export interface HighlightTarget {
  documentId?: string;
  pageNumber?: number;
  startChar?: number;
  endChar?: number;
  quoteText?: string;
}

export interface DocumentViewerProps {
  documentId: string | null;
  activeHighlight: HighlightTarget | null;
  onClearHighlight?: () => void;
}
