const cron = require("node-cron");
const fs = require("fs");
const os = require("os");
const path = require("path");
const pdfParse = require("pdf-parse");
const { createWorker } = require("tesseract.js");
const { fromPath } = require("pdf2pic");

const CvProfile = require("../models/CvProfile");
const storageService = require("./storageService");
const aiService = require("./aiService");
const cvExtractor = require("./cvExtractor");

// To run OCR, we write the file buffer to temporary storage and clear it immediately
const extractTextWithOCRFromBuffer = async (pdfBuffer) => {
  console.log("[Worker] Running OCR fallback from Buffer...");
  const tempDir = os.tmpdir();
  const tempFilename = `ocr_temp_${Date.now()}`;
  const tempFilePath = path.join(tempDir, `${tempFilename}.pdf`);
  
  let imagePath = null;

  try {
    fs.writeFileSync(tempFilePath, pdfBuffer);

    const convert = fromPath(tempFilePath, {
      density: 200,
      saveFilename: tempFilename,
      savePath: tempDir,
      format: "png",
      width: 1240,
      height: 1754,
    });

    const pageImage = await convert(1, { responseType: "image" });
    imagePath = pageImage.path;
    console.log("[Worker] Temporary OCR image saved at:", imagePath);

    const worker = await createWorker("eng+vie");
    const {
      data: { text },
    } = await worker.recognize(imagePath);
    await worker.terminate();

    return text;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("[Worker] Temporary PDF file deleted.");
    }
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log("[Worker] Temporary image file deleted.");
    }
  }
};

/**
 * Main function to process a single queued CV job from the database
 */
const processSingleCvJob = async () => {
  let cv = null;
  try {
    // 1. Claim one queued job atomically (FIFO order)
    cv = await CvProfile.findOneAndUpdate(
      { 
        processingStatus: "queued", 
        attempts: { $lt: 3 } 
      },
      { 
        $set: { processingStatus: "processing" } 
      },
      { 
        new: true, 
        sort: { createdAt: 1 } 
      }
    );

    if (!cv) {
      return; // No jobs in queue
    }

    console.log(`[Worker] Started processing CV Job for profile ID: ${cv._id} (Attempts: ${cv.attempts})`);

    // 2. Fetch the file buffer from Cloudflare R2
    if (!cv.fileUrl) {
      throw new Error("No fileUrl present on the CV profile");
    }
    console.log(`[Worker] Fetching file buffer from R2 for key: ${cv.fileUrl}`);
    const fileBuffer = await storageService.getFileBuffer(cv.fileUrl);

    // 3. Parse PDF text
    console.log("[Worker] Parsing PDF content...");
    const pdfData = await pdfParse(fileBuffer);
    let extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length < 50) {
      console.log("[Worker] Low character count -> falling back to OCR...");
      extractedText = await extractTextWithOCRFromBuffer(fileBuffer);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Could not extract any text content from the PDF");
    }

    const textToSend = extractedText.substring(0, 3000);

    // 4. Generate AI Embeddings Vector (Gemini)
    console.log("[Worker] Generating vector embeddings...");
    const embeddingVector = await aiService.getEmbedding(textToSend);
    if (!embeddingVector || embeddingVector.length === 0) {
      throw new Error("Embedding generation returned empty or null vector");
    }

    // 5. Extract Profile Information (Gemini -> Groq -> Regex)
    console.log("[Worker] Extracting profile details...");
    const extractedData = await cvExtractor.extractCvData(textToSend);

    // 6. Update database with parsed fields and vector
    cv.fullName = extractedData?.fullName || cv.fullName || "Not updated";
    cv.headline = extractedData?.headline || "";
    cv.email = extractedData?.email || "";
    cv.phone = extractedData?.phone || "";
    cv.location = extractedData?.location || "";
    cv.address = extractedData?.address || "";
    cv.dateOfBirth = extractedData?.dateOfBirth || "";
    cv.website = extractedData?.website || "";
    cv.summary = extractedData?.summary || textToSend;
    cv.skills = extractedData?.skills || [];
    cv.certifications = extractedData?.certifications || "";
    cv.experience = extractedData?.experience || [];
    cv.education = extractedData?.education || [];
    cv.embedding = embeddingVector;
    cv.processingStatus = "ready";
    cv.processingError = null;

    await cv.save();
    console.log(`[Worker] SUCCESS: CV Profile ID ${cv._id} processed successfully`);

  } catch (error) {
    console.error(`[Worker] CRITICAL: Error processing CV Job: ${error.message}`);
    
    if (cv) {
      try {
        const nextAttempts = cv.attempts + 1;
        if (nextAttempts >= 3) {
          // Permanently fail the job
          await CvProfile.updateOne(
            { _id: cv._id },
            { 
              $set: { 
                processingStatus: "failed", 
                processingError: error.message,
                attempts: nextAttempts
              } 
            }
          );
          console.log(`[Worker] Job marked as permanently FAILED for profile ID ${cv._id}`);
        } else {
          // Re-queue for another attempt
          await CvProfile.updateOne(
            { _id: cv._id },
            { 
              $set: { 
                processingStatus: "queued", 
                processingError: error.message,
                attempts: nextAttempts
              } 
            }
          );
          console.log(`[Worker] Job re-queued for profile ID ${cv._id} (Next attempt: ${nextAttempts})`);
        }
      } catch (dbErr) {
        console.error(`[Worker] Failed to update fail state in DB for CV ${cv._id}:`, dbErr.message);
      }
    }
  }
};

/**
 * Initialize the Node-cron schedule
 */
const initCronWorker = () => {
  console.log("[Worker] Initializing Background Cron Worker (30s schedule)...");
  
  // Runs every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    try {
      await processSingleCvJob();
    } catch (err) {
      console.error("[Worker] Cron loop encountered error:", err.message);
    }
  });
};

module.exports = {
  initCronWorker,
  processSingleCvJob
};
