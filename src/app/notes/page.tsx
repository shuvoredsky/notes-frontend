'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import AuthGuard from '@/components/AuthGuard';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
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
  const { success: toastSuccess, error: toastError } = useToast();

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
      toastError('Please fix the form errors');
      return;
    }

    setIsCreating(true);
    try {
      await api.post<ApiResponse<Note>>('/notes', {
        title: createTitle.trim(),
        content: createContent.trim(),
      });
      toastSuccess('Note created');
      setCreateTitle('');
      setCreateContent('');
      if (page === 1) {
        fetchNotes(1);
      } else {
        setPage(1);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create note.';
      setError(msg);
      toastError(msg);
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
      toastError('Please fix the form errors');
      return;
    }

    setIsSaving(true);
    try {
      await api.put<ApiResponse<Note>>(`/notes/${noteId}`, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      toastSuccess('Note updated');
      setEditingId(null);
      fetchNotes(page);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update note.';
      setError(msg);
      toastError(msg);
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
      toastSuccess('Note deleted');
      if (notes.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchNotes(page);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete note.';
      setError(msg);
      toastError(msg);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <AuthGuard>
      <div className="py-4 sm:py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user?.role === 'admin' ? 'Notes Management' : 'My Notes'}
          </h1>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm rounded">
            {error}
          </div>
        )}

        {/* Create Note Section */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-xs">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Create Note</h2>
          <form onSubmit={handleCreateNote} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Note title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {createErrors.title && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.title}</p>
              )}
            </div>

            <div>
              <textarea
                placeholder="Note content"
                rows={3}
                value={createContent}
                onChange={(e) => setCreateContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {createErrors.content && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.content}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="btn text-sm"
              >
                {isCreating ? 'Creating...' : 'Create Note'}
              </button>
            </div>
          </form>
        </div>

        {/* Admin Filter by Owner */}
        {user?.role === 'admin' && (
          <form
            onSubmit={handleApplyOwnerFilter}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-sm shadow-xs"
          >
            <label className="font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Filter by owner id:
            </label>
            <input
              type="text"
              placeholder="e.g. 64b1f... or leave empty"
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              className="flex-1 w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="btn btn-sm"
              >
                Apply Filter
              </button>
              {ownerFilter && (
                <button
                  type="button"
                  onClick={handleClearOwnerFilter}
                  className="btn btn-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        )}

        {/* Notes Listing */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              No notes yet.
            </div>
          ) : (
            notes.map((note) => {
              const isEditing = editingId === note._id;
              const isDeleting = isDeletingId === note._id;

              return (
                <div
                  key={note._id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-xs space-y-3"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {editErrors.title && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.title}</p>
                        )}
                      </div>

                      <div>
                        <textarea
                          rows={3}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {editErrors.content && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.content}</p>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(note._id)}
                          disabled={isSaving}
                          className="btn btn-sm"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="btn btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{note.title}</h3>
                          {user?.role === 'admin' && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                              Owner: {formatOwner(note.owner)}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex space-x-2 self-start">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(note)}
                            className="btn btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note._id)}
                            disabled={isDeleting}
                            className="btn btn-sm"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.content}</p>
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
