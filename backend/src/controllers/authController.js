const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ─── Helper: tạo token và gắn vào HTTPOnly Cookie ─────────────────────────────
const sendTokenCookie = (user, statusCode, res, extraJson = {}) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });

    const cookieOptions = {
        httpOnly: true,                                   // Không cho JS client đọc
        secure: process.env.NODE_ENV === 'production',   // Chỉ HTTPS ở production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Cross-site cookie khi production
        maxAge: 7 * 24 * 60 * 60 * 1000,               // 7 ngày
    };

    // Nếu có COOKIE_DOMAIN (ví dụ: .domain.vn) thì gán để chia sẻ cross-subdomain
    if (process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    res.cookie('token', token, cookieOptions);

    return res.status(statusCode).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        // Không trả token trong body — client dùng cookie
        ...extraJson,
    });
};

// ─── Register ─────────────────────────────────────────────────────────────────
const register = async (req, res) => {
    const { email, password, role } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ message: 'Mật khẩu cần ít nhất 6 ký tự' });
        }

        // ✅ P0: Chặn public register tạo tài khoản admin
        const allowedRoles = ['candidate', 'employer'];
        if (!role || !allowedRoles.includes(role)) {
            return res.status(400).json({ message: 'Vai trò không hợp lệ (chỉ candidate hoặc employer)' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'Email đã tồn tại' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            email,
            password: hashedPassword,
            role
        });

        if (role === 'employer') {
            const CompanyProfile = require('../models/CompanyProfile');
            await CompanyProfile.create({
                userId: user._id,
                companyName: req.body.companyName || '',
                industry: req.body.industry || 'other',
                size: req.body.size || 'startup',
                country: req.body.country || 'Việt Nam',
                province: req.body.province || '',
                address: req.body.address || '',
                about: req.body.about || '',
                contactName: req.body.contactName || '',
                phone: req.body.phone || '',
                taxId: req.body.taxId || ''
            });
        }

        return sendTokenCookie(user, 201, res);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const msgs = Object.values(error.errors || {}).map((e) => e.message);
            return res.status(400).json({ message: msgs.join(' ') || error.message });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email đã tồn tại' });
        }
        res.status(500).json({ message: error.message });
    }
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    const { email, password, role } = req.body;

    try {
        const user = await User.findOne({ email });
        
        // 1. Check if user exists
        if (!user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        // 2. Validate role BEFORE password comparison (prevent timing attacks and CPU load on mismatched portals)
        if (user.role !== 'admin' && role && user.role !== role) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        // 3. Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        return sendTokenCookie(user, 200, res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = (req, res) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: new Date(0), // Đặt thời gian hết hạn trong quá khứ để xóa cookie
    };
    if (process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
    res.cookie('token', '', cookieOptions);
    res.status(200).json({ message: 'Đăng xuất thành công' });
};

// ─── Get Current User ─────────────────────────────────────────────────────────
const getCurrentUser = async (req, res) => {
    res.json({
        _id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        isEmailSubscribed: req.user.isEmailSubscribed,
        status: req.user.status
    });
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────
const googleAuth = (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        // ✅ P0: Tắt mock OAuth khi chạy production
        if (process.env.NODE_ENV === 'production') {
            return res.status(503).json({ message: 'Google OAuth chưa được cấu hình trên server này.' });
        }
        console.warn("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Redirecting to mock callback.");
        const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/google/callback?code=mock_google_code`;
        return res.redirect(callbackUrl);
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=profile%20email`;
    res.redirect(googleAuthUrl);
};

const googleCallback = async (req, res) => {
    const { code } = req.query;
    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

    try {
        let email, name, googleId;

        // ✅ P0: Từ chối mock code trong production
        if (code === 'mock_google_code') {
            if (process.env.NODE_ENV === 'production') {
                return res.redirect(`${clientOrigin}/login?error=oauth_disabled`);
            }
            email = 'candidate_google@demo.com';
            name = 'Demo Google Candidate';
            googleId = 'mock_google_id_123456';
        } else {
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

            const axios = require('axios');

            const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            });

            const { access_token } = tokenRes.data;

            const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            email = profileRes.data.email;
            name = profileRes.data.name || profileRes.data.given_name || 'Ứng viên Google';
            googleId = profileRes.data.sub;
        }

        if (!email) {
            return res.redirect(`${clientOrigin}/login?error=email_required`);
        }

        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
            user = await User.create({
                email,
                googleId,
                role: 'candidate'
            });
        } else if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }

        const CvProfile = require('../models/CvProfile');
        let cv = await CvProfile.findOne({ userId: user._id }).sort({ createdAt: -1 });
        if (!cv) {
            await CvProfile.create({
                userId: user._id,
                fullName: name,
                email: user.email,
                summary: "Hồ sơ được tạo tự động từ liên kết Google.",
                skills: [],
                embedding: [],
                isLookingForJob: true
            });
        }

        // ✅ P0: Gắn token qua cookie, KHÔNG đặt token trên URL
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        };
        if (process.env.COOKIE_DOMAIN) cookieOptions.domain = process.env.COOKIE_DOMAIN;
        res.cookie('token', token, cookieOptions);

        // Redirect về client với thông tin role để frontend biết cần redirect đâu
        const redirectTarget = user.role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
        res.redirect(`${clientOrigin}${redirectTarget}?oauth=success`);
    } catch (error) {
        console.error('Google Auth Error:', error.message);
        res.redirect(`${clientOrigin}/login?error=auth_failed&message=${encodeURIComponent(error.message)}`);
    }
};

