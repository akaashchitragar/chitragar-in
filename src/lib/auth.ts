'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = () => {
      const authenticated = localStorage.getItem('admin_authenticated') === 'true';
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = () => {
    localStorage.setItem('admin_authenticated', 'true');
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_email');
    setIsAuthenticated(false);
    router.push('/admin/login');
  };

  const requireAuth = (returnUrl?: string) => {
    if (!isLoading && !isAuthenticated) {
      const loginUrl = returnUrl 
        ? `/admin/login?returnUrl=${encodeURIComponent(returnUrl)}`
        : '/admin/login';
      router.push(loginUrl);
      return false;
    }
    return isAuthenticated;
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    requireAuth,
  };
};
