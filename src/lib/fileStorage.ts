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

// Use tmp directory in production, data directory in development
const METADATA_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/metadata'
  : join(process.cwd(), 'data', 'metadata');

// Ensure metadata directory exists
export async function initStorage() {
  try {
    console.log('Initializing storage in directory:', METADATA_DIR);
    
    // Create metadata directory with proper permissions
    mkdirSync(METADATA_DIR, { recursive: true, mode: 0o777 });
    
    // Verify directory was created
    if (!existsSync(METADATA_DIR)) {
      throw new Error(`Failed to create metadata directory: ${METADATA_DIR}`);
    }
    
    console.log('Storage initialized successfully');
    return true;
  } catch (error) {
    console.error('Storage initialization error:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error,
      directory: METADATA_DIR
    });
    
    // Don't throw in production
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    return false;
  }
}

// Save file metadata
export async function saveFileMetadata(metadata: FileMetadata) {
  try {
    console.log('Saving metadata for file:', metadata.filename);
    
    const metadataPath = join(METADATA_DIR, `${metadata.code}.json`);
    console.log('Metadata path:', metadataPath);
    
    // Ensure directory exists before writing
    mkdirSync(METADATA_DIR, { recursive: true, mode: 0o777 });
    
    // Write metadata with full permissions
    await writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      { mode: 0o666 }
    );
    
    // Verify file was written
    if (!existsSync(metadataPath)) {
      throw new Error(`Failed to write metadata file: ${metadataPath}`);
    }
    
    console.log('Metadata saved successfully');
    return metadata;
  } catch (error) {
    console.error('Metadata save error:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error,
      path: join(METADATA_DIR, `${metadata.code}.json`)
    });
    
    // In production, continue even if metadata saving fails
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    return metadata;
  }
}

// Get file metadata by code
export async function getFileMetadata(code: string): Promise<FileMetadata | null> {
  try {
    console.log('Getting metadata for code:', code);
    
    const metadataPath = join(METADATA_DIR, `${code}.json`);
    console.log('Looking for metadata at:', metadataPath);
    
    if (!existsSync(metadataPath)) {
      console.log('Metadata file not found');
      return null;
    }
    
    const data = await readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(data) as FileMetadata;
    console.log('Metadata retrieved successfully');
    return metadata;
  } catch (error) {
    console.error('Metadata read error:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error,
      code,
      path: join(METADATA_DIR, `${code}.json`)
    });
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