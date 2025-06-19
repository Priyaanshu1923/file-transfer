import { NextRequest, NextResponse } from 'next/server';
import { saveFileMetadata } from '@/lib/fileStorage';
import crypto from 'crypto';

function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { url, code, originalName, mimetype, size } = await request.json();

    const metadata = {
      id: generateId(),
      filename: url.split('/').pop(),
      originalName,
      mimetype,
      size,
      uploadDate: new Date().toISOString(),
      path: url,
      code,
      downloads: 0,
    };

    await saveFileMetadata(metadata);

    return NextResponse.json({ success: true, metadata });
  } catch (error) {
    return NextResponse.json({ error: 'Error saving metadata' }, { status: 500 });
  }
} 