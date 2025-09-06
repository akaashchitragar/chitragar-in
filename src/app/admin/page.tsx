'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/components/auth-wrapper';

const AdminDashboard = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to photo-upload as the main admin interface
    router.push('/photo-upload');
  }, [router]);

  return (
    <AuthWrapper returnUrl="/admin">
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Redirecting to admin panel...</p>
      </div>
    </AuthWrapper>
  );
};

export default AdminDashboard;
