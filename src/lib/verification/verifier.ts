import { QuoteVerificationResult, VerificationPage } from './types';

interface DocumentToken {
  word: string;
  normalized: string;
  startChar: number;
  endChar: number;
}

export function cleanText(str: string): string {
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00AD/g, '') // soft hyphen
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/[–—]/g, '-')
    .trim();
}

export function tokenizeWithOffsets(text: string): DocumentToken[] {
  const tokens: DocumentToken[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawWord = match[0];
    const normalized = cleanText(rawWord)
      .toLowerCase()
      .replace(/[^\w]/g, ''); // strip punctuation for flexible matching

    tokens.push({
      word: rawWord,
      normalized,
      startChar: match.index,
      endChar: match.index + rawWord.length,
    });
  }

  return tokens;
}

export function verifyQuote(
  documentText: string,
  quoteText: string,
  pages: VerificationPage[] = [],
  docId?: string
): QuoteVerificationResult {
  const cleanQuote = cleanText(quoteText);
  if (!cleanQuote || cleanQuote.length < 3) {
    return {
      quote: quoteText,
      verified: false,
      docId,
      reason: 'Quote is empty or too short to verify.',
    };
  }

  // 1. Direct substring match (Fast path)
  const exactIndex = documentText.indexOf(cleanQuote);
  if (exactIndex !== -1) {
    const startChar = exactIndex;
    const endChar = exactIndex + cleanQuote.length;
    const pageNumber = findPage(startChar, pages);
    return {
      quote: quoteText,
      verified: true,
      docId,
      pageNumber,
      startChar,
      endChar,
      matchedText: documentText.slice(startChar, endChar),
    };
  }

  // 2. Direct case-insensitive match
  const lowerDoc = documentText.toLowerCase();
  const lowerQuote = cleanQuote.toLowerCase();
  const lowerIndex = lowerDoc.indexOf(lowerQuote);
  if (lowerIndex !== -1) {
    const startChar = lowerIndex;
    const endChar = lowerIndex + cleanQuote.length;
    const pageNumber = findPage(startChar, pages);
    return {
      quote: quoteText,
      verified: true,
      docId,
      pageNumber,
      startChar,
      endChar,
      matchedText: documentText.slice(startChar, endChar),
    };
  }

  // 3. Sliding token window match (Whitespace / Line-break invariant)
  const docTokens = tokenizeWithOffsets(documentText);
  const quoteTokens = tokenizeWithOffsets(cleanQuote).filter((t) => t.normalized.length > 0);

  if (quoteTokens.length === 0) {
    return {
      quote: quoteText,
      verified: false,
      docId,
      reason: 'Quote contains no matchable alphanumeric words.',
    };
  }

  const quoteLen = quoteTokens.length;

  for (let i = 0; i <= docTokens.length - quoteLen; i++) {
    let match = true;

    for (let j = 0; j < quoteLen; j++) {
      if (docTokens[i + j].normalized !== quoteTokens[j].normalized) {
        match = false;
        break;
      }
    }

    if (match) {
      const startChar = docTokens[i].startChar;
      const endChar = docTokens[i + quoteLen - 1].endChar;
      const pageNumber = findPage(startChar, pages);
      const matchedText = documentText.slice(startChar, endChar);

      return {
        quote: quoteText,
        verified: true,
        docId,
        pageNumber,
        startChar,
        endChar,
        matchedText,
      };
    }
  }

  // 4. Sub-phrase match (in case AI trimmed 1 or 2 outer words or added a period)
  if (quoteLen >= 5) {
    // Try matching the middle 80% of tokens
    const trimmedQuoteTokens = quoteTokens.slice(1, quoteTokens.length - 1);
    const subLen = trimmedQuoteTokens.length;

    for (let i = 0; i <= docTokens.length - subLen; i++) {
      let match = true;
      for (let j = 0; j < subLen; j++) {
        if (docTokens[i + j].normalized !== trimmedQuoteTokens[j].normalized) {
          match = false;
          break;
        }
      }

      if (match) {
        const startChar = docTokens[i].startChar;
        const endChar = docTokens[i + subLen - 1].endChar;
        const pageNumber = findPage(startChar, pages);
        const matchedText = documentText.slice(startChar, endChar);

        return {
          quote: quoteText,
          verified: true,
          docId,
          pageNumber,
          startChar,
          endChar,
          matchedText,
        };
      }
    }
  }

  return {
    quote: quoteText,
    verified: false,
    docId,
    reason: 'Quote not found in document text (potential paraphrase or hallucination).',
  };
}

function findPage(charIndex: number, pages: VerificationPage[]): number {
  if (!pages || pages.length === 0) return 1;

  // 1. Direct hit inside page bounds
  for (const p of pages) {
    if (charIndex >= p.startChar && charIndex <= p.endChar) {
      return p.pageNumber;
    }
  }

  // 2. In-between pages or boundary gap - find page with minimum distance
  let closestPage = pages[0].pageNumber;
  let minDistance = Infinity;
  for (const p of pages) {
    const dist = Math.min(
      Math.abs(charIndex - p.startChar),
      Math.abs(charIndex - p.endChar)
    );
    if (dist < minDistance) {
      minDistance = dist;
      closestPage = p.pageNumber;
    }
  }
  return closestPage;
}

export function extractQuotesFromText(text: string): string[] {
  const quotes: string[] = [];
  const seen = new Set<string>();

  // 1. Match bracket citations: [quote: "...", docId: "..."] or [quote: "..."]
  const bracketRegex = /\[quote:\s*["“]([^"”]+)["”](?:,\s*docId:\s*["'][^"']+["'])?\]/gi;
  let match: RegExpExecArray | null;
  while ((match = bracketRegex.exec(text)) !== null) {
    const q = match[1].trim();
    if (q && !seen.has(q)) {
      seen.add(q);
      quotes.push(q);
    }
  }

  // 2. Match markdown blockquotes: > "..." or > ...
  const blockquoteRegex = /(?:^|\n)>\s*["“]?([^"\n\r]{15,})["”]?/g;
  while ((match = blockquoteRegex.exec(text)) !== null) {
    const q = match[1].trim().replace(/^["“]|["”]$/g, '');
    if (q && !seen.has(q)) {
      seen.add(q);
      quotes.push(q);
    }
  }

  // 3. Match explicit quotation marks in sentences if at least 20 chars: "..."
  const quoteMarkRegex = /["“]([A-Za-z0-9\s,.'’\-–—]{20,})["”]/g;
  while ((match = quoteMarkRegex.exec(text)) !== null) {
    const q = match[1].trim();
    if (q && !seen.has(q)) {
      seen.add(q);
      quotes.push(q);
    }
  }

  return quotes;
}

export function verifyAllQuotes(
  documentText: string,
  quotes: string[],
  pages: VerificationPage[] = [],
  docId?: string
): QuoteVerificationResult[] {
  return quotes.map((q) => verifyQuote(documentText, q, pages, docId));
}
