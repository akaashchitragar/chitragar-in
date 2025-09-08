'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Upload, Image as ImageIcon, Trash2, EyeOff, FolderOpen, Grid3X3, Star, LogOut,
  LayoutDashboard, MessageSquare, Mail, Settings, Camera, Menu
} from 'lucide-react';
import Image from 'next/image';
import { Album, Photo } from '@/lib/supabase';

interface FeedbackItem {
  id: number;
  name?: string;
  created_at: string;
  status: string;
  message: string;
  [key: string]: unknown;
}

interface NewsletterSubscriber {
  id: number;
  email: string;
  subscribed_at: string;
  [key: string]: unknown;
}

interface NewsletterStats {
  active_subscribers?: number;
  new_this_month?: number;
  new_this_week?: number;
  [key: string]: unknown;
}

interface FeedbackStats {
  [key: string]: number;
}

interface OverviewStats {
  totalAlbums: number;
  totalPhotos: number;
  publishedAlbums: number;
  publishedPhotos: number;
  pendingFeedback: number;
  totalFeedback: number;
  activeSubscribers: number;
  totalSubscribers: number;
  newSubscribersThisWeek: number;
  newSubscribersThisMonth: number;
}

interface ActivityItem {
  type: string;
  message: string;
  timestamp: Date;
  color: string;
}
import { getOptimizedImageUrl, uploadToCloudinaryClient } from '@/lib/cloudinary-client';
import AuthWrapper from '@/components/auth-wrapper';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';


// Dashboard navigation items
const navigationItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'photos', label: 'Photo Manager', icon: Camera },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'newsletter', label: 'Newsletter', icon: Mail },
];

