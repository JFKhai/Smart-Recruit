const express = require("express");
const router = express.Router();

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
} = require("../controllers/cvController");


router.post("/upload", protect, upload.single("cv"), uploadCv);
router.get("/", protect, getMyCvProfiles);
router.post("/", protect, createCvProfile);
router.get("/:id", protect, getCvProfileById);
router.get("/:id/download", protect, downloadCv); // Route tải CV qua presigned URL bảo mật
router.put("/:id", protect, updateCvProfile);
router.delete("/:id", protect, deleteCvProfile);
router.patch("/:id/set-primary", protect, setPrimaryCV);

module.exports = router;
