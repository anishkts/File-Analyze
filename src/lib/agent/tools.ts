import { tool } from 'ai';
import { z } from 'zod';
import { getDocumentSections, searchSectionsFTS, getDocument } from '../db';

export function createContractTools(documentIds: string[], customDbPath?: string) {
  return {
    list_clauses: tool({
      description: 'List the table of contents and all clause section numbers and titles for a contract.',
      parameters: z.object({
        documentId: z
          .string()
          .optional()
          .describe('The ID of the document to inspect. Defaults to the first document if omitted.'),
      }),
      execute: async ({ documentId }) => {
        try {
          const targetDocId = documentId || documentIds[0];
          const sections = getDocumentSections(targetDocId, customDbPath);
          return {
            documentId: targetDocId,
            clauses: sections.map((s) => ({
              id: s.id,
              sectionNumber: s.sectionNumber,
              title: s.title,
              pageNumber: s.pageNumber,
            })),
          };
        } catch (error: any) {
          return { error: `Failed to list clauses: ${error.message}` };
        }
      },
    }),

    search_document: tool({
      description: 'Search contract text using full-text search keywords across all clauses.',
      parameters: z.object({
        query: z
          .string()
          .describe('Search query terms or keywords (e.g. "liability cap", "termination", "confidentiality").'),
        documentId: z
          .string()
          .optional()
          .describe('The ID of the document to search. If omitted, searches across all active documents.'),
      }),
      execute: async ({ query, documentId }) => {
        try {
          const targetDocIds = documentId ? [documentId] : documentIds;
          const allMatches = [];

          for (const dId of targetDocIds) {
            const matches = searchSectionsFTS(dId, query, customDbPath);
            const doc = getDocument(dId, customDbPath);
            for (const m of matches) {
              allMatches.push({
                documentId: dId,
                documentName: doc?.filename || dId,
                sectionNumber: m.sectionNumber,
                title: m.title,
                snippet: m.content.slice(0, 300) + (m.content.length > 300 ? '...' : ''),
                pageNumber: m.pageNumber,
              });
            }
          }

          return {
            query,
            matches: allMatches.slice(0, 8),
          };
        } catch (error: any) {
          return { error: `Search error: ${error.message}` };
        }
      },
    }),

    get_section: tool({
      description: 'Retrieve the complete full text of a specific section or clause in a contract.',
      parameters: z.object({
        sectionNumberOrTitle: z
          .string()
          .describe('The section number (e.g., "Section 8", "1.2") or section title to fetch.'),
        documentId: z
          .string()
          .optional()
          .describe('The ID of the document. If omitted, checks active documents.'),
      }),
      execute: async ({
        sectionNumberOrTitle,
        documentId,
      }: {
        sectionNumberOrTitle: string;
        documentId?: string;
      }) => {
        try {
          const targetDocIds = documentId ? [documentId] : documentIds;
          const queryNorm = sectionNumberOrTitle.toLowerCase().trim();

          for (const dId of targetDocIds) {
            const sections = getDocumentSections(dId, customDbPath);
            const found = sections.find(
              (s) =>
                (s.sectionNumber && s.sectionNumber.toLowerCase().includes(queryNorm)) ||
                (s.title && s.title.toLowerCase().includes(queryNorm)) ||
                queryNorm.includes((s.sectionNumber || '').toLowerCase())
            );

            if (found) {
              const doc = getDocument(dId, customDbPath);
              return {
                found: true,
                documentId: dId,
                documentName: doc?.filename,
                section: {
                  sectionNumber: found.sectionNumber,
                  title: found.title,
                  content: found.content,
                  pageNumber: found.pageNumber,
                },
              };
            }
          }

          return {
            found: false,
            message: `Section "${sectionNumberOrTitle}" not found in document. Call list_clauses to see available sections.`,
          };
        } catch (error: any) {
          return { found: false, message: `Error retrieving section: ${error.message}` };
        }
      },
    }),

    check_coverage: tool({
      description: 'Check how much of the contract has been inspected to verify whether exhaustive statements are safe.',
      parameters: z.object({
        documentId: z
          .string()
          .optional()
          .describe('The document ID to evaluate.'),
        inspectedSections: z
          .array(z.string())
          .optional()
          .default([])
          .describe('List of section numbers that have been read/inspected.'),
      }),
      execute: async ({
        documentId,
        inspectedSections = [],
      }: {
        documentId?: string;
        inspectedSections?: string[];
      }) => {
        const targetDocId = documentId || documentIds[0];
        const allSections = getDocumentSections(targetDocId, customDbPath);
        const total = allSections.length;
        const inspectedSet = new Set(inspectedSections.map((s) => s.toLowerCase().trim()));

        const matchedCount = allSections.filter((s) =>
          inspectedSet.has((s.sectionNumber || '').toLowerCase().trim())
        ).length;

        const isFullCoverage = total > 0 && matchedCount >= total;

        return {
          documentId: targetDocId,
          totalSections: total,
          inspectedCount: matchedCount,
          isFullCoverage,
          warning: !isFullCoverage
            ? `Only ${matchedCount} of ${total} sections inspected. Do NOT state that a clause does not exist unless you have searched or read all relevant sections.`
            : 'All sections inspected.',
        };
      },
    }),
  };
}
