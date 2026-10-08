import { ClauseDiffItem, SignificanceLevel } from './types';

export function classifySignificance(
  title: string,
  contentA: string = '',
  contentB: string = ''
): { level: SignificanceLevel; summary: string } {
  const combined = `${title} ${contentA} ${contentB}`.toLowerCase();

  // High significance keywords
  const highKeywords = [
    'liability',
    'indemn',
    'damages',
    'cap',
    'terminate',
    'termination',
    'governing law',
    'jurisdiction',
    'intellectual property',
    'warranty',
  ];

  // Check if financial numbers / amounts changed
  const numbersA = contentA.match(/\b(?:\d+[,.]?)+\b/g) || [];
  const numbersB = contentB.match(/\b(?:\d+[,.]?)+\b/g) || [];
  const numberChanged = JSON.stringify(numbersA) !== JSON.stringify(numbersB);

  // Financial currency cues
  const hasCurrency = /[$€£]|AED|USD|EUR|GBP|dollars?|dirhams?/i.test(combined);

  const hasHighKeyword = highKeywords.some((k) => combined.includes(k));
  const isHigh = hasHighKeyword || (numberChanged && hasCurrency);

  if (isHigh) {
    let summary = 'Material legal or commercial shift detected';
    if (numberChanged && hasCurrency) {
      summary = 'Commercial values, financial caps, or liability thresholds were altered.';
    } else if (combined.includes('liability')) {
      summary = 'Key liability risk allocation or liability exclusions were modified.';
    } else if (combined.includes('termination')) {
      summary = 'Termination rights, cause conditions, or exit remedies were changed.';
    } else if (combined.includes('indemn')) {
      summary = 'Indemnification scope or defense obligations were revised.';
    }
    return { level: 'high', summary };
  }

  // Medium significance keywords
  const mediumKeywords = [
    'notice',
    'payment',
    'days',
    'invoice',
    'renewal',
    'audit',
    'confidential',
  ];
  const isMedium = mediumKeywords.some((k) => combined.includes(k)) || numberChanged;

  if (isMedium) {
    return {
      level: 'medium',
      summary: 'Operational or procedural terms (such as notice days or payment schedules) were modified.',
    };
  }

  return {
    level: 'low',
    summary: 'Clarification, stylistic rephrasing, or non-material formatting update.',
  };
}

export function compareClauses(
  clausesA: Array<{ sectionNumber?: string; title?: string; content: string }>,
  clausesB: Array<{ sectionNumber?: string; title?: string; content: string }>
): ClauseDiffItem[] {
  const diffs: ClauseDiffItem[] = [];
  const bMatched = new Set<number>();

  for (let i = 0; i < clausesA.length; i++) {
    const a = clausesA[i];
    const aNum = (a.sectionNumber || '').toLowerCase().trim();
    const aTitle = (a.title || '').toLowerCase().trim();

    // Find match in B
    let bIndex = clausesB.findIndex((b, idx) => {
      if (bMatched.has(idx)) return false;
      const bNum = (b.sectionNumber || '').toLowerCase().trim();
      const bTitle = (b.title || '').toLowerCase().trim();
      return (aNum && aNum === bNum) || (aTitle && aTitle === bTitle);
    });

    if (bIndex !== -1) {
      bMatched.add(bIndex);
      const b = clausesB[bIndex];
      const normA = a.content.replace(/\s+/g, ' ').trim();
      const normB = b.content.replace(/\s+/g, ' ').trim();

      if (normA === normB) {
        diffs.push({
          id: `diff-${i}`,
          sectionNumber: a.sectionNumber || `Section ${i + 1}`,
          title: a.title || 'Clause',
          status: 'unchanged',
          contentA: a.content,
          contentB: b.content,
        });
      } else {
        const sig = classifySignificance(a.title || a.sectionNumber || '', a.content, b.content);
        diffs.push({
          id: `diff-${i}`,
          sectionNumber: a.sectionNumber || `Section ${i + 1}`,
          title: a.title || 'Clause',
          status: 'modified',
          contentA: a.content,
          contentB: b.content,
          significance: sig,
        });
      }
    } else {
      // In A, but not in B -> Deleted
      diffs.push({
        id: `diff-del-${i}`,
        sectionNumber: a.sectionNumber || `Section ${i + 1}`,
        title: a.title || 'Clause',
        status: 'deleted',
        contentA: a.content,
        significance: {
          level: 'high',
          summary: 'Clause completely removed from the subsequent contract version.',
        },
      });
    }
  }

  // Any remaining in B -> Added
  for (let j = 0; j < clausesB.length; j++) {
    if (!bMatched.has(j)) {
      const b = clausesB[j];
      diffs.push({
        id: `diff-add-${j}`,
        sectionNumber: b.sectionNumber || `Section ${j + 1}`,
        title: b.title || 'Clause',
        status: 'added',
        contentB: b.content,
        significance: {
          level: 'high',
          summary: 'New clause introduced in the subsequent contract version.',
        },
      });
    }
  }

  return diffs;
}
