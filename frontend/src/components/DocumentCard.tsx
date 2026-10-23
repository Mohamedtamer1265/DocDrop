'use client';

import React from 'react';
import { FileText, Download, Lock, CheckCircle, ExternalLink, Eye } from 'lucide-react';
import { Document } from '../types';
import { getDownloadUrl, getViewUrl } from '../lib/api';

interface DocumentCardProps {
  document: Document;
  onClick: () => void;
  onPreview?: (doc: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onClick, onPreview }) => {
  // Format file size
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Determine badge type text & color
  const getBadgeInfo = (fileType: string) => {
    if (fileType.includes('pdf')) return { label: 'pdf', color: 'text-red-500 border-red-200 bg-red-50/50' };
    if (fileType.includes('word') || fileType.includes('doc')) return { label: 'doc', color: 'text-blue-500 border-blue-200 bg-blue-50/50' };
    if (fileType.includes('fig')) return { label: 'fig', color: 'text-purple-500 border-purple-200 bg-purple-50/50' };
    if (fileType.includes('image')) return { label: 'img', color: 'text-emerald-500 border-emerald-200 bg-emerald-50/50' };
    return { label: 'file', color: 'text-slate-500 border-slate-200 bg-slate-50' };
  };

  const badge = getBadgeInfo(document.file_type);
  const isRestricted = document.department_permissions && document.department_permissions.length > 0;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-pointer select-none"
    >
      {/* Top Header inside Card: Version badge & Permissions */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
          v{document.current_version}
        </span>

        {isRestricted ? (
          <span
            className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
            title={`Restricted to: ${document.department_permissions.map((d) => d.name).join(', ')}`}
          >
            <Lock className="w-3 h-3 text-amber-600" />
            Restricted
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium">Public</span>
        )}
      </div>

      {/* Center Icon: PDF/Doc Page Graphic matching screenshot */}
      <div className="flex items-center justify-center my-3 py-4">
        <div className="relative w-16 h-20 bg-white rounded-lg border-2 border-slate-200 shadow-sm flex flex-col items-center justify-center group-hover:scale-105 group-hover:border-blue-300 transition-all">
          {/* Top-right folded corner */}
          <div className="absolute top-0 right-0 w-4 h-4 bg-slate-100 border-b border-l border-slate-200 rounded-bl-sm" />

          {/* Central File Extension badge */}
          <span className={`text-xs font-bold uppercase tracking-wider ${badge.color} px-2 py-0.5 rounded border`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Document Info */}
      <div className="mt-2 text-center">
        <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate px-1">
          {document.title}
        </h3>
        <p className="text-[11px] text-slate-400 mt-1">
          {formatDate(document.updated_at || document.created_at)}
        </p>
      </div>

      {/* Action Buttons: View & Download directly from the card */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <span className="text-[11px] text-slate-400 font-mono truncate">
          {formatSize(document.file_size)}
        </span>

        {document.latest_version_id && (
          <div className="flex items-center space-x-1">
            {onPreview ? (
              <button
                type="button"
                onClick={() => onPreview(document)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium"
                title="Preview document in-app"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
            ) : (
              <a
                href={getViewUrl(document.latest_version_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium"
                title="View document in browser"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </a>
            )}
            <a
              href={getDownloadUrl(document.latest_version_id)}
              download
              className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all flex items-center gap-1 text-[11px] font-semibold border border-blue-100 hover:border-blue-600 shadow-sm"
              title="Download document"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

