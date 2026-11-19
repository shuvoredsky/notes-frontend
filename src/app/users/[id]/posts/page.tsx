'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { z } from 'zod';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError, buildQuery } from '@/lib/api';
import { PaginatedApiResponse, PaginationMeta, Post, UserPostsData, UserSummary } from '@/types/api';

const LIMIT = 5;

const createPostSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().trim().min(1, 'Content is required'),
});

export default function UserPostsPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const { user: currentUser, loading: authLoading } = useAuth();

  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create post form state (for post author)
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createErrors, setCreateErrors] = useState<{ title?: string; content?: string }>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchUserPosts = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedApiResponse<UserPostsData>>(
        `/users/${id}/posts${buildQuery({ page, limit: LIMIT })}`
      );
      setUserSummary(res.data.user);
      setPosts(res.data.posts);
      setMeta(res.meta);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load user posts');
      }
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    fetchUserPosts();
  }, [fetchUserPosts]);

  const isOwner =
    !authLoading &&
    !!currentUser?._id &&
    !!id &&
    currentUser._id.toString() === id.toString();

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setCreateErrors({});

    const result = createPostSchema.safeParse({
      title: createTitle,
      content: createContent,
    });

    if (!result.success) {
      const errors: { title?: string; content?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === 'title' || field === 'content') {
          errors[field] = issue.message;
        }
      }
      setCreateErrors(errors);
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/posts', {
        title: result.data.title,
        content: result.data.content,
      });

      setCreateTitle('');
      setCreateContent('');

      if (page !== 1) {
        setPage(1);
      } else {
        await fetchUserPosts();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Failed to create post');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setActionError(null);
    const confirmed = window.confirm('Are you sure you want to delete this post?');
    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    try {
      await api.delete(`/posts/${postId}`);

      if (posts.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchUserPosts();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Failed to delete post');
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 space-y-6">
      {/* Header Info */}
      {userSummary ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{userSummary.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{userSummary.email}</p>
            </div>
            {isOwner && (
              <span className="self-start sm:self-auto text-xs font-semibold px-2.5 py-1 bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 rounded-full border border-green-200 dark:border-green-800">
                Your Public Profile
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300 flex items-start justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Create Post Form (Only shown if logged-in user is viewing their OWN posts page) */}
      {!authLoading && isOwner && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 sm:p-6 shadow-xs">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create a New Post</h2>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Post Title
              </label>
              <input
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="What's on your mind?"
                disabled={actionLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {createErrors.title && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content
              </label>
              <textarea
                value={createContent}
                onChange={(e) => setCreateContent(e.target.value)}
                rows={3}
                placeholder="Share your thoughts with the public..."
                disabled={actionLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {createErrors.content && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.content}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="btn"
              >
                {actionLoading ? 'Publishing...' : 'Publish Post'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts Section */}
      {loading ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400 shadow-xs">
          Loading posts...
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded-lg p-8 text-center shadow-xs">
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          <button
            type="button"
            onClick={fetchUserPosts}
            className="btn btn-sm"
          >
            Retry
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400 shadow-xs">
          No posts yet.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 px-1">
            <span>Posts by {userSummary?.name || 'User'}</span>
            {meta && (
              <span>
                {meta.total} {meta.total === 1 ? 'total post' : 'total posts'}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {posts.map((post) => {
              const authorId = typeof post.author === 'string' ? post.author : post.author?._id;
              const isOwnPost =
                !authLoading &&
                !!currentUser?._id &&
                !!authorId &&
                currentUser._id.toString() === authorId.toString();
              const canDelete = isOwnPost || (!authLoading && currentUser?.role === 'admin');

              return (
                <div
                  key={post._id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-xs transition-shadow hover:shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{post.title}</h3>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post._id)}
                        disabled={actionLoading}
                        className="btn btn-sm self-start"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">
                    {post.content}
                  </p>

                  <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-2">
                    Posted on {new Date(post.createdAt).toLocaleDateString()} at{' '}
                    {new Date(post.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {meta && <Pagination meta={meta} onPageChange={(p) => setPage(p)} />}
        </div>
      )}
    </div>
  );
}
