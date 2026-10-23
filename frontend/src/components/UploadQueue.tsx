'use client';

import React from 'react';
import { X, CheckCircle2, AlertCircle, FileText, Folder, Loader2 } from 'lucide-react';
import { UploadQueueItem } from '../types';

interface UploadQueueProps {
  items: UploadQueueItem[];
  isOpen: boolean;
  onClose: () => void;
  onClearItem: (id: string) => void;
}

export const UploadQueue: React.FC<UploadQueueProps> = ({
  items,
  isOpen,
  onClose,
  onClearItem,
}) => {
  if (!isOpen || items.length === 0) return null;

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const activeCount = items.filter((i) => i.status === 'uploading').length;

  return (
    <aside aria-label="Upload queue" className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header matching screenshot */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center space-x-2">
          <h4 className="text-xs font-bold text-slate-800 tracking-wide">Upload queue</h4>
          {activeCount > 0 && (
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
              {activeCount} active
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 transition-colors"
          title="Close queue"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Upload Item List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
        {items.map((item) => (
          <div key={item.id} className="p-3.5 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              {/* Blue folder/file thumbnail matching screenshot */}
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                {item.fileName.endsWith('.fig') || item.fileName.endsWith('.zip') ? (
                  <Folder className="w-5 h-5 text-blue-600 fill-blue-600" />
                ) : (
                  <FileText className="w-5 h-5 text-blue-600" />
                )}
              </div>

              {/* Title & destination info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate leading-snug">
                  {item.fileName}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {formatSize(item.fileSize)} | Uploading to /{item.destination || 'Documents'}
                </p>
              </div>
            </div>

            {/* Status indicator on right matching circular spinners from screenshot */}
            <div className="flex-shrink-0 flex items-center">
              {item.status === 'uploading' && (
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <svg className="w-5 h-5 animate-spin text-blue-600" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      fill="none"
                    />
                    <path
                      className="opacity-90"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              )}

              {item.status === 'completed' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}

              {item.status === 'error' && (
                <span title={item.error || 'Upload error'}>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Progress Bar */}
      {activeCount > 0 && (
        <div className="h-1 bg-slate-100 w-full overflow-hidden">
          <div className="h-full bg-blue-600 animate-pulse w-full" />
        </div>
      )}
    </aside>
  );
};
