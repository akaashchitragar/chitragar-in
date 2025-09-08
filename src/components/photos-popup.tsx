'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Grid, Play, Pause, ArrowLeft, Search, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { albumsApi, photosApi, Album, Photo } from '@/lib/supabase';
import { getOptimizedImageUrl } from '@/lib/cloudinary-client';
import { useWindowManager } from './window-manager';
import { getCenterPosition } from '@/lib/utils';

interface PhotosPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdaptiveImageSliderProps {
  photos: Photo[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isAutoplay: boolean;
}

const AdaptiveImageSlider: React.FC<AdaptiveImageSliderProps> = ({ 
  photos, 
  currentIndex, 
  onIndexChange, 
  isAutoplay
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const currentPhoto = photos[currentIndex];

  // Auto-play functionality
  useEffect(() => {
    if (isAutoplay && photos.length > 1) {
      autoplayRef.current = setInterval(() => {
        onIndexChange((currentIndex + 1) % photos.length);
      }, 3000);
    } else {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    }

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [isAutoplay, currentIndex, photos.length, onIndexChange]);

  // Reset loading state when photo changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setImageDimensions(null);
  }, [currentIndex]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
    console.warn('Failed to load photo:', currentPhoto?.cloudinary_public_id);
  };

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    onIndexChange(newIndex);
  };

  const goToNext = () => {
    const newIndex = (currentIndex + 1) % photos.length;
    onIndexChange(newIndex);
  };

  // Determine image orientation and calculate optimal display size
  const getImageDisplayInfo = () => {
    if (!imageDimensions) {
      return {
        orientation: 'unknown',
        containerStyle: {},
        imageStyle: {}
      };
    }

    const { width, height } = imageDimensions;
    const aspectRatio = width / height;
    
    // Available container space (accounting for padding and UI elements)
    const maxWidth = 900;  // Increased for larger window
    const maxHeight = 550; // Increased for larger window
    
    let orientation: 'portrait' | 'landscape' | 'square';
    let displayWidth: number;
    let displayHeight: number;

    if (aspectRatio > 1.3) {
      orientation = 'landscape';
      // For landscape images, fit to width first
      displayWidth = Math.min(maxWidth, width);
      displayHeight = displayWidth / aspectRatio;
      
      // If height exceeds container, scale down
      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = displayHeight * aspectRatio;
      }
    } else if (aspectRatio < 0.75) {
      orientation = 'portrait';
      // For portrait images, fit to height first
      displayHeight = Math.min(maxHeight, height);
      displayWidth = displayHeight * aspectRatio;
      
      // If width exceeds container, scale down
      if (displayWidth > maxWidth) {
        displayWidth = maxWidth;
        displayHeight = displayWidth / aspectRatio;
      }
    } else {
      orientation = 'square';
      // For square-ish images, fit to the smaller dimension
      const maxSize = Math.min(maxWidth, maxHeight);
      displayWidth = Math.min(maxSize, width);
      displayHeight = Math.min(maxSize, height);
    }

