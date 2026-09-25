import { callAi, extractJsonFromText } from '@/lib/ai/provider';
import type { QuizPackage, AiProvider } from '@/types/extended';

export const QUIZ_SYSTEM_PROMPT = `Bạn là Chuyên gia Khảo thí và Kiểm tra đánh giá học sinh chuẩn GDPT 2018.
Nhiệm vụ của bạn là xây dựng NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM & TRÒ CHƠI HỌC TẬP TƯƠNG TÁC bám sát Yêu cầu cần đạt.

QUY TẮC THIẾT KẾ CÂU HỎI:
1. Tạo 8 - 10 câu hỏi phân bổ đủ 4 mức độ tư duy:
   - Nhận biết (3 câu)
   - Thông hiểu (3 câu)
   - Vận dụng (2 câu)
   - Vận dụng cao (1-2 câu)
2. Mỗi câu hỏi gồm đúng 4 lựa chọn [A, B, C, D] rõ ràng, không mập mờ, chỉ có DUY NHẤT 1 đáp án đúng.
3. correctIndex: 0 cho A, 1 cho B, 2 cho C, 3 cho D.
4. Công thức toán/khoa học luôn viết bằng LaTeX: $...$ hoặc $$...$$.
5. Có phần giải thích chi tiết, sư phạm, giúp học sinh hiểu sâu vì sao chọn đáp án đó.
6. Trả về ĐÚNG MỘ KHỐI JSON hợp lệ (không kèm văn bản ngoài JSON).

CẤU TRÚC JSON:
{
  "lessonTitle": "...",
  "questions": [
    {
      "id": "q1",
      "level": "Nhận biết",
      "question": "Nội dung câu hỏi số 1...",
      "options": [
        "Lựa chọn A...",
        "Lựa chọn B...",
        "Lựa chọn C...",
        "Lựa chọn D..."
      ],
      "correctIndex": 0,
      "explanation": "Giải thích chi tiết vì sao A đúng...",
      "points": 10
    }
  ]
}`;

export async function generateQuizPackage(params: {
  subject: string;
  grade: string;
  lessonTitle: string;
  requirement: string;
  provider?: AiProvider;
  customApiKey?: string;
}): Promise<QuizPackage> {
  const userPrompt = `Hãy thiết kế Ngân hàng câu hỏi trắc nghiệm & Trò chơi tương tác (8-10 câu 4 mức độ) cho bài học:
- Môn học: ${params.subject}
- Khối lớp: Lớp ${params.grade}
- Tên bài học: ${params.lessonTitle}
- Yêu cầu cần đạt: ${params.requirement}

Yêu cầu: Câu hỏi chất lượng, bám sát sách giáo khoa mới, có công thức LaTeX chuẩn xác, lời giải cặn kẽ và các phương án nhiễu hợp lý.`;

  const responseText = await callAi({
    prompt: userPrompt,
    systemPrompt: QUIZ_SYSTEM_PROMPT,
    provider: params.provider,
    customApiKey: params.customApiKey,
    maxTokens: 8000,
    temperature: 0.4
  });

  const jsonText = extractJsonFromText(responseText);
  let parsed: QuizPackage;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse Quiz JSON:', jsonText);
    throw new Error('AI trả về dữ liệu Câu hỏi trắc nghiệm không đúng định dạng JSON. Vui lòng thử lại.');
  }

  return parsed;
}
