export interface ParsedPage {
  pageNumber: number;
  text: string;
  startChar: number;
  endChar: number;
}

export interface ParsedSection {
  id?: string;
  sectionNumber: string;
  title: string;
  content: string;
  pageNumber: number;
  startChar: number;
  endChar: number;
}

export interface ParseResult {
  text: string;
  pageCount: number;
  pages: ParsedPage[];
  sections: ParsedSection[];
  isScanned: boolean;
  htmlContent?: string;
}
