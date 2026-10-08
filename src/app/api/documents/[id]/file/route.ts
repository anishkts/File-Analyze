import { NextRequest, NextResponse } from 'next/server';
import { getDocument } from '@/lib/db';
import fs from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = getDocument(id);
    if (!doc || !fs.existsSync(doc.filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(doc.filePath);
    const contentType =
      doc.fileType === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${doc.filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
