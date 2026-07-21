const CvProfile = require("../models/CvProfile");
const storageService = require("../services/storageService");
const Job = require("../models/Job");
const Application = require("../models/Application");

const uploadCv = async (req, res) => {
  try {
    console.log("==========================================");
    console.log("1. STARTING ASYNC CV UPLOAD PROCESS (CLOUDFLARE R2)...");

    if (!req.file) {
      return res.status(400).json({ message: "Please provide a PDF file" });
    }

    // Upload PDF file from RAM to Cloudflare R2
    console.log("2. Uploading file to Cloudflare R2...");
    const uniqueFilename = `cvs/${req.user._id}-${Date.now()}.pdf`;
    const r2Key = await storageService.uploadFile(
      req.file.buffer,
      uniqueFilename,
      req.file.mimetype
    );
    console.log("3. R2 upload successful. Key:", r2Key);
    console.log("==========================================");

    const existingPrimary = await CvProfile.findOne({ userId: req.user._id, isPrimary: true });
    
    // Create the CV profile in 'queued' state. The background cron worker will pick it up
    // and populate the parsed AI fields and embedding vectors.
    const tempName = req.body.fullName || req.file.originalname || "CV Profile";
    const newCv = await CvProfile.create({
      userId: req.user._id,
      fullName: tempName,
      headline: "Processing profile details...",
      fileUrl: r2Key, // Save R2 Key as file URL
      isLookingForJob: true,
      isPrimary: !existingPrimary,
      processingStatus: "queued",
      attempts: 0
    });

    res.status(201).json({ 
      message: "CV upload successful! Processing details in the background.", 
      data: newCv 
    });
  } catch (error) {
    console.error("CRASH ERROR DURING CV UPLOAD SETUP:", error);
    res.status(500).json({ message: "System error preparing profile upload" });
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

