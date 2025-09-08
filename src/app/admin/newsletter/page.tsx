'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Subscriber {
  id: number;
  email: string;
  subscribed_at: string;
  is_active: boolean;
  unsubscribed_at?: string;
  welcome_email_sent: boolean;
  welcome_email_sent_at?: string;
  last_email_sent_at?: string;
  notes?: string;
  tags?: string[];
  ip_hash: string;
  user_agent: string;
  referrer?: string;
}

interface NewsletterStats {
  total_subscribers: number;
  active_subscribers: number;
  unsubscribed: number;
  welcome_emails_sent: number;
  new_this_month: number;
  new_this_week: number;
}

const NewsletterAdmin: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchSubscribers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStatus, searchQuery]);

  const fetchSubscribers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: currentStatus,
        search: searchQuery,
        limit: '100'
      });

      const response = await fetch(`/api/newsletter/admin?${params}`);
      const data = await response.json();

      if (response.ok) {
        setSubscribers(data.subscribers);
        setStats(data.stats);
      } else {
        toast.error(data.error || 'Failed to fetch subscribers');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [currentStatus, searchQuery]);

  const updateSubscriber = async (
    subscriberId: number, 
    updates: { notes?: string; tags?: string[]; isActive?: boolean }
  ) => {
    try {
      setProcessingId(subscriberId);
      
      const response = await fetch('/api/newsletter/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId,
          ...updates
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchSubscribers(); // Refresh the list
        setEditingNotes(prev => ({ ...prev, [subscriberId]: '' })); // Clear notes
      } else {
        toast.error(data.error || 'Failed to update subscriber');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const deleteSubscriber = async (subscriberId: number) => {
    if (!confirm('Are you sure you want to delete this subscriber? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingId(subscriberId);
      
      const response = await fetch(`/api/newsletter/admin?id=${subscriberId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchSubscribers(); // Refresh the list
      } else {
        toast.error(data.error || 'Failed to delete subscriber');
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

  const getStatusBadge = (subscriber: Subscriber) => {
    if (!subscriber.is_active || subscriber.unsubscribed_at) {
      return <Badge variant="destructive">Unsubscribed</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Active</Badge>;
  };

  const getEmailStatusBadge = (subscriber: Subscriber) => {
    if (subscriber.welcome_email_sent) {
      return <Badge variant="outline" className="text-green-600 border-green-300">Welcome Sent</Badge>;
    }
    return <Badge variant="outline" className="text-orange-600 border-orange-300">Pending</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Newsletter Management</h1>
        <p className="text-gray-600">Manage newsletter subscribers and view statistics</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.active_subscribers}</div>
              <div className="text-sm text-gray-600">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.total_subscribers}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.unsubscribed}</div>
              <div className="text-sm text-gray-600">Unsubscribed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.welcome_emails_sent}</div>
              <div className="text-sm text-gray-600">Welcome Sent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.new_this_month}</div>
              <div className="text-sm text-gray-600">This Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.new_this_week}</div>
              <div className="text-sm text-gray-600">This Week</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'active', label: 'Active', count: stats?.active_subscribers },
            { key: 'unsubscribed', label: 'Unsubscribed', count: stats?.unsubscribed },
            { key: 'all', label: 'All', count: stats?.total_subscribers }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setCurrentStatus(key)}
              className={`
                px-4 py-2 rounded-md font-medium transition-colors text-sm
                ${currentStatus === key 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
                }
              `}
            >
              {label} ({count || 0})
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Subscribers List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading subscribers...</p>
        </div>
      ) : subscribers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No subscribers found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscribers.map((subscriber) => (
            <Card key={subscriber.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg">
                      {subscriber.email}
                    </CardTitle>
                    {getStatusBadge(subscriber)}
                    {getEmailStatusBadge(subscriber)}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {subscriber.id}
                  </div>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><strong>Subscribed:</strong> {formatDate(subscriber.subscribed_at)}</p>
                  {subscriber.unsubscribed_at && (
                    <p><strong>Unsubscribed:</strong> {formatDate(subscriber.unsubscribed_at)}</p>
                  )}
                  {subscriber.welcome_email_sent_at && (
                    <p><strong>Welcome Email:</strong> {formatDate(subscriber.welcome_email_sent_at)}</p>
                  )}
                  {subscriber.referrer && (
                    <p><strong>Referrer:</strong> {subscriber.referrer}</p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Admin Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Admin Notes:</label>
                  <Textarea
                    value={editingNotes[subscriber.id] ?? subscriber.notes ?? ''}
                    onChange={(e) => setEditingNotes(prev => ({ 
                      ...prev, 
                      [subscriber.id]: e.target.value 
                    }))}
                    placeholder="Add notes about this subscriber..."
                    className="min-h-[60px] text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => updateSubscriber(subscriber.id, { 
                      notes: editingNotes[subscriber.id] ?? subscriber.notes 
                    })}
                    disabled={processingId === subscriber.id}
                    size="sm"
                    variant="outline"
                  >
                    💾 Save Notes
                  </Button>

                  {subscriber.is_active ? (
                    <Button
                      onClick={() => updateSubscriber(subscriber.id, { isActive: false })}
                      disabled={processingId === subscriber.id}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      🚫 Unsubscribe
                    </Button>
                  ) : (
                    <Button
                      onClick={() => updateSubscriber(subscriber.id, { isActive: true })}
                      disabled={processingId === subscriber.id}
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      ✅ Reactivate
                    </Button>
                  )}

                  <Button
                    onClick={() => deleteSubscriber(subscriber.id)}
                    disabled={processingId === subscriber.id}
                    size="sm"
                    variant="outline"
                    className="text-gray-600 hover:text-red-600"
                  >
                    🗑️ Delete
                  </Button>
                </div>

                {/* Technical Details */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Technical Details
                  </summary>
                  <div className="mt-2 text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded">
                    <p><strong>User Agent:</strong> {subscriber.user_agent}</p>
                    <p><strong>IP Hash:</strong> {subscriber.ip_hash}</p>
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

export default NewsletterAdmin;
