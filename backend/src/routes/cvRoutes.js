const express = require("express");
const router = express.Router();

const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  uploadCv,
  getMyCvProfiles,
  getCvProfileById,
  createCvProfile,
  updateCvProfile,
  deleteCvProfile,
  setPrimaryCV,
  downloadCv,
  retryCvAiCandidate,
} = require("../controllers/cvController");

const cvRetryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // max 10 retries per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Bạn đã vượt quá số lần thử lại AI cho phép (tối đa 10 lần/giờ). Vui lòng thử lại sau." },
});

router.post("/upload", protect, upload.single("cv"), uploadCv);
router.get("/", protect, getMyCvProfiles);
router.post("/", protect, createCvProfile);
router.get("/:id", protect, getCvProfileById);
router.get("/:id/download", protect, downloadCv);
router.put("/:id", protect, updateCvProfile);
router.delete("/:id", protect, deleteCvProfile);
router.patch("/:id/set-primary", protect, setPrimaryCV);
router.post("/:id/retry", protect, cvRetryLimiter, retryCvAiCandidate);

module.exports = router;
