'use client';

import React, { useState } from 'react';
import { Download, History, Calendar, HardDrive, FileCheck, Eye, Trash2, KeyRound } from 'lucide-react';
import { DocumentVersion } from '../types';
import { getDownloadUrl, getViewUrl, deleteDocumentVersion } from '../lib/api';

interface VersionHistoryTableProps {
  versions: DocumentVersion[];
  currentVersion: number;
  onVersionDeleted?: (updatedDoc: any) => void;
  onPreviewVersion?: (versionId: string) => void;
  onVersionDownloaded?: () => void;
}

export const VersionHistoryTable: React.FC<VersionHistoryTableProps> = ({
  versions,
  currentVersion,
  onVersionDeleted,
  onPreviewVersion,
  onVersionDownloaded,
}) => {
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeleteVersion = async (versionId: string) => {
    setDeleteError(null);
    if (deletePassword !== 'EEMW') {
      setDeleteError('Incorrect password. Enter EEMW to authorize deletion.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await deleteDocumentVersion(versionId, deletePassword);
      if (onVersionDeleted) onVersionDeleted(updated);
      setDeletingVersionId(null);
      setDeletePassword('');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete version.');
    } finally {
      setIsSubmitting(false);
    }
  };
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-blue-600" />
          Version History ({versions.length})
        </h4>
        <span className="text-[11px] text-slate-400">Past revisions preserved</span>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <th className="py-2.5 px-3">Revision</th>
              <th className="py-2.5 px-3">Uploaded</th>
              <th className="py-2.5 px-3">Size</th>
              <th className="py-2.5 px-3 text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {versions.map((v) => {
              const isCurrent = v.version_number === currentVersion;
              return (
                <tr
                  key={v.id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    isCurrent ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      v{v.version_number}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-blue-600 font-semibold">
                        (Latest)
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-slate-500">
                    {formatDate(v.created_at)}
                  </td>

                  <td className="py-2.5 px-3 text-slate-500 font-mono">
                    {formatSize(v.file_size)}
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {onPreviewVersion ? (
                        <button
                          type="button"
                          onClick={() => onPreviewVersion(v.id)}
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 font-medium hover:underline"
                          title="Preview this revision in-app"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>
                      ) : (
                        <a
                          href={getViewUrl(v.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium hover:underline"
                          title="View file in browser"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </a>
                      )}
                      <a
                        href={getDownloadUrl(v.id)}
                        download
                        onClick={() => {
                          if (onVersionDownloaded) onVersionDownloaded();
                        }}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                      {versions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingVersionId(v.id);
                            setDeleteError(null);
                            setDeletePassword('');
                          }}
                          className="inline-flex items-center text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                          title="Delete this revision"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Version Prompt (Requires EEMW password) */}
      {deletingVersionId && (
        <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
          <p className="font-semibold text-red-900">
            Confirm version deletion: Enter password <strong>EEMW</strong>:
          </p>
          {deleteError && (
            <p className="text-red-700 font-medium">{deleteError}</p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter EEMW..."
              className="px-3 py-1 text-xs rounded-lg border border-red-200 bg-white focus:outline-none focus:border-red-500"
            />
            <button
              type="button"
              onClick={() => handleDeleteVersion(deletingVersionId)}
              disabled={isSubmitting}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Version'}
            </button>
            <button
              type="button"
              onClick={() => setDeletingVersionId(null)}
              className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
