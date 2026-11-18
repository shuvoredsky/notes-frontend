'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Notes App
          </Link>
          {user && (
            <>
              <Link
                href="/notes"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Notes
              </Link>
              <Link
                href={`/users/${user._id}/posts`}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                My Posts
              </Link>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <Link
                href="/admin/users"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Users
              </Link>
              <Link
                href="/admin/interests"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Interests
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{user.name}</span>
                <span className="ml-1 text-xs uppercase px-2 py-0.5 bg-gray-100 rounded text-gray-600 border border-gray-200">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-sm px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="space-x-3">
              <Link
                href="/login"
                className="text-sm px-3 py-1.5 rounded hover:bg-gray-100 text-gray-700 font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
