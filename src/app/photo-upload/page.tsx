'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Image as ImageIcon, Trash2, EyeOff, FolderOpen, Grid3X3, Star, LogOut } from 'lucide-react';
import Image from 'next/image';
import { Album, Photo } from '@/lib/supabase';
import { getOptimizedImageUrl, uploadToCloudinaryClient } from '@/lib/cloudinary-client';
import AuthWrapper from '@/components/auth-wrapper';
import { useAuth } from '@/lib/auth';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';


const PhotoUploadManager = () => {
  const { logout } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumCreationStep, setAlbumCreationStep] = useState(1); // 1: Album details, 2: Photo upload
  const [newlyCreatedAlbum, setNewlyCreatedAlbum] = useState<Album | null>(null);
  
  // Form states
  const [albumForm, setAlbumForm] = useState({
    name: '',
    description: '',
    is_published: true,
  });
  
  const [photoForm, setPhotoForm] = useState({
    title: '',
    description: '',
    alt_text: '',
    is_published: true,
  });

  // Load albums on component mount
  useEffect(() => {
    loadAlbums();
  }, []);

  // Load photos when album is selected
  useEffect(() => {
    if (selectedAlbum) {
      loadPhotos(selectedAlbum.id);
    }
  }, [selectedAlbum]);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/albums');
      if (!response.ok) throw new Error('Failed to load albums');
      const data = await response.json();
      setAlbums(data);
    } catch (err) {
      setError('Failed to load albums');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async (albumId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/photos?album_id=${albumId}`);
      if (!response.ok) throw new Error('Failed to load photos');
      const data = await response.json();
      setPhotos(data);
    } catch (err) {
      setError('Failed to load photos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = () => {
    setEditingAlbum(null);
    setAlbumCreationStep(1);
    setNewlyCreatedAlbum(null);
    setAlbumForm({
      name: '',
      description: '',
      is_published: true,
    });
    setShowAlbumModal(true);
  };


  const handleSaveAlbum = async () => {
    try {
      setLoading(true);
      const url = editingAlbum ? `/api/albums/${editingAlbum.id}` : '/api/albums';
      const method = editingAlbum ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...albumForm,
          order_index: editingAlbum?.order_index || albums.length,
        }),
      });

      if (!response.ok) throw new Error('Failed to save album');
      
      const savedAlbum = await response.json();
      await loadAlbums();
      
      // If creating new album, go to photo upload step
      if (!editingAlbum) {
        setNewlyCreatedAlbum(savedAlbum);
        setAlbumCreationStep(2);
      } else {
        setShowAlbumModal(false);
      }
    } catch (err) {
      setError('Failed to save album');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm('Are you sure you want to delete this album? This will also delete all photos in it.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/albums/${albumId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete album');
      
      await loadAlbums();
      if (selectedAlbum?.id === albumId) {
        setSelectedAlbum(null);
        setPhotos([]);
      }
    } catch (err) {
      setError('Failed to delete album');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = useCallback(async (type: 'photo', file?: File) => {
    const processImageUpload = async (uploadFile: File) => {
      try {
        setLoading(true);
        setUploadingCount(prev => prev + 1);
        
        const uploadData = await uploadToCloudinaryClient(uploadFile);

        // Update form based on type
        if (type === 'photo' && (selectedAlbum || newlyCreatedAlbum)) {
          const targetAlbum = selectedAlbum || newlyCreatedAlbum;
          // Create photo record
          const photoData = {
            album_id: targetAlbum!.id,
            cloudinary_public_id: uploadData.public_id,
            cloudinary_url: uploadData.secure_url,
            title: photoForm.title || uploadFile.name,
            description: photoForm.description,
            alt_text: photoForm.alt_text || uploadFile.name,
          is_published: photoForm.is_published,
          is_cover: false,
          order_index: photos.length,
          metadata: {
              width: uploadData.width,
              height: uploadData.height,
              size: uploadData.bytes,
              format: uploadData.format,
            },
          };

          const response = await fetch('/api/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(photoData),
          });

          if (!response.ok) throw new Error('Failed to create photo record');
          
          await loadPhotos(targetAlbum!.id);
          if (selectedAlbum) {
            setShowPhotoModal(false);
          }
        }
      } catch (err) {
        setError('Failed to upload image');
        console.error(err);
      } finally {
        setLoading(false);
        setUploadingCount(prev => prev - 1);
      }
    };

    if (!file) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      return new Promise<void>((resolve) => {
        input.onchange = async (e) => {
          const uploadedFile = (e.target as HTMLInputElement).files?.[0];
          if (uploadedFile) {
            await processImageUpload(uploadedFile);
          }
          resolve();
        };
        input.click();
      });
    } else {
      await processImageUpload(file);
    }
  }, [photoForm, selectedAlbum, newlyCreatedAlbum, photos.length]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (uploadingCount > 0) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    imageFiles.forEach(file => {
      handleImageUpload('photo', file);
    });
  }, [handleImageUpload, uploadingCount]);

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete photo');
      
      if (selectedAlbum) {
        await loadPhotos(selectedAlbum.id);
      }
    } catch (err) {
      setError('Failed to delete photo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCover = async (photoId: string, currentCoverStatus: boolean) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/photos/${photoId}/cover`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_cover: !currentCoverStatus }),
      });

      if (!response.ok) throw new Error('Failed to update cover status');
      
      if (selectedAlbum) {
        await loadPhotos(selectedAlbum.id);
        await loadAlbums(); // Refresh albums to update cover image
      }
    } catch (err) {
      setError('Failed to update cover status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Photo Manager</h1>
            <p className="text-muted-foreground">Manage your photo albums and collections</p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={showAlbumModal} onOpenChange={setShowAlbumModal}>
              <DialogTrigger asChild>
                <Button onClick={handleCreateAlbum} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Album
                </Button>
              </DialogTrigger>
            </Dialog>
            <Button variant="outline" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-destructive">{error}</p>
                <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Albums Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Albums
                </CardTitle>
                <CardDescription>
                  {albums.length} album{albums.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading && albums.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  albums.map((album) => (
                    <div
                      key={album.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        selectedAlbum?.id === album.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:bg-muted'
                      }`}
                      onClick={() => setSelectedAlbum(album)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{album.name}</h3>
                            {!album.is_published && (
                              <Badge variant="secondary" className="h-5">
                                <EyeOff className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          {album.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {album.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAlbum(album.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Photos Panel */}
          <div className="lg:col-span-3">
            {selectedAlbum ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Grid3X3 className="h-5 w-5" />
                        {selectedAlbum.name}
                      </CardTitle>
                      <CardDescription>
                        {photos.length} photo{photos.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        setPhotoForm({
                          title: '',
                          description: '',
                          alt_text: '',
                          is_published: true,
                        });
                        setShowPhotoModal(true);
                      }}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Photos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading && photos.length === 0 ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : photos.length === 0 ? (
                    <div className="text-center py-12">
                      <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No photos in this album yet</p>
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={() => setShowPhotoModal(true)}
                      >
                        <Upload className="h-4 w-4" />
                        Upload First Photo
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {photos.map((photo) => (
                        <div key={photo.id} className="group relative">
                          <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                            {photo.cloudinary_public_id && getOptimizedImageUrl(photo.cloudinary_public_id, {
                              width: 200,
                              height: 200,
                              crop: 'fill'
                            }) ? (
                              <Image
                                src={getOptimizedImageUrl(photo.cloudinary_public_id, {
                                  width: 200,
                                  height: 200,
                                  crop: 'fill'
                                })}
                                alt={photo.alt_text || photo.title || 'Photo'}
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                                onError={() => {
                                  console.warn('Failed to load photo:', photo.cloudinary_public_id);
                                }}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full bg-muted">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            {/* Cover star indicator - higher z-index to stay above overlay */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCover(photo.id, photo.is_cover);
                              }}
                              className={`absolute top-2 right-2 p-1.5 rounded-full transition-all z-20 ${
                                photo.is_cover 
                                  ? 'bg-yellow-500 text-white shadow-lg' 
                                  : 'bg-black/50 text-white/70 hover:bg-black/70 hover:text-white'
                              }`}
                              title={photo.is_cover ? 'Remove as cover' : 'Set as cover'}
                            >
                              <Star className={`h-3 w-3 ${photo.is_cover ? 'fill-current' : ''}`} />
                            </button>
                            
                            {!photo.is_published && (
                              <Badge className="absolute top-2 left-2 z-10" variant="secondary">
                                <EyeOff className="h-3 w-3" />
                              </Badge>
                            )}
                            
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePhoto(photo.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {photo.title && (
                            <p className="mt-2 text-sm truncate">{photo.title}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Select an album to manage photos</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Album Modal */}
        <Dialog open={showAlbumModal} onOpenChange={setShowAlbumModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAlbum ? 'Edit Album' : 
                 albumCreationStep === 1 ? 'Create Album' : 'Upload Photos'}
              </DialogTitle>
              {!editingAlbum && (
                <DialogDescription>
                  Step {albumCreationStep} of 2
                </DialogDescription>
              )}
            </DialogHeader>

            {/* Step 1: Album Details */}
            {albumCreationStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="album-name">Album Name *</Label>
                  <Input
                    id="album-name"
                    value={albumForm.name}
                    onChange={(e) => setAlbumForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter album name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="album-description">Description</Label>
                  <Textarea
                    id="album-description"
                    value={albumForm.description}
                    onChange={(e) => setAlbumForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter album description"
                    rows={3}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Star className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Cover Image Selection</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        After uploading photos, click the star icon on any photo to set it as the album cover.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={albumForm.is_published}
                    onChange={(e) => setAlbumForm(prev => ({ ...prev, is_published: e.target.checked }))}
                    className="rounded border-input"
                  />
                  <Label htmlFor="is_published" className="text-sm">
                    Published (visible to public)
                  </Label>
                </div>
              </div>
            )}

            {/* Step 2: Photo Upload */}
            {albumCreationStep === 2 && newlyCreatedAlbum && (
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="text-lg font-semibold mb-2">
                    Album &quot;{newlyCreatedAlbum.name}&quot; Created!
                  </h4>
                  <p className="text-muted-foreground">
                    Now add some photos to your album. They&apos;ll be organized in &quot;{newlyCreatedAlbum.name}&quot;.
                  </p>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                    uploadingCount > 0 
                      ? 'border-blue-300 bg-blue-50' 
                      : photos.length > 0 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer'
                  }`}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (uploadingCount > 0) return;
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = Array.from((e.target as HTMLInputElement).files || []);
                      files.forEach(file => {
                        handleImageUpload('photo', file);
                      });
                    };
                    input.click();
                  }}
                >
                  {uploadingCount > 0 ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <div className="space-y-2">
                        <p className="font-medium text-blue-700">Uploading photos...</p>
                        <p className="text-sm text-blue-600">{uploadingCount} photo{uploadingCount > 1 ? 's' : ''} uploading</p>
                      </div>
                    </>
                  ) : photos.length > 0 ? (
                    <>
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-green-700">Photos uploaded successfully!</p>
                        <p className="text-sm text-green-600">Click to add more photos</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <div className="space-y-2">
                        <p className="font-medium">Drop photos here or click to browse</p>
                        <p className="text-sm text-muted-foreground">Select multiple photos at once</p>
                      </div>
                    </>
                  )}
                </div>

                {photos.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium">Uploaded Photos ({photos.length})</h5>
                    <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                      {photos.map((photo) => (
                        <div key={photo.id} className="aspect-square relative bg-muted rounded-md overflow-hidden">
                          {photo.cloudinary_public_id && getOptimizedImageUrl(photo.cloudinary_public_id, {
                            width: 100,
                            height: 100,
                            crop: 'fill'
                          }) ? (
                            <Image
                              src={getOptimizedImageUrl(photo.cloudinary_public_id, {
                                width: 100,
                                height: 100,
                                crop: 'fill'
                              })}
                              alt={photo.title || 'Uploaded photo'}
                              fill
                              className="object-cover"
                              onError={() => {
                                console.warn('Failed to load uploaded photo:', photo.cloudinary_public_id);
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-muted">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-6">
              <div>
                {albumCreationStep === 2 && (
                  <Button variant="ghost" onClick={() => setAlbumCreationStep(1)}>
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAlbumModal(false);
                    setAlbumCreationStep(1);
                    setNewlyCreatedAlbum(null);
                  }}
                  disabled={uploadingCount > 0}
                >
                  {albumCreationStep === 2 ? (uploadingCount > 0 ? 'Uploading...' : 'Done') : 'Cancel'}
                </Button>
                
                {albumCreationStep === 1 && (
                  <Button
                    onClick={handleSaveAlbum}
                    disabled={!albumForm.name || loading || uploadingCount > 0}
                  >
                    {loading ? 'Creating...' : (editingAlbum ? 'Update' : 'Create & Continue')}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Simple Photo Upload Dialog */}
        <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Photos</DialogTitle>
              <DialogDescription>
                Add photos to {selectedAlbum?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-muted-foreground/50"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = Array.from(e.dataTransfer.files);
                const imageFiles = files.filter(file => file.type.startsWith('image/'));
                imageFiles.forEach(file => {
                  handleImageUpload('photo', file);
                });
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  files.forEach(file => {
                    handleImageUpload('photo', file);
                  });
                };
                input.click();
              }}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <div className="space-y-2">
                <p className="font-medium">Drop photos here or click to browse</p>
                <p className="text-sm text-muted-foreground">Select multiple photos at once</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setShowPhotoModal(false)}>
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const ProtectedPhotoUploadManager = () => {
  return (
    <AuthWrapper returnUrl="/photo-upload">
      <PhotoUploadManager />
    </AuthWrapper>
  );
};

export default ProtectedPhotoUploadManager;


