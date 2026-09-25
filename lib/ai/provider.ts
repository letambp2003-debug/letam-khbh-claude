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
/**
 * Phân tích danh sách API Key (hỗ trợ nhập nhiều key cách nhau bằng xuống dòng, dấu phẩy, chấm phẩy)
 */
export function parseApiKeys(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,;\s]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 5);
}

/**
 * Hàm điều phối AI dùng chung toàn ứng dụng:
 * Hỗ trợ nhập NHIỀU API KEY cùng lúc, tự động xoay vòng và dự phòng (fallback)
 * khi một key bị hết hạn mức (HTTP 429 / RESOURCE_EXHAUSTED).
 */
export async function callAi(options: CallAiOptions): Promise<string> {
  const requestedProvider = options.provider || 'gemini';
  const customKeyRaw = options.customApiKey?.trim();

  // ƯU TIÊN 1: GOOGLE GEMINI
  if (requestedProvider === 'gemini') {
    let geminiKeys = parseApiKeys(customKeyRaw);
    if (geminiKeys.length === 0 && process.env.GEMINI_API_KEY) {
      geminiKeys = parseApiKeys(process.env.GEMINI_API_KEY);
    }

    if (geminiKeys.length > 0) {
      let lastError: any = null;
      for (let i = 0; i < geminiKeys.length; i++) {
        const currentKey = geminiKeys[i];
        try {
          return await callGeminiRest(
            options.prompt,
            options.systemPrompt,
            currentKey,
            options.temperature,
            options.maxTokens
          );
        } catch (err: any) {
          lastError = err;
          console.warn(
            `[Gemini] Key #${i + 1}/${geminiKeys.length} gặp sự cố (${err.message}). ` +
              (i < geminiKeys.length - 1 ? 'Đang tự động chuyển sang key dự phòng tiếp theo...' : 'Đã hết key dự phòng.')
          );
          if (i < geminiKeys.length - 1) {
            continue;
          }
        }
      }
      throw new Error(
        `Tất cả ${geminiKeys.length} Gemini API Key đều thất bại hoặc hết hạn mức. Chi tiết: ${lastError?.message || 'Lỗi không xác định'}`
      );
    }

    // Nếu không có Gemini key nào, thử fallback sang Claude
    const claudeKeys = parseApiKeys(process.env.ANTHROPIC_API_KEY);
    if (claudeKeys.length > 0) {
      return callClaudeSdk(
        options.prompt,
        options.systemPrompt,
        claudeKeys[0],
        options.temperature,
        options.maxTokens
      );
    }

    throw new Error(
      'Chưa cấu hình API Key. Thầy/cô vui lòng bấm vào "⚙ Cài đặt API Key & Phương pháp" để nhập ít nhất một Gemini API Key (hỗ trợ dán nhiều key cùng lúc).'
    );
  }

  // ƯU TIÊN 2: ANTHROPIC CLAUDE
  if (requestedProvider === 'claude') {
    let claudeKeys = parseApiKeys(customKeyRaw);
    if (claudeKeys.length === 0 && process.env.ANTHROPIC_API_KEY) {
      claudeKeys = parseApiKeys(process.env.ANTHROPIC_API_KEY);
    }

    if (claudeKeys.length > 0) {
      let lastError: any = null;
      for (let i = 0; i < claudeKeys.length; i++) {
        const currentKey = claudeKeys[i];
        try {
          return await callClaudeSdk(
            options.prompt,
            options.systemPrompt,
            currentKey,
            options.temperature,
            options.maxTokens
          );
        } catch (err: any) {
          lastError = err;
          console.warn(
            `[Claude] Key #${i + 1}/${claudeKeys.length} gặp sự cố (${err.message}). ` +
              (i < claudeKeys.length - 1 ? 'Đang tự động chuyển sang key dự phòng tiếp theo...' : 'Đã hết key dự phòng.')
          );
          if (i < claudeKeys.length - 1) {
            continue;
          }
        }
      }
      throw new Error(
        `Tất cả ${claudeKeys.length} Claude API Key đều thất bại hoặc hết hạn mức. Chi tiết: ${lastError?.message || 'Lỗi không xác định'}`
      );
    }

    // Fallback sang Gemini
    const geminiKeys = parseApiKeys(process.env.GEMINI_API_KEY);
    if (geminiKeys.length > 0) {
      return callGeminiRest(
        options.prompt,
        options.systemPrompt,
        geminiKeys[0],
        options.temperature,
        options.maxTokens
      );
    }

    throw new Error(
      'Chưa cấu hình Anthropic API Key. Thầy/cô vui lòng nhập Claude Key trong mục Cài đặt hoặc chuyển sang dùng Google Gemini.'
    );
  }

  throw new Error(`Nhà cung cấp AI "${requestedProvider}" không được hỗ trợ.`);
}
