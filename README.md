# File Sharing Application

A simple file sharing application built with Next.js that allows users to upload and share files using a unique code.

## Features

- File upload with size limit
- Unique 6-character sharing code generation
- File download using sharing code
- 24-hour file expiration
- Download count tracking

## Deployment on Vercel

This application is configured to be deployed on Vercel with Vercel Blob Storage for file storage.

### Prerequisites

- A Vercel account
- Vercel CLI installed (optional for local deployment)

### Setup Steps

1. **Create a Vercel Blob Storage**

   - Go to your Vercel dashboard
   - Navigate to Storage section
   - Create a new Blob Storage instance
   - Copy the `BLOB_READ_WRITE_TOKEN`

2. **Set Environment Variables**

   - In your Vercel project settings, add the following environment variable:
     - `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob Storage token

3. **Deploy to Vercel**

   Using Vercel CLI:
   ```bash
   vercel
   ```

   Or connect your GitHub repository to Vercel for automatic deployments.

## Local Development

1. Clone the repository
2. Install dependencies
   ```bash
   npm install
   ```
3. Create a `.env.local` file with the following variables:
   ```
   BLOB_READ_WRITE_TOKEN=your_token_here
   ```
4. Run the development server
   ```bash
   npm run dev
   ```
