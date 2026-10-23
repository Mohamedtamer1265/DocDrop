'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Calendar,
  User,
  Building,
  Tag as TagIcon,
  Lock,
  Globe,
  FileText,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Document, DocumentVersion } from '../types';
import { VersionHistoryTable } from './VersionHistoryTable';
import { getDownloadUrl, uploadNewVersion, fetchDocumentById } from '../lib/api';

interface DocumentDetailModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onDocumentUpdated: (updatedDoc: Document) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  isOpen,
  onClose,
  onDocumentUpdated,
}) => {
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [versionSuccess, setVersionSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !document) return null;

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

  const isRestricted =
    document.department_permissions && document.department_permissions.length > 0;

  const handleNewVersionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingVersion(true);
      setVersionSuccess(null);

      try {
        await uploadNewVersion(document.id, file);
        // Refresh updated document with new version list
        const updated = await fetchDocumentById(document.id);
        onDocumentUpdated(updated);
        setVersionSuccess(`Successfully uploaded version v${updated.current_version}`);
        setTimeout(() => setVersionSuccess(null), 4000);
      } catch (err: any) {
        alert(err.message || 'Failed to upload new version');
      } finally {
        setIsUploadingVersion(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight truncate max-w-md">
                {document.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Current Version: <span className="font-semibold text-blue-600">v{document.current_version}</span> • {formatSize(document.file_size)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {versionSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {versionSuccess}
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {document.latest_version_id && (
              <a
                href={getDownloadUrl(document.latest_version_id)}
                download
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl shadow-sm shadow-blue-500/20 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Current (v{document.current_version})
              </a>
            )}

            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleNewVersionUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingVersion}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-sm font-semibold py-2.5 px-4 rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                {isUploadingVersion ? 'Uploading revision...' : 'Upload New Version'}
              </button>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Uploader
              </span>
              <p className="font-semibold text-slate-800">
                {document.uploader_name || 'System'}
              </p>
              <p className="text-[11px] text-slate-500">{document.uploader_email || '—'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Permissions
              </span>
              <div>
                {isRestricted ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-600" />
                    Restricted: {document.department_permissions.map((d) => d.name).join(', ')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Globe className="w-3 h-3 text-emerald-600" />
                    Public (All Departments)
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Created At
              </span>
              <p className="text-slate-700 font-medium">{formatDate(document.created_at)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Last Modified
              </span>
              <p className="text-slate-700 font-medium">
                {formatDate(document.updated_at || document.created_at)}
              </p>
            </div>
          </div>

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-blue-600" />
                Categories & Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {document.tags.map((t) => (
                  <span
                    key={t.id}
                    className="text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Version History Table */}
          {document.versions && document.versions.length > 0 && (
            <VersionHistoryTable
              versions={document.versions}
              currentVersion={document.current_version}
            />
          )}
        </div>
      </div>
    </div>
  );
};

