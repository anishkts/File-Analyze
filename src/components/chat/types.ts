export interface ChatQuote {
  quote: string;
  verified: boolean;
  docId?: string;
  documentName?: string;
  pageNumber?: number;
  startChar?: number;
  endChar?: number;
  matchedText?: string;
  reason?: string;
}

export interface ResearchStep {
  round?: number;
  toolName: string;
  args?: any;
  statusText: string;
  timestamp?: string;
}

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ResearchStep[];
  quotes?: ChatQuote[];
  createdAt?: string;
}

export interface ChatPaneProps {
  selectedDocumentIds: string[];
  documents: Array<{ id: string; filename: string }>;
  onQuoteClick: (quote: ChatQuote) => void;
}
