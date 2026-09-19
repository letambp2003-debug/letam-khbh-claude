/**
 * Chuyển công thức LaTeX (MATH_CANONICAL) sang OMML (Office Math Markup)
 * để nhúng NGUYÊN SINH (native) vào file Word — đúng yêu cầu:
 *   MATH_CANONICAL → OMML Word Equation native (không dùng ảnh, không để
 *   nguyên chuỗi LaTeX/dấu $ trong file .docx cuối cùng).
 *
 * Pipeline: TeX (MathJax) → cây MathML nội bộ (SerializedMmlVisitor)
 *           → OMML (mathml2omml-plus), tương đương transform MML2OMML.XSL
 *           chính thức của Microsoft.
 *
 * CHỈ import module này ở phía server (route/lib dùng trong docx.ts),
 * không import trong component client.
 */
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SerializedMmlVisitor } from 'mathjax-full/js/core/MmlTree/SerializedMmlVisitor.js';
import { STATE } from 'mathjax-full/js/core/MathItem.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { mml2omml } from 'mathml2omml-plus';

let mathDoc: any = null;
let visitor: SerializedMmlVisitor | null = null;

// Loại các package cần output jax hiển thị (bussproofs vẽ cây suy luận) vì ta
// chỉ dùng MathJax để lấy cây MathML, không render hình ảnh.
const TEX_PACKAGES = AllPackages.filter((p) => p !== 'bussproofs');

function getMathDocument() {
  if (!mathDoc) {
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const tex = new TeX({ packages: TEX_PACKAGES });
    visitor = new SerializedMmlVisitor();
    mathDoc = mathjax.document('', { InputJax: tex });
  }
  return mathDoc;
}

/** LaTeX -> chuỗi XML MathML (<math>...</math>) */
export function latexToMathML(latex: string, display: boolean): string {
  const doc = getMathDocument();
  const node = doc.convert(latex, { display, end: STATE.CONVERT });
  return visitor!.visitTree(node);
}

/**
 * LaTeX -> chuỗi XML OMML thuần (<m:oMath>...</m:oMath>), sẵn sàng nhúng vào
 * document.xml của file .docx bằng ImportedXmlComponent.fromXmlString.
 */
export function latexToOmmlXml(latex: string): string {
  const mml = latexToMathML(latex, false);
  return mml2omml(mml);
}

export interface MathConvertResult {
  ok: boolean;
  ommlXml?: string;
  error?: string;
}

/** Bản an toàn: không throw, trả về ok=false kèm lý do nếu LaTeX lỗi cú pháp. */
export function tryLatexToOmmlXml(latex: string): MathConvertResult {
  try {
    return { ok: true, ommlXml: latexToOmmlXml(latex) };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}