const PhotoUploadManager = () => {
  const { logout } = useAuth();
  
  // Navigation state
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Photo management state
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Feedback management state
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({});
  const [feedbackStatus, setFeedbackStatus] = useState('pending');

  // Newsletter management state
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [newsletterStats, setNewsletterStats] = useState<NewsletterStats>({});
  const [subscriberStatus, setSubscriberStatus] = useState('active');
  
  // Dashboard overview state
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalAlbums: 0,
    totalPhotos: 0,
    publishedAlbums: 0,
    publishedPhotos: 0,
    pendingFeedback: 0,
    totalFeedback: 0,
    activeSubscribers: 0,
    totalSubscribers: 0,
    newSubscribersThisWeek: 0,
    newSubscribersThisMonth: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  
  // Modal states
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  
  // Form states
  const [albumForm, setAlbumForm] = useState({
    name: '',
    description: '',
    is_published: true,
  });
  

  // Load data on component mount and tab change
  useEffect(() => {
    loadAlbums();
    if (activeTab === 'overview') {
      loadOverviewData();
    } else if (activeTab === 'feedback') {
      loadFeedback();
    } else if (activeTab === 'newsletter') {
      loadNewsletterData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load photos when album is selected
  useEffect(() => {
    if (selectedAlbum) {
      loadPhotos(selectedAlbum.id);
    }
  }, [selectedAlbum]);

  // Reload feedback when status filter changes
  useEffect(() => {
    if (activeTab === 'feedback') {
      loadFeedback();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackStatus, activeTab]);

  const loadAlbums = useCallback(async () => {
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
  }, []);

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

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/feedback/admin?status=${feedbackStatus}`);
      if (!response.ok) throw new Error('Failed to load feedback');
      const data = await response.json();
      setFeedback(data.feedback || []);
      setFeedbackStats(data.counts || {});
    } catch (err) {
      setError('Failed to load feedback');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [feedbackStatus]);

  const loadNewsletterData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/newsletter/admin?status=${subscriberStatus}`);
      if (!response.ok) throw new Error('Failed to load newsletter data');
      const data = await response.json();
      setSubscribers(data.subscribers || []);
      setNewsletterStats(data.stats || {});
    } catch (err) {
      setError('Failed to load newsletter data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [subscriberStatus]);

  const loadOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel for overview
      const [albumsRes, feedbackRes, newsletterRes, photosRes] = await Promise.all([
        fetch('/api/albums'),
        fetch('/api/feedback/admin?status=pending'),
        fetch('/api/newsletter/admin?status=active'),
        fetch('/api/photos')
      ]);

      const [albumsData, feedbackData, newsletterData, photosData] = await Promise.all([
        albumsRes.ok ? albumsRes.json() : [],
        feedbackRes.ok ? feedbackRes.json() : { counts: {} },
        newsletterRes.ok ? newsletterRes.json() : { stats: {} },
        photosRes.ok ? photosRes.json() : []
      ]);

      // Debug logging
      console.log('Overview Data Debug:', {
        albumsData: albumsData,
        photosData: photosData,
        albumsLength: Array.isArray(albumsData) ? albumsData.length : 'not array',
        photosLength: Array.isArray(photosData) ? photosData.length : 'not array'
      });

      // Set comprehensive overview stats
      setOverviewStats({
        totalAlbums: Array.isArray(albumsData) ? albumsData.length : 0,
        totalPhotos: Array.isArray(photosData) ? photosData.length : 0,
        publishedAlbums: Array.isArray(albumsData) ? albumsData.filter((a: Album) => a.is_published).length : 0,
        publishedPhotos: Array.isArray(photosData) ? photosData.filter((p: Photo) => p.is_published).length : 0,
        pendingFeedback: feedbackData.counts?.pending || 0,
        totalFeedback: Object.values(feedbackData.counts || {}).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0),
        activeSubscribers: newsletterData.stats?.active_subscribers || 0,
        totalSubscribers: newsletterData.stats?.total_subscribers || 0,
        newSubscribersThisWeek: newsletterData.stats?.new_this_week || 0,
        newSubscribersThisMonth: newsletterData.stats?.new_this_month || 0
      });

      // Generate recent activity from real data
      const activities: ActivityItem[] = [];
      
      // Recent feedback
      if (feedbackData.feedback && feedbackData.feedback.length > 0) {
        const recentFeedback = feedbackData.feedback.slice(0, 3);
        recentFeedback.forEach((fb: FeedbackItem) => {
          activities.push({
            type: 'feedback',
            message: `New feedback received from ${fb.name || 'Anonymous'}`,
            timestamp: new Date(fb.created_at),
            color: 'green'
          });
        });
      }

      // Recent subscribers
      if (newsletterData.subscribers && newsletterData.subscribers.length > 0) {
        const recentSubscribers = newsletterData.subscribers
          .filter((s: NewsletterSubscriber) => s.subscribed_at)
          .sort((a: NewsletterSubscriber, b: NewsletterSubscriber) => new Date(b.subscribed_at).getTime() - new Date(a.subscribed_at).getTime())
          .slice(0, 2);
        
        recentSubscribers.forEach((sub: NewsletterSubscriber) => {
          activities.push({
            type: 'newsletter',
            message: `New newsletter subscriber: ${sub.email}`,
            timestamp: new Date(sub.subscribed_at),
            color: 'blue'
          });
        });
      }

      // Recent photos
      if (Array.isArray(photosData) && photosData.length > 0) {
        const recentPhotos = photosData
          .filter((p: Photo) => p.created_at)
          .sort((a: Photo, b: Photo) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 2);
        
        recentPhotos.forEach((photo: Photo) => {
          activities.push({
            type: 'photo',
            message: `Photo uploaded: ${photo.title || 'Untitled'}`,
            timestamp: new Date(photo.created_at),
            color: 'purple'
          });
        });
      }

      // Recent albums
      if (Array.isArray(albumsData) && albumsData.length > 0) {
        const recentAlbums = albumsData
          .filter((a: Album) => a.created_at)
          .sort((a: Album, b: Album) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 1);
        
        recentAlbums.forEach((album: Album) => {
          activities.push({
            type: 'album',
            message: `New album created: ${album.name}`,
            timestamp: new Date(album.created_at),
            color: 'indigo'
          });
        });
      }

      // Sort activities by timestamp and take the most recent 5
      const sortedActivities = activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5);

      setRecentActivity(sortedActivities);

    } catch (err) {
      setError('Failed to load overview data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateAlbum = () => {
    setEditingAlbum(null);
    setAlbumForm({
      name: '',
      description: '',
      is_published: true,
    });
    setShowAlbumModal(true);
  };

  const handleEditAlbum = (album: Album) => {
    setEditingAlbum(album);
    setAlbumForm({
      name: album.name,
      description: album.description || '',
      is_published: album.is_published,
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
      
      await loadAlbums();
      setShowAlbumModal(false);
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
        if (type === 'photo' && selectedAlbum) {
          const targetAlbum = selectedAlbum;
          // Create photo record with minimal data
          const photoData = {
            album_id: targetAlbum!.id,
            cloudinary_public_id: uploadData.public_id,
            cloudinary_url: uploadData.secure_url,
            title: uploadFile.name.replace(/\.[^/.]+$/, ""), // Remove file extension
            description: '',
            alt_text: uploadFile.name,
            is_published: true,
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
          
          // Auto-close modal when upload count reaches 0
          setTimeout(() => {
            if (uploadingCount === 1) { // Will be 0 after this upload completes
              setShowPhotoModal(false);
            }
          }, 500);
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
      input.multiple = true;
      
      return new Promise<void>((resolve) => {
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) {
            for (let i = 0; i < files.length; i++) {
              await processImageUpload(files[i]);
            }
          }
          resolve();
        };
        input.click();
      });
    } else {
      await processImageUpload(file);
    }
  }, [selectedAlbum, photos.length, uploadingCount]);

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

    const files = Array.from(e.dataTransfer.files);
    // Accept all files, let Cloudinary handle validation
    files.forEach(file => {
      handleImageUpload('photo', file);
    });
  }, [handleImageUpload]);

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

  // Render different dashboard sections
  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground">Welcome to your admin dashboard</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Albums</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.totalAlbums || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overviewStats.publishedAlbums || 0} published
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.totalPhotos || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overviewStats.publishedPhotos || 0} published
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.pendingFeedback || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overviewStats.totalFeedback || 0} total received
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Newsletter Subscribers</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.activeSubscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{overviewStats.newSubscribersThisWeek || 0} this week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => setActiveTab('photos')} className="w-full justify-start" variant="outline">
              <Camera className="mr-2 h-4 w-4" />
              Manage Photos
            </Button>
            <Button onClick={() => setActiveTab('feedback')} className="w-full justify-start" variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              Review Feedback
            </Button>
            <Button onClick={() => setActiveTab('newsletter')} className="w-full justify-start" variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Newsletter Management
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full`}></div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleDateString()} at {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Activity will appear here as you manage your portfolio
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPhotoManager = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Photo Manager</h2>
          <p className="text-muted-foreground">Manage your photo albums and collections</p>
        </div>
        <Button onClick={handleCreateAlbum} className="gap-2">
          <Plus className="h-4 w-4" />
          New Album
        </Button>
      </div>

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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAlbum(album);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
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
                    onClick={() => setShowPhotoModal(true)}
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
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-muted">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          
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
    </div>
  );

  const renderFeedbackManager = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Feedback Management</h2>
        <p className="text-muted-foreground">Review and manage user feedback</p>
      </div>
      
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['pending', 'approved', 'rejected'].map((status) => (
          <Button
            key={status}
            variant={feedbackStatus === status ? "default" : "ghost"}
            size="sm"
            onClick={() => setFeedbackStatus(status)}
            className="capitalize"
          >
            {status} ({feedbackStats[status] || 0})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : feedback.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No {feedbackStatus} feedback found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">Feedback #{item.id}</CardTitle>
                  <Badge variant={item.status === 'approved' ? 'default' : item.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="whitespace-pre-wrap">{item.message}</p>
                  </div>
                  
                  {feedbackStatus === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateFeedback(item.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => updateFeedback(item.id, 'rejected')}
                        variant="destructive"
                        size="sm"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderNewsletterManager = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Newsletter Management</h2>
        <p className="text-muted-foreground">Manage newsletter subscribers</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{newsletterStats.active_subscribers || 0}</div>
            <div className="text-sm text-gray-600">Active Subscribers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{newsletterStats.new_this_month || 0}</div>
            <div className="text-sm text-gray-600">New This Month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{newsletterStats.new_this_week || 0}</div>
            <div className="text-sm text-gray-600">New This Week</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['active', 'unsubscribed', 'all'].map((status) => (
          <Button
            key={status}
            variant={subscriberStatus === status ? "default" : "ghost"}
            size="sm"
            onClick={() => setSubscriberStatus(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : subscribers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No subscribers found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscribers.map((subscriber) => (
            <Card key={subscriber.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{subscriber.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Subscribed: {new Date(subscriber.subscribed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={subscriber.is_active ? 'default' : 'secondary'}>
                    {subscriber.is_active ? 'Active' : 'Unsubscribed'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );


  // Helper functions for feedback and newsletter management
  const updateFeedback = async (feedbackId: number, status: string) => {
    try {
      const response = await fetch('/api/feedback/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId, status })
      });

      if (response.ok) {
        toast.success(`Feedback ${status} successfully`);
        loadFeedback();
      } else {
        toast.error('Failed to update feedback');
      }
    } catch {
      toast.error('Network error');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 border-r bg-card`}>
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex h-16 items-center border-b px-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-2"
              >
                <Menu className="h-4 w-4" />
              </Button>
              {sidebarOpen && (
                <h1 className="text-lg font-semibold">Admin Dashboard</h1>
              )}
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "secondary" : "ghost"}
                    className={`w-full justify-start ${!sidebarOpen && 'px-2'}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {sidebarOpen && <span className="ml-2">{item.label}</span>}
                  </Button>
                );
              })}
            </nav>
            
            {/* Footer */}
            <div className="border-t p-2">
              <Button
                variant="ghost"
                className={`w-full justify-start ${!sidebarOpen && 'px-2'}`}
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                {sidebarOpen && <span className="ml-2">Logout</span>}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto space-y-8">
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

            {/* Render active tab content */}
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'photos' && renderPhotoManager()}
            {activeTab === 'feedback' && renderFeedbackManager()}
            {activeTab === 'newsletter' && renderNewsletterManager()}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={showAlbumModal} onOpenChange={setShowAlbumModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAlbum ? 'Edit Album' : 'Create Album'}
            </DialogTitle>
            <DialogDescription>
              {editingAlbum ? 'Update album details' : 'Create a new photo album'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="album-name">Album Name</Label>
              <Input
                id="album-name"
                placeholder="Enter album name"
                value={albumForm.name}
                onChange={(e) => setAlbumForm({ ...albumForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="album-description">Description</Label>
              <Textarea
                id="album-description"
                placeholder="Enter album description"
                value={albumForm.description}
                onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="album-published"
                checked={albumForm.is_published}
                onChange={(e) => setAlbumForm({ ...albumForm, is_published: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="album-published">Publish album</Label>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAlbumModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAlbum} disabled={loading || !albumForm.name.trim()}>
              {loading ? 'Saving...' : editingAlbum ? 'Update Album' : 'Create Album'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Photos</DialogTitle>
            <DialogDescription>
              Add photos to {selectedAlbum?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => handleImageUpload('photo')}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                Click to select photos or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                Supports all image formats • No size limits
              </p>
            </div>
            {uploadingCount > 0 ? (
              <div className="text-center mt-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-600 mt-3">
                  Uploading {uploadingCount} photo{uploadingCount !== 1 ? 's' : ''}...
                </p>
              </div>
            ) : (
              <div className="text-center mt-6">
                <p className="text-sm text-green-600">
                  Ready to upload photos • Multiple files supported
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
