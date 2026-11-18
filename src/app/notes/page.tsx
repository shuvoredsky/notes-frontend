'use client';

import React from 'react';
import AuthGuard from '@/components/AuthGuard';

export default function NotesPage() {
  return (
    <AuthGuard>
      <div className="py-8">
        <h1 className="text-2xl font-bold text-gray-900">Notes page</h1>
        <p className="mt-2 text-gray-600">Your notes will appear here.</p>
      </div>
    </AuthGuard>
  );
}
