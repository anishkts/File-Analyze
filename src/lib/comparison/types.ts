export type ClauseDiffStatus = 'unchanged' | 'modified' | 'added' | 'deleted';
export type SignificanceLevel = 'high' | 'medium' | 'low';

export interface ClauseDiffItem {
  id: string;
  sectionNumber: string;
  title: string;
  status: ClauseDiffStatus;
  contentA?: string;
  contentB?: string;
  significance?: {
    level: SignificanceLevel;
    summary: string;
  };
}

export interface ComparisonReport {
  documentAId: string;
  documentBId: string;
  documentAName: string;
  documentBName: string;
  summary: string;
  diffs: ClauseDiffItem[];
  stats: {
    totalClauses: number;
    unchangedCount: number;
    modifiedCount: number;
    addedCount: number;
    deletedCount: number;
    highSignificanceCount: number;
  };
}
