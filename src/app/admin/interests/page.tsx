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
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users by Interest</h1>
            <p className="text-sm text-gray-600">
              Aggregation Scenario 1: Group and analyze users according to shared interests.
            </p>
          </div>

          {/* Filter Bar */}
          <form onSubmit={handleApplyFilter} className="flex items-center gap-2">
            <input
              type="text"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Filter by interest..."
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
            >
              Apply
            </button>
            {appliedFilter && (
              <button
                type="button"
                onClick={handleClearFilter}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {appliedFilter && (
          <div className="mb-4 text-xs text-gray-600 flex items-center gap-2">
            <span>Filtered by interest:</span>
            <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              {appliedFilter}
            </span>
            <button
              type="button"
              onClick={handleClearFilter}
              className="text-gray-400 hover:text-gray-600 cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500 shadow-xs">
            Loading interests...
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-lg p-8 text-center shadow-xs">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              type="button"
              onClick={fetchGroups}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500 shadow-xs">
            No interests found.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-gray-500 px-1">
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
                  className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-base font-bold text-gray-900 capitalize">
                        {group.interest}
                      </span>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {group.count} {group.count === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Group Members
                    </h3>
                    {group.users && group.users.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {group.users.map((member) => (
                          <div
                            key={member._id}
                            className="p-3 rounded border border-gray-100 bg-gray-50/60 flex flex-col justify-between"
                          >
                            <div>
                              <div className="font-medium text-sm text-gray-900">
                                {member.name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {member.email}
                              </div>
                            </div>
                            <div className="mt-2 text-right">
                              <Link
                                href={`/users/${member._id}/posts`}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                View Posts →
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No member details available.</p>
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

