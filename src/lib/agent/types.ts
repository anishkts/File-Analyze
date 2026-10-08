export interface AgentResearchStep {
  round: number;
  toolName: string;
  args: any;
  statusText: string;
  resultSummary?: string;
  timestamp: string;
}

export interface AgentResearchResult {
  content: string;
  steps: AgentResearchStep[];
  quotes: any[];
  coverage: {
    inspectedCount: number;
    totalSections: number;
    isFullCoverage: boolean;
  };
}
