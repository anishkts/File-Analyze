import { ParsedPage, ParsedSection } from './types';

export function segmentClauses(
  fullText: string,
  documentId: string,
  pages: ParsedPage[] = []
): ParsedSection[] {
  // Regex to match legal section headers:
  // e.g. "Section 1", "Section 1.1", "Article II", "1.1 Definitions", "CLAUSE 4:"
  const sectionRegex = /(?:^|\n)\s*(?:(Section|Article|Clause)\s+([0-9IVXLCDM]+(?:\.[0-9]+)*)|([0-9]+(?:\.[0-9]+)+))\s*[:.\-–—]?\s*([^\n]+)?/gi;

  const matches: Array<{
    index: number;
    sectionNumber: string;
    title: string;
    fullMatchLength: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(fullText)) !== null) {
    const prefix = match[1] || '';
    const num = match[2] || match[3] || '';
    const sectionNumber = prefix ? `${prefix} ${num}`.trim() : num.trim();
    const rawTitle = (match[4] || '').trim();

    matches.push({
      index: match.index,
      sectionNumber,
      title: rawTitle,
      fullMatchLength: match[0].length,
    });
  }

  // If no structured section headers found, split into paragraphs
  if (matches.length === 0) {
    const paragraphs = fullText.split(/\n\s*\n/);
    const sections: ParsedSection[] = [];
    let currentChar = 0;

    paragraphs.forEach((para, idx) => {
      const trimmed = para.trim();
      if (!trimmed) return;

      const startChar = fullText.indexOf(trimmed, currentChar);
      const endChar = startChar + trimmed.length;
      currentChar = endChar;

      // Find page number
      const pageNumber = findPageForChar(startChar, pages);

      sections.push({
        id: `sec-${idx + 1}`,
        sectionNumber: `Paragraph ${idx + 1}`,
        title: trimmed.slice(0, 40) + (trimmed.length > 40 ? '...' : ''),
        content: trimmed,
        pageNumber,
        startChar,
        endChar,
      });
    });

    return sections;
  }

  const sections: ParsedSection[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : fullText.length;

    const startChar = current.index;
    const endChar = nextIndex;
    const rawContent = fullText.slice(startChar, endChar).trim();

    // The content excluding the section header line
    const contentLines = rawContent.split('\n');
    const content = contentLines.length > 1 ? contentLines.slice(1).join('\n').trim() : rawContent;

    const pageNumber = findPageForChar(startChar, pages);

    sections.push({
      id: `sec-${i + 1}`,
      sectionNumber: current.sectionNumber,
      title: current.title || current.sectionNumber,
      content: content || rawContent,
      pageNumber,
      startChar,
      endChar,
    });
  }

  return sections;
}

function findPageForChar(charIndex: number, pages: ParsedPage[]): number {
  if (!pages || pages.length === 0) return 1;
  for (const page of pages) {
    if (charIndex >= page.startChar && charIndex <= page.endChar) {
      return page.pageNumber;
    }
  }
  return pages[0].pageNumber;
}
