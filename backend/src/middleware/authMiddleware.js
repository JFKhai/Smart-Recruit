const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // 1. Ưu tiên đọc từ HTTPOnly Cookie (bảo mật hơn)
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    // 2. Fallback: đọc từ Authorization header (tương thích ngược với Postman / mobile)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Không có quyền truy cập, thiếu token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'Tài khoản không tồn tại' });
        }

        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Không đủ quyền truy cập, token không hợp lệ' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Quyền truy cập của bạn (${req.user.role}) không được phép thực hiện hành động này`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };