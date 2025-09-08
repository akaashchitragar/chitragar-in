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
    progressive?: boolean
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
    gravity = 'auto',
    progressive = true
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
  if (progressive) transformations.push('fl_progressive');

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

// Helper function to compress image if it's too large
const compressImage = (file: File, maxSizeBytes: number = 5 * 1024 * 1024): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (file.size <= maxSizeBytes) {
      resolve(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions to reduce file size
      let { width, height } = img;
      const maxDimension = 1920; // Max width or height

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try different quality levels to get under the size limit
      let quality = 0.8;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            if (blob.size <= maxSizeBytes || quality <= 0.1) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          'image/jpeg',
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
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
  try {
    // Compress the image if it's too large
    const maxSize = 5 * 1024 * 1024; // 5MB
    const processedFile = await compressImage(file, maxSize);

    const formData = new FormData();
    formData.append('file', processedFile);
    formData.append('folder', 'photo-gallery');

    const response = await fetch('/api/cloudinary/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary upload failed:', response.status, errorText);
      
      // Parse error message from server
      let errorMessage = 'Failed to upload image';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If parsing fails, use the raw text or default message
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
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
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
