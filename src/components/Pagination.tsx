'use client';

import React from 'react';
import { PaginationMeta } from '@/types/api';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export default function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.total === 0) {
    return null;
  }

  const isPrevDisabled = meta.page <= 1;
  const isNextDisabled = meta.page >= meta.pages;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-2 py-4 mt-6">
      <div className="text-sm text-gray-700">
        Page <span className="font-medium">{meta.page}</span> of{' '}
        <span className="font-medium">{meta.pages}</span>{' '}
        <span className="text-gray-500">({meta.total} total)</span>
      </div>
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={isPrevDisabled}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={isNextDisabled}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}

