import { callAi, extractJsonFromText } from '@/lib/ai/provider';
import { KHDH_SYSTEM_PROMPT, buildKhdhUserPrompt } from './prompt';
import type { KhdhContent } from '@/types/khdh';
import type { AiProvider } from '@/types/extended';

export async function generateKhdhContent(params: {
  schoolName: string;
  department: string;
  teacherName: string;
  subject: string;
  grade: string;
  lessonTitle: string;
  week: string;
  ppctPeriods: string;
  durationPeriods: number;
  requirement: string;
  extraNotes?: string;
  provider?: AiProvider;
  customApiKey?: string;
  teachingMethod?: string;
  sgkText?: string;
  khdhCuText?: string;
  geminiModel?: string;
}): Promise<KhdhContent> {
  let promptText = buildKhdhUserPrompt(params);
  if (params.teachingMethod) {
    promptText += `\nĐẶC BIỆT: Hãy thiết kế các hoạt động theo phương pháp sư phạm: ${params.teachingMethod}.`;
  }

  const responseText = await callAi({
    prompt: promptText,
    systemPrompt: KHDH_SYSTEM_PROMPT,
    provider: params.provider,
    customApiKey: params.customApiKey,
    maxTokens: 8000,
    temperature: 0.35,
    geminiModel: params.geminiModel
  });

  const jsonText = extractJsonFromText(responseText);
  let parsed: KhdhContent;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse AI JSON', jsonText);
    throw new Error('AI trả về dữ liệu không đúng định dạng JSON. Vui lòng thử tạo lại.');
  }

  return normalizeKhdhContent(parsed, params);
}

/**
 * Đảm bảo output luôn có đủ 4 phần A-B-C-D và cấu trúc tối thiểu hợp lệ,
 * kể cả khi AI trả thiếu một vài trường không quan trọng.
 */
function normalizeKhdhContent(content: KhdhContent, fallback: {
  schoolName: string;
  department: string;
  teacherName: string;
  subject: string;
  grade: string;
  lessonTitle: string;
  week: string;
  ppctPeriods: string;
  durationPeriods: number;
}): KhdhContent {
  const requiredHeadings = [
    'A. HOẠT ĐỘNG KHỞI ĐỘNG',
    'B. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC',
    'C. HOẠT ĐỘNG LUYỆN TẬP',
    'D. HOẠT ĐỘNG VẬN DỤNG'
  ];

  const sections = requiredHeadings.map((heading) => {
    const found = content.sections?.find((s) => s.heading?.toUpperCase().startsWith(heading[0] + '.'));
    return (
      found ?? {
        heading,
        subActivities: []
      }
    );
  });

  return {
    schoolName: content.schoolName || fallback.schoolName,
    department: content.department || fallback.department,
    teacherName: content.teacherName || fallback.teacherName,
    lessonTitle: content.lessonTitle || fallback.lessonTitle,
    subject: content.subject || fallback.subject,
    grade: content.grade || fallback.grade,
    durationPeriods: content.durationPeriods || fallback.durationPeriods,
    ppctPeriods: content.ppctPeriods || fallback.ppctPeriods,
    week: content.week || fallback.week,
    goals: {
      knowledge: content.goals?.knowledge ?? [],
      competencies: content.goals?.competencies ?? [],
      qualities: content.goals?.qualities ?? []
    },
    equipment: {
      teacher: content.equipment?.teacher ?? [],
      student: content.equipment?.student ?? []
    },
    sections,
    homework: content.homework ?? []
  };
}
