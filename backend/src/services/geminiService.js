const { GoogleGenerativeAI } = require("@google/generative-ai");

// Danh sách model ưu tiên: nếu model đầu bị quá tải/404 sẽ thử model tiếp theo.
// gemini-1.5-flash / gemini-2.0-flash đã shutdown (2026) → dùng Gemini 3.x Flash.
const MODEL_CHAIN = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];

const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error) => {
  const msg = (error?.message || "").toLowerCase();
  if (
    msg.includes("quota") ||
    msg.includes("billing") ||
    msg.includes("limit: 0") ||
    msg.includes("exceeded your current quota")
  ) {
    return false;
  }

  // Lỗi tạm thời thực sự (server quá tải / mạng) -> nên thử lại.
  return (
    msg.includes("503") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("service unavailable") ||
    msg.includes("fetch failed") ||
    msg.includes("etimedout")
  );
};

const extractCvData = async (text) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "dummy_key_if_not_set") {
    console.warn("Chưa cấu hình GEMINI_API_KEY, bỏ qua trích xuất thông tin tự động.");
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `
Bạn là một chuyên gia nhân sự và hệ thống AI thông minh.
Dưới đây là nội dung văn bản thô được trích xuất từ một CV (Sơ yếu lý lịch) của ứng viên:
"""
${text}
"""

Nhiệm vụ của bạn là trích xuất các thông tin chính và trả về DUY NHẤT một chuỗi JSON hợp lệ với cấu trúc sau:
{
  "fullName": "Họ và tên ứng viên",
  "headline": "Vị trí / Tiêu đề nghề nghiệp (Ví dụ: Full Stack Developer)",
  "email": "Địa chỉ email",
  "phone": "Số điện thoại",
  "location": "Thành phố, Quốc gia (Ví dụ: Đà Nẵng, Việt Nam)",
  "address": "Địa chỉ cụ thể (Ví dụ: Quận 7, Đà Nẵng)",
  "dateOfBirth": "Ngày sinh (Định dạng mm/dd/yyyy hoặc giữ nguyên gốc)",
  "website": "Website cá nhân hoặc link LinkedIn / GitHub",
  "summary": "Đoạn giới thiệu bản thân hoặc mục tiêu nghề nghiệp (khoảng 2-3 câu)",
  "skills": ["Kỹ năng 1", "Kỹ năng 2", ...],
  "certifications": "Các chứng chỉ đạt được (liệt kê dạng chuỗi cách nhau dấu phẩy hoặc \\n)",
  "experience": [
    {
      "company": "Tên công ty",
      "position": "Vị trí công việc",
      "description": "Mô tả ngắn gọn công việc",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD"
    }
  ],
  "education": [
    {
      "school": "Tên trường",
      "major": "Chuyên ngành",
      "gpa": "Điểm trung bình (nếu có)"
    }
  ]
}

YÊU CẦU QUAN TRỌNG (Fallback):
- GIỮ NGUYÊN NGÔN NGỮ GỐC của CV (Nếu CV tiếng Anh thì trích xuất ra tiếng Anh, nếu tiếng Việt thì ra tiếng Việt). KHÔNG tự ý dịch thuật sang ngôn ngữ khác.
- Nếu KHÔNG TÌM THẤY thông tin nào đó (ví dụ không thấy phone, hoặc không có kinh nghiệm), hãy trả về null (đối với chuỗi) hoặc mảng rỗng [] (đối với mảng).
- TUYỆT ĐỐI KHÔNG TỰ BỊA RA THÔNG TIN hoặc thêm dữ liệu giả.
- Trả về ĐÚNG định dạng JSON, không có markdown block \`\`\`json ở đầu hay cuối.
`;

  // Thử lần lượt từng model; mỗi model retry vài lần khi gặp lỗi tạm thời.
  for (const modelName of MODEL_CHAIN) {
    const model = genAI.getGenerativeModel({ model: modelName });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up potential markdown JSON wrapping
        let cleanJsonStr = responseText.trim();
        if (cleanJsonStr.startsWith('```json')) {
          cleanJsonStr = cleanJsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (cleanJsonStr.startsWith('```')) {
          cleanJsonStr = cleanJsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const parsedData = JSON.parse(cleanJsonStr);
        if (attempt > 1 || modelName !== MODEL_CHAIN[0]) {
          console.log(`✅ Gemini trích xuất thành công với model "${modelName}" (lần thử ${attempt}).`);
        }
        return parsedData;
      } catch (error) {
        const msg = error?.message || "";
        console.error(`Lỗi Gemini [model: ${modelName}, lần thử ${attempt}/${MAX_RETRIES}]:`, msg);

        // 404: model không tồn tại / không có quyền -> chuyển sang model kế tiếp luôn.
        if (msg.includes("404")) {
          console.error(`-> Model "${modelName}" không khả dụng (404), chuyển sang model khác.`);
          break;
        }

        // Lỗi tạm thời (503/429/quá tải): chờ rồi thử lại (backoff: 1s, 2s, 4s).
        if (isRetryable(error) && attempt < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.warn(`-> Gemini đang quá tải, thử lại sau ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        // Lỗi không retry được (vd API key sai) hoặc đã hết lượt -> bỏ model này.
        break;
      }
    }
  }

  console.error("Gemini trích xuất THẤT BẠI sau khi thử mọi model. CV vẫn được lưu (cần điền tay).");
  return null;
};

module.exports = { extractCvData };
