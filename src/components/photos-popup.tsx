'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Grid, Play, Pause, ArrowLeft, Search } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, Keyboard, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import Image from 'next/image';
import { albumsApi, photosApi, Album, Photo } from '@/lib/supabase';
import { getOptimizedImageUrl } from '@/lib/cloudinary-client';
import { useWindowManager } from './window-manager';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface PhotosPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const PhotosPopup: React.FC<PhotosPopupProps> = ({ isOpen, onClose }) => {
  // Window management
  const [position, setPosition] = useState({ x: 200, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    bringToFront(windowId);
    
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

  // Navigation functions (defined before useEffect that uses them)
  const goToNext = useCallback(() => {
    if (swiperInstance) {
      swiperInstance.slideNext();
    }
  }, [swiperInstance]);

  const goToPrevious = useCallback(() => {
    if (swiperInstance) {
      swiperInstance.slidePrev();
    }
  }, [swiperInstance]);

  const toggleAutoplay = useCallback(() => {
    if (swiperInstance) {
      if (isAutoplay) {
        swiperInstance.autoplay.stop();
      } else {
        swiperInstance.autoplay.start();
      }
      setIsAutoplay(!isAutoplay);
    }
  }, [swiperInstance, isAutoplay]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen || !isSlideshow) return;

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
          if (isSlideshow) {
            setIsSlideshow(false);
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isSlideshow, currentPhotoIndex, goToNext, goToPrevious, onClose, toggleAutoplay]);

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

  // Filter albums based on search
  const filteredAlbums = albums.filter(album =>
    album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (album.description && album.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: getZIndex(windowId) }}>
      <div
        ref={popupRef}
        className="absolute pointer-events-auto"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Slideshow Mode - Full Screen Overlay */}
        {isSlideshow && photos.length > 0 && (
          <div className="fixed inset-0 bg-black z-[100] flex flex-col" style={{ pointerEvents: 'auto' }}>
            {/* Slideshow Header */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={closeSlideshow}
                  className="p-2 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-sm transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="text-white">
                  <h3 className="font-semibold">{selectedAlbum?.name}</h3>
                  <p className="text-sm opacity-80">
                    {currentPhotoIndex + 1} of {photos.length}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleAutoplay}
                  className="p-2 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-sm transition-colors"
                >
                  {isAutoplay ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Swiper Slideshow */}
            <Swiper
              modules={[Navigation, Pagination, Autoplay, Keyboard, Mousewheel]}
              spaceBetween={0}
              slidesPerView={1}
              navigation={{
                nextEl: '.swiper-button-next-custom',
                prevEl: '.swiper-button-prev-custom',
              }}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}
              autoplay={isAutoplay ? {
                delay: 3000,
                disableOnInteraction: false,
              } : false}
              keyboard={{
                enabled: true,
              }}
              mousewheel={{
                forceToAxis: true,
              }}
              loop={photos.length > 1}
              initialSlide={currentPhotoIndex}
              onSwiper={setSwiperInstance}
              onSlideChange={(swiper) => setCurrentPhotoIndex(swiper.realIndex)}
              className="w-full h-full"
            >
              {photos.map((photo, index) => (
                <SwiperSlide key={photo.id} className="flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <Image
                      src={getOptimizedImageUrl(photo.cloudinary_public_id, {
                        width: 1920,
                        height: 1080,
                        quality: 90,
                        format: 'auto'
                      })}
                      alt={photo.alt_text || photo.title || `Photo ${index + 1}`}
                      fill
                      onError={() => {
                        console.warn('Failed to load photo:', photo.cloudinary_public_id);
                      }}
                      className="object-contain"
                      priority={index === currentPhotoIndex}
                      sizes="100vw"
                    />
                    
                    {/* Photo Info Overlay */}
                    {(photo.title || photo.description) && (
                      <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
                        {photo.title && (
                          <h4 className="font-semibold mb-1">{photo.title}</h4>
                        )}
                        {photo.description && (
                          <p className="text-sm opacity-90">{photo.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Custom Navigation Buttons */}
            <button
              className="swiper-button-prev-custom absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-sm transition-colors"
              onClick={goToPrevious}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              className="swiper-button-next-custom absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-sm transition-colors"
              onClick={goToNext}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        )}

        {/* Main Photos App Window */}
        {!isSlideshow && (
          <div className="bg-gray-100/95 backdrop-blur-xl rounded-xl border border-gray-300/50 shadow-2xl w-[900px] h-[700px] flex flex-col overflow-hidden select-none">
            {/* macOS Header with Traffic Lights */}
            <div className="drag-handle flex items-center justify-between p-2 border-b border-gray-300/30 bg-gradient-to-r from-gray-200 to-gray-300 flex-shrink-0">
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
                {selectedAlbum && (
                  <button
                    onClick={backToAlbums}
                    className="flex items-center space-x-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Albums</span>
                  </button>
                )}
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedAlbum ? selectedAlbum.name : 'Albums'}
                </h2>
                {selectedAlbum && photos.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                  </span>
                )}
              </div>
              
              {!selectedAlbum && (
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
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white">
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
                                crop: 'fill'
                              })}
                              alt={album.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
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
                            crop: 'fill'
                          })}
                          alt={photo.alt_text || photo.title || `Photo ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotosPopup;
