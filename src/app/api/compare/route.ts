import { NextRequest, NextResponse } from 'next/server';
import { getDocument, getDocumentSections } from '@/lib/db';
import { compareClauses } from '@/lib/comparison/differ';
import { ComparisonReport } from '@/lib/comparison/types';

export async function POST(req: NextRequest) {
  try {
    const { documentAId, documentBId } = await req.json();

    if (!documentAId || !documentBId) {
      return NextResponse.json(
        { error: 'Both documentAId and documentBId are required' },
        { status: 400 }
      );
    }

    const docA = getDocument(documentAId);
    const docB = getDocument(documentBId);

    if (!docA || !docB) {
      return NextResponse.json({ error: 'One or both documents not found' }, { status: 404 });
    }

    const sectionsA = getDocumentSections(documentAId);
    const sectionsB = getDocumentSections(documentBId);

    const diffs = compareClauses(sectionsA, sectionsB);

    const stats = {
      totalClauses: diffs.length,
      unchangedCount: diffs.filter((d) => d.status === 'unchanged').length,
      modifiedCount: diffs.filter((d) => d.status === 'modified').length,
      addedCount: diffs.filter((d) => d.status === 'added').length,
      deletedCount: diffs.filter((d) => d.status === 'deleted').length,
      highSignificanceCount: diffs.filter((d) => d.significance?.level === 'high').length,
    };

    const summary = `Comparison between "${docA.filename}" and "${docB.filename}": Identified ${stats.modifiedCount} modified clauses, ${stats.addedCount} newly added clauses, and ${stats.deletedCount} deleted clauses (${stats.highSignificanceCount} high-significance changes).`;

    const report: ComparisonReport = {
      documentAId,
      documentBId,
      documentAName: docA.filename,
      documentBName: docB.filename,
      summary,
      diffs,
      stats,
    };

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Comparison error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
