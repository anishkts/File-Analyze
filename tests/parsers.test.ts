import { describe, it, expect } from 'vitest';
import { isScannedDocument } from '../src/lib/parsers/pdf';
import { segmentClauses } from '../src/lib/parsers/segmenter';
import { parseDocxBuffer } from '../src/lib/parsers/docx';

describe('Document Parsers & Scanned Detection', () => {
  it('detects scanned PDF with insufficient text', () => {
    expect(isScannedDocument('', 10)).toBe(true);
    expect(isScannedDocument('   \n\t  ', 5)).toBe(true);
    expect(isScannedDocument('Few words', 10)).toBe(true);
    expect(
      isScannedDocument(
        'This is a fully readable legal contract clause with lots of text that contains well over 50 characters of valid readable contract language.',
        1
      )
    ).toBe(false);
  });

  it('segments legal text into structured clauses and sections with offsets', () => {
    const rawText = `MASTER SERVICES AGREEMENT

Section 1. Definitions
"Effective Date" means the date of execution. "Services" means consulting work.

Section 2. Limitation of Liability
Neither party shall be liable for indirect, incidental, or consequential damages. In no event shall aggregate liability exceed AED 100,000.

Section 3. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of DIFC.`;

    const sections = segmentClauses(rawText, 'doc-test-1');
    expect(sections.length).toBeGreaterThanOrEqual(3);

    expect(sections[0].sectionNumber).toBe('Section 1');
    expect(sections[0].title).toBe('Definitions');
    expect(sections[0].content).toContain('Effective Date');
    expect(sections[0].startChar).toBeGreaterThanOrEqual(0);

    expect(sections[1].sectionNumber).toBe('Section 2');
    expect(sections[1].title).toBe('Limitation of Liability');
    expect(sections[1].content).toContain('AED 100,000');

    expect(sections[2].sectionNumber).toBe('Section 3');
    expect(sections[2].title).toBe('Governing Law');
    expect(sections[2].content).toContain('laws of DIFC');
  });

  it('handles numbered subsections like 1.1, 1.2, 2.1', () => {
    const text = `
1.1 Term and Termination
This agreement commences on January 1.

1.2 Notice Period
Written notice of 30 days is required.
    `;
    const sections = segmentClauses(text, 'doc-test-2');
    expect(sections.length).toBe(2);
    expect(sections[0].sectionNumber).toBe('1.1');
    expect(sections[1].sectionNumber).toBe('1.2');
  });
});
