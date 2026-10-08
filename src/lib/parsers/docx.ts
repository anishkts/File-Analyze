import mammoth from 'mammoth';
import { ParsedPage, ParseResult } from './types';
import { segmentClauses } from './segmenter';

export async function parseDocxBuffer(buffer: Buffer, documentId: string): Promise<ParseResult> {
  const [rawTextResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ]);

  const fullText = rawTextResult.value.replace(/\r\n/g, '\n').trim();
  const htmlContent = htmlResult.value;

  // Approximate pages for DOCX (standard ~3000 chars per typical single-spaced page)
  const pageSizeChars = 3000;
  const pageCount = Math.max(1, Math.ceil(fullText.length / pageSizeChars));
  const pages: ParsedPage[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const startChar = (i - 1) * pageSizeChars;
    const endChar = Math.min(fullText.length, i * pageSizeChars);
    pages.push({
      pageNumber: i,
      text: fullText.slice(startChar, endChar),
      startChar,
      endChar,
    });
  }

  const isScanned = fullText.length < 50;
  const sections = segmentClauses(fullText, documentId, pages);

  return {
    text: fullText,
    pageCount,
    pages,
    sections,
    isScanned,
    htmlContent,
  };
}
