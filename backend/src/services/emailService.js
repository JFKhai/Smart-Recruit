const nodemailer = require('nodemailer');

let transporter = null;


const initTransporter = async () => {
  if (transporter) return transporter;

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[Email Service] WARNING: RESEND_API_KEY is not set. Emails will not send.');
    }

    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend', 
        pass: apiKey, 
      },
    });

    console.log('[Email Service] Resend SMTP Transporter initialized successfully.');
    return transporter;
  } catch (error) {
    console.error('[Email Service] Error initializing Resend SMTP Transporter:', error);
    return null;
  }
};

const sendJobMatchEmail = async (user, matchedJobs) => {
  try {
    const t = await initTransporter();
    if (!t) throw new Error('Transporter not ready');

    if (!matchedJobs || matchedJobs.length === 0) return;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const sender = process.env.SENDER_EMAIL || 'Smart Recruit <onboarding@resend.dev>';

    const jobsHtml = matchedJobs.map(job => `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #f8fafc;">
        <h3 style="margin-top: 0; color: #1e40af; font-size: 18px;">${job.title}</h3>
        <p style="margin: 4px 0; color: #475569;"><strong>Công ty:</strong> ${job.companyName || 'Công ty bảo mật'}</p>
        <p style="margin: 4px 0; color: #475569;"><strong>Địa điểm:</strong> ${job.location || 'Chưa cập nhật'}</p>
        <p style="margin: 8px 0 0 0;">
          <span style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 14px;">
            Độ phù hợp (AI): ${job.previewScore}%
          </span>
        </p>
        <div style="margin-top: 16px;">
          <a href="${frontendUrl}/candidate/matches" style="background-color: #2563eb; color: #ffffff; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: 500;">Xem chi tiết & Ứng tuyển</a>
        </div>
      </div>
    `).join('');

    const mailOptions = {
      from: sender,
      to: user.email,
      subject: `[Smart Recruit] Có ${matchedJobs.length} việc làm mới siêu phù hợp với bạn! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #2563eb; margin: 0;">Smart Recruit</h1>
            <p style="color: #64748b; margin-top: 5px;">Hệ thống tuyển dụng thông minh AI</p>
          </div>
          
          <div style="padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="margin-top: 0;">Chào ${user.fullName || 'bạn'},</h2>
            <p>Hệ thống AI của chúng tôi vừa quét và phát hiện có <strong>${matchedJobs.length}</strong> công việc mới rất phù hợp với kỹ năng và kinh nghiệm trong CV của bạn.</p>
            <p style="color: #475569; font-size: 14px; background-color: #f1f5f9; padding: 10px; border-radius: 6px; border-left: 4px solid #3b82f6;">
              💡 <em>Độ phù hợp (AI) được tính dựa trên CV chính của bạn: <strong>${user.fullName}</strong>.</em>
            </p>
            <p>Dưới đây là danh sách gợi ý dành riêng cho bạn:</p>
            
            <div style="margin-top: 24px;">
              ${jobsHtml}
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 13px; color: #94a3b8; text-align: center;">
              Bạn nhận được email này vì đã bật tính năng "Nhận email gợi ý việc làm AI".<br/>
              Để thay đổi tần suất hoặc tắt thông báo, vui lòng truy cập <a href="${frontendUrl}/candidate/email-settings" style="color: #2563eb;">Cài đặt thông báo</a>.
            </p>
          </div>
        </div>
      `,
    };

    const info = await t.sendMail(mailOptions);
    console.log(`[Email Service] Đã gửi thông báo cho ${user.email} (MessageID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`[Email Service] Lỗi gửi email cho ${user.email}:`, error);
  }
};

const sendJobAlertEmail = async (target, alert, matchedJobs) => {
  try {
    const t = await initTransporter();
    if (!t) throw new Error('Transporter not ready');
    if (!matchedJobs || matchedJobs.length === 0) return;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const sender = process.env.SENDER_EMAIL || 'Smart Recruit <onboarding@resend.dev>';

    const jobsHtml = matchedJobs
      .map((job) => {
        const tags = (job.matchedBy || [])
          .map(
            (m) =>
              `<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;padding:2px 10px;border-radius:999px;font-size:12px;margin:2px 4px 2px 0;">✓ ${m}</span>`
          )
          .join('');
        return `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;background:#f8fafc;">
        <h3 style="margin:0 0 6px;color:#1e40af;font-size:18px;">${job.title}</h3>
        <p style="margin:4px 0;color:#475569;"><strong>Công ty:</strong> ${job.companyName || 'Đang cập nhật'}</p>
        <p style="margin:4px 0;color:#475569;"><strong>Địa điểm:</strong> ${job.location || 'Đang cập nhật'}</p>
        ${job.salary ? `<p style="margin:4px 0;color:#475569;"><strong>Mức lương:</strong> ${job.salary}</p>` : ''}
        <div style="margin:8px 0;">${tags}</div>
        <p style="margin:8px 0 0;">
          <span style="display:inline-block;background:#dcfce7;color:#166534;padding:4px 12px;border-radius:999px;font-weight:bold;font-size:14px;">
            Độ phù hợp: ${job.finalScore}%
          </span>
        </p>
        <div style="margin-top:16px;">
          <a href="${frontendUrl}/candidate/jobs/${job.id}" style="background:#2563eb;color:#fff;padding:8px 16px;text-decoration:none;border-radius:6px;font-weight:500;">Xem chi tiết & Ứng tuyển</a>
        </div>
      </div>`;
      })
      .join('');

    const criteria = [
      `Từ khoá: <strong>${alert.keyword}</strong>`,
      alert.location ? `Địa điểm: <strong>${alert.location}</strong>` : 'Địa điểm: <strong>Tất cả</strong>',
    ].join(' &nbsp;•&nbsp; ');

    const mailOptions = {
      from: sender,
      to: target.email,
      subject: `[Smart Recruit] ${matchedJobs.length} việc làm mới khớp thông báo "${alert.keyword}" 🔔`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
          <div style="text-align:center;padding:20px 0;">
            <h1 style="color:#2563eb;margin:0;">Smart Recruit</h1>
            <p style="color:#64748b;margin-top:5px;">Hệ thống tuyển dụng thông minh AI</p>
          </div>
          <div style="padding:20px;background:#fff;border-radius:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);">
            <h2 style="margin-top:0;">Chào ${target.fullName || 'bạn'},</h2>
            <p>Có <strong>${matchedJobs.length}</strong> việc làm mới khớp với thông báo việc làm bạn đã tạo:</p>
            <p style="color:#475569;font-size:14px;background:#f1f5f9;padding:10px;border-radius:6px;border-left:4px solid #3b82f6;">
              🔎 ${criteria}
            </p>
            <div style="margin-top:24px;">${jobsHtml}</div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
            <p style="font-size:13px;color:#94a3b8;text-align:center;">
              Bạn nhận email này vì đã tạo thông báo việc làm trên Smart Recruit.<br/>
              Quản lý hoặc tắt thông báo tại <a href="${frontendUrl}/candidate/job-alerts" style="color:#2563eb;">Thông báo việc làm</a>.
            </p>
          </div>
        </div>`,
    };

    const info = await t.sendMail(mailOptions);
    console.log(`[Email Service] Đã gửi thông báo việc làm cho ${target.email} (keyword: ${alert.keyword}) (MessageID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`[Email Service] Lỗi gửi job-alert email cho ${target?.email}:`, error);
  }
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    const t = await initTransporter();
    if (!t) throw new Error('Transporter not ready');

    const sender = process.env.SENDER_EMAIL || 'Smart Recruit <onboarding@resend.dev>';
    const mailOptions = {
      from: sender,
      to,
      subject,
      html,
    };

    const info = await t.sendMail(mailOptions);
    console.log(`[Email Service] Đã gửi email thành công tới ${to} (MessageID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`[Email Service] Lỗi gửi email tới ${to}:`, error.message);
    throw error;
  }
};

const sendPasswordResetEmail = async ({ to, fullName, resetUrl }) => {
  const subject = '[Smart Recruit] Yêu cầu Đặt lại Mật khẩu';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px;">
        <h1 style="color: #6d28d9; margin: 0;">Smart Recruit</h1>
        <p style="color: #64748b; margin-top: 4px; font-size: 14px;">Hệ thống Tuyển dụng Thông minh AI</p>
      </div>
      
      <div style="padding: 20px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #7c3aed;">
        <h2 style="margin-top: 0; color: #1e1b4b; font-size: 18px;">🔑 Yêu cầu Đặt lại Mật khẩu</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Xin chào <strong>${fullName || to}</strong>,<br/>
          Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại Smart Recruit.
        </p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3);">
            Đặt lại Mật khẩu Ngay
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          ⚠️ <em>Đường dẫn này có hiệu lực trong vòng <strong>60 phút</strong>. Nếu bạn không đưa ra yêu cầu này, vui lòng bỏ qua email và mật khẩu của bạn vẫn an toàn.</em>
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        © Smart Recruit System · Hỗ trợ bảo mật tài khoản tự động
      </p>
    </div>
  `;

  return sendEmail({ to, subject, html });
};

module.exports = {
  sendJobMatchEmail,
  sendJobAlertEmail,
  sendEmail,
  sendPasswordResetEmail,
};
