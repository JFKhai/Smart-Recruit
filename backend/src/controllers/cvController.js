const fs = require("fs");
const os = require("os");
const path = require("path");
const pdfParse = require("pdf-parse");
const { createWorker } = require("tesseract.js");
const { fromPath } = require("pdf2pic");
const CvProfile = require("../models/CvProfile");
const aiService = require("../services/aiService");
const cvExtractor = require("../services/cvExtractor");
const storageService = require("../services/storageService");
const Job = require("../models/Job");
const Application = require("../models/Application");

// To run OCR, we write the file buffer to temporary storage and clear it immediately
const extractTextWithOCRFromBuffer = async (pdfBuffer) => {
  console.log("Using OCR fallback from Buffer...");
  const tempDir = os.tmpdir();
  const tempFilename = `ocr_temp_${Date.now()}`;
  const tempFilePath = path.join(tempDir, `${tempFilename}.pdf`);
  
  let imagePath = null;

  try {
    // Write buffer to temporary file
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
    console.log("Temporary OCR image saved at:", imagePath);

    const worker = await createWorker("eng+vie");
    const {
      data: { text },
    } = await worker.recognize(imagePath);
    await worker.terminate();

    return text;
  } finally {
    // Clean up temporary PDF file and temporary image file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("Temporary PDF file deleted.");
    }
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log("Temporary image file deleted.");
    }
  }
};

const uploadCv = async (req, res) => {
  try {
    console.log("==========================================");
    console.log("1. STARTING CV UPLOAD PROCESS (CLOUDFLARE R2)...");

    if (!req.file) {
      return res.status(400).json({ message: "Please provide a PDF file" });
    }

    console.log("2. Received file from memory storage. Size:", req.file.size);
    const pdfData = await pdfParse(req.file.buffer);
    let extractedText = pdfData.text;

    console.log("3. Read PDF from RAM. Total characters:", extractedText.length);

    if (!extractedText || extractedText.trim().length < 50) {
      console.log("PDF contains no text or is scanned image -> Switching to OCR...");
      extractedText = await extractTextWithOCRFromBuffer(req.file.buffer);
      console.log("OCR completed. Characters received:", extractedText.length);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res
        .status(400)
        .json({ message: "Unable to read content from this PDF file" });
    }

    const textToSend = extractedText.substring(0, 3000);
    console.log(
      "4. Text snippet sent for embedding:",
      textToSend.substring(0, 50).replace(/\n/g, " ") + "...",
    );
    console.log("5. AI Service URL:", process.env.AI_SERVICE_URL);

    const embeddingVector = await aiService.getEmbedding(textToSend);

    if (embeddingVector && embeddingVector.length > 0) {
      console.log(
        "6. SUCCESS! Received vector length:",
        embeddingVector.length,
      );
    } else {
      console.log("6. FAILURE! Vector is null. Returning empty array.");
    }
    
    console.log("--- EXTRACTING INFORMATION (Gemini -> Groq -> Regex) ---");
    const extractedData = await cvExtractor.extractCvData(textToSend);
    if (extractedData && extractedData._source !== "regex") {
      console.log("7. AI extraction SUCCESSFUL!");
    } else {
      console.log("7. AI unavailable -> used Regex Fallback.");
    }

    // Upload PDF file from RAM to Cloudflare R2
    console.log("8. Uploading file to Cloudflare R2...");
    const uniqueFilename = `cvs/${req.user._id}-${Date.now()}.pdf`;
    const r2Key = await storageService.uploadFile(
      req.file.buffer,
      uniqueFilename,
      req.file.mimetype
    );
    console.log("9. R2 upload successful. Key:", r2Key);
    console.log("==========================================");

    const existingPrimary = await CvProfile.findOne({ userId: req.user._id, isPrimary: true });
    const newCv = await CvProfile.create({
      userId: req.user._id,
      fullName: extractedData?.fullName || req.body.fullName || "Not updated",
      headline: extractedData?.headline || "",
      email: extractedData?.email || "",
      phone: extractedData?.phone || "",
      location: extractedData?.location || "",
      address: extractedData?.address || "",
      dateOfBirth: extractedData?.dateOfBirth || "",
      website: extractedData?.website || "",
      summary: extractedData?.summary || textToSend,
      skills: extractedData?.skills || [],
      certifications: extractedData?.certifications || "",
      experience: extractedData?.experience || [],
      education: extractedData?.education || [],
      fileUrl: r2Key, // Save R2 Key as file URL
      embedding: embeddingVector || [],
      isLookingForJob: true,
      isPrimary: !existingPrimary, 
    });

    res.status(201).json({ message: "CV upload successful!", data: newCv });
  } catch (error) {
    console.error("CRASH ERROR DURING CV PROCESSING:", error);
    res.status(500).json({ message: "System error handling profile" });
  }
};


