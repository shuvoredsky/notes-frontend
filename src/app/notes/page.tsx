'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import AuthGuard from '@/components/AuthGuard';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/context/AuthContext';
import { Note, PaginationMeta, PaginatedApiResponse, ApiResponse } from '@/types/api';
import { api, buildQuery, ApiError } from '@/lib/api';

const LIMIT = 5;

const noteSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty'),
  content: z.string().trim().min(1, 'Content cannot be empty'),
});

function formatOwner(owner: Note['owner']): string {
  if (!owner) return 'Unknown';
  if (typeof owner === 'string') return owner;
  return `${owner.name} (${owner.email})`;
}

export default function NotesPage() {
  const { user } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Admin filter by owner
  const [ownerInput, setOwnerInput] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');

  // Create form state
  const [createTitle, setCreateTitle] = useState<string>('');
  const [createContent, setCreateContent] = useState<string>('');
  const [createErrors, setCreateErrors] = useState<{ title?: string; content?: string }>({});
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editErrors, setEditErrors] = useState<{ title?: string; content?: string }>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError(null);

    const queryParams: Record<string, string | number | undefined> = {
      page: targetPage,
      limit: LIMIT,
    };

    if (user?.role === 'admin' && ownerFilter.trim()) {
      queryParams.owner = ownerFilter.trim();
    }

    try {
      const res = await api.get<PaginatedApiResponse<Note>>(`/notes${buildQuery(queryParams)}`);
      setNotes(res.data);
      setMeta(res.meta);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch notes. Please try again.');
      }
      setNotes([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, ownerFilter, user?.role]);

  useEffect(() => {
    fetchNotes(page);
  }, [fetchNotes, page]);

  const handleApplyOwnerFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerFilter(ownerInput.trim());
    setPage(1);
  };

  const handleClearOwnerFilter = () => {
    setOwnerInput('');
    setOwnerFilter('');
    setPage(1);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({});
    setError(null);

    const result = noteSchema.safeParse({
      title: createTitle,
      content: createContent,
    });

    if (!result.success) {
      const fieldErrors: { title?: string; content?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'title' | 'content';
        fieldErrors[field] = issue.message;
      }
      setCreateErrors(fieldErrors);
      return;
    }

    setIsCreating(true);
    try {
      await api.post<ApiResponse<Note>>('/notes', {
        title: createTitle.trim(),
        content: createContent.trim(),
      });
      setCreateTitle('');
      setCreateContent('');
      if (page === 1) {
        fetchNotes(1);
      } else {
        setPage(1);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create note.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note._id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditErrors({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditErrors({});
  };

  const handleSaveEdit = async (noteId: string) => {
    setEditErrors({});
    setError(null);

    const result = noteSchema.safeParse({
      title: editTitle,
      content: editContent,
    });

    if (!result.success) {
      const fieldErrors: { title?: string; content?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'title' | 'content';
        fieldErrors[field] = issue.message;
      }
      setEditErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      await api.put<ApiResponse<Note>>(`/notes/${noteId}`, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setEditingId(null);
      fetchNotes(page);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update note.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this note?');
    if (!confirmed) return;

    setIsDeletingId(noteId);
    setError(null);

    try {
      await api.delete(`/notes/${noteId}`);
      if (notes.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchNotes(page);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to delete note.');
      }
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <AuthGuard>
      <div className="py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === 'admin' ? 'Notes Management' : 'My Notes'}
          </h1>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        {/* Create Note Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Create Note</h2>
          <form onSubmit={handleCreateNote} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Note title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {createErrors.title && (
                <p className="mt-1 text-xs text-red-600">{createErrors.title}</p>
              )}
            </div>

            <div>
              <textarea
                placeholder="Note content"
                rows={3}
                value={createContent}
                onChange={(e) => setCreateContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {createErrors.content && (
                <p className="mt-1 text-xs text-red-600">{createErrors.content}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition disabled:opacity-50 cursor-pointer"
            >
              {isCreating ? 'Creating...' : 'Create Note'}
            </button>
          </form>
        </div>

        {/* Admin Filter by Owner */}
        {user?.role === 'admin' && (
          <form
            onSubmit={handleApplyOwnerFilter}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3 text-sm shadow-sm"
          >
            <label className="font-medium text-gray-700 whitespace-nowrap">
              Filter by owner id:
            </label>
            <input
              type="text"
              placeholder="e.g. 64b1f... or leave empty"
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded text-sm font-medium cursor-pointer"
            >
              Apply Filter
            </button>
            {ownerFilter && (
              <button
                type="button"
                onClick={handleClearOwnerFilter}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>
        )}

        {/* Notes Listing */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm bg-white border border-gray-200 rounded-lg">
              No notes yet.
            </div>
          ) : (
            notes.map((note) => {
              const isEditing = editingId === note._id;
              const isDeleting = isDeletingId === note._id;

              return (
                <div
                  key={note._id}
                  className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {editErrors.title && (
                          <p className="mt-1 text-xs text-red-600">{editErrors.title}</p>
                        )}
                      </div>

                      <div>
                        <textarea
                          rows={3}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {editErrors.content && (
                          <p className="mt-1 text-xs text-red-600">{editErrors.content}</p>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(note._id)}
                          disabled={isSaving}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded disabled:opacity-50 cursor-pointer"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">{note.title}</h3>
                          {user?.role === 'admin' && (
                            <p className="text-xs text-blue-600 mt-0.5">
                              Owner: {formatOwner(note.owner)}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(note)}
                            className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note._id)}
                            disabled={isDeleting}
                            className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded disabled:opacity-50 cursor-pointer"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {meta && (
          <Pagination
            meta={meta}
            onPageChange={(newPage) => setPage(newPage)}
          />
        )}
      </div>
    </AuthGuard>
  );
}
