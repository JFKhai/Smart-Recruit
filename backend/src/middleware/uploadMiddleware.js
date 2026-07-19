const multer = require("multer");

// Sử dụng memoryStorage để lưu file buffer tạm thời trong RAM, tránh rác đĩa cục bộ trên server.
// Sau đó sẽ được storageService đẩy trực tiếp lên Cloudflare R2.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận định dạng file PDF!"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
  fileFilter: fileFilter,
});

module.exports = upload;

