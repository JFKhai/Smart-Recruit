const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const fs = require('fs');

// Import all models to ensure schemas are registered
const User = require('../models/User');
const Job = require('../models/Job');
const CvProfile = require('../models/CvProfile');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const SystemSetting = require('../models/SystemSetting');
const CompanyProfile = require('../models/CompanyProfile');
const JobAlert = require('../models/JobAlert');
const CompanyReview = require('../models/CompanyReview');

const modelsMap = {
  users: User,
  jobs: Job,
  cvprofiles: CvProfile,
  applications: Application,
  notifications: Notification,
  systemsettings: SystemSetting,
  companyprofiles: CompanyProfile,
  jobalerts: JobAlert,
  companyreviews: CompanyReview,
};

// Helper: Recursively convert BSON-like strings back to Mongoose ObjectId and Date types during restore
function recastBsonTypes(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => recastBsonTypes(item));
  }

  const newObj = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === 'object' && val.$oid) {
      newObj[key] = new mongoose.Types.ObjectId(val.$oid);
    } else if (val && typeof val === 'object' && val.$date) {
      newObj[key] = new Date(val.$date);
    } else if (typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val) && (key === '_id' || key.endsWith('Id') || key === 'userId' || key === 'employerId' || key === 'candidateId' || key === 'jobId')) {
      newObj[key] = new mongoose.Types.ObjectId(val);
    } else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val) && (key.endsWith('At') || key === 'date')) {
      newObj[key] = new Date(val);
    } else if (typeof val === 'object' && val !== null) {
      newObj[key] = recastBsonTypes(val);
    } else {
      newObj[key] = val;
    }
  }
  return newObj;
}

// Helper: Convert Mongoose lean docs to BSON Extended JSON format during backup
function formatBsonExport(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  if (Array.isArray(doc)) return doc.map(formatBsonExport);

  const formatted = {};
  for (const [key, val] of Object.entries(doc)) {
    if (val instanceof mongoose.Types.ObjectId) {
      formatted[key] = { $oid: val.toString() };
    } else if (val instanceof Date) {
      formatted[key] = { $date: val.toISOString() };
    } else if (val && typeof val === 'object') {
      formatted[key] = formatBsonExport(val);
    } else {
      formatted[key] = val;
    }
  }
  return formatted;
}

async function main() {
  const args = process.argv.slice(2).reduce((acc, arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=');
    acc[k] = v || true;
    return acc;
  }, {});

  const action = args.action; // 'backup' or 'restore'
  const filePath = args.out || args.in || path.join(__dirname, '../../backups/smart_recruit_backup.json');

  if (!action || !['backup', 'restore'].includes(action)) {
    console.error('❌ Vui lòng chỉ định --action=backup hoặc --action=restore');
    console.log('Ví dụ: node src/scripts/dbBackup.js --action=backup --out=./backups/backup.json');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-recruit';
  console.log(`[DB Backup] Đang kết nối tới MongoDB: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);
  await mongoose.connect(mongoUri);

  try {
    if (action === 'backup') {
      console.log('📦 Bắt đầu tiến trình SAO LƯU (Backup)...');
      const backupData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0',
        },
        collections: {},
      };

      for (const [name, model] of Object.entries(modelsMap)) {
        const rawDocs = await model.find().lean();
        backupData.collections[name] = formatBsonExport(rawDocs);
        console.log(`  ✓ Đã sao lưu collection [${name}]: ${rawDocs.length} bản ghi.`);
      }

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
      console.log(`✅ Sao lưu dữ liệu thành công! File lưu tại: ${filePath}`);

    } else if (action === 'restore') {
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Không tìm thấy file sao lưu tại: ${filePath}`);
        process.exit(1);
      }

      console.log(`♻️ Bắt đầu tiến trình KHÔI PHỤC (Restore) từ file: ${filePath}...`);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const backupData = JSON.parse(fileContent);

      if (!backupData.collections) {
        console.error('❌ Định dạng file sao lưu không hợp lệ.');
        process.exit(1);
      }

      for (const [name, model] of Object.entries(modelsMap)) {
        const rawDocs = backupData.collections[name] || [];
        const processedDocs = recastBsonTypes(rawDocs);

        // Clear existing collection and re-insert
        await model.deleteMany({});
        if (processedDocs.length > 0) {
          await model.insertMany(processedDocs);
        }
        console.log(`  ✓ Đã khôi phục collection [${name}]: ${processedDocs.length} bản ghi BSON-safe.`);
      }

      console.log('✅ Khôi phục dữ liệu MongoDB thành công!');
    }
  } catch (err) {
    console.error('❌ Thao tác thất bại:', err);
  } finally {
    await mongoose.connection.close();
    console.log('[DB Backup] Đã đóng kết nối database.');
  }
}

main();
