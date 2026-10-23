'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  History,
  Layers,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import { Document, DocumentVersion } from '../types';
import { getViewUrl, getDownloadUrl } from '../lib/api';

interface DocumentPreviewModalProps {
  document: Document | null;
  initialVersionId?: string;
  isOpen: boolean;
  onClose: () => void;
  onActivityOccurred?: (docId: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  initialVersionId,
  isOpen,
  onClose,
  onActivityOccurred,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState<boolean>(false);

  // Sync active version when document or initialVersionId changes
  useEffect(() => {
    if (!document) {
      setSelectedVersion(null);
      return;
    }

    setZoom(100);
    if (document.versions && document.versions.length > 0) {
      if (initialVersionId) {
        const found = document.versions.find((v) => v.id === initialVersionId);
        if (found) {
          setSelectedVersion(found);
          return;
        }
      }
      setSelectedVersion(document.versions[0]);
    } else if (document.latest_version_id) {
      setSelectedVersion({
        id: document.latest_version_id,
        document_id: document.id,
        version_number: document.current_version,
        file_path: '',
        file_size: document.file_size,
        file_type: document.file_type,
        created_at: document.updated_at || document.created_at,
      });
    }
  }, [document, initialVersionId, isOpen]);

  // Load text content if file is text/plain, markdown, csv, json
  useEffect(() => {
    if (!selectedVersion || !isOpen) return;
    const ft = (selectedVersion.file_type || '').toLowerCase();
    const isTextPreviewable =
      ft.includes('text/') ||
      ft.includes('json') ||
      ft.includes('csv') ||
      ft.includes('markdown') ||
      ft.includes('xml');

    if (isTextPreviewable) {
      setLoadingText(true);
      fetch(getViewUrl(selectedVersion.id))
        .then((res) => res.text())
        .then((txt) => setTextContent(txt))
        .catch(() => setTextContent('Unable to load text preview.'))
        .finally(() => setLoadingText(false));
    } else {
      setTextContent(null);
    }
  }, [selectedVersion, isOpen]);

  if (!isOpen || !document || !selectedVersion) return null;

  const fileType = (selectedVersion.file_type || '').toLowerCase();
  const isPdf = fileType.includes('pdf');
  const isImage = fileType.includes('image/');
  const isText = textContent !== null || loadingText;

  const notifyActivity = () => {
    if (onActivityOccurred && document) {
      setTimeout(() => onActivityOccurred(document.id), 500);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-6xl h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          {/* Document Title & Active Version Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
              {isImage ? (
                <ImageIcon className="w-5 h-5" />
              ) : isText ? (
                <FileCode className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-md">
                  {document.title}
                </h3>
                <span className="text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md">
                  v{selectedVersion.version_number}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {selectedVersion.file_type} • {formatSize(selectedVersion.file_size)}
              </p>
            </div>
          </div>

          {/* Center Controls: Version Switcher & Image Zoom */}
          <div className="flex items-center gap-3">
            {/* Live Version Switcher */}
            {document.versions && document.versions.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] text-slate-300 font-medium">Revision:</span>
                <div className="flex items-center gap-1">
                  {document.versions.map((ver) => (
                    <button
                      key={ver.id}
                      type="button"
                      onClick={() => {
                        setSelectedVersion(ver);
                        notifyActivity();
                      }}
                      className={`px-2 py-0.5 rounded-md text-xs font-bold transition-colors ${
                        selectedVersion.id === ver.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      v{ver.version_number}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Zoom Controls */}
            {isImage && (
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="p-1 text-slate-300 hover:text-white rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono text-slate-200 px-1.5">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(250, z + 25))}
                  className="p-1 text-slate-300 hover:text-white rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  className="p-1 text-slate-400 hover:text-white rounded ml-0.5"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <a
              href={getViewUrl(selectedVersion.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              title="Open in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>

            <a
              href={getDownloadUrl(selectedVersion.id)}
              download
              onClick={notifyActivity}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download v{selectedVersion.version_number}</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors ml-1"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Viewer Body */}
        <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center relative">
          {isPdf ? (
            <iframe
              key={selectedVersion.id}
              src={getViewUrl(selectedVersion.id)}
              title={`${document.title} - v${selectedVersion.version_number}`}
              className="w-full h-full border-0 bg-white"
            />
          ) : isImage ? (
            <div className="p-8 overflow-auto flex items-center justify-center w-full h-full">
              <img
                src={getViewUrl(selectedVersion.id)}
                alt={document.title}
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg transition-transform duration-150 bg-white"
              />
            </div>
          ) : isText ? (
            <div className="w-full h-full p-6 overflow-auto">
              <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                {loadingText ? (
                  <p className="text-xs text-slate-400 animate-pulse">Loading document content...</p>
                ) : (
                  <pre className="text-xs sm:text-sm font-mono text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
                    {textContent}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            /* Fallback for Office / Binary Formats (.docx, .xlsx, .fig, .zip) */
            <div className="max-w-md w-full mx-4 bg-white rounded-3xl p-8 text-center shadow-lg border border-slate-200 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-base">
                  {document.title} (v{selectedVersion.version_number})
                </h4>
                <p className="text-xs text-slate-500">
                  Format: <span className="font-mono font-medium text-slate-700">{selectedVersion.file_type}</span> • {formatSize(selectedVersion.file_size)}
                </p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                This binary file format requires a native desktop application to render. Download the file below to view or edit it locally.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <a
                  href={getDownloadUrl(selectedVersion.id)}
                  download
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download File (v{selectedVersion.version_number})
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

