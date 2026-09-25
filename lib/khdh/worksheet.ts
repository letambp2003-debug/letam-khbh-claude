import { callAi, extractJsonFromText } from '@/lib/ai/provider';
import type { WorksheetPackage, AiProvider } from '@/types/extended';

export const WORKSHEET_SYSTEM_PROMPT = `Bạn là Chuyên gia Phương pháp Dạy học THCS & THPT chuẩn Chương trình GDPT 2018 (Công văn 5512).
Nhiệm vụ của bạn là thiết kế HỆ THỐNG PHIẾU HỌC TẬP (WORKSHEETS) đồng bộ với Kế hoạch bài dạy (KHDH).

QUY TẮC THIẾT KẾ PHIẾU HỌC TẬP:
1. Mỗi bài học tạo 2 đến 3 phiếu học tập:
   - Phiếu 1: Khám phá / Hình thành kiến thức (câu hỏi gợi mở, bảng điền khuyết, quan sát hình ảnh/thí nghiệm).
   - Phiếu 2: Luyện tập / Bài tập nhóm (bài tập rèn kỹ năng, giải toán, xử lý tình huống).
   - Phiếu 3: Vận dụng / Mở rộng thực tế (liên hệ đời sống, bài toán thực tiễn, dự án nhỏ).
2. Công thức Toán học, Vật lý, Hóa học: Luôn bọc trong ký hiệu LaTeX chuẩn: $...$ (trong dòng) hoặc $$...$$ (khối tách dòng).
3. Đầy đủ thành phần sư phạm: Tiêu đề phiếu, Năng lực hướng đến, Chế độ làm việc (cá nhân/nhóm), Các nhiệm vụ (instructions, questionContent, answerSpaceType, suggestedAnswer, score), Thang điểm/Rubric đánh giá.
4. Trả về ĐÚNG MỘ KHỐI JSON hợp lệ (không kèm lời chào hay giải thích ngoài JSON).

CẤU TRÚC JSON BẮT BUỘC:
{
  "lessonTitle": "...",
  "subject": "...",
  "grade": "...",
  "sheets": [
    {
      "id": "sheet-1",
      "sheetNumber": 1,
      "title": "PHIẾU HỌC TẬP SỐ 1: ...",
      "activityTarget": "Hoạt động 2: Hình thành kiến thức",
      "targetCompetency": "...",
      "groupMode": "pair",
      "tasks": [
        {
          "id": "task-1-1",
          "orderNumber": 1,
          "title": "Nhiệm vụ 1: ...",
          "instructions": "...",
          "questionContent": "...",
          "answerSpaceType": "lines",
          "suggestedAnswer": "...",
          "score": 4
        }
      ],
      "rubric": [
        {
          "criteria": "Tính chính xác",
          "excellent": "Đúng 100%...",
          "good": "Đúng trên 70%...",
          "needsImprovement": "Dưới 50%..."
        }
      ],
      "teacherNotes": "Lưu ý khi hướng dẫn học sinh..."
    }
  ]
}`;

export async function generateWorksheets(params: {
  subject: string;
  grade: string;
  lessonTitle: string;
  requirement: string;
  durationPeriods?: number;
  provider?: AiProvider;
  customApiKey?: string;
  teachingMethod?: string;
}): Promise<WorksheetPackage> {
  const userPrompt = `Hãy thiết kế Hệ thống Phiếu học tập chuẩn GDPT 2018 cho bài học sau:
- Môn học: ${params.subject}
- Khối lớp: Lớp ${params.grade}
- Tên bài học: ${params.lessonTitle}
- Thời lượng: ${params.durationPeriods ?? 1} tiết
- Yêu cầu cần đạt (YCCĐ): ${params.requirement}
${params.teachingMethod ? `- Phương pháp áp dụng: ${params.teachingMethod}` : ''}

Yêu cầu: Thiết kế 3 phiếu học tập (Khám phá kiến thức, Luyện tập, Vận dụng thực tế) chi tiết, có câu hỏi bài tập hay, gợi ý đáp án đầy đủ và rubric chấm điểm. Trả về JSON theo đúng định dạng.`;

  const responseText = await callAi({
    prompt: userPrompt,
    systemPrompt: WORKSHEET_SYSTEM_PROMPT,
    provider: params.provider,
    customApiKey: params.customApiKey,
    maxTokens: 8000,
    temperature: 0.4
  });

  const jsonText = extractJsonFromText(responseText);
  let parsed: WorksheetPackage;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse Worksheet JSON:', jsonText);
    throw new Error('AI trả về dữ liệu Phiếu học tập không đúng định dạng JSON. Vui lòng thử lại.');
  }

  return parsed;
}
