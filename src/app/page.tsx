'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
      router.replace('/notes');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
