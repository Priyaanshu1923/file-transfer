'use client';

import { useState } from 'react';

type Mode = 'select' | 'send' | 'receive';

interface UploadResult {
  success?: boolean;
  fileId?: string;
  code?: string;
  error?: string;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('select');
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (e.g., 100MB limit)
      if (selectedFile.size > 100 * 1024 * 1024) {
        alert('File size must be less than 100MB');
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const generateRandomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Generate a random 6-character code
      const code = generateRandomCode();
      formData.append('code', code);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadResult({ ...result, code });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({ 
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!code.trim()) return;

    setIsLoading(true);
    setDownloadError(null);

    try {
      const response = await fetch(`/api/download/${code.trim()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid code');
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'downloaded-file';

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadError(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-12">
          File Transfer
        </h1>

        {mode === 'select' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('send')}
              className="p-8 text-center bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="text-5xl mb-4">📤</div>
              <h2 className="text-2xl font-semibold text-gray-800">Send File</h2>
              <p className="mt-2 text-gray-600">Upload and share files</p>
            </button>

            <button
              onClick={() => setMode('receive')}
              className="p-8 text-center bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="text-5xl mb-4">📥</div>
              <h2 className="text-2xl font-semibold text-gray-800">Receive File</h2>
              <p className="mt-2 text-gray-600">Download shared files</p>
            </button>
        </div>
        )}

        {mode === 'send' && (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <button
              onClick={() => {
                setMode('select');
                setFile(null);
                setUploadResult(null);
              }}
              className="mb-6 text-gray-600 hover:text-gray-800 flex items-center"
            >
              ← Back to Menu
            </button>

            <div className="mb-6">
              <label className="block text-lg font-medium text-gray-700 mb-4">
                Select a file to share
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg
                  hover:border-blue-500 transition-colors duration-300
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected file: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || isLoading}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium
                ${!file || isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors duration-300`}
            >
              {isLoading ? 'Processing...' : 'Generate Sharing Code'}
            </button>

            {uploadResult && (
              <div className="mt-6">
                {uploadResult.error ? (
                  <div className="p-4 bg-red-50 rounded-lg text-red-600">
                    Error: {uploadResult.error}
                  </div>
                ) : (
                  <div className="p-6 bg-green-50 rounded-lg text-center">
                    <p className="text-green-800 mb-4">File uploaded successfully!</p>
                    <div className="text-4xl font-bold text-gray-800 mb-4">
                      {uploadResult.code}
                    </div>
                    <p className="text-sm text-gray-600">
                      Share this code with someone to let them download your file.<br />
                      This code will expire in 24 hours.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'receive' && (
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <button
              onClick={() => {
                setMode('select');
                setCode('');
                setDownloadError(null);
              }}
              className="mb-6 text-gray-600 hover:text-gray-800 flex items-center"
            >
              ← Back to Menu
            </button>

            <div className="mb-6">
              <label className="block text-lg font-medium text-gray-700 mb-4">
                Enter the sharing code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                maxLength={6}
              />
            </div>

            <button
              onClick={handleDownload}
              disabled={!code.trim() || isLoading}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium
                ${!code.trim() || isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors duration-300`}
            >
              {isLoading ? 'Downloading...' : 'Download File'}
            </button>

            {downloadError && (
              <div className="mt-6 p-4 bg-red-50 rounded-lg text-red-600">
                {downloadError}
              </div>
            )}
          </div>
        )}
    </div>
    </main>
  );
}
