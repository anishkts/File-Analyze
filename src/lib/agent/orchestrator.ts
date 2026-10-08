import { createContractTools } from './tools';
import { AgentResearchStep, AgentResearchResult } from './types';
import { extractQuotesFromText, verifyAllQuotes } from '../verification/verifier';
import { getDocument, getDocumentSections } from '../db';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export function getAiModel() {
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (openaiKey) {
    const openai = createOpenAI({
      apiKey: openaiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
    const modelName = process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini';
    return openai(modelName);
  }

  if (geminiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: geminiKey,
    });
    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
    return google(modelName);
  }

  return null;
}

export function formatSystemPrompt(documentSummaries: string[]): string {
  return `You are an expert AI Legal Contract Analyst.
You are researching questions against the following active contracts:
${documentSummaries.join('\n')}

MANDATORY RULES:
1. ONLY answer using facts and clauses found in the documents. If an answer or clause is not present in the contracts, you MUST explicitly say: "This document does not contain provisions regarding [topic]." Do NOT speculate or invent contract language.
2. Back every claim and answer with exact quotes enclosed in quotes: > "exact quote here" or [quote: "exact quote here"].
3. Use the provided tools (search_document, get_section, list_clauses, check_coverage) to look up clauses before answering. Never guess what a clause says.
4. If you have only inspected part of a document, do NOT make an exhaustive claim that something does not exist without checking all relevant sections or mentioning the coverage limitation.
5. In multi-document comparisons, clearly identify which document each quote and clause comes from.`;
}

export async function runOfflineSimulatedResearch(
  query: string,
  documentIds: string[],
  onStatusUpdate?: (status: string) => void
): Promise<AgentResearchResult> {
  // Graceful fallback when no LLM API key is configured
  const tools = createContractTools(documentIds);
  const steps: AgentResearchStep[] = [];

  onStatusUpdate?.('Inspecting document outline...');
  steps.push({
    round: 1,
    toolName: 'list_clauses',
    args: { documentId: documentIds[0] },
    statusText: 'Inspecting document outline and table of contents...',
    timestamp: new Date().toISOString(),
  });
  const clauseList = await tools.list_clauses.execute({ documentId: documentIds[0] });

  onStatusUpdate?.(`Searching for terms matching "${query}"...`);
  steps.push({
    round: 2,
    toolName: 'search_document',
    args: { query },
    statusText: `Searching clauses matching "${query}"...`,
    timestamp: new Date().toISOString(),
  });
  const searchResults = await tools.search_document.execute({ query });

  let answerText = '';
  const quotesToVerify: Array<{ text: string; docId: string }> = [];

  if (searchResults.matches && searchResults.matches.length > 0) {
    const bestMatch = searchResults.matches[0];
    onStatusUpdate?.(`Reading ${bestMatch.sectionNumber}: ${bestMatch.title}...`);

    const sectionIdentifier = bestMatch.sectionNumber || bestMatch.title || 'Section 1';
    steps.push({
      round: 3,
      toolName: 'get_section',
      args: { sectionNumberOrTitle: sectionIdentifier, documentId: bestMatch.documentId },
      statusText: `Reading full text of ${sectionIdentifier}...`,
      timestamp: new Date().toISOString(),
    });

    const fullSec = await tools.get_section.execute({
      sectionNumberOrTitle: sectionIdentifier,
      documentId: bestMatch.documentId,
    });

    if (fullSec.found && fullSec.section) {
      const sentence = fullSec.section.content.split('. ')[0] + '.';
      answerText = `Based on ${fullSec.section.sectionNumber} (${fullSec.section.title}) from ${fullSec.documentName}:\n\n> "${sentence}"\n\nThis provision addresses your question regarding "${query}".`;
      quotesToVerify.push({ text: sentence, docId: fullSec.documentId! });
    }
  } else {
    answerText = `Based on a search across the contract, no provisions matching "${query}" were located. The contract does not appear to contain terms regarding this subject.`;
  }

  // Verification pass
  const verifiedQuotes: any[] = [];
  for (const q of quotesToVerify) {
    const doc = getDocument(q.docId);
    if (doc) {
      const v = verifyAllQuotes(doc.extractedText, [q.text], [], q.docId);
      verifiedQuotes.push(...v);
    }
  }

  const allSections = getDocumentSections(documentIds[0]);

  return {
    content: answerText,
    steps,
    quotes: verifiedQuotes,
    coverage: {
      inspectedCount: searchResults.matches ? searchResults.matches.length : 0,
      totalSections: allSections.length,
      isFullCoverage: searchResults.matches?.length === allSections.length,
    },
  };
}
