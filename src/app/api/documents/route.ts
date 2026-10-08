import { NextResponse } from 'next/server';
import { listDocuments } from '@/lib/db';

export async function GET() {
  try {
    const docs = listDocuments();
    return NextResponse.json({
      documents: docs.map((d) => ({
        id: d.id,
        filename: d.filename,
        fileType: d.fileType,
        fileSize: d.fileSize,
        pageCount: d.pageCount,
        isScanned: d.isScanned,
        createdAt: d.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
