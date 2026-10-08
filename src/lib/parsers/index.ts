import { ParseResult } from './types';
import { parsePdfBuffer } from './pdf';
import { parseDocxBuffer } from './docx';

export * from './types';
export * from './pdf';
export * from './docx';
export * from './segmenter';

export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  documentId: string
): Promise<ParseResult> {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
    return parsePdfBuffer(buffer, documentId);
  }

  if (
    lowerName.endsWith('.docx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return parseDocxBuffer(buffer, documentId);
  }

  throw new Error('Unsupported file format. Only PDF (.pdf) and Word (.docx) documents are accepted.');
}
