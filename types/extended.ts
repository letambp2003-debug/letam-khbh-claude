import type { Lesson, KhdhContent } from './khdh';

// ----- PHIẾU HỌC TẬP (WORKSHEET) -----
export interface WorksheetTask {
  id: string;
  orderNumber: number;
  title: string; // Vd: "Nhiệm vụ 1: Khám phá định lý..."
  instructions: string; // Hướng dẫn thực hiện
  questionContent: string; // Nội dung câu hỏi/bài tập/điền khuyết (hỗ trợ LaTeX $...$)
  answerSpaceType: 'lines' | 'box' | 'table' | 'multiple_choice'; // Kiểu vùng làm bài
  suggestedAnswer: string; // Gợi ý đáp án / lời giải cho GV
  score: number; // Điểm số tối đa (thang điểm 10)
}

export interface WorksheetRubricItem {
  criteria: string; // Tiêu chí
  excellent: string; // Mức Tốt
  good: string; // Mức Đạt
  needsImprovement: string; // Mức Cần cố gắng
}

export interface Worksheet {
  id: string;
  sheetNumber: number; // Phiếu số 1, 2, 3...
  title: string; // Vd: "PHIẾU HỌC TẬP SỐ 1: KHÁM PHÁ KIẾN THỨC MỚI"
  activityTarget: string; // Thuộc hoạt động nào trong KHDH (vd: Hoạt động 2.1)
  targetCompetency: string; // YCCĐ / Năng lực cần hình thành
  groupMode: 'individual' | 'pair' | 'group'; // Cá nhân / Nhóm đôi / Nhóm 4-6
  tasks: WorksheetTask[];
  rubric?: WorksheetRubricItem[];
  teacherNotes?: string;
}

export interface WorksheetPackage {
  lessonTitle: string;
  subject: string;
  grade: string;
  sheets: Worksheet[];
}

// ----- MA TRẬN NĂNG LỰC - PHẨM CHẤT (NLS MAP) -----
export interface NlsMatrixRow {
  activityName: string; // Tên hoạt động (A. Khởi động, B. Hình thành KT...)
  generalCompetencies: string[]; // Năng lực chung: Tự chủ - tự học, Giao tiếp - hợp tác, Giải quyết vấn đề - sáng tạo
  specificCompetencies: string[]; // Năng lực đặc thù môn học (Toán: Tư duy & lập luận, Mô hình hóa, v.v.)
  qualities: string[]; // Phẩm chất: Yêu nước, Nhân ái, Chăm chỉ, Trung thực, Trách nhiệm
  assessmentEvidence: string; // Bằng chứng / Công cụ đánh giá (Quan sát, Câu hỏi, Phiếu học tập, Sản phẩm)
}

export interface NlsMap {
  lessonTitle: string;
  subject: string;
  grade: string;
  matrix: NlsMatrixRow[];
  summaryNote: string;
}

// ----- KỊCH BẢN SLIDE TRÌNH CHIẾU (SLIDE PROMPTS) -----
export interface SlideCard {
  slideNumber: number;
  phase: 'Khởi động' | 'Khám phá' | 'Thực hành' | 'Vận dụng' | 'Tổng kết';
  title: string;
  bulletPoints: string[];
  visualPrompt: string; // Prompt mô tả hình ảnh hoặc sơ đồ để vẽ bằng AI/Canva
  teacherScript: string; // Lời giảng/hướng dẫn sư phạm của GV
  studentAction: string; // Hành động của học sinh
}

export interface SlideDeck {
  lessonTitle: string;
  totalSlides: number;
  slides: SlideCard[];
}

// ----- NGÂN HÀNG CÂU HỎI & TRÒ CHƠI TƯƠNG TÁC (QUIZ & GAME) -----
export interface QuizQuestion {
  id: string;
  level: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';
  question: string; // Nội dung câu hỏi (hỗ trợ LaTeX)
  options: string[]; // 4 lựa chọn A, B, C, D
  correctIndex: number; // 0, 1, 2, 3
  explanation: string; // Giải thích chi tiết
  points: number;
}

export interface QuizPackage {
  lessonTitle: string;
  questions: QuizQuestion[];
}

// ----- TÙY CHỌN AI -----
export type AiProvider = 'claude' | 'gemini';

export interface UserAiSettings {
  provider: AiProvider;
  geminiApiKey?: string;
  claudeApiKey?: string;
  geminiModel?: string;
  claudeModel?: string;
  teachingMethod?: string; // "Dạy học tích cực", "Bàn tay nặn bột", "STEM", "Giải quyết vấn đề"
}