    return {
      orientation,
      containerStyle: {
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
      },
      imageStyle: {
        width: displayWidth,
        height: displayHeight,
      }
    };
  };

  const displayInfo = getImageDisplayInfo();

  if (!currentPhoto) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/20 backdrop-blur-md">
      {/* Loading State */}
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white"></div>
            <p className="text-white/70 text-sm">Loading image...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {imageError && (
        <div className="flex items-center justify-center text-white/70">
          <p>Failed to load image</p>
        </div>
      )}

      {/* Image Container */}
      {!imageError && (
        <div 
          className={`relative transition-all duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
          style={displayInfo.containerStyle}
        >
          <Image
            src={getOptimizedImageUrl(currentPhoto.cloudinary_public_id, {
              width: displayInfo.imageStyle.width || 900,
              height: displayInfo.imageStyle.height || 550,
              quality: 85, // Optimized quality for faster loading
              format: 'webp',
              progressive: true
            })}
            alt={currentPhoto.alt_text || currentPhoto.title || `Photo ${currentIndex + 1}`}
            width={displayInfo.imageStyle.width || 900}
            height={displayInfo.imageStyle.height || 550}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="object-contain w-full h-full rounded-lg shadow-2xl"
            priority={true}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 900px"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
        </div>
      )}

      {/* Navigation Buttons */}
      {photos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-all duration-200 shadow-lg border border-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-all duration-200 shadow-lg border border-white/20"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => onIndexChange(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PhotosPopup: React.FC<PhotosPopupProps> = ({ isOpen, onClose }) => {
  // Window management
  const [position, setPosition] = useState(() => getCenterPosition(1000, 750));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { getZIndex, bringToFront } = useWindowManager();
  const windowId = 'photos-popup';

  // App state
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    bringToFront(windowId);
    
    // Don't start dragging if clicking on close button or other interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'INPUT') {
      return;
    }
    
    if (e.target === popupRef.current || (e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart.x, dragStart.y]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Load albums on component mount
  useEffect(() => {
    if (isOpen) {
      loadAlbums();
    }
  }, [isOpen]);

  // Load photos when album is selected
  useEffect(() => {
    if (selectedAlbum) {
      loadPhotos(selectedAlbum.id);
    }
  }, [selectedAlbum]);

  // Navigation functions
  const goToNext = useCallback(() => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentPhotoIndex((prev) => prev === 0 ? photos.length - 1 : prev - 1);
  }, [photos.length]);

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay(!isAutoplay);
  }, [isAutoplay]);

  // Preload adjacent images for smoother slideshow navigation
  useEffect(() => {
    if (isSlideshow && photos.length > 1) {
      const preloadImage = (publicId: string) => {
        if (!preloadedImages.has(publicId)) {
          const img = new window.Image();
          img.src = getOptimizedImageUrl(publicId, {
            width: 900,
            height: 550,
            quality: 85,
            format: 'webp',
            progressive: true
          });
          img.onload = () => {
            setPreloadedImages(prev => new Set(prev).add(publicId));
          };
        }
      };

      // Preload next and previous images
      const nextIndex = (currentPhotoIndex + 1) % photos.length;
      const prevIndex = currentPhotoIndex === 0 ? photos.length - 1 : currentPhotoIndex - 1;
      
      if (photos[nextIndex]) {
        preloadImage(photos[nextIndex].cloudinary_public_id);
      }
      if (photos[prevIndex]) {
        preloadImage(photos[prevIndex].cloudinary_public_id);
      }
    }
  }, [isSlideshow, currentPhotoIndex, photos, preloadedImages]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Handle slideshow navigation
      if (isSlideshow) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            goToPrevious();
            break;
          case 'ArrowRight':
            e.preventDefault();
            goToNext();
            break;
          case ' ':
            e.preventDefault();
            toggleAutoplay();
            break;
          case 'Escape':
            e.preventDefault();
            setIsSlideshow(false);
            break;
        }
      } else {
        // Handle general popup navigation
        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            onClose();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isSlideshow, goToNext, goToPrevious, toggleAutoplay, onClose]);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      setError(null);
      const albumsData = await albumsApi.getAll();
      setAlbums(albumsData);
    } catch (err) {
      setError('Failed to load albums');
      console.error('Error loading albums:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async (albumId: string) => {
    try {
      setLoading(true);
      setError(null);
      const photosData = await photosApi.getByAlbumId(albumId);
      setPhotos(photosData);
      setCurrentPhotoIndex(0);
    } catch (err) {
      setError('Failed to load photos');
      console.error('Error loading photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const openSlideshow = (photoIndex: number) => {
    setCurrentPhotoIndex(photoIndex);
    setIsSlideshow(true);
  };

  const closeSlideshow = () => {
    setIsSlideshow(false);
    setIsAutoplay(false);
  };

  const backToAlbums = () => {
    setSelectedAlbum(null);
    setPhotos([]);
    setIsSlideshow(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (selectedAlbum) {
        await loadPhotos(selectedAlbum.id);
      } else {
        await loadAlbums();
      }
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500); // Small delay to show the animation
    }
  };

  // Filter albums based on search
  const filteredAlbums = albums.filter(album =>
    album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (album.description && album.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: getZIndex(windowId) }}>
      <div
        ref={popupRef}
        className={`absolute pointer-events-auto ${
          isDragging ? '' : 'transition-all duration-200 ease-out'
        } ${
          isAnimating || isDragging
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-2'
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
        onMouseDown={handleMouseDown}
      >

        {/* Main Photos App Window */}
        <div className="bg-gray-100/95 backdrop-blur-xl rounded-xl border border-gray-300/50 shadow-2xl w-[1000px] h-[750px] flex flex-col overflow-hidden select-none">
            {/* macOS Header with Traffic Lights */}
            <div className="drag-handle flex items-center justify-between p-2 border-b border-gray-300/30 bg-gradient-to-r from-gray-200 to-gray-300 flex-shrink-0" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
              <div className="flex space-x-2">
                <button
                  onClick={onClose}
                  className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                />
                <button className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors" />
                <button className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors" />
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 relative overflow-hidden rounded-md">
                  <Image
                    src="/icons/photo.png"
                    alt="Photos"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-gray-800 font-semibold text-sm">Photos</h3>
                  <p className="text-gray-600 text-xs">
                    {selectedAlbum ? selectedAlbum.name : 'Library'}
                  </p>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                {isSlideshow ? (
                  <button
                    onClick={closeSlideshow}
                    className="flex items-center space-x-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                ) : selectedAlbum ? (
                  <button
                    onClick={backToAlbums}
                    className="flex items-center space-x-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Albums</span>
                  </button>
                ) : null}
                
                <h2 className="text-lg font-semibold text-gray-900">
                  {isSlideshow ? selectedAlbum?.name : selectedAlbum ? selectedAlbum.name : 'Albums'}
                </h2>
                
                {isSlideshow && photos.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {currentPhotoIndex + 1} of {photos.length}
                  </span>
                )}
                
                {!isSlideshow && selectedAlbum && photos.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                  </span>
                )}
              </div>
              
              {isSlideshow ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleAutoplay}
                    className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                    title={isAutoplay ? 'Pause slideshow' : 'Start slideshow'}
                  >
                    {isAutoplay ? (
                      <Pause className="w-4 h-4 text-gray-700" />
                    ) : (
                      <Play className="w-4 h-4 text-gray-700" />
                    )}
                  </button>
                </div>
              ) : !selectedAlbum ? (
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search albums..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || loading}
                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                    title="Refresh albums"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || loading}
                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                    title="Refresh photos"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-white">
              {/* Slideshow View */}
              {isSlideshow && photos.length > 0 && (
                <div className="h-full flex flex-col">
                  {/* Adaptive Image Slider */}
                  <div className="flex-1 relative">
                    <AdaptiveImageSlider
                      photos={photos}
                      currentIndex={currentPhotoIndex}
                      onIndexChange={setCurrentPhotoIndex}
                      isAutoplay={isAutoplay}
                    />
                  </div>

                  {/* Photo Info */}
                  {photos[currentPhotoIndex] && (photos[currentPhotoIndex].title || photos[currentPhotoIndex].description) && (
                    <div className="bg-black/30 backdrop-blur-md text-white p-4 border-t border-white/10">
                      {photos[currentPhotoIndex].title && (
                        <h4 className="font-semibold mb-1">{photos[currentPhotoIndex].title}</h4>
                      )}
                      {photos[currentPhotoIndex].description && (
                        <p className="text-sm text-gray-200">{photos[currentPhotoIndex].description}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Regular Content Views */}
              {!isSlideshow && (
                <div className="h-full overflow-y-auto">
                  {loading && (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                          onClick={selectedAlbum ? () => loadPhotos(selectedAlbum.id) : loadAlbums}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  )}

                  {!loading && !error && !selectedAlbum && (
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredAlbums.map((album) => (
                          <div
                            key={album.id}
                            className="group cursor-pointer"
                            onClick={() => setSelectedAlbum(album)}
                          >
                            <div className="aspect-square relative bg-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                              {album.cover_public_id ? (
                                <Image
                                  src={getOptimizedImageUrl(album.cover_public_id, {
                                    width: 300,
                                    height: 300,
                                    crop: 'fill',
                                    quality: 'auto',
                                    format: 'webp'
                                  })}
                                  alt={album.name}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                                  loading="lazy"
                                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                  onError={(e) => {
                                    console.warn('Failed to load album cover image:', album.cover_public_id);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-100 to-gray-200">
                                  <Grid className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                            <div className="mt-2">
                              <h3 className="font-medium text-gray-900 text-sm truncate">{album.name}</h3>
                              {album.description && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">{album.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!loading && !error && selectedAlbum && photos.length > 0 && (
                    <div className="p-6">
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {photos.map((photo, index) => (
                          <div
                            key={photo.id}
                            className="aspect-square relative bg-gray-100 rounded-md overflow-hidden cursor-pointer group hover:ring-2 hover:ring-blue-500 transition-all"
                            onClick={() => openSlideshow(index)}
                          >
                            <Image
                              src={getOptimizedImageUrl(photo.cloudinary_public_id, {
                                width: 200,
                                height: 200,
                                crop: 'fill',
                                quality: 'auto',
                                format: 'webp'
                              })}
                              alt={photo.alt_text || photo.title || `Photo ${index + 1}`}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                              sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
                              onError={() => {
                                console.warn('Failed to load photo thumbnail:', photo.cloudinary_public_id);
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!loading && !error && selectedAlbum && photos.length === 0 && (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <Grid className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">No photos in this album</p>
                      </div>
                    </div>
                  )}

                  {!loading && !error && !selectedAlbum && filteredAlbums.length === 0 && (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <Grid className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">
                          {searchQuery ? 'No albums match your search' : 'No albums available'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PhotosPopup;
