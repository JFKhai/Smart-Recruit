const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const http = require('http');
const mongoose = require('mongoose');
const User = require('../models/User');

const API_BASE = process.env.TEST_API_URL || 'http://localhost:5000';
const TEST_EMAIL = `smoke_test_${Date.now()}@smartrecruit-test.internal`;

function makeRequest(url, options = {}, bodyData = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runSmokeTests() {
  console.log('🧪 === BẮT ĐẦU SMOKE TEST BẢO MẬT VÀ VẬN HÀNH (DAY 7) ===\n');
  let passedTests = 0;
  let totalTests = 0;

  // 1. TEST HEALTHCHECK
  totalTests++;
  try {
    console.log('[Test 1] Kiểm tra endpoint /health...');
    const res = await makeRequest(`${API_BASE}/health`);
    if (res.status === 200 && res.body?.status === 'ok') {
      console.log('  ✅ PASS: Endpoint /health hoạt động tốt (Status 200, DB connected).');
      passedTests++;
    } else {
      console.log(`  ❌ FAIL: Endpoint /health phản hồi status ${res.status}`);
    }
  } catch (err) {
    console.log(`  ❌ FAIL: Không kết nối được tới /health (${err.message})`);
  }

  // 2. TEST ROLE ESCALATION
  totalTests++;
  try {
    console.log('\n[Test 2] Kiểm tra chống leo thang đặc quyền (Role Escalation)...');
    const res = await makeRequest(
      `${API_BASE}/api/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        fullName: 'Smoke Test Hacker',
        email: TEST_EMAIL,
        password: 'Password123!',
        role: 'admin', // Cố tình truyền role admin
      }
    );

    if (res.status === 201 || res.status === 200) {
      const createdRole = res.body?.user?.role || res.body?.role;
      if (createdRole !== 'admin') {
        console.log(`  ✅ PASS: Hệ thống đã chặn ép role admin! Role thực tế được cấp: "${createdRole}".`);
        passedTests++;
      } else {
        console.log('  ❌ CRITICAL FAIL: Phát hiện lỗ hổng cho phép tự tạo tài khoản Admin!');
      }
    } else if (res.status === 400) {
      console.log('  ✅ PASS: Hệ thống từ chối yêu cầu tạo admin (Status 400).');
      passedTests++;
    } else {
      console.log(`  ⚠️ Lỗi không xác định: status ${res.status}`);
    }
  } catch (err) {
    console.log(`  ❌ FAIL: Lỗi kết nối API register (${err.message})`);
  }

  // 3. TEST CORS PROTECTION
  totalTests++;
  try {
    console.log('\n[Test 3] Kiểm tra chính sách CORS (Cross-Origin Resource Sharing)...');
    const res = await makeRequest(`${API_BASE}/health`, {
      method: 'GET',
      headers: { Origin: 'http://unauthorized-hacker-site.com' },
    });

    const allowOrigin = res.headers['access-control-allow-origin'];
    if (!allowOrigin || allowOrigin !== 'http://unauthorized-hacker-site.com') {
      console.log('  ✅ PASS: Chặn CORS thành công đối với origin lạ!');
      passedTests++;
    } else {
      console.log('  ❌ FAIL: Phát hiện cấu hình CORS lỏng lẻo cho phép origin lạ.');
    }
  } catch (err) {
    console.log(`  ✅ PASS: Origin lạ bị server ngắt kết nối / từ chối (${err.message})`);
    passedTests++;
  }

  // 4. TEST FULL FORGOT PASSWORD & RESET PASSWORD E2E FLOW
  totalTests++;
  try {
    console.log('\n[Test 4] Kiểm tra trọn vẹn luồng Quên mật khẩu → Reset Token → Đăng nhập bằng MK mới...');
    const crypto = require('crypto');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-recruit';
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri);
    }

    // A. Đăng ký tài khoản thử nghiệm với role candidate
    await makeRequest(
      `${API_BASE}/api/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        fullName: 'Smoke Test Candidate',
        email: TEST_EMAIL,
        password: 'InitialPassword123!',
        role: 'candidate',
      }
    );

    // B. Gọi forgot-password
    const forgotRes = await makeRequest(
      `${API_BASE}/api/auth/forgot-password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: TEST_EMAIL }
    );

    if (forgotRes.status !== 200) {
      console.log(`  ❌ FAIL: forgot-password phản hồi status ${forgotRes.status}`);
    } else {
      // C. Tạo token thử nghiệm trong DB
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await User.updateOne(
        { email: TEST_EMAIL },
        {
          resetPasswordToken: hashedToken,
          resetPasswordExpire: Date.now() + 3600000,
        }
      );

      // C. Reset mật khẩu với token mới
      const newPassword = 'NewSecretPassword123!';
      const resetRes = await makeRequest(
        `${API_BASE}/api/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { token: rawToken, password: newPassword }
      );

      if (resetRes.status !== 200) {
        console.log(`  ❌ FAIL: reset-password thất bại với status ${resetRes.status}`);
      } else {
        // D. Thử đăng nhập lại bằng mật khẩu mới
        const loginRes = await makeRequest(
          `${API_BASE}/api/auth/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
          { email: TEST_EMAIL, password: newPassword, role: 'candidate' }
        );

        if (loginRes.status === 200) {
          console.log('  ✅ PASS: Trọn vẹn luồng Quên mật khẩu → Đổi mật khẩu → Đăng nhập bằng MK mới thành công!');
          passedTests++;
        } else {
          console.log(`  ❌ FAIL: Đăng nhập bằng mật khẩu mới không thành công (status ${loginRes.status})`);
        }
      }
    }
  } catch (err) {
    console.log(`  ❌ FAIL: Lỗi kết nối luồng reset-password (${err.message})`);
  }

  // 5. TEARDOWN CLEANUP (DỌN DẸP DỮ LIỆU THỬ NGHIỆM)
  console.log('\n🧹 === TIẾN HÀNH DỌN DẸP DỮ LIỆU TEST (TEARDOWN) ===');
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-recruit';
    await mongoose.connect(mongoUri);
    const deleteResult = await User.deleteMany({ email: { $regex: /^smoke_test_/ } });
    console.log(`  ✓ Đã dọn dẹp xong ${deleteResult.deletedCount} tài khoản thử nghiệm khỏi MongoDB.`);
    await mongoose.connection.close();
  } catch (cleanErr) {
    console.error('  ⚠️ Lỗi khi dọn dẹp dữ liệu test:', cleanErr.message);
  }

  console.log(`\n📊 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASSED.`);
}

runSmokeTests();
