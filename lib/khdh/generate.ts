import Anthropic from '@anthropic-ai/sdk';
import { KHDH_SYSTEM_PROMPT, buildKhdhUserPrompt } from './prompt';
import type { KhdhContent } from '@/types/khdh';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Chưa cấu hình ANTHROPIC_API_KEY. Vui lòng thêm biến môi trường này trong Vercel Project Settings.'
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  // Loại bỏ code fence nếu Claude vẫn bọc markdown
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

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
}): Promise<KhdhContent> {
  const anthropic = getClient();
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

  const message = await anthropic.messages.create({
    model,
    max_tokens: 8000,
    system: KHDH_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildKhdhUserPrompt(params)
      }
    ]
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('AI không trả về nội dung văn bản hợp lệ.');
  }

  const jsonText = extractJson(textBlock.text);
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
