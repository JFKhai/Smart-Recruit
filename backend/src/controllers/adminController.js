const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const CvProfile = require('../models/CvProfile');
const Notification = require('../models/Notification');
const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');
const { logAdminAction } = require('../services/auditLogService');

const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCandidates,
      totalEmployers,
      totalJobs,
      openJobs,
      closedJobs,
      totalApplications,
      totalCvs,
      totalNotifications,
      unreadNotifications,
      bannedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'candidate' }),
      User.countDocuments({ role: 'employer' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'open' }),
      Job.countDocuments({ status: { $in: ['closed', 'archived'] } }),
      Application.countDocuments(),
      CvProfile.countDocuments(),
      Notification.countDocuments({ isDeleted: { $ne: true } }),
      Notification.countDocuments({ isRead: false, isDeleted: { $ne: true } }),
      User.countDocuments({ status: 'banned' }),
    ]);

    const recentUsers = await User.find()
      .select('email role status createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentApplications = await Application.find()
      .populate('candidateId', 'email')
      .populate('jobId', 'title')
      .sort({ appliedAt: -1 })
      .limit(5);

    res.json({
      data: {
        users: { total: totalUsers, candidates: totalCandidates, employers: totalEmployers, banned: bannedUsers },
        jobs: { total: totalJobs, open: openJobs, closed: closedJobs },
        applications: { total: totalApplications },
        cvs: { total: totalCvs },
        notifications: { total: totalNotifications, unread: unreadNotifications },
        recentUsers,
        recentApplications,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const role = req.query.role; // 'candidate' | 'employer' | 'admin'
    const status = req.query.status; // 'active' | 'banned'
    const search = req.query.search;

    const filter = { isDeleted: { $ne: true } };
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) filter.email = { $regex: search, $options: 'i' };

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ data: users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'banned'].includes(status)) {
      return res.status(400).json({ message: 'Status không hợp lệ. Chỉ chấp nhận: active, banned' });
    }
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Không thể thay đổi trạng thái tài khoản của chính mình' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    // Log Audit Action
    await logAdminAction({
      req,
      action: status === 'banned' ? 'LOCK_USER' : 'UNLOCK_USER',
      targetModel: 'User',
      targetId: user._id,
      details: { email: user.email, role: user.role, newStatus: status },
    });

    res.json({ message: `Đã ${status === 'banned' ? 'khoá' : 'kích hoạt'} tài khoản thành công`, data: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Không thể xóa tài khoản của chính mình' });
    }

    // Soft delete user to preserve relational application history
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, status: 'banned' },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    // Log Audit Action
    await logAdminAction({
      req,
      action: 'DELETE_USER',
      targetModel: 'User',
      targetId: user._id,
      details: { email: user.email, role: user.role, softDeleted: true },
    });

    res.json({ message: 'Đã lưu trữ (xóa mềm) tài khoản thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetUserPasswordByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản người dùng' });
    }

    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const emailService = require('../services/emailService');
    await emailService.sendEmail({
      to: user.email,
      subject: '[Smart Recruit] Yêu cầu Đặt lại Mật khẩu từ Quản trị viên',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #6d28d9;">🔑 Đặt lại Mật khẩu Hỗ trợ</h2>
          <p>Xin chào <strong>${user.fullName || user.email}</strong>,</p>
          <p>Quản trị viên hệ thống Smart Recruit đã khởi tạo yêu cầu hỗ trợ đặt lại mật khẩu cho tài khoản của bạn.</p>
          <p style="margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Đặt lại Mật khẩu Ngay
            </a>
          </p>
          <p style="font-size: 13px; color: #666;">Đường dẫn này có hiệu lực trong vòng 60 phút. Nếu bạn không đưa ra yêu cầu này, vui lòng bỏ qua email.</p>
        </div>
      `,
    });

    await logAdminAction({
      req,
      action: 'UPDATE_SYSTEM_SETTINGS',
      targetModel: 'User',
      targetId: user._id,
      details: { email: user.email, actionType: 'PASSWORD_RESET_ASSIST' },
    });

    res.json({ message: `Đã gửi email hỗ trợ đặt lại mật khẩu tới ${user.email} thành công!` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const action = req.query.action;
    const search = req.query.search;

    const filter = {};
    if (action) filter.action = action;

    if (search) {
      const adminUsers = await User.find({ email: { $regex: search, $options: 'i' } }).select('_id');
      const adminIds = adminUsers.map((u) => u._id);
      filter.$or = [{ adminId: { $in: adminIds } }, { ipAddress: { $regex: search, $options: 'i' } }];
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('adminId', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ data: logs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const search = req.query.search;

    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const total = await Job.countDocuments(filter);
    const jobs = await Job.find(filter)
      .populate('employerId', 'email')
      .select('-embedding')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

   
    const jobsWithCount = await Promise.all(
      jobs.map(async (job) => {
        const applyCount = await Application.countDocuments({ jobId: job._id });
        return { ...job.toObject(), applyCount };
      })
    );

    res.json({ data: jobsWithCount, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const closeJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    );
    if (!job) return res.status(404).json({ message: 'Không tìm thấy tin tuyển dụng' });

    await logAdminAction({
      req,
      action: 'REJECT_JOB',
      targetModel: 'Job',
      targetId: job._id,
      details: { title: job.title, newStatus: 'closed' },
    });

    res.json({ message: 'Đã đóng tin tuyển dụng', data: job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const deleteJob = async (req, res) => {
  try {
    // Soft delete / archive job to preserve application relational data
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, status: 'archived' },
      { new: true }
    );
    if (!job) return res.status(404).json({ message: 'Không tìm thấy tin tuyển dụng' });

    await logAdminAction({
      req,
      action: 'DELETE_JOB',
      targetModel: 'Job',
      targetId: job._id,
      details: { title: job.title, archived: true },
    });

    res.json({ message: 'Đã gỡ bài và lưu trữ (xóa mềm) tin tuyển dụng thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSystemInfo = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    const dbState = mongoose.connection.readyState;
    const dbStateMap = { 0: 'Ngắt kết nối', 1: 'Đã kết nối', 2: 'Đang kết nối', 3: 'Đang ngắt kết nối' };

    const aiServiceUrl = process.env.AI_SERVICE_URL || '(Chưa cấu hình)';
    const nodeEnv = process.env.NODE_ENV || 'development';

    const [totalNotifications, softDeletedNotifications, totalCvWithEmbedding, settingsRecord] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ isDeleted: true }),
      CvProfile.countDocuments({ embedding: { $exists: true, $not: { $size: 0 } } }),
      SystemSetting.findOne({ key: 'email_matching_settings' }),
    ]);

    let cronScheduleText = 'Tắt (Chưa lên lịch)';
    if (settingsRecord && settingsRecord.value.isEnabled) {
      const typeMap = {
        demo: 'Mỗi phút (Demo)',
        hourly: 'Mỗi giờ',
        daily: 'Hàng ngày (7h & 17h)',
        weekly: 'Hàng tuần (Thứ 2)',
        custom: 'Tùy chỉnh',
      };
      const label = typeMap[settingsRecord.value.scheduleType] || 'Tùy chỉnh';
      cronScheduleText = `${settingsRecord.value.cronExpression} (${label})`;
    }

    res.json({
      data: {
        server: {
          uptime: `${hours}h ${minutes}m ${seconds}s`,
          uptimeSeconds,
          nodeEnv,
          nodeVersion: process.version,
          platform: process.platform,
          memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
        database: {
          status: dbStateMap[dbState] || 'Không xác định',
          readyState: dbState,
          host: mongoose.connection.host || '—',
          name: mongoose.connection.name || '—',
        },
        services: {
          aiServiceUrl,
          cronSchedule: cronScheduleText,
        },
        notifications: {
          total: totalNotifications,
          softDeleted: softDeletedNotifications,
        },
        cvs: {
          withEmbedding: totalCvWithEmbedding,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const triggerMatchingJob = async (req, res) => {
  try {
    // 1. Nhánh gửi email thử nghiệm (Mock data)
    if (req.query.test === 'true') {
      const emailService = require('../services/emailService');
      
      const mockJobs = [
        {
          id: 'mockjob1',
          title: 'Senior Fullstack Developer (Node.js & React)',
          location: 'Thành phố Hồ Chí Minh',
          companyName: 'Smart Recruit Demo Corp',
          previewScore: 96,
        },
        {
          id: 'mockjob2',
          title: 'AI Product Engineer (Python & Large Language Models)',
          location: 'Hà Nội',
          companyName: 'AI Innovations Lab',
          previewScore: 89,
        }
      ];

      const receiverEmail = req.user?.email;
      if (!receiverEmail) {
        return res.status(400).json({ message: 'Không xác định được email của tài khoản admin hiện tại.' });
      }

      await emailService.sendJobMatchEmail(
        { email: receiverEmail, fullName: 'Người dùng Thử nghiệm (Admin)' },
        mockJobs
      );

      return res.json({
        message: 'Gửi email thử nghiệm thành công!',
        data: {
          receiver: receiverEmail,
          emailsSent: 1,
        },
      });
    }

    // 2. Nhánh chạy quét DB thật
    const { runMatchingProcess } = require('../cronJob');
    const stats = await runMatchingProcess();
    res.json({
      message: 'Kích hoạt tác vụ quét và gửi email thành công!',
      data: stats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmailSettings = async (req, res) => {
  try {
    let settingsRecord = await SystemSetting.findOne({ key: 'email_matching_settings' });
    if (!settingsRecord) {
      settingsRecord = await SystemSetting.create({
        key: 'email_matching_settings',
        value: {
          isEnabled: true,
          scheduleType: 'daily',
          cronExpression: '0 7,17 * * *',
        }
      });
    }
    res.json({ data: settingsRecord.value });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateEmailSettings = async (req, res) => {
  try {
    const { isEnabled, scheduleType, cronExpression } = req.body;
    
    // Validate custom cron expression format if scheduleType is custom
    if (scheduleType === 'custom') {
      if (!cronExpression || cronExpression.trim().split(/\s+/).length < 5) {
        return res.status(400).json({ message: 'Biểu thức Cron tùy chỉnh không hợp lệ (cần ít nhất 5 trường).' });
      }

      const minPart = cronExpression.trim().split(/\s+/)[0];
      const hourPart = cronExpression.trim().split(/\s+/)[1];
      
      // Block high frequency execution under 15 minutes for custom cron
      const isEveryMin = minPart === '*' && hourPart === '*';
      let isStepTooFrequent = false;
      if (minPart.startsWith('*/') && hourPart === '*') {
        const step = parseInt(minPart.replace('*/', ''), 10);
        if (!isNaN(step) && step < 15) isStepTooFrequent = true;
      }

      if (isEveryMin || isStepTooFrequent) {
        return res.status(400).json({
          message: 'Tần suất quá cao! Vui lòng chọn khoảng thời gian tối thiểu 15 phút hoặc chọn các phương án có sẵn.',
        });
      }
    }

    // Set standard cron expressions for pre-defined types
    let computedCron = cronExpression;
    if (scheduleType === 'demo') computedCron = '* * * * *';
    else if (scheduleType === 'hourly') computedCron = '0 * * * *';
    else if (scheduleType === 'daily') computedCron = '0 7,17 * * *';
    else if (scheduleType === 'weekly') computedCron = '0 8 * * 1';

    const settingsRecord = await SystemSetting.findOneAndUpdate(
      { key: 'email_matching_settings' },
      {
        $set: {
          value: {
            isEnabled: !!isEnabled,
            scheduleType,
            cronExpression: computedCron,
          }
        }
      },
      { new: true, upsert: true }
    );

    // Dynamic reschedule cron!
    const { reloadCronJobs } = require('../cronJob');
    await reloadCronJobs();

    await logAdminAction({
      req,
      action: 'UPDATE_SYSTEM_SETTINGS',
      targetModel: 'SystemSetting',
      targetId: settingsRecord._id,
      details: { key: 'email_matching_settings', value: settingsRecord.value },
    });

    res.json({
      message: 'Cập nhật cấu hình gửi email thành công!',
      data: settingsRecord.value,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAiMonitor = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const [total, readyCount, completedCount, failedCount, processingCount, queuedCount] = await Promise.all([
      CvProfile.countDocuments(),
      CvProfile.countDocuments({ processingStatus: 'ready' }),
      CvProfile.countDocuments({ processingStatus: 'completed' }),
      CvProfile.countDocuments({ processingStatus: 'failed' }),
      CvProfile.countDocuments({ processingStatus: 'processing' }),
      CvProfile.countDocuments({ processingStatus: 'queued' }),
    ]);

    const filter = {};
    if (status && status !== 'all') {
      filter.processingStatus = status;
    }

    const cvs = await CvProfile.find(filter)
      .populate('userId', 'fullName email')
      .select('fullName email headline processingStatus processingError attempts lastAiAttemptAt fileUrl createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const filteredTotal = await CvProfile.countDocuments(filter);

    res.json({
      stats: {
        total,
        ready: readyCount + completedCount,
        failed: failedCount,
        processing: processingCount,
        queued: queuedCount,
      },
      data: cvs,
      total: filteredTotal,
      page,
      pages: Math.ceil(filteredTotal / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const retryCvAi = async (req, res) => {
  try {
    const profile = await CvProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ CV' });
    }

    profile.processingStatus = 'queued';
    profile.processingError = null;
    profile.attempts = 0;
    profile.lastAiAttemptAt = new Date();
    await profile.save();

    await logAdminAction({
      req,
      action: 'RETRY_AI_PARSING',
      targetModel: 'CvProfile',
      targetId: profile._id,
      details: { fullName: profile.fullName, email: profile.email },
    });

    res.json({ message: 'Đã đưa CV vào hàng đợi xử lý lại AI thành công!', data: profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const retryAllFailedCvAi = async (req, res) => {
  try {
    const failedCvs = await CvProfile.find({ processingStatus: 'failed' });
    const count = failedCvs.length;

    if (count === 0) {
      return res.json({ message: 'Không có CV nào ở trạng thái lỗi', queuedCount: 0 });
    }

    await CvProfile.updateMany(
      { processingStatus: 'failed' },
      {
        $set: {
          processingStatus: 'queued',
          processingError: null,
          attempts: 0,
          lastAiAttemptAt: new Date(),
        },
      }
    );

    await logAdminAction({
      req,
      action: 'RETRY_AI_PARSING',
      targetModel: 'CvProfile',
      targetId: null,
      details: { queuedCount: count, bulk: true },
    });

    res.json({ message: `Đã xếp hàng ${count} CV bị lỗi để xử lý lại AI`, queuedCount: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const SystemBroadcast = require('../models/SystemBroadcast');
const { processBroadcastAsync } = require('../services/broadcastWorker');

const createBroadcast = async (req, res) => {
  try {
    const { title, message, targetGroup, sendEmail, sendInApp } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Tiêu đề và nội dung thông báo là bắt buộc.' });
    }

    const broadcast = await SystemBroadcast.create({
      title,
      message,
      targetGroup: targetGroup || 'all',
      sendEmail: sendEmail !== false,
      sendInApp: sendInApp !== false,
      status: 'processing',
      createdAdminId: req.user._id,
    });

    await logAdminAction({
      req,
      action: 'CREATE_SYSTEM_BROADCAST',
      targetModel: 'SystemBroadcast',
      targetId: broadcast._id,
      details: { title, targetGroup, sendEmail, sendInApp },
    });

    // Launch background worker non-blockingly using setImmediate
    setImmediate(() => {
      processBroadcastAsync(broadcast._id);
    });

    res.status(202).json({
      message: 'Thông báo toàn hệ thống đã được tạo và đang được phát ngầm thành công!',
      broadcastId: broadcast._id,
      data: broadcast,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBroadcasts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const total = await SystemBroadcast.countDocuments();
    const broadcasts = await SystemBroadcast.find()
      .populate('createdAdminId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ data: broadcasts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUserStatus,
  deleteUser,
  getJobs,
  closeJob,
  deleteJob,
  getSystemInfo,
  triggerMatchingJob,
  getEmailSettings,
  updateEmailSettings,
  getAuditLogs,
  getAiMonitor,
  retryCvAi,
  retryAllFailedCvAi,
  createBroadcast,
  getBroadcasts,
  resetUserPasswordByAdmin,
};
