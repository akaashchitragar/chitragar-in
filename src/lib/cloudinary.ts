// Server-side Cloudinary configuration (only import on server)
let cloudinary: typeof import('cloudinary').v2 | null = null;
if (typeof window === 'undefined') {
  // Only import and configure on server-side
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { v2 } = require('cloudinary');
  cloudinary = v2;
  
  if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET && cloudinary) {
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

// Client-side image transformation helpers
export const getOptimizedImageUrl = (
  publicId: string,
  options: {
    width?: number
    height?: number
    quality?: number | 'auto'
    format?: 'auto' | 'webp' | 'jpg' | 'png'
    crop?: 'fill' | 'fit' | 'scale' | 'crop' | 'thumb'
    gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west'
  } = {}
) => {
  // Validate publicId first
  if (!publicId || typeof publicId !== 'string' || publicId.trim() === '') {
    console.warn('Invalid publicId provided to getOptimizedImageUrl:', publicId);
    return '';
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto'
  } = options;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.warn('Cloudinary cloud name not configured');
    return '';
  }

  const transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  if (crop) transformations.push(`c_${crop}`);
  if (gravity && crop !== 'scale') transformations.push(`g_${gravity}`);

  const transformString = transformations.length > 0 ? `${transformations.join(',')}` : '';
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`;
};

// Predefined image sizes for responsive loading
export const imageSizes = {
  thumbnail: { width: 300, height: 300, crop: 'fill' as const },
  small: { width: 600, height: 400, crop: 'fit' as const },
  medium: { width: 1200, height: 800, crop: 'fit' as const },
  large: { width: 1920, height: 1080, crop: 'fit' as const },
  fullscreen: { width: 2560, height: 1440, crop: 'fit' as const }
};

// Generate responsive image URLs
export const getResponsiveImageUrls = (publicId: string) => {
  return {
    thumbnail: getOptimizedImageUrl(publicId, imageSizes.thumbnail),
    small: getOptimizedImageUrl(publicId, imageSizes.small),
    medium: getOptimizedImageUrl(publicId, imageSizes.medium),
    large: getOptimizedImageUrl(publicId, imageSizes.large),
    fullscreen: getOptimizedImageUrl(publicId, imageSizes.fullscreen),
    original: getOptimizedImageUrl(publicId)
  };
};

// Server-side upload function (for API routes)
export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  options: {
    folder?: string;
    public_id?: string;
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
    transformation?: Record<string, unknown>;
  } = {}
): Promise<{
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  url: string;
}> => {
  if (!cloudinary) {
    throw new Error('Cloudinary not configured - this function can only be used on the server');
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'auto' as const,
      folder: 'photo-gallery',
      ...options,
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error: unknown, result: unknown) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else if (result && typeof result === 'object' && result !== null) {
          const uploadResult = result as {
            public_id: string;
            secure_url: string;
            width: number;
            height: number;
            format: string;
            bytes: number;
            url: string;
          };
          resolve({
            public_id: uploadResult.public_id,
            secure_url: uploadResult.secure_url,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
            url: uploadResult.url,
          });
        } else {
          reject(new Error('Upload failed - no result'));
        }
      }
    ).end(fileBuffer);
  });
};

// Client-side upload function (using upload preset)
export const uploadToCloudinaryClient = async (
  file: File,
  uploadPreset: string = 'photo-gallery'
): Promise<{
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload to Cloudinary');
  }

  const result = await response.json();
  
  return {
    public_id: result.public_id,
    secure_url: result.secure_url,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
};

// Export cloudinary instance for server-side use only
export default cloudinary;
