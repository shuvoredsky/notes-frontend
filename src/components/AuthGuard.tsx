'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  guestOnly?: boolean;
}

export default function AuthGuard({
  children,
  requireAdmin = false,
  guestOnly = false,
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (guestOnly && user) {
      router.replace('/notes');
    } else if (!guestOnly && !user) {
      router.replace('/login');
    } else if (requireAdmin && user?.role !== 'admin') {
      router.replace('/notes');
    }
  }, [user, loading, guestOnly, requireAdmin, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (guestOnly && user) {
    return null;
  }

  if (!guestOnly && !user) {
    return null;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
