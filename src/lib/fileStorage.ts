import { list, del, head } from '@vercel/blob';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile, unlink } from 'fs/promises';

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadDate: string;
  path: string;
  code: string;
  downloads: number;
}

// We'll still keep metadata locally for simplicity
const METADATA_DIR = join(process.cwd(), 'data', 'metadata');

// Ensure metadata directory exists
export async function initStorage() {
  try {
    // Only create metadata directory as files will be stored in Vercel Blob
    mkdirSync(METADATA_DIR, { recursive: true });
    return true;
  } catch (error) {
    console.error('Error initializing storage directories:', error);
    throw error;
  }
}

// Save file metadata
export async function saveFileMetadata(metadata: FileMetadata) {
  try {
    const metadataPath = join(METADATA_DIR, `${metadata.code}.json`);
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    return metadata;
  } catch (error) {
    console.error('Error saving file metadata:', error);
    throw error;
  }
}

// Get file metadata by code
export async function getFileMetadata(code: string): Promise<FileMetadata | null> {
  try {
    const metadataPath = join(METADATA_DIR, `${code}.json`);
    if (!existsSync(metadataPath)) {
      return null;
    }
    const data = await readFile(metadataPath, 'utf-8');
    return JSON.parse(data) as FileMetadata;
  } catch (error) {
    console.error('Error reading file metadata:', error);
    return null;
  }
}

// Update file metadata
export async function updateFileMetadata(code: string, updates: Partial<FileMetadata>) {
  try {
    const metadata = await getFileMetadata(code);
    if (!metadata) {
      throw new Error('File not found');
    }
    const updatedMetadata = { ...metadata, ...updates };
    await saveFileMetadata(updatedMetadata);
    return updatedMetadata;
  } catch (error) {
    console.error('Error updating file metadata:', error);
    throw error;
  }
}

// Clean up expired files (older than 24 hours)
export async function cleanupExpiredFiles() {
  try {
    // List all blobs
    const blobs = await list();
    
    // Get current time
    const now = new Date();
    
    // Filter blobs older than 24 hours
    const expiredBlobs = blobs.blobs.filter(blob => {
      const uploadDate = new Date(blob.uploadedAt);
      const diffHours = (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60);
      return diffHours > 24;
    });
    
    // Delete expired blobs
    for (const blob of expiredBlobs) {
      await del(blob.url);
      console.log(`Deleted expired blob: ${blob.url}`);
      
      // Try to find and delete the corresponding metadata
      try {
        // Extract code from URL (this depends on how you structure your URLs)
        const urlParts = blob.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const code = filename.split('-')[0]; // Assuming code is the first part of the filename
        
        // Delete metadata file if it exists
        const metadataPath = join(METADATA_DIR, `${code}.json`);
        if (existsSync(metadataPath)) {
          await unlink(metadataPath);
          console.log(`Deleted metadata for expired blob: ${code}`);
        }
      } catch (metadataError) {
        console.error('Error deleting metadata for expired blob:', metadataError);
      }
    }
    
    return expiredBlobs.length;
  } catch (error) {
    console.error('Error cleaning up expired files:', error);
    return 0;
  }
}