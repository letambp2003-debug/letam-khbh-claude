import { callAi, extractJsonFromText } from '@/lib/ai/provider';
import type { NlsMap, SlideDeck, AiProvider } from '@/types/extended';

export const NLS_SLIDE_SYSTEM_PROMPT = `Bạn là Chuyên gia Khảo thí và Thiết kế Bài giảng Điện tử (Canva, PowerPoint) theo Chương trình GDPT 2018.
Nhiệm vụ của bạn là xây dựng:
1. MA TRẬN NĂNG LỰC - PHẨM CHẤT (NLS MAP): Phân rã mục tiêu bài học thành các chỉ báo hành vi và bằng chứng đánh giá ứng với 4 hoạt động.
2. KHUNG KỊCH BẢN SLIDE TRÌNH CHIẾU (SLIDE DECK): Bộ 10 - 14 slides logic bám sát tiến trình dạy học.

QUY TẮC SLIDE:
- Mỗi slide có:
  + phase: 'Khởi động' | 'Khám phá' | 'Thực hành' | 'Vận dụng' | 'Tổng kết'
  + title: Tiêu đề slide ngắn gọn, hấp dẫn
  + bulletPoints: Các ý ngắn gọn, súc tích (không viết nguyên đoạn văn dài)
  + visualPrompt: Mô tả hình ảnh / biểu đồ / infographic (dùng để copy vào Canva/DALL-E/Midjourney để sinh ảnh)
  + teacherScript: Lời gợi ý giáo viên nói gì khi chiếu slide này
  + studentAction: Học sinh làm gì (ghi vở, thảo luận cặp, xung phong...)

Trả về ĐÚNG MỘ KHỐI JSON hợp lệ theo cấu trúc:
{
  "nlsMap": {
    "lessonTitle": "...",
    "subject": "...",
    "grade": "...",
    "matrix": [
      {
        "activityName": "A. Hoạt động Khởi động",
        "generalCompetencies": ["Tự chủ và tự học: tự giác quan sát...", "Giao tiếp và hợp tác: trao đổi..."],
        "specificCompetencies": ["Tư duy và lập luận toán học: phán đoán..."],
        "qualities": ["Chăm chỉ: tích cực tham gia...", "Trách nhiệm: hoàn thành nhiệm vụ..."],
        "assessmentEvidence": "Câu trả lời của học sinh; thái độ hào hứng tham gia trò chơi khởi động"
      },
      {
        "activityName": "B. Hoạt động Hình thành kiến thức",
        "generalCompetencies": [...],
        "specificCompetencies": [...],
        "qualities": [...],
        "assessmentEvidence": "Sản phẩm ghi trên Phiếu học tập số 1; bảng nhóm của các tổ"
      },
      {
        "activityName": "C. Hoạt động Luyện tập",
        "generalCompetencies": [...],
        "specificCompetencies": [...],
        "qualities": [...],
        "assessmentEvidence": "Bài làm trong vở bài tập; kết quả bài trắc nghiệm nhanh"
      },
      {
        "activityName": "D. Hoạt động Vận dụng",
        "generalCompetencies": [...],
        "specificCompetencies": [...],
        "qualities": [...],
        "assessmentEvidence": "Báo cáo sản phẩm thực hành nhỏ hoặc bài tập vận dụng thực tế tại nhà"
      }
    ],
    "summaryNote": "Gợi ý đánh giá thường xuyên của giáo viên..."
  },
  "slideDeck": {
    "lessonTitle": "...",
    "totalSlides": 12,
    "slides": [
      {
        "slideNumber": 1,
        "phase": "Khởi động",
        "title": "BẮT ĐẦU CHUYẾN HÀNH TRÌNH",
        "bulletPoints": ["Khám phá câu đố thực tế", "Nêu phỏng đoán"],
        "visualPrompt": "A modern and vibrant illustration showing...",
        "teacherScript": "Chào các em! Hôm nay chúng ta sẽ bắt đầu...",
        "studentAction": "Quan sát màn hình và ghi lại câu trả lời nhanh"
      }
    ]
  }
}`;

export async function generateNlsAndSlides(params: {
  subject: string;
  grade: string;
  lessonTitle: string;
  requirement: string;
  durationPeriods?: number;
  provider?: AiProvider;
  customApiKey?: string;
  teachingMethod?: string;
}): Promise<{ nlsMap: NlsMap; slideDeck: SlideDeck }> {
  const userPrompt = `Hãy thiết kế Ma trận Năng lực - Phẩm chất (NLS Map) và Kịch bản Slide trình chiếu (10-14 slides) cho bài học:
- Môn học: ${params.subject}
- Lớp: ${params.grade}
- Tên bài: ${params.lessonTitle}
- Thời lượng: ${params.durationPeriods ?? 1} tiết
- Yêu cầu cần đạt: ${params.requirement}
${params.teachingMethod ? `- Phương pháp: ${params.teachingMethod}` : ''}

Trả về JSON chính xác theo cấu trúc mô tả.`;

  const responseText = await callAi({
    prompt: userPrompt,
    systemPrompt: NLS_SLIDE_SYSTEM_PROMPT,
    provider: params.provider,
    customApiKey: params.customApiKey,
    maxTokens: 8000,
    temperature: 0.4
  });

  const jsonText = extractJsonFromText(responseText);
  let parsed: { nlsMap: NlsMap; slideDeck: SlideDeck };
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse Nls/Slide JSON:', jsonText);
    throw new Error('AI trả về dữ liệu Ma trận & Slide không đúng định dạng JSON. Vui lòng thử lại.');
  }

  return parsed;
}
