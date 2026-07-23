const User = require('../models/User');
const Notification = require('../models/Notification');
const SystemBroadcast = require('../models/SystemBroadcast');
const emailService = require('./emailService');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute broadcast delivery in the background without blocking Express API thread.
 */
const processBroadcastAsync = async (broadcastId) => {
  console.log(`[BroadcastWorker] Bắt đầu phát thông báo ngầm ID: ${broadcastId}`);
  try {
    const broadcast = await SystemBroadcast.findById(broadcastId);
    if (!broadcast) return;

    // Determine target filter query
    const userFilter = {};
    if (broadcast.targetGroup === 'candidates') {
      userFilter.role = 'candidate';
    } else if (broadcast.targetGroup === 'employers') {
      userFilter.role = 'employer';
    }

    const totalTargets = await User.countDocuments(userFilter);
    broadcast.stats.totalTargets = totalTargets;
    await broadcast.save();

    if (totalTargets === 0) {
      broadcast.status = 'completed';
      broadcast.completedAt = new Date();
      await broadcast.save();
      return;
    }

    let sentCount = 0;
    let failCount = 0;
    const CHUNK_SIZE = 50;

    // Stream targeted users in chunks using cursor
    const cursor = User.find(userFilter).select('_id email fullName').cursor();
    let chunk = [];

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      chunk.push(doc);

      if (chunk.length >= CHUNK_SIZE) {
        const result = await processChunk(chunk, broadcast);
        sentCount += result.sent;
        failCount += result.failed;
        chunk = [];

        // Update progress in DB
        await SystemBroadcast.findByIdAndUpdate(broadcastId, {
          'stats.sentCount': sentCount,
          'stats.failCount': failCount,
        });

        // Throttle 300ms between chunks to respect rate limits
        await sleep(300);
      }
    }

    // Process remaining users in last chunk
    if (chunk.length > 0) {
      const result = await processChunk(chunk, broadcast);
      sentCount += result.sent;
      failCount += result.failed;
    }

    // Finalize broadcast status
    broadcast.status = 'completed';
    broadcast.completedAt = new Date();
    broadcast.stats.sentCount = sentCount;
    broadcast.stats.failCount = failCount;
    await broadcast.save();

    console.log(`[BroadcastWorker] ✅ Hoàn tất phát thông báo (Gửi thành công: ${sentCount}, Thất bại: ${failCount})`);
  } catch (error) {
    console.error(`[BroadcastWorker] ❌ Lỗi khi phát thông báo ID ${broadcastId}:`, error.message);
    await SystemBroadcast.findByIdAndUpdate(broadcastId, {
      status: 'failed',
    });
  }
};

/**
 * Process a chunk of 50 users (In-App notifications bulk insert + Resend emails)
 */
async function processChunk(users, broadcast) {
  let sent = 0;
  let failed = 0;

  // 1. Bulk In-App Notifications
  if (broadcast.sendInApp) {
    try {
      const notifications = users.map((u) => ({
        userId: u._id,
        title: broadcast.title,
        message: broadcast.message,
        type: 'system',
        isRead: false,
      }));
      await Notification.insertMany(notifications, { ordered: false });
    } catch (err) {
      console.error('[BroadcastWorker] In-app notification bulk insert error:', err.message);
    }
  }

  // 2. Email Delivery (Promises with settled handling)
  if (broadcast.sendEmail) {
    const emailPromises = users.map(async (user) => {
      try {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
            <h2 style="color: #6d28d9;">📢 Thông báo từ Hệ thống Smart Recruit</h2>
            <p style="font-size: 16px; font-weight: bold; color: #111;">${broadcast.title}</p>
            <div style="background-color: #f5f3ff; padding: 15px; border-left: 4px solid #7c3aed; margin: 20px 0; color: #333; line-height: 1.6;">
              ${broadcast.message.replace(/\n/g, '<br/>')}
            </div>
            <p style="font-size: 13px; color: #666;">Cảm ơn bạn đã đồng hành cùng Smart Recruit!</p>
          </div>
        `;
        await emailService.sendEmail({
          to: user.email,
          subject: `[Smart Recruit] ${broadcast.title}`,
          html: htmlContent,
        });
        return true;
      } catch {
        return false;
      }
    });

    const results = await Promise.allSettled(emailPromises);
    results.forEach((res) => {
      if (res.status === 'fulfilled' && res.value === true) {
        sent++;
      } else {
        failed++;
      }
    });
  } else {
    sent += users.length;
  }

  return { sent, failed };
}

module.exports = { processBroadcastAsync };
