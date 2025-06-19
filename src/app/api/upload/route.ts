import { NextRequest, NextResponse } from 'next/server';
import { initStorage, saveFileMetadata } from '@/lib/fileStorage';
import crypto from 'crypto';
import { put } from '@vercel/blob';

// New route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Generate a unique ID
function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    // Log environment check
    console.log('Environment check:', {
      hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 10),
      env: process.env.NODE_ENV
    });

    // Initialize storage
    await initStorage();

    const data = await request.formData();
    const file = data.get('file');
    const code = data.get('code') as string;

    if (!file || !(file instanceof Blob)) {
      console.error('No file received in request');
      return NextResponse.json(
        { error: 'No file received.' },
        { status: 400 }
      );
    }

    if (!code) {
      console.error('No code provided');
      return NextResponse.json(
        { error: 'No sharing code provided.' },
        { status: 400 }
      );
    }

    // Log file details
    console.log('Received file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      code
    });

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate safe filename
    const fileExtension = file.name.split('.').pop() || '';
    const safeFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

    try {
      console.log('Starting Vercel Blob upload...');
      
      // Upload file to Vercel Blob Storage
      const { url } = await put(safeFilename, buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType: file.type || 'application/octet-stream'
      });
      
      console.log('File uploaded successfully to Vercel Blob:', url);

      // Save file metadata
      const metadata = {
        id: generateId(),
        filename: safeFilename,
        originalName: file.name,
        mimetype: file.type || 'application/octet-stream',
        size: file.size,
        uploadDate: new Date().toISOString(),
        path: url,
        code: code,
        downloads: 0
      };

      await saveFileMetadata(metadata);
      console.log('File metadata saved:', metadata.id);

      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        fileId: metadata.id,
        code: metadata.code,
        url: url
      });

    } catch (error) {
      // Detailed error logging
      console.error('Upload error details:', {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error,
        blobToken: process.env.BLOB_READ_WRITE_TOKEN ? 'Present' : 'Missing'
      });

      return NextResponse.json(
        { 
          error: 'Error saving file',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    // Detailed error logging for outer try-catch
    console.error('Request processing error:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error,
      blobToken: process.env.BLOB_READ_WRITE_TOKEN ? 'Present' : 'Missing'
    });

    return NextResponse.json(
      { 
        error: 'Error processing upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}