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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-800 px-2 py-4 mt-6">
      <div className="text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
        Page <span className="font-medium text-gray-900 dark:text-gray-100">{meta.page}</span> of{' '}
        <span className="font-medium text-gray-900 dark:text-gray-100">{meta.pages}</span>{' '}
        <span className="text-gray-500 dark:text-gray-400">({meta.total} total)</span>
      </div>
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={isPrevDisabled}
          className="btn btn-sm"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={isNextDisabled}
          className="btn btn-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}
