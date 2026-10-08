import { describe, it, expect } from 'vitest';
import { compareClauses, classifySignificance } from '../src/lib/comparison/differ';

describe('Document Comparison Engine', () => {
  it('identifies unchanged, modified, added, and deleted clauses', () => {
    const clausesA = [
      { sectionNumber: '1.1', title: 'Term', content: 'This agreement lasts 1 year.' },
      { sectionNumber: '2.0', title: 'Payment', content: 'Invoices payable in 30 days.' },
      { sectionNumber: '3.0', title: 'Old Clause', content: 'Will be removed in next version.' },
    ];

    const clausesB = [
      { sectionNumber: '1.1', title: 'Term', content: 'This agreement lasts 3 years.' },
      { sectionNumber: '2.0', title: 'Payment', content: 'Invoices payable in 30 days.' },
      { sectionNumber: '4.0', title: 'New Indemnity', content: 'Supplier indemnifies customer.' },
    ];

    const diff = compareClauses(clausesA, clausesB);
    expect(diff.length).toBe(4);

    const termDiff = diff.find((d) => d.sectionNumber === '1.1');
    expect(termDiff?.status).toBe('modified');
    expect(termDiff?.significance).toBeDefined();

    const paymentDiff = diff.find((d) => d.sectionNumber === '2.0');
    expect(paymentDiff?.status).toBe('unchanged');

    const addedDiff = diff.find((d) => d.sectionNumber === '4.0');
    expect(addedDiff?.status).toBe('added');

    const deletedDiff = diff.find((d) => d.sectionNumber === '3.0');
    expect(deletedDiff?.status).toBe('deleted');
  });

  it('classifies liability, indemnity, or financial limits as HIGH significance', () => {
    const sig1 = classifySignificance('Limitation of Liability', 'Liability capped at AED 100k', 'Liability uncapped');
    expect(sig1.level).toBe('high');

    const sig2 = classifySignificance('Payment Notice', 'Notice of 14 days', 'Notice of 30 days');
    expect(sig2.level).toBe('medium');

    const sig3 = classifySignificance('Headings', 'The supplier shall provide', 'The Supplier will provide');
    expect(sig3.level).toBe('low');
  });
});
