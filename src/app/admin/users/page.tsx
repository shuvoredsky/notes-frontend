'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import AuthGuard from '@/components/AuthGuard';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/context/AuthContext';
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

  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action status (create, update, delete)
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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
    setActionError(null);
    setActionSuccess(null);
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
      setActionSuccess('User created successfully');

      if (page !== 1) {
        setPage(1);
      } else {
        await fetchUsers();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Failed to create user');
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
    setActionError(null);
    setActionSuccess(null);
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
    setActionError(null);
    setActionSuccess(null);
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
      setActionSuccess('User updated successfully');
      await fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Failed to update user');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (u: User) => {
    setActionError(null);
    setActionSuccess(null);

    const confirmed = window.confirm(
      `Are you sure you want to delete "${u.name}"? This user's notes and posts will also be deleted.`
    );
    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    try {
      await api.delete(`/users/${u._id}`);
      setActionSuccess('User deleted successfully');

      // If the last item on a page > 1 was deleted, navigate to previous page
      if (users.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchUsers();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Failed to delete user');
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AuthGuard requireAdmin>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600">
              Create, edit, and manage system users and roles.
            </p>
          </div>
        </div>

        {/* Global Action Alerts */}
        {actionError && (
          <div className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-sm text-red-700 flex items-start justify-between">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-red-500 hover:text-red-700 font-bold ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-6 p-4 rounded bg-green-50 border border-green-200 text-sm text-green-700 flex items-start justify-between">
            <span>{actionSuccess}</span>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-green-500 hover:text-green-700 font-bold ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Create User Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-xs">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New User</h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {createErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{createErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {createErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{createErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {createErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{createErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interests <span className="text-gray-400 font-normal">(optional, comma-separated)</span>
              </label>
              <input
                type="text"
                value={createForm.interests}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, interests: e.target.value }))
                }
                disabled={actionLoading}
                placeholder="tech, reading, sports"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Creating User...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>

        {/* Users List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Registered Users</h2>
            {meta && (
              <span className="text-xs text-gray-500">
                {meta.total} total {meta.total === 1 ? 'user' : 'users'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading users...
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <button
                type="button"
                onClick={fetchUsers}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded font-medium cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700 divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-semibold">User</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Role</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Interests</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Created</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((u) => {
                    const isEditing = editingUserId === u._id;
                    const isSelf = currentUser?._id === u._id;

                    if (isEditing) {
                      return (
                        <tr key={u._id} className="bg-blue-50/50">
                          <td className="px-6 py-4" colSpan={5}>
                            <div className="space-y-3">
                              <div className="text-xs font-semibold text-blue-700 uppercase">
                                Editing User: {u.name} ({u.email})
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
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
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white"
                                  />
                                  {editErrors.name && (
                                    <p className="text-xs text-red-600 mt-0.5">
                                      {editErrors.name}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
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
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white"
                                  />
                                  {editErrors.email && (
                                    <p className="text-xs text-red-600 mt-0.5">
                                      {editErrors.email}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
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
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white"
                                  >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
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
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
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
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white"
                                  />
                                  {editErrors.password && (
                                    <p className="text-xs text-red-600 mt-0.5">
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
                                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 cursor-pointer disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(u)}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer disabled:opacity-50"
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
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-600 max-w-xs truncate">
                            {u.interests && u.interests.length > 0
                              ? u.interests.join(', ')
                              : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                          <Link
                            href={`/users/${u._id}/posts`}
                            className="inline-block px-2.5 py-1 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700"
                          >
                            Posts
                          </Link>
                          <button
                            type="button"
                            onClick={() => startEditing(u)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 text-xs font-medium border border-blue-300 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer disabled:opacity-50"
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
                            className="px-2.5 py-1 text-xs font-medium border border-red-300 rounded bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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

