import { NextRequest, NextResponse } from 'next/server';
import { getFileMetadata, updateFileMetadata } from '@/lib/fileStorage';
import { get } from '@vercel/blob';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const metadata = await getFileMetadata(params.code);
    
    if (!metadata) {
      return NextResponse.json(
        { error: 'Invalid code or file has expired' },
        { status: 404 }
      );
    }

    // Check if file is expired (24 hours)
    const uploadDate = new Date(metadata.uploadDate);
    const now = new Date();
    const diffHours = (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours > 24) {
      return NextResponse.json(
        { error: 'File has expired' },
        { status: 410 }
      );
    }

    try {
      // Increment download count
      await updateFileMetadata(metadata.code, {
        downloads: metadata.downloads + 1
      });
      
      // For Vercel Blob, we can redirect to the blob URL
      // This is more efficient than fetching the blob and then serving it
      const blobUrl = metadata.path;
      
      // Set appropriate headers for file download
      const headers = new Headers();
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(metadata.originalName)}"`);
      
      // Redirect to the blob URL
      return NextResponse.redirect(blobUrl);
    } catch (error) {
      console.error('Error reading file:', error);
      return NextResponse.json(
        { error: 'Error reading file from disk' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Error processing download' },
      { status: 500 }
    );
  }
}