'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/api';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  interests: z.string().optional(),
});

type RegisterFormErrors = {
  name?: string;
  email?: string;
  password?: string;
  interests?: string;
};

export default function RegisterPage() {
  const { register } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [interests, setInterests] = useState('');
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const result = registerSchema.safeParse({ name, email, password, interests });
    if (!result.success) {
      const fieldErrors: RegisterFormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof RegisterFormErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      toastError('Please fix the form errors');
      return;
    }

    const interestsArray = interests
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setIsSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        interests: interestsArray,
      });
      toastSuccess('Account created');
      router.push('/notes');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'An unexpected error occurred. Please try again.';
      setServerError(message);
      toastError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard guestOnly>
      <div className="flex justify-center items-center py-8 sm:py-12">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-xs">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Create an Account</h1>

          {serverError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm rounded">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="name@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="At least 6 characters"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interests <span className="text-gray-400 dark:text-gray-500 font-normal">(optional, comma-separated)</span>
              </label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="coding, music, reading"
              />
              {errors.interests && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.interests}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn w-full py-2"
            >
              {isSubmitting ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
