'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import Pagination from '@/components/Pagination';
import { api, ApiError, buildQuery } from '@/lib/api';
import { InterestGroup, PaginatedApiResponse, PaginationMeta } from '@/types/api';

const LIMIT = 5;

export default function AdminInterestsPage() {
  const [groups, setGroups] = useState<InterestGroup[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterInput, setFilterInput] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedApiResponse<InterestGroup[]>>(
        `/users/grouped-by-interests${buildQuery({
          page,
          limit: LIMIT,
          interest: appliedFilter ? appliedFilter.trim().toLowerCase() : undefined,
        })}`
      );
      setGroups(res.data);
      setMeta(res.meta);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load interests');
      }
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilter]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = filterInput.trim();
    if (trimmed !== appliedFilter) {
      setAppliedFilter(trimmed);
      setPage(1);
    }
  };

  const handleClearFilter = () => {
    setFilterInput('');
    if (appliedFilter !== '') {
      setAppliedFilter('');
      setPage(1);
    }
  };

  return (
    <AuthGuard requireAdmin>
      <div className="max-w-5xl mx-auto py-4 sm:py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users by Interest</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aggregation Scenario 1: Group and analyze users according to shared interests.
            </p>
          </div>

          {/* Filter Bar */}
          <form onSubmit={handleApplyFilter} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Filter by interest..."
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="btn btn-sm"
              >
                Apply
              </button>
              {appliedFilter && (
                <button
                  type="button"
                  onClick={handleClearFilter}
                  className="btn btn-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {appliedFilter && (
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <span>Filtered by interest:</span>
            <span className="font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded">
              {appliedFilter}
            </span>
            <button
              type="button"
              onClick={handleClearFilter}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400 shadow-xs">
            Loading interests...
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded-lg p-8 text-center shadow-xs">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <button
              type="button"
              onClick={fetchGroups}
              className="btn btn-sm"
            >
              Retry
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400 shadow-xs">
            No interests found.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 px-1">
              <span>
                Showing {groups.length} {groups.length === 1 ? 'group' : 'groups'}
              </span>
              {meta && (
                <span>
                  {meta.total} {meta.total === 1 ? 'total group' : 'total groups'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {groups.map((group, idx) => (
                <div
                  key={`${group.interest}-${idx}`}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-100 capitalize">
                        {group.interest}
                      </span>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                        {group.count} {group.count === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Group Members
                    </h3>
                    {group.users && group.users.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {group.users.map((member) => (
                          <div
                            key={member._id}
                            className="p-3 rounded border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/60 flex flex-col justify-between"
                          >
                            <div>
                              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {member.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {member.email}
                              </div>
                            </div>
                            <div className="mt-2 text-right">
                              <Link
                                href={`/users/${member._id}/posts`}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                              >
                                View Posts →
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">No member details available.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {meta && <Pagination meta={meta} onPageChange={(p) => setPage(p)} />}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
