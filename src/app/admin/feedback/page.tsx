'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Feedback {
  id: number;
  message: string;
  feedback_type: string;
  mood_emoji?: string;
  rating?: number;
  created_at: string;
  status: string;
  admin_notes?: string;
  is_spam: boolean;
  spam_score: number;
  user_agent: string;
}

// Helper function to get category info based on feedback_type
const getCategoryInfo = (feedbackType: string) => {
  const categories: Record<string, { name: string; icon_emoji: string; color_hex: string }> = {
    general: { name: 'General', icon_emoji: '💬', color_hex: '#6b7280' },
    portfolio: { name: 'Portfolio', icon_emoji: '🎨', color_hex: '#3b82f6' },
    website: { name: 'Website', icon_emoji: '🌐', color_hex: '#10b981' },
    collaboration: { name: 'Collaboration', icon_emoji: '🤝', color_hex: '#f59e0b' },
    suggestion: { name: 'Suggestion', icon_emoji: '💡', color_hex: '#8b5cf6' },
    compliment: { name: 'Compliment', icon_emoji: '❤️', color_hex: '#ef4444' },
    critique: { name: 'Critique', icon_emoji: '🔍', color_hex: '#f97316' }
  };
  return categories[feedbackType] || categories.general;
};

interface FeedbackCounts {
  pending: number;
  approved: number;
  rejected: number;
  archived: number;
}

const FeedbackAdmin: React.FC = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [counts, setCounts] = useState<FeedbackCounts>({ pending: 0, approved: 0, rejected: 0, archived: 0 });
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchFeedback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStatus]);

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/feedback/admin?status=${currentStatus}`);
      const data = await response.json();

      if (response.ok) {
        setFeedback(data.feedback);
        setCounts(data.counts);
      } else {
        toast.error(data.error || 'Failed to fetch feedback');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [currentStatus]);

  const updateFeedbackStatus = async (
    feedbackId: number, 
    newStatus: string, 
    options: { displayPublicly?: boolean; isFeatured?: boolean } = {}
  ) => {
    try {
      setProcessingId(feedbackId);
      
      const response = await fetch('/api/feedback/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId,
          status: newStatus,
          adminNotes: adminNotes[feedbackId] || '',
          displayPublicly: options.displayPublicly,
          isFeatured: options.isFeatured
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchFeedback(); // Refresh the list
        setAdminNotes(prev => ({ ...prev, [feedbackId]: '' })); // Clear notes
      } else {
        toast.error(data.error || 'Failed to update feedback');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const deleteFeedback = async (feedbackId: number) => {
    if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingId(feedbackId);
      
      const response = await fetch(`/api/feedback/admin?id=${feedbackId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchFeedback(); // Refresh the list
      } else {
        toast.error(data.error || 'Failed to delete feedback');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSpamBadge = (isSpam: boolean, score: number) => {
    if (isSpam) {
      return <Badge variant="destructive">SPAM</Badge>;
    }
    if (score > 0.5) {
      return <Badge variant="outline" className="text-orange-600">Suspicious ({Math.round(score * 100)}%)</Badge>;
    }
    return null;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Feedback Management</h1>
        <p className="text-gray-600">Review and manage user feedback submissions</p>
      </div>

      {/* Status Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {Object.entries(counts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setCurrentStatus(status)}
            className={`
              px-4 py-2 rounded-md font-medium transition-colors capitalize
              ${currentStatus === status 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
              }
            `}
          >
            {status} ({count})
          </button>
        ))}
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading feedback...</p>
        </div>
      ) : feedback.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No {currentStatus} feedback found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg">
                      Feedback #{item.id}
                    </CardTitle>
                    {(() => {
                      const categoryInfo = getCategoryInfo(item.feedback_type);
                      return (
                        <Badge 
                          variant="outline" 
                          style={{ backgroundColor: categoryInfo.color_hex + '20', color: categoryInfo.color_hex }}
                        >
                          {categoryInfo.icon_emoji} {categoryInfo.name}
                        </Badge>
                      );
                    })()}
                    {item.mood_emoji && (
                      <span className="text-2xl">{item.mood_emoji}</span>
                    )}
                    {item.rating && (
                      <div className="flex items-center">
                        {'⭐'.repeat(item.rating)}
                        <span className="ml-1 text-sm text-gray-600">({item.rating}/5)</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getSpamBadge(item.is_spam, item.spam_score)}
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Submitted on {formatDate(item.created_at)}
                </p>
              </CardHeader>
              
              <CardContent>
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Message:</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="whitespace-pre-wrap">{item.message}</p>
                  </div>
                </div>

                {item.admin_notes && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Admin Notes:</h4>
                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-sm">{item.admin_notes}</p>
                    </div>
                  </div>
                )}

                {currentStatus === 'pending' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Admin Notes (optional):</label>
                      <Textarea
                        value={adminNotes[item.id] || ''}
                        onChange={(e) => setAdminNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="Add notes about your decision..."
                        className="min-h-[80px]"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => updateFeedbackStatus(item.id, 'approved', { displayPublicly: true })}
                        disabled={processingId === item.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ✅ Approve & Display
                      </Button>
                      
                      <Button
                        onClick={() => updateFeedbackStatus(item.id, 'approved', { displayPublicly: true, isFeatured: true })}
                        disabled={processingId === item.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        ⭐ Approve & Feature
                      </Button>
                      
                      <Button
                        onClick={() => updateFeedbackStatus(item.id, 'approved', { displayPublicly: false })}
                        disabled={processingId === item.id}
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        👁️ Approve (Private)
                      </Button>
                      
                      <Button
                        onClick={() => updateFeedbackStatus(item.id, 'rejected')}
                        disabled={processingId === item.id}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        ❌ Reject
                      </Button>
                      
                      <Button
                        onClick={() => deleteFeedback(item.id)}
                        disabled={processingId === item.id}
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                )}

                {currentStatus !== 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => updateFeedbackStatus(item.id, 'pending')}
                      disabled={processingId === item.id}
                      variant="outline"
                      size="sm"
                    >
                      Move to Pending
                    </Button>
                    
                    <Button
                      onClick={() => deleteFeedback(item.id)}
                      disabled={processingId === item.id}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                )}

                {/* Technical Details (Collapsible) */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Technical Details
                  </summary>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <p><strong>User Agent:</strong> {item.user_agent}</p>
                    <p><strong>Spam Score:</strong> {Math.round(item.spam_score * 100)}%</p>
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackAdmin;
