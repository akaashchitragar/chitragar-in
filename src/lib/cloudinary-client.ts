// Client-side only Cloudinary utilities
// This file should only contain functions that work in the browser

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

// Client-side upload function (using our API route)
export const uploadToCloudinaryClient = async (
  file: File
): Promise<{
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'photo-gallery');

  const response = await fetch('/api/cloudinary/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cloudinary upload failed:', response.status, errorText);
    throw new Error(`Failed to upload to Cloudinary: ${response.status} ${errorText}`);
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
