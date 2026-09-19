'use client';

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { parseContentBlocks, parseInlineMath, isStandaloneDisplayMathLine } from '@/lib/khdh/content';

/**
 * Hiển thị preview trên web cho 1 đoạn nội dung KHDH (có thể chứa công thức
 * $...$/$$...$$, khối TikZ, khối prompt ảnh) — dùng KaTeX để render công
 * thức, ĐÚNG cặp với bản Word xuất ra dùng OMML (cùng 1 bộ phân tích nội
 * dung ở lib/khdh/content.ts, chỉ khác tầng render).
 */
export default function MathText({ text }: { text: string }) {
  const blocks = parseContentBlocks(text);

  return (
    <div>
      {blocks.map((block, i) => {
        if (block.type === 'tikz') {
          return (
            <div
              key={i}
              style={{
                background: '#f2f2f2',
                borderRadius: 6,
                padding: '8px 10px',
                margin: '6px 0',
                fontFamily: 'Consolas, monospace',
                fontSize: 12.5,
                whiteSpace: 'pre-wrap'
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Mã TikZ/Overleaf (dán vào Overleaf để biên dịch):
              </div>
              {block.code}
            </div>
          );
        }
        if (block.type === 'image_prompt') {
          return (
            <div
              key={i}
              style={{
                background: '#eaf1ff',
                borderRadius: 6,
                padding: '8px 10px',
                margin: '6px 0',
                fontSize: 13,
                fontStyle: 'italic'
              }}
            >
              <strong style={{ fontStyle: 'normal' }}>Prompt tạo ảnh minh hoạ: </strong>
              {block.prompt}
            </div>
          );
        }
        return (
          <div key={i}>
            {block.lines.map((line, j) => {
              if (line.trim() === '') return <div key={j} style={{ height: 6 }} />;
              const standalone = isStandaloneDisplayMathLine(line);
              if (standalone) {
                return <MathLine key={j} latex={standalone.latex} display />;
              }
              const tokens = parseInlineMath(line);
              return (
                <p key={j} style={{ margin: '4px 0' }}>
                  {tokens.map((t, k) =>
                    t.type === 'text' ? (
                      <span key={k}>{t.value}</span>
                    ) : (
                      <KatexSpan key={k} latex={t.latex} display={false} />
                    )
                  )}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function MathLine({ latex, display }: { latex: string; display: boolean }) {
  return (
    <div style={{ textAlign: 'center', margin: '6px 0' }}>
      <KatexSpan latex={latex} display={display} />
    </div>
  );
}

function KatexSpan({ latex, display }: { latex: string; display: boolean }) {
  let html: string;
  try {
    html = katex.renderToString(latex, { throwOnError: false, displayMode: display });
  } catch {
    html = `<span style="color:#c00">[Công thức lỗi: ${escapeHtml(latex)}]</span>`;
  }
  // eslint-disable-next-line react/no-danger
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
