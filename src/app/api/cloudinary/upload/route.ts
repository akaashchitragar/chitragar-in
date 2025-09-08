import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

// Configure the API route for larger file uploads
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds timeout

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'photo-gallery';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (AWS Amplify has a 6MB limit for API routes)
    const maxSize = 5 * 1024 * 1024; // 5MB to be safe
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Please compress the image or use a smaller file (max 5MB).' 
      }, { status: 413 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, {
      folder: folder,
      resource_type: 'auto',
    });

    return NextResponse.json({
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
