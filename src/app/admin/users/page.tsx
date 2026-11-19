'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import AuthGuard from '@/components/AuthGuard';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, ApiError, buildQuery } from '@/lib/api';
import { PaginatedApiResponse, PaginationMeta, User } from '@/types/api';

const LIMIT = 5;

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['user', 'admin']),
  interests: z.string().optional(),
});

interface EditFormState {
  name: string;
  email: string;
  role: 'user' | 'admin';
  interests: string;
  password: string;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action status (create, update, delete)
  const [actionLoading, setActionLoading] = useState(false);

  // Create user form state
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    interests: '',
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Inline edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    email: '',
    role: 'user',
    interests: '',
    password: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedApiResponse<User>>(
        `/users${buildQuery({ page, limit: LIMIT })}`
      );
      setUsers(res.data);
      setMeta(res.meta);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Create user handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({});

    const result = createUserSchema.safeParse(createForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (path && typeof path === 'string') {
          fieldErrors[path] = issue.message;
        }
      }
      setCreateErrors(fieldErrors);
      toastError('Please fix the form errors');
      return;
    }

    const interests = result.data.interests
      ? result.data.interests
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];

    setActionLoading(true);
    try {
      await api.post('/users', {
        name: result.data.name,
        email: result.data.email.toLowerCase(),
        password: result.data.password,
        role: result.data.role,
        interests,
      });

      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        interests: '',
      });
      toastSuccess('User created');

      if (page !== 1) {
        setPage(1);
      } else {
        await fetchUsers();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toastError(err.message);
      } else {
        toastError('Failed to create user');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Start inline editing
  const startEditing = (u: User) => {
    setEditingUserId(u._id);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      interests: u.interests ? u.interests.join(', ') : '',
      password: '',
    });
    setEditErrors({});
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditForm({
      name: '',
      email: '',
      role: 'user',
      interests: '',
      password: '',
    });
    setEditErrors({});
  };

  // Save inline edit
  const handleSaveEdit = async (u: User) => {
    setEditErrors({});

    const errors: Record<string, string> = {};
    if (!editForm.name.trim() || editForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editForm.email.trim() || !emailRegex.test(editForm.email.trim())) {
      errors.email = 'Invalid email address';
    }
    if (editForm.password && editForm.password.trim().length > 0 && editForm.password.trim().length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      toastError('Please fix the form errors');
      return;
    }

    const payload: {
      name?: string;
      email?: string;
      role?: 'user' | 'admin';
      interests?: string[];
      password?: string;
    } = {};

    if (editForm.name.trim() !== u.name) {
      payload.name = editForm.name.trim();
    }
    if (editForm.email.trim().toLowerCase() !== u.email.toLowerCase()) {
      payload.email = editForm.email.trim().toLowerCase();
    }
    if (editForm.role !== u.role) {
      payload.role = editForm.role;
    }

    const parsedInterests = editForm.interests
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const existingInterests = (u.interests || []).map((s) => s.toLowerCase());
    const interestsChanged =
      parsedInterests.length !== existingInterests.length ||
      parsedInterests.some((item, idx) => item !== existingInterests[idx]);

    if (interestsChanged) {
      payload.interests = parsedInterests;
    }

    if (editForm.password && editForm.password.trim().length > 0) {
      payload.password = editForm.password.trim();
    }

    // If nothing changed, exit edit mode cleanly
    if (Object.keys(payload).length === 0) {
      setEditingUserId(null);
      return;
    }

    setActionLoading(true);
    try {
      await api.put(`/users/${u._id}`, payload);
      setEditingUserId(null);
      toastSuccess('User updated');
      await fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        toastError(err.message);
      } else {
        toastError('Failed to update user');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (u: User) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${u.name}"? This user's notes and posts will also be deleted.`
    );
    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    try {
      await api.delete(`/users/${u._id}`);
      toastSuccess('User deleted');

      // If the last item on a page > 1 was deleted, navigate to previous page
      if (users.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchUsers();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toastError(err.message);
      } else {
        toastError('Failed to delete user');
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AuthGuard requireAdmin>
      <div className="max-w-5xl mx-auto py-4 sm:py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create, edit, and manage system users and roles.
            </p>
          </div>
        </div>

        {/* Create User Form */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 sm:p-6 shadow-xs">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add New User</h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={actionLoading}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {createErrors.name && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={actionLoading}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {createErrors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  disabled={actionLoading}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {createErrors.password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      role: e.target.value as 'user' | 'admin',
                    }))
                  }
                  disabled={actionLoading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interests <span className="text-gray-400 dark:text-gray-500 font-normal">(optional, comma-separated)</span>
              </label>
              <input
                type="text"
                value={createForm.interests}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, interests: e.target.value }))
                }
                disabled={actionLoading}
                placeholder="tech, reading, sports"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="btn"
              >
                {actionLoading ? 'Creating User...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>

        {/* Users List */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Registered Users</h2>
            {meta && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {meta.total} total {meta.total === 1 ? 'user' : 'users'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading users...
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <button
                type="button"
                onClick={fetchUsers}
                className="btn btn-sm"
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300 divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-semibold">User</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Role</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Interests</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Created</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {users.map((u) => {
                    const isEditing = editingUserId === u._id;
                    const isSelf = currentUser?._id === u._id;

                    if (isEditing) {
                      return (
                        <tr key={u._id} className="bg-blue-50/50 dark:bg-blue-950/20">
                          <td className="px-6 py-4" colSpan={5}>
                            <div className="space-y-3">
                              <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">
                                Editing User: {u.name} ({u.email})
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Name
                                  </label>
                                  <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                      }))
                                    }
                                    disabled={actionLoading}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  />
                                  {editErrors.name && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                      {editErrors.name}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email
                                  </label>
                                  <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                      }))
                                    }
                                    disabled={actionLoading}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  />
                                  {editErrors.email && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                      {editErrors.email}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Role
                                  </label>
                                  <select
                                    value={editForm.role}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        role: e.target.value as 'user' | 'admin',
                                      }))
                                    }
                                    disabled={actionLoading}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Interests (comma-separated)
                                  </label>
                                  <input
                                    type="text"
                                    value={editForm.interests}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        interests: e.target.value,
                                      }))
                                    }
                                    disabled={actionLoading}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    New Password (leave empty to keep)
                                  </label>
                                  <input
                                    type="password"
                                    value={editForm.password}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        password: e.target.value,
                                      }))
                                    }
                                    disabled={actionLoading}
                                    placeholder="Optional"
                                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                  />
                                  {editErrors.password && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                      {editErrors.password}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-end space-x-2 pt-2">
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  disabled={actionLoading}
                                  className="btn btn-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(u)}
                                  disabled={actionLoading}
                                  className="btn btn-sm"
                                >
                                  {actionLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{u.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                              u.role === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate">
                            {u.interests && u.interests.length > 0
                              ? u.interests.join(', ')
                              : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                          <Link
                            href={`/users/${u._id}/posts`}
                            className="inline-block px-2.5 py-1 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                          >
                            Posts
                          </Link>
                          <button
                            type="button"
                            onClick={() => startEditing(u)}
                            disabled={actionLoading}
                            className="btn btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={actionLoading || isSelf}
                            title={
                              isSelf
                                ? 'You cannot delete your own account'
                                : 'Delete user'
                            }
                            className="btn btn-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {meta && <Pagination meta={meta} onPageChange={(p) => setPage(p)} />}
        </div>
      </div>
    </AuthGuard>
  );
}