const getMyCvProfiles = async (req, res) => {
  try {
    const profiles = await CvProfile.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ data: profiles });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCvProfileById = async (req, res) => {
  try {
    const profile = await CvProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ" });
    }

    if (
      req.user.role !== "admin" &&
      profile.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Không có quyền truy cập hồ sơ này" });
    }

    res.json({ data: profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCvProfile = async (req, res) => {
  try {
    const existingPrimary = await CvProfile.findOne({ userId: req.user._id, isPrimary: true });
    const payload = {
      userId: req.user._id,
      fullName: req.body.fullName || "Chưa cập nhật",
      headline: req.body.headline,
      email: req.body.email,
      phone: req.body.phone,
      location: req.body.location,
      address: req.body.address,
      dateOfBirth: req.body.dateOfBirth,
      website: req.body.website,
      summary: req.body.summary,
      skills: req.body.skills || [],
      certifications: req.body.certifications,
      experience: req.body.experience || [],
      education: req.body.education || [],
      isLookingForJob:
        typeof req.body.isLookingForJob === "boolean"
          ? req.body.isLookingForJob
          : true,
      isPrimary: !existingPrimary,
    };

    const createdProfile = await CvProfile.create(payload);

    const textForEmb = [
      payload.headline || '',
      payload.summary || '',
      (payload.skills || []).join(', '),
      payload.certifications || '',
      (payload.experience || []).map(e => `${e.position || ''} ${e.description || ''}`).join(' '),
      (payload.education || []).map(e => `${e.major || ''} ${e.school || ''}`).join(' '),
    ].filter(Boolean).join('. ').trim();

    if (textForEmb.length >= 20) {
      try {
        const embedding = await aiService.getEmbedding(textForEmb.substring(0, 3000));
        if (embedding && embedding.length > 0) {
          createdProfile.embedding = embedding;
          await createdProfile.save();
          console.log('CV Profile: embedding tao thanh cong,', embedding.length, 'chieu');
        }
      } catch (e) {
        console.warn('CV Profile: khong the tao embedding -', e.message);
      }
    } else {
      createdProfile.embedding = [];
      await createdProfile.save();
    }

    res.status(201).json({ message: "Tạo hồ sơ thành công", data: createdProfile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCvProfile = async (req, res) => {
  try {
    const profile = await CvProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ" });
    }

    if (profile.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Không có quyền cập nhật hồ sơ này" });
    }

    const allowedFields = [
      "fullName",
      "headline",
      "email",
      "phone",
      "location",
      "address",
      "dateOfBirth",
      "website",
      "summary",
      "skills",
      "certifications",
      "experience",
      "education",
      "isLookingForJob",
      "fileUrl",
    ];

    allowedFields.forEach((field) => {
      if (typeof req.body[field] !== "undefined") {
        profile[field] = req.body[field];
      }
    });

    const updatedProfile = await profile.save();

    const changedFields = Object.keys(req.body);
    if (changedFields.some(f => ['summary','skills','experience','education', 'headline', 'certifications'].includes(f))) {
      const textForEmb = [
        updatedProfile.headline || '',
        updatedProfile.summary || '',
        (updatedProfile.skills || []).join(', '),
        updatedProfile.certifications || '',
        (updatedProfile.experience || []).map(e => `${e.position || ''} ${e.description || ''}`).join(' '),
        (updatedProfile.education || []).map(e => `${e.major || ''} ${e.school || ''}`).join(' '),
      ].filter(Boolean).join('. ').trim();

      if (textForEmb.length >= 20) {
        try {
          const embedding = await aiService.getEmbedding(textForEmb.substring(0, 3000));
          if (embedding && embedding.length > 0) {
            updatedProfile.embedding = embedding;
            await updatedProfile.save();
            console.log('CV Profile: cap nhat embedding thanh cong,', embedding.length, 'chieu');
          }
        } catch (e) {
          console.warn('CV Profile: khong the cap nhat embedding -', e.message);
        }
      } else {
        updatedProfile.embedding = [];
        await updatedProfile.save();
        console.log('CV Profile: thong tin qua ngan, da xoa embedding.');
      }
    }

    res.json({ message: "Cập nhật hồ sơ thành công", data: updatedProfile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCvProfile = async (req, res) => {
  try {
    const profile = await CvProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (
      req.user.role !== "admin" &&
      profile.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "You are not authorized to delete this profile" });
    }

    // Xóa file vật lý trên Cloudflare R2 trước khi xóa trong DB
    if (profile.fileUrl) {
      try {
        console.log(`Deleting CV file on Cloudflare R2: ${profile.fileUrl}`);
        await storageService.deleteFile(profile.fileUrl);
      } catch (err) {
        console.error("Error deleting file on R2:", err.message);
      }
    }

    const wasPrimary = profile.isPrimary;
    await profile.deleteOne();

    // Deleting the primary CV promotes the newest remaining one
    if (wasPrimary) {
      const next = await CvProfile.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (next) {
        next.isPrimary = true;
        await next.save();
      }
    }

    res.json({ message: "Profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const downloadCv = async (req, res) => {
  try {
    const profile = await CvProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: "CV profile not found" });
    }

    if (!profile.fileUrl) {
      return res.status(400).json({ message: "This profile does not have a PDF file attached" });
    }

    const userIdStr = req.user._id.toString();
    const candidateIdStr = profile.userId.toString();

    // ─── ACCESS AUTHORIZATION (PREVENT IDOR) ──────────────────────────────────
    let isAuthorized = false;

    if (req.user.role === "admin") {
      isAuthorized = true;
    } else if (req.user.role === "candidate") {
      // Candidates can only download their own CVs
      isAuthorized = userIdStr === candidateIdStr;
    } else if (req.user.role === "employer") {
      // Employers can only download CVs if the candidate applied to one of their jobs
      // 1. Get jobs posted by this employer
      const employerJobs = await Job.find({ employerId: req.user._id }).select("_id");
      const jobIds = employerJobs.map(job => job._id);

      // 2. Check if an application exists for this candidate matching those jobs
      const hasApplication = await Application.exists({
        candidateId: profile.userId,
        jobId: { $in: jobIds }
      });

      isAuthorized = !!hasApplication;
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "You are not authorized to access or download this CV file!" });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Generate pre-signed URL from Cloudflare R2 valid for 5 minutes (300 seconds)
    const signedUrl = await storageService.getSignedDownloadUrl(profile.fileUrl);
    
    // Return JSON if client requests it (like standard API fetch request).
    // Redirect directly to R2 if client visits the URL directly (like clicking anchor tag).
    if (req.query.json === "true" || req.headers.accept?.includes("application/json")) {
      res.json({
        message: "CV download link generated successfully",
        downloadUrl: signedUrl,
        expiresInSeconds: 300
      });
    } else {
      res.redirect(302, signedUrl);
    }
  } catch (error) {
    console.error("Error generating download CV link:", error);
    res.status(500).json({ message: "System error generating download link" });
  }
};

const setPrimaryCV = async (req, res) => {
  try {
    const profile = await CvProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    if (profile.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to change this profile" });
    }

    await CvProfile.updateMany(
      { userId: req.user._id, _id: { $ne: profile._id } },
      { $set: { isPrimary: false } }
    );

    profile.isPrimary = true;
    await profile.save();

    res.json({ message: "Set as primary CV successfully", data: profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadCv,
  getMyCvProfiles,
  getCvProfileById,
  createCvProfile,
  updateCvProfile,
  deleteCvProfile,
  setPrimaryCV,
  downloadCv, // Export downloadCv route
};