// ─── Facebook OAuth ───────────────────────────────────────────────────────────
const facebookAuth = (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
        // ✅ P0: Tắt mock OAuth khi chạy production
        if (process.env.NODE_ENV === 'production') {
            return res.status(503).json({ message: 'Facebook OAuth chưa được cấu hình trên server này.' });
        }
        console.warn("FACEBOOK_APP_ID or FACEBOOK_APP_SECRET is missing. Redirecting to mock callback.");
        const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/facebook/callback?code=mock_facebook_code`;
        return res.redirect(callbackUrl);
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;
    const facebookAuthUrl = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile`;
    res.redirect(facebookAuthUrl);
};

const facebookCallback = async (req, res) => {
    const { code } = req.query;
    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

    try {
        let email, name, facebookId;

        // ✅ P0: Từ chối mock code trong production
        if (code === 'mock_facebook_code') {
            if (process.env.NODE_ENV === 'production') {
                return res.redirect(`${clientOrigin}/login?error=oauth_disabled`);
            }
            email = 'candidate_facebook@demo.com';
            name = 'Demo Facebook Candidate';
            facebookId = 'mock_facebook_id_123456';
        } else {
            const appId = process.env.FACEBOOK_APP_ID;
            const appSecret = process.env.FACEBOOK_APP_SECRET;
            const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;

            const axios = require('axios');

            const tokenRes = await axios.get(`https://graph.facebook.com/v12.0/oauth/access_token`, {
                params: {
                    client_id: appId,
                    client_secret: appSecret,
                    redirect_uri: redirectUri,
                    code
                }
            });

            const { access_token } = tokenRes.data;

            const profileRes = await axios.get(`https://graph.facebook.com/me`, {
                params: {
                    fields: 'id,name,email',
                    access_token
                }
            });

            email = profileRes.data.email;
            name = profileRes.data.name || 'Ứng viên Facebook';
            facebookId = profileRes.data.id;
        }

        if (!email) {
            email = `fb_${facebookId}@facebook.com`;
        }

        let user = await User.findOne({ $or: [{ facebookId }, { email }] });

        if (!user) {
            user = await User.create({
                email,
                facebookId,
                role: 'candidate'
            });
        } else if (!user.facebookId) {
            user.facebookId = facebookId;
            await user.save();
        }

        const CvProfile = require('../models/CvProfile');
        let cv = await CvProfile.findOne({ userId: user._id }).sort({ createdAt: -1 });
        if (!cv) {
            await CvProfile.create({
                userId: user._id,
                fullName: name,
                email: user.email,
                summary: "Hồ sơ được tạo tự động từ liên kết Facebook.",
                skills: [],
                embedding: [],
                isLookingForJob: true
            });
        }

        // ✅ P0: Gắn token qua cookie, KHÔNG đặt token trên URL
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        };
        if (process.env.COOKIE_DOMAIN) cookieOptions.domain = process.env.COOKIE_DOMAIN;
        res.cookie('token', token, cookieOptions);

        const redirectTarget = user.role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
        res.redirect(`${clientOrigin}${redirectTarget}?oauth=success`);
    } catch (error) {
        console.error('Facebook Auth Error:', error.message);
        res.redirect(`${clientOrigin}/login?error=auth_failed&message=${encodeURIComponent(error.message)}`);
    }
};

module.exports = {
    register,
    login,
    logout,
    getCurrentUser,
    googleAuth,
    googleCallback,
    facebookAuth,
    facebookCallback
};