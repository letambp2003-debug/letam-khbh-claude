import Anthropic from '@anthropic-ai/sdk';
import type { AiProvider } from '@/types/extended';

export interface CallAiOptions {
  prompt: string;
  systemPrompt?: string;
  provider?: AiProvider;
  customApiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Trích xuất khối JSON từ chuỗi phản hồi của AI (bỏ qua ```json markdown fences nếu có)
 */
export function extractJsonFromText(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

/**
 * Gọi Google Gemini thông qua REST API (hỗ trợ cả gemini-2.5-flash và gemini-1.5-flash)
 */
async function callGeminiRest(
  prompt: string,
  systemPrompt: string | undefined,
  apiKey: string,
  temperature: number = 0.4,
  maxTokens: number = 8192
): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const fullSystemPrompt = (systemPrompt ? systemPrompt + '\n' : '') +
    'QUY TẮC QUAN TRỌNG: Triển khai ĐẦY ĐỦ 100% nội dung chi tiết cho từng bước và từng hoạt động. Tuyệt đối KHÔNG viết tắt, KHÔNG tóm tắt sơ sài, KHÔNG dùng các câu như "tương tự như trên..." hay bỏ lửng nội dung.';

  const contents: any[] = [];
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const payload: any = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    },
    systemInstruction: {
      parts: [{ text: fullSystemPrompt }]
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    let msg = `Lỗi từ Google Gemini (${res.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      msg = parsed.error?.message || msg;
    } catch {
      msg = `${msg}: ${errorBody.slice(0, 200)}`;
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Google Gemini không trả về nội dung hợp lệ.');
  }

  return text;
}

/**
 * Gọi Anthropic Claude SDK
 */
async function callClaudeSdk(
  prompt: string,
  systemPrompt: string | undefined,
  apiKey: string,
  temperature: number = 0.4,
  maxTokens: number = 8000
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }]
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Anthropic Claude không trả về nội dung văn bản hợp lệ.');
  }

  return textBlock.text;
}

/**
 * Hàm điều phối AI dùng chung toàn ứng dụng:
 * Tự động chọn Claude hoặc Gemini dựa vào cấu hình hoặc yêu cầu của giáo viên.
 */
export async function callAi(options: CallAiOptions): Promise<string> {
  const requestedProvider = options.provider || 'gemini';
  const customKey = options.customApiKey?.trim();

  // Ưu tiên 1: Gemini
  if (requestedProvider === 'gemini') {
    const geminiKey = customKey || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      return callGeminiRest(
        options.prompt,
        options.systemPrompt,
        geminiKey,
        options.temperature,
        options.maxTokens
      );
    }

    // Nếu không có Gemini key, tự động fallback sang Claude nếu Claude key có sẵn
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    if (claudeKey) {
      return callClaudeSdk(
        options.prompt,
        options.systemPrompt,
        claudeKey,
        options.temperature,
        options.maxTokens
      );
    }

    throw new Error(
      'Chưa cấu hình API Key. Vui lòng bấm vào "Cài đặt API Key" để nhập Gemini API Key (miễn phí) hoặc Anthropic Claude Key.'
    );
  }

  // Ưu tiên 2: Claude
  if (requestedProvider === 'claude') {
    const claudeKey = customKey || process.env.ANTHROPIC_API_KEY;
    if (claudeKey) {
      return callClaudeSdk(
        options.prompt,
        options.systemPrompt,
        claudeKey,
        options.temperature,
        options.maxTokens
      );
    }

    // Nếu không có Claude key, fallback sang Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      return callGeminiRest(
        options.prompt,
        options.systemPrompt,
        geminiKey,
        options.temperature,
        options.maxTokens
      );
    }

    throw new Error(
      'Chưa cấu hình Anthropic API Key. Vui lòng nhập Claude Key trong mục Cài đặt hoặc chuyển sang dùng Google Gemini.'
    );
  }

  throw new Error(`Nhà cung cấp AI "${requestedProvider}" không được hỗ trợ.`);
}
