'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown whenever route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Desktop Navigation */}
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            onClick={closeMenu}
            className="text-xl font-bold text-gray-900 dark:text-gray-100"
          >
            Notes App
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {user && (
              <>
                <Link
                  href="/notes"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Notes
                </Link>
                <Link
                  href={`/users/${user._id}/posts`}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  My Posts
                </Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Link
                  href="/admin/users"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Users
                </Link>
                <Link
                  href="/admin/interests"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Interests
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Desktop Right Side */}
        <div className="hidden md:flex items-center space-x-4">
          <ThemeToggle />
          {user ? (
            <>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{user.name}</span>
                <span className="ml-1 text-xs uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="btn btn-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="space-x-3">
              <Link
                href="/login"
                className="text-sm px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="btn btn-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center space-x-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
            className="btn btn-sm p-1.5"
          >
            {isOpen ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Panel */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 space-y-3">
          {user ? (
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="text-sm text-gray-800 dark:text-gray-200">
                <span className="font-semibold block">{user.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
              </div>
              <span className="text-xs uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {user.role}
              </span>
            </div>
          ) : null}

          <nav className="flex flex-col space-y-2">
            {user ? (
              <>
                <Link
                  href="/notes"
                  onClick={closeMenu}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-1"
                >
                  Notes
                </Link>
                <Link
                  href={`/users/${user._id}/posts`}
                  onClick={closeMenu}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-1"
                >
                  My Posts
                </Link>
                {user.role === 'admin' && (
                  <>
                    <Link
                      href="/admin/users"
                      onClick={closeMenu}
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-1"
                    >
                      Users
                    </Link>
                    <Link
                      href="/admin/interests"
                      onClick={closeMenu}
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-1"
                    >
                      Interests
                    </Link>
                  </>
                )}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                    className="btn btn-sm w-full text-center justify-center"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col space-y-2 pt-1">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-1"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="btn btn-sm w-full text-center justify-center"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
