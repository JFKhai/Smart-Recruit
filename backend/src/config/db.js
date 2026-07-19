const mongoose = require('mongoose');
const dns = require('dns');

// Fix lỗi querySrv ECONNREFUSED trên một số mạng ISP/VPN tại Việt Nam
// Ưu tiên IPv4 cho DNS lookup thay vì IPv6
dns.setDefaultResultOrder('ipv4first');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000, // Timeout sau 10s nếu không kết nối được
            socketTimeoutMS: 45000,
            family: 4, // Dùng IPv4, tránh lỗi với IPv6 trên một số mạng
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
