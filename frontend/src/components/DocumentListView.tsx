'use client';

import React from 'react';
import { FileText, Download, Lock, ExternalLink, Eye } from 'lucide-react';
import { Document } from '../types';
import { getDownloadUrl, getViewUrl } from '../lib/api';

interface DocumentListViewProps {
  documents: Document[];
  onSelect: (doc: Document) => void;
}

export const DocumentListView: React.FC<DocumentListViewProps> = ({ documents, onSelect }) => {
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Document</th>
              <th className="py-3 px-4">Version</th>
              <th className="py-3 px-4">Tags</th>
              <th className="py-3 px-4">Permissions</th>
              <th className="py-3 px-4">Uploader</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Modified</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {documents.map((doc) => {
              const isRestricted =
                doc.department_permissions && doc.department_permissions.length > 0;

              return (
                <tr
                  key={doc.id}
                  onClick={() => onSelect(doc)}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-blue-600">
                    <div className="flex items-center space-x-2.5">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate max-w-xs">{doc.title}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      v{doc.current_version}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {doc.tags?.map((t) => (
                        <span
                          key={t.id}
                          className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {isRestricted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Lock className="w-3 h-3 text-amber-600" />
                        {doc.department_permissions.map((d) => d.name).join(', ')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">All Departments</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 text-xs">
                    {doc.uploader_name || 'System'}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 text-xs font-mono">
                    {formatSize(doc.file_size)}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 text-xs">
                    {formatDate(doc.updated_at || doc.created_at)}
                  </td>

                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {doc.latest_version_id && (
                      <div className="flex items-center justify-end space-x-1">
                        <a
                          href={getViewUrl(doc.latest_version_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View document in browser"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <a
                          href={getDownloadUrl(doc.latest_version_id)}
                          className="inline-flex items-center p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download document"
                          download
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

