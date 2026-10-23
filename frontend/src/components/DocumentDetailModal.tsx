'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Eye,
  Pencil,
  Trash2,
  KeyRound,
} from 'lucide-react';
import { Document, DocumentVersion, Tag } from '../types';
import { VersionHistoryTable } from './VersionHistoryTable';
import { getDownloadUrl, getViewUrl, uploadNewVersion, fetchDocumentById, updateDocument, deleteDocument } from '../lib/api';

interface DocumentDetailModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onDocumentUpdated: (updatedDoc: Document) => void;
  onDocumentDeleted: (deletedId: string) => void;
  allTags?: Tag[];
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  isOpen,
  onClose,
  onDocumentUpdated,
  onDocumentDeleted,
  allTags = [],
}) => {
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [versionSuccess, setVersionSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSelectedTags, setEditSelectedTags] = useState<number[]>([]);
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete State
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  useEffect(() => {
    if (document) {
      setEditTitle(document.title);
      setEditSelectedTags(document.tags ? document.tags.map((t) => t.id) : []);
      setIsEditing(false);
      setIsDeleting(false);
      setEditPassword('');
      setDeletePassword('');
      setEditError(null);
      setDeleteError(null);
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editTitle.trim()) {
      setEditError('Title is required.');
      return;
    }
    if (editPassword !== 'EEMW') {
      setEditError('Incorrect authorization password. Please enter company password EEMW.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updated = await updateDocument(document.id, {
        title: editTitle.trim(),
        tags: editSelectedTags,
        password: editPassword,
      });
      onDocumentUpdated(updated);
      setIsEditing(false);
      setVersionSuccess('Document details updated successfully.');
      setTimeout(() => setVersionSuccess(null), 3000);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update document.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    if (deletePassword !== 'EEMW') {
      setDeleteError('Incorrect authorization password. Please enter company password EEMW.');
      return;
    }

    setIsSubmittingDelete(true);
    try {
      await deleteDocument(document.id, deletePassword);
      onDocumentDeleted(document.id);
      onClose();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete document.');
    } finally {
      setIsSubmittingDelete(false);
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
              <>
                <a
                  href={getViewUrl(document.latest_version_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-all"
                >
                  <Eye className="w-4 h-4" />
                  View in Browser
                </a>
                <a
                  href={getDownloadUrl(document.latest_version_id)}
                  download
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl shadow-sm shadow-blue-500/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Current (v{document.current_version})
                </a>
              </>
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

            {/* Edit & Delete Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(!isEditing);
                  setIsDeleting(false);
                }}
                className={`p-2.5 rounded-xl border transition-all text-sm font-medium flex items-center gap-1.5 ${
                  isEditing
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="Edit document"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDeleting(!isDeleting);
                  setIsEditing(false);
                }}
                className={`p-2.5 rounded-xl border transition-all text-sm font-medium flex items-center gap-1.5 ${
                  isDeleting
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-50 text-red-600 border-slate-200 hover:bg-red-50'
                }`}
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Edit Form (Requires EEMW Password) */}
          {isEditing && (
            <form onSubmit={handleSaveEdit} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Document Metadata (Requires Authorization)</span>
              </div>

              {editError && (
                <div className="p-2 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                  required
                />
              </div>

              {/* Edit Tags */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Categories & Tags
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-200 max-h-32 overflow-y-auto">
                  {allTags.map((t) => {
                    const isSelected = editSelectedTags.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => {
                          setEditSelectedTags((prev) =>
                            prev.includes(t.id)
                              ? prev.filter((id) => id !== t.id)
                              : [...prev, t.id]
                          );
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Company Authorization Password (EEMW)
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Delete Confirmation (Requires EEMW Password) */}
          {isDeleting && (
            <form onSubmit={handleConfirmDelete} className="p-4 bg-red-50/60 rounded-2xl border border-red-200 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Document & All Revisions</span>
              </div>
              <p className="text-xs text-red-700">
                This action is permanent and removes the document from the repository. To confirm, enter the company authorization password (<strong>EEMW</strong>).
              </p>

              {deleteError && (
                <div className="p-2 bg-red-100 text-red-800 text-xs rounded-lg border border-red-300">
                  {deleteError}
                </div>
              )}

              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter EEMW password to confirm..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-red-200 focus:outline-none focus:border-red-500 bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsDeleting(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelete}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmittingDelete ? 'Deleting...' : 'Confirm & Delete'}
                </button>
              </div>
            </form>
          )}

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
              onVersionDeleted={(updatedDoc) => {
                onDocumentUpdated(updatedDoc);
                setVersionSuccess('Document version removed successfully.');
                setTimeout(() => setVersionSuccess(null), 3000);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

