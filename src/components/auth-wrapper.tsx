'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
  returnUrl?: string;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children, returnUrl }) => {
  const { isAuthenticated, isLoading, requireAuth } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      requireAuth(returnUrl);
    }
  }, [isLoading, isAuthenticated, requireAuth, returnUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper;
