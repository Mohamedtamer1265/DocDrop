'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, File, Lock, Globe, Plus, Check } from 'lucide-react';
import { Tag, Department, User, UploadQueueItem, Document } from '../types';
import { uploadDocument } from '../lib/api';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  departments: Department[];
  activeUser: User | null;
  onUploadItemCreated: (item: UploadQueueItem) => void;
  onUploadComplete: (doc: Document) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  tags,
  departments,
  activeUser,
  onUploadItemCreated,
  onUploadComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState<(number | string)[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        // Auto-fill title from filename
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setTitle(cleanName);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setTitle(cleanName);
      }
    }
  };

  const toggleTag = (tagIdOrName: number | string) => {
    setSelectedTags((prev) =>
      prev.includes(tagIdOrName)
        ? prev.filter((id) => id !== tagIdOrName)
        : [...prev, tagIdOrName]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = customTagInput.trim();
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags((prev) => [...prev, clean]);
      setCustomTagInput('');
    }
  };

  const toggleDept = (deptId: number) => {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter a document title.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const uploadId = `upload-${Date.now()}`;
    const destinationFolder =
      selectedTags.length > 0
        ? tags.find((t) => t.id === selectedTags[0])?.name || 'Documents'
        : 'Documents';

    // Register into floating upload queue widget
    const queueItem: UploadQueueItem = {
      id: uploadId,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      destination: destinationFolder,
      progress: 50,
      status: 'uploading',
    };
    onUploadItemCreated(queueItem);

    // Close modal right away so user sees upload in the queue like Dropbox
    onClose();

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      if (activeUser?.id) {
        formData.append('uploader_id', activeUser.id);
      }
      formData.append('tags', JSON.stringify(selectedTags));

      if (isRestricted && selectedDepts.length > 0) {
        formData.append('department_permissions', JSON.stringify(selectedDepts));
      }

      const createdDoc = await uploadDocument(formData);
      onUploadComplete(createdDoc);
    } catch (err: any) {
      console.error('Upload failed:', err);
    } finally {
      setIsSubmitting(false);
      setSelectedFile(null);
      setTitle('');
      setSelectedTags([]);
      setSelectedDepts([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Upload Document</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-blue-500 bg-blue-50/40'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center space-x-3">
                <File className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Click to browse or drag and drop file here
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF, Word, Fig, Images, Spreadsheets up to 50MB</p>
              </div>
            )}
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design Research or Q3 Financial Audit"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all"
              required
            />
          </div>

          {/* Tags (Virtual Folders) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Categories & Tags (Virtual Folders)
              </label>
              <span className="text-[10px] text-slate-400">Select existing or type custom</span>
            </div>

            {/* Existing tags */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {tags.map((t) => {
                const isSelected = selectedTags.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTag(t.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}

              {/* Any newly added custom tags */}
              {selectedTags
                .filter((st): st is string => typeof st === 'string')
                .map((customName) => (
                  <button
                    type="button"
                    key={customName}
                    onClick={() => toggleTag(customName)}
                    className="text-xs px-3 py-1.5 rounded-full border bg-emerald-600 text-white border-emerald-600 shadow-sm flex items-center gap-1"
                  >
                    <span>+ {customName}</span>
                    <X className="w-3 h-3 ml-0.5" />
                  </button>
                ))}
            </div>

            {/* Add Custom Tag Input Field */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="Create custom tag (e.g. 'Project Alpha', 'Budget 2026')..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                disabled={!customTagInput.trim()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all disabled:opacity-40 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tag
              </button>
            </div>
          </div>

          {/* Access Control / Permissions */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                {isRestricted ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                )}
                Access Control
              </label>

              <button
                type="button"
                onClick={() => setIsRestricted(!isRestricted)}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                  isRestricted
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isRestricted ? 'Restricted to Specific Depts' : 'Public to All Depts'}
              </button>
            </div>

            {isRestricted && (
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 mt-2">
                <p className="text-[11px] text-amber-800 mb-2">
                  Select which departments have permission to view and download this document:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {departments.map((dept) => {
                    const checked = selectedDepts.includes(dept.id);
                    return (
                      <button
                        type="button"
                        key={dept.id}
                        onClick={() => toggleDept(dept.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                          checked
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                        {dept.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

