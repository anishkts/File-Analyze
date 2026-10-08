import { NextRequest, NextResponse } from 'next/server';
import { getDocument, deleteDocument, getDocumentSections } from '@/lib/db';
import fs from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const sections = getDocumentSections(id);

    return NextResponse.json({
      document: doc,
      sections,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Remove file if exists
    if (fs.existsSync(doc.filePath)) {
      try {
        fs.unlinkSync(doc.filePath);
      } catch (e) {}
    }

    deleteDocument(id);
    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
