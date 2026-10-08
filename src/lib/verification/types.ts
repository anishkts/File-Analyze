export interface QuoteVerificationResult {
  quote: string;
  verified: boolean;
  docId?: string;
  pageNumber?: number;
  startChar?: number;
  endChar?: number;
  matchedText?: string;
  reason?: string;
}

export interface VerificationPage {
  pageNumber: number;
  text: string;
  startChar: number;
  endChar: number;
}
