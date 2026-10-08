import { ParsedPage, ParseResult } from './types';
import { segmentClauses } from './segmenter';

export function isScannedDocument(text: string, pageCount: number): boolean {
  const printableText = text.replace(/[\s\r\n\t]/g, '');
  // A readable PDF has at least 50 characters across pages
  return printableText.length < 50;
}

export async function parsePdfBuffer(buffer: Buffer, documentId: string): Promise<ParseResult> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  const pages: ParsedPage[] = [];
  let fullText = '';
  let currentCharIndex = 0;

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const startChar = currentCharIndex;
    const endChar = startChar + pageText.length;
    currentCharIndex = endChar + 1; // accounting for newline separator

    pages.push({
      pageNumber: i,
      text: pageText,
      startChar,
      endChar,
    });

    fullText += (fullText ? '\n\n' : '') + pageText;
  }

  const isScanned = isScannedDocument(fullText, pageCount);
  const sections = segmentClauses(fullText, documentId, pages);

  return {
    text: fullText,
    pageCount,
    pages,
    sections,
    isScanned,
  };
}
