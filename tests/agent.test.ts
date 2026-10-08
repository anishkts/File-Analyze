import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createContractTools } from '../src/lib/agent/tools';
import { getDb, insertDocument, insertSections } from '../src/lib/db';
import path from 'path';
import fs from 'fs';

describe('Agentic Document Research Tools', () => {
  const testDbPath = path.resolve(__dirname, '../data/test-agent.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    insertDocument(
      {
        id: 'doc-agent-1',
        filename: 'contract.pdf',
        fileType: 'pdf',
        filePath: '/uploads/contract.pdf',
        fileSize: 2048,
        pageCount: 10,
        extractedText: 'Full contract text here...',
        isScanned: 0,
      },
      testDbPath
    );

    insertSections(
      [
        {
          id: 'sec-1',
          documentId: 'doc-agent-1',
          sectionNumber: 'Section 1',
          title: 'Definitions',
          content: 'Applicable law and defined terms.',
          startChar: 0,
          endChar: 40,
          pageNumber: 1,
        },
        {
          id: 'sec-8',
          documentId: 'doc-agent-1',
          sectionNumber: 'Section 8',
          title: 'Termination for Cause',
          content: 'Either party may terminate immediately on material breach.',
          startChar: 41,
          endChar: 110,
          pageNumber: 4,
        },
      ],
      testDbPath
    );
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {}
    }
  });

  it('provides list_clauses, search_document, get_section, and check_coverage', async () => {
    const tools = createContractTools(['doc-agent-1'], testDbPath);
    expect(tools.list_clauses).toBeDefined();
    expect(tools.search_document).toBeDefined();
    expect(tools.get_section).toBeDefined();
    expect(tools.check_coverage).toBeDefined();

    // 1. list_clauses
    const clausesResult = await tools.list_clauses.execute({ documentId: 'doc-agent-1' });
    expect(clausesResult.clauses.length).toBe(2);
    expect(clausesResult.clauses[1].sectionNumber).toBe('Section 8');

    // 2. search_document
    const searchResult = await tools.search_document.execute({
      documentId: 'doc-agent-1',
      query: 'material breach',
    });
    expect(searchResult.matches.length).toBe(1);
    expect(searchResult.matches[0].sectionNumber).toBe('Section 8');

    // 3. get_section
    const secResult = await tools.get_section.execute({
      documentId: 'doc-agent-1',
      sectionNumberOrTitle: 'Section 8',
    });
    expect(secResult.found).toBe(true);
    expect(secResult.section?.content).toContain('material breach');

    // 4. check_coverage
    const coverageResult = await tools.check_coverage.execute({
      documentId: 'doc-agent-1',
      inspectedSections: ['Section 8'],
    });
    expect(coverageResult.totalSections).toBe(2);
    expect(coverageResult.inspectedCount).toBe(1);
    expect(coverageResult.isFullCoverage).toBe(false);
  });

  it('handles malformed or missing sections gracefully without throwing', async () => {
    const tools = createContractTools(['doc-agent-1'], testDbPath);
    const result = await tools.get_section.execute({
      documentId: 'doc-agent-1',
      sectionNumberOrTitle: 'Section 99 NonExistent',
    });
    expect(result.found).toBe(false);
    expect(result.message).toContain('not found');
  });
});
