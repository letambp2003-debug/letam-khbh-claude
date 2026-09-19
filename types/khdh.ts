// Một dòng dữ liệu bóc tách được từ bảng Phụ lục I / PPCT
export interface Lesson {
  week: string; // Tuần
  periods: string; // Tiết (PPCT), vd "1, 2"
  title: string; // Tên bài học
  requirement: string; // Yêu cầu cần đạt (YCCĐ)
}

export interface PpctParseResult {
  subject: string;
  grade: string;
  lessons: Lesson[];
  warnings: string[];
}

// ----- Cấu trúc nội dung KHDH sinh bởi AI, theo FORM V11-2 -----

export interface KhdhGoals {
  knowledge: string[]; // 1. Kiến thức - chỉ danh từ/cụm danh từ
  competencies: string[]; // 2. Năng lực - câu hành động quan sát được
  qualities: { name: string; behavior: string }[]; // 3. Phẩm chất
}

export interface KhdhEquipment {
  teacher: string[];
  student: string[];
}

export interface ActivityStep {
  title: string; // "Bước 1. Chuyển giao nhiệm vụ"
  teacherAndStudent: string; // nội dung cột "HOẠT ĐỘNG CỦA GV VÀ HS"
  expectedProduct: string; // nội dung cột "SẢN PHẨM DỰ KIẾN"
}

export interface ActivityBlock {
  heading: string; // vd "A. HOẠT ĐỘNG KHỞI ĐỘNG" hoặc "Hoạt động 1. ..."
  goal: string; // a) Mục tiêu
  content: string; // b) Nội dung (có thể chứa LaTeX $...$, $$...$$, khối TIKZ:, PROMPT_ANH:)
  product: string; // c) Sản phẩm
  steps: ActivityStep[]; // d) Tổ chức thực hiện - đủ 4 bước
}

export interface KhdhSection {
  heading: string; // "A. HOẠT ĐỘNG KHỞI ĐỘNG" | "B..." | "C..." | "D..."
  subActivities: ActivityBlock[]; // KHỞI ĐỘNG/LUYỆN TẬP/VẬN DỤNG thường có 1; HÌNH THÀNH KIẾN THỨC có nhiều "Hoạt động n."
}

export interface KhdhContent {
  schoolName: string;
  department: string;
  teacherName: string;
  lessonTitle: string; // "BÀI 1: ..."
  subject: string;
  grade: string;
  durationPeriods: number;
  ppctPeriods: string;
  week: string;
  goals: KhdhGoals;
  equipment: KhdhEquipment;
  sections: KhdhSection[]; // đúng 4 phần A-B-C-D
  homework: string[]; // IV. HƯỚNG DẪN VỀ NHÀ
}
