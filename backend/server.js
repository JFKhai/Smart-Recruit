require("dotenv").config(); // Load biến môi trường
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const connectDB = require("./src/config/db");

const app = express();
const path = require("path");
const fs = require("fs");

connectDB();

// ─── Rate Limiters ───────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20,                   // tối đa 20 request / 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10,                   // tối đa 10 lần upload / giờ
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quá nhiều lần tải lên, vui lòng thử lại sau.' },
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allowlist: hỗ trợ nhiều origin cách nhau bởi dấu phẩy qua biến môi trường
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (ví dụ: curl, Postman) trong dev
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: origin '${origin}' không được phép.`));
      }
    },
    credentials: true, // Cho phép gửi cookie kèm request
  }),
);

app.use(express.json());
app.use(cookieParser()); // Đọc HTTPOnly cookie từ request

// KHÔNG phục vụ thư mục uploads ra public — CV phải qua signed URL (Ngày 4)
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Health Check ─────────────────────────────────────────────────────────────
// Railway và uptime monitor gọi endpoint này để kiểm tra service có sống không
app.get("/health", (req, res) => {
  const mongoose = require("mongoose");
  const dbState = mongoose.connection.readyState;
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    memory: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  });
});

app.get("/", (req, res) => {
  res.send("API Smart Recruit đang chạy và đã kết nối DB!");
});

// Áp dụng rate limit cho các route xác thực nhạy cảm
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/users", require("./src/routes/userRoutes"));

app.use("/api/cv/upload", uploadLimiter);
app.use("/api/cv", require("./src/routes/cvRoutes"));
app.use("/api/jobs", require("./src/routes/jobRoutes"));
app.use("/api/applications", require("./src/routes/applicationRoutes"));
app.use("/api/notifications", require("./src/routes/notificationRoutes"));
app.use("/api/job-alerts", require("./src/routes/jobAlertRoutes"));
app.use("/api/reviews", require("./src/routes/reviewRoutes"));
app.use("/api/admin", require("./src/routes/adminRoutes"));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server đang chạy tại port ${PORT}`);

  const { startCronJobs } = require("./src/cronJob");
  startCronJobs();

  // Khởi chạy background AI worker xử lý CV
  const { initCronWorker } = require("./src/services/cronWorker");
  initCronWorker();
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// Railway gửi SIGTERM trước khi dừng container; cho phép các request đang chạy hoàn thành
const gracefulShutdown = (signal) => {
  console.log(`\n[${signal}] Bắt đầu dừng server...`);
  server.close(async () => {
    console.log('HTTP server đã dừng nhận request mới.');
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('Kết nối MongoDB đã đóng.');
    } catch (err) {
      console.error('Lỗi khi đóng MongoDB:', err.message);
    }
    process.exit(0);
  });

  // Bẫt buộc dừng sau 15 giây nếu server chưa thoát
  setTimeout(() => {
    console.error('Timeout graceful shutdown, buộc dừng.');
    process.exit(1);
  }, 15000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Railway
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));  // Ctrl+C local
