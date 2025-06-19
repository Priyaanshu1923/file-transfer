import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { unlink } from 'fs/promises';

const METADATA_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/metadata'
  : join(process.cwd(), 'data', 'metadata');

export async function GET(req: Request) {
  // Secure with CRON_SECRET
  if (process.env.CRON_SECRET) {
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  const now = Date.now();
  let deleted = 0;

  if (!existsSync(METADATA_DIR)) {
    return NextResponse.json({ deleted, message: 'No metadata directory found.' });
  }

  const files = readdirSync(METADATA_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = join(METADATA_DIR, file);
    const metadata = JSON.parse(require('fs').readFileSync(filePath, 'utf-8'));
    const uploadTime = new Date(metadata.uploadDate).getTime();

    // If file is older than 2 minutes (120,000 ms)
    if (now - uploadTime > 2 * 60 * 1000) {
      try {
        await del(metadata.path); // Delete from Vercel Blob
        await unlink(filePath);   // Delete metadata
        deleted++;
      } catch (err) {
        // Log error but continue
        console.error('Cleanup error:', err);
      }
    }
  }

  return NextResponse.json({ deleted });
}