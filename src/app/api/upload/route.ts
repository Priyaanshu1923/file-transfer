import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { initStorage, saveFileMetadata } from '@/lib/fileStorage';
import crypto from 'crypto';
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Generate a unique ID
function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
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

    // Generate safe filename
    const fileExtension = file.name.split('.').pop() || '';
    const safeFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

    try {
      // Upload file to Vercel Blob Storage
      const { url } = await put(safeFilename, file, {
        access: 'public',
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
        path: url, // Store the Blob URL instead of local path
        code: code,
        downloads: 0
      };

      await saveFileMetadata(metadata);
      console.log('File metadata saved:', metadata.id);

      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        fileId: metadata.id,
        code: metadata.code
      });

    } catch (error) {
      console.error('Error saving file:', error);
      return NextResponse.json(
        { error: 'Error saving file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Error processing upload' },
      { status: 500 }
    );
  }
}