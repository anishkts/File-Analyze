import { describe, it, expect } from 'vitest';
import { verifyQuote, extractQuotesFromText, verifyAllQuotes } from '../src/lib/verification/verifier';

describe('Quote Verification Engine', () => {
  const docText = `MASTER SERVICES AGREEMENT

In no event shall either party's aggregate liability exceed AED 100,000 for any and all claims arising under this Agreement.
This agreement is governed by the laws of the Dubai International Financial Centre (DIFC).

The Contractor warrants that services will be performed with reasonable care and skill.`;

  const pages = [
    { pageNumber: 1, text: docText.slice(0, 160), startChar: 0, endChar: 160 },
    { pageNumber: 2, text: docText.slice(160), startChar: 160, endChar: docText.length },
  ];

  it('verifies exact quote with identical text', () => {
    const quote = "In no event shall either party's aggregate liability exceed AED 100,000";
    const result = verifyQuote(docText, quote, pages);
    expect(result.verified).toBe(true);
    expect(result.pageNumber).toBe(1);
    expect(result.startChar).toBeGreaterThanOrEqual(0);
    expect(result.matchedText).toContain("AED 100,000");
  });

  it('verifies quote with irregular newlines, soft hyphens, and whitespace differences', () => {
    const quote = "In  no event   shall either\nparty's aggregate liability\n\n  exceed AED 100,000";
    const result = verifyQuote(docText, quote, pages);
    expect(result.verified).toBe(true);
    expect(result.pageNumber).toBe(1);
  });

  it('verifies quote spanning page boundaries', () => {
    // Quote starts near end of page 1 and extends into page 2
    const crossQuote = "arising under this Agreement.\nThis agreement is governed by the laws";
    const result = verifyQuote(docText, crossQuote, pages);
    expect(result.verified).toBe(true);
    expect(result.pageNumber).toBe(1); // origin page
  });

  it('verifies quote on subsequent pages and returns correct page number', () => {
    const quote = "The Contractor warrants that services will be performed with reasonable care";
    const result = verifyQuote(docText, quote, pages);
    expect(result.verified).toBe(true);
    expect(result.pageNumber).toBe(2);
  });

  it('correctly maps quote near page gap to nearest page rather than defaulting to page 1', () => {
    const multiPages = [
      { pageNumber: 1, text: 'Page one text', startChar: 0, endChar: 50 },
      { pageNumber: 2, text: 'Page two text', startChar: 60, endChar: 120 },
      { pageNumber: 3, text: 'Page three text', startChar: 140, endChar: 200 },
    ];
    // Offset 135 is in gap right before Page 3 (140..200)
    const text = 'A'.repeat(135) + 'Page three text is here';
    const result = verifyQuote(text, 'Page three text', multiPages);
    expect(result.verified).toBe(true);
    expect(result.pageNumber).toBe(3);
  });

  it('rejects hallucinated or paraphrased quotes', () => {
    const fakeQuote = "The supplier agrees to unlimited liability for any damages whatsoever.";
    const result = verifyQuote(docText, fakeQuote, pages);
    expect(result.verified).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('extracts quoted passages from assistant response and verifies them all', () => {
    const assistantResponse = `According to the agreement:
> "In no event shall either party's aggregate liability exceed AED 100,000"
The agreement is governed by DIFC laws:
[quote: "This agreement is governed by the laws of the Dubai International Financial Centre (DIFC)."]
However, the contract states:
> "The company must pay infinite liquidated damages on demand"
`;
    const quotes = extractQuotesFromText(assistantResponse);
    expect(quotes.length).toBe(3);

    const verified = verifyAllQuotes(docText, quotes, pages, 'doc-1');
    expect(verified.length).toBe(3);
    expect(verified[0].verified).toBe(true);
    expect(verified[1].verified).toBe(true);
    expect(verified[2].verified).toBe(false); // fake quote flagged as unverified
  });
});
