import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/parsers';
import { insertDocument, insertSections, insertPages } from '@/lib/db';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const filename = file.name;
    const lowerName = filename.toLowerCase();

    // 1. Validate file extension
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx')) {
      return NextResponse.json(
        {
          error: `Invalid file type "${filename}". Only PDF (.pdf) and Word (.docx) documents are supported.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const documentId = `doc-${crypto.randomUUID()}`;
    const fileType = lowerName.endsWith('.pdf') ? 'pdf' : 'docx';

    // 2. Parse text and check scanned status
    const parsed = await parseDocument(buffer, filename, file.type, documentId);

    if (parsed.isScanned) {
      return NextResponse.json(
        {
          error:
            'Scanned document detected: This PDF contains image data but no machine-readable selectable text. Please upload an OCR-processed PDF or DOCX file.',
          isScanned: true,
        },
        { status: 422 }
      );
    }

    // 3. Save physical file to disk
    const uploadsDir =
      process.env.UPLOADS_DIR ||
      (process.env.VERCEL ? '/tmp/uploads' : path.resolve(process.cwd(), 'data/uploads'));
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const safeFilename = `${documentId}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeFilename);
    fs.writeFileSync(filePath, buffer);

    // 4. Store in database
    insertDocument({
      id: documentId,
      filename,
      fileType,
      filePath,
      fileSize: file.size,
      pageCount: parsed.pageCount,
      extractedText: parsed.text,
      isScanned: 0,
      htmlContent: parsed.htmlContent,
    });

    if (parsed.pages && parsed.pages.length > 0) {
      insertPages(
        parsed.pages.map((p) => ({
          id: `${documentId}-p-${p.pageNumber}`,
          documentId,
          pageNumber: p.pageNumber,
          startChar: p.startChar,
          endChar: p.endChar,
        }))
      );
    }

    if (parsed.sections && parsed.sections.length > 0) {
      const dbSections = parsed.sections.map((s, idx) => ({
        id: `${documentId}-sec-${idx + 1}`,
        documentId,
        sectionNumber: s.sectionNumber,
        title: s.title,
        content: s.content,
        startChar: s.startChar,
        endChar: s.endChar,
        pageNumber: s.pageNumber,
      }));
      insertSections(dbSections);
    }

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        filename,
        fileType,
        pageCount: parsed.pageCount,
        sectionCount: parsed.sections.length,
        fileSize: file.size,
      },
    });
  } catch (error: any) {
    console.error('Upload processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process document' },
      { status: 500 }
    );
  }
}
