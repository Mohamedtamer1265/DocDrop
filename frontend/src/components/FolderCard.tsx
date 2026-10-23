'use client';

import React from 'react';
import { Tag } from '../types';

interface FolderCardProps {
  tag: Tag;
  count?: number;
  isSelected: boolean;
  onClick: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  tag,
  count = 0,
  isSelected,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-white border transition-all cursor-pointer select-none ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md shadow-blue-500/5'
          : 'border-slate-200/80 hover:border-blue-300 hover:shadow-md hover:shadow-slate-200/50'
      }`}
    >
      <div className="flex items-start justify-between">
        {/* Blue Folder Graphic matching screenshot */}
        <div className="w-12 h-10 relative">
          {/* Back tab */}
          <div className="absolute top-0 left-0 w-5 h-2 bg-blue-500 rounded-t-sm" />
          {/* Main folder body */}
          <div className="absolute top-1 left-0 w-12 h-9 bg-blue-600 rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
          {/* Inner folder accent */}
          <div className="absolute top-2 left-1.5 w-9 h-6 bg-blue-400 rounded-sm opacity-90" />
        </div>

        {count > 0 && (
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
            {count} {count === 1 ? 'file' : 'files'}
          </span>
        )}
      </div>

      <div className="mt-3">
        <h3 className="font-semibold text-sm text-slate-800 group-hover:text-blue-600 transition-colors truncate">
          {tag.name}
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">Category Folder</p>
      </div>
    </div>
  );
};

