'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FileText,
  AlertCircle,
  Plus,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { FolderCard } from '../components/FolderCard';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentListView } from '../components/DocumentListView';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { DocumentDetailModal } from '../components/DocumentDetailModal';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { StorageAnalyticsWidget } from '../components/StorageAnalyticsWidget';
import { UploadQueue } from '../components/UploadQueue';
import { Document, Tag, Department, User, UploadQueueItem, StorageAnalytics } from '../types';
import { fetchDocuments, fetchMetadata, fetchDocumentById, fetchStorageAnalytics } from '../lib/api';

export default function DocDropHome() {
  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'size'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals & Drawers
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewVersionId, setPreviewVersionId] = useState<string | undefined>(undefined);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Upload Queue
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(true);

  // Status
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleToggleTag = (tagName: string) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName];
      
      const search = next.length > 0 ? `?tags=${next.map(encodeURIComponent).join(',')}` : window.location.pathname;
      window.history.pushState({ tags: next }, '', search);
      return next;
    });
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags((prev) => {
      const next = prev.filter((t) => t !== tagName);
      const search = next.length > 0 ? `?tags=${next.map(encodeURIComponent).join(',')}` : window.location.pathname;
      window.history.pushState({ tags: next }, '', search);
      return next;
    });
  };

  const handleClearTags = () => {
    setSelectedTags([]);
    window.history.pushState({}, '', window.location.pathname);
  };

  // Listen to browser Back/Forward navigation buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tagsParam = urlParams.get('tags') || urlParams.get('tag');
      if (tagsParam) {
        setSelectedTags(tagsParam.split(',').filter(Boolean));
      } else {
        setSelectedTags([]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const refreshAnalytics = () => {
    fetchStorageAnalytics()
      .then(setAnalytics)
      .catch(() => {});
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [meta, docs, stats] = await Promise.all([
        fetchMetadata().catch(() => ({ departments: [], tags: [], users: [] })),
        fetchDocuments({
          department_id: activeUser?.department_id || undefined,
        }).catch(() => []),
        fetchStorageAnalytics().catch(() => null),
      ]);

      setDepartments(meta.departments);
      setTags(meta.tags);
      setUsers(meta.users);
      if (!activeUser && meta.users.length > 0) {
        // Default to Diana Prince (Legal)
        setActiveUser(meta.users[0]);
      }
      setDocuments(docs);
      if (stats) setAnalytics(stats);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend repository.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload documents when active employee or tags change
  useEffect(() => {
    if (activeUser) {
      fetchDocuments({
        department_id: activeUser.department_id || undefined,
        q: searchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      })
        .then(setDocuments)
        .catch((err) => console.error('Failed to load user docs:', err));
    }
  }, [activeUser, selectedTags]);

  // Handle live search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments({
        department_id: activeUser?.department_id || undefined,
        q: searchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      })
        .then(setDocuments)
        .catch((err) => console.error('Search error:', err));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Tag document count map
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach((doc) => {
      doc.tags?.forEach((t) => {
        counts[t.name] = (counts[t.name] || 0) + 1;
      });
    });
    return counts;
  }, [documents]);

  // Sorted documents
  const sortedDocuments = useMemo(() => {
    const docs = [...documents];
    switch (sortBy) {
      case 'title':
        return docs.sort((a, b) => a.title.localeCompare(b.title));
      case 'size':
        return docs.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
      case 'date':
      default:
        return docs.sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at).getTime() -
            new Date(a.updated_at || a.created_at).getTime()
        );
    }
  }, [documents, sortBy]);

  // Open Document Detail
  const handleOpenDetail = async (doc: Document) => {
    try {
      const fullDoc = await fetchDocumentById(doc.id);
      setSelectedDoc(fullDoc);
    } catch {
      setSelectedDoc(doc);
    }
    setIsDetailOpen(true);
  };

  // Open In-App Document Preview Modal
  const handleOpenPreview = async (doc: Document, versionId?: string) => {
    try {
      const fullDoc = await fetchDocumentById(doc.id);
      setPreviewDoc(fullDoc);
    } catch {
      setPreviewDoc(doc);
    }
    setPreviewVersionId(versionId);
    setIsPreviewOpen(true);
  };

  // Upload Queue Handler
  const handleUploadItemCreated = (item: UploadQueueItem) => {
    setUploadQueue((prev) => [item, ...prev]);
    setIsQueueOpen(true);
  };

  const handleUploadComplete = (createdDoc: Document) => {
    // Mark item completed in queue
    setUploadQueue((prev) =>
      prev.map((item) =>
        item.status === 'uploading'
          ? { ...item, status: 'completed' as const, progress: 100 }
          : item
      )
    );

    // Refresh tags if newly created tags were introduced
    if (createdDoc.tags && createdDoc.tags.length > 0) {
      setTags((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const newTags = createdDoc.tags.filter((t) => !existingIds.has(t.id));
        return newTags.length > 0 ? [...prev, ...newTags] : prev;
      });
    }

    // Add document to list & refresh storage analytics
    setDocuments((prev) => [createdDoc, ...prev]);
    refreshAnalytics();
  };

  const handleDocumentUpdated = (updatedDoc: Document) => {
    setSelectedDoc(updatedDoc);
    setDocuments((prev) =>
      prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
    );
    refreshAnalytics();
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col font-sans">
      {/* Top Header */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTags={selectedTags}
        onRemoveTag={handleRemoveTag}
        onClearTags={handleClearTags}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        users={users}
        activeUser={activeUser}
        onUserChange={setActiveUser}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        {/* Storage Analytics & Disk Usage Meter */}
        <StorageAnalyticsWidget analytics={analytics} />

        {/* Virtual Folders / Tags Section - Multi-select folders */}
        {tags.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Categories & Virtual Folders
                </h2>
                <span className="text-[10px] text-slate-400">(Click to select multiple folders)</span>
              </div>
              {selectedTags.length > 0 && (
                <button
                  onClick={handleClearTags}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  View All Files
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tags.map((tag) => (
                <FolderCard
                  key={tag.id}
                  tag={tag}
                  count={tagCounts[tag.name] || 0}
                  isSelected={selectedTags.includes(tag.name)}
                  onClick={() => handleToggleTag(tag.name)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Documents Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800">
                {selectedTags.length > 0
                  ? `Files matching ${selectedTags.map((t) => `"${t}"`).join(' or ')}`
                  : 'Files & Documents'}
              </h2>
              <span className="text-xs font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                {sortedDocuments.length}
              </span>
            </div>

            {selectedTags.length > 0 && (
              <button
                onClick={handleClearTags}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1 rounded-lg transition-colors"
              >
                Clear folder filters
              </button>
            )}
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Loading repository files...</p>
            </div>
          ) : sortedDocuments.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {sortedDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onClick={() => handleOpenDetail(doc)}
                    onPreview={(d) => handleOpenPreview(d)}
                  />
                ))}
              </div>
            ) : (
              <DocumentListView
                documents={sortedDocuments}
                onSelect={(doc) => handleOpenDetail(doc)}
                onPreview={(d) => handleOpenPreview(d)}
              />
            )
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <FolderOpen className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">No documents found</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {searchQuery || selectedTags.length > 0
                  ? 'No documents match your filter criteria or current employee permissions.'
                  : 'Start by uploading your first policy, technical spec, or report.'}
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Upload New Document
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Floating Upload Queue Widget (Bottom-Right, matching screenshot) */}
      <UploadQueue
        items={uploadQueue}
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        onClearItem={(id) => setUploadQueue((prev) => prev.filter((i) => i.id !== id))}
      />

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        tags={tags}
        departments={departments}
        activeUser={activeUser}
        onUploadItemCreated={handleUploadItemCreated}
        onUploadComplete={handleUploadComplete}
      />

      {/* Document Detail & Version History Modal */}
      <DocumentDetailModal
        document={selectedDoc}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onDocumentUpdated={handleDocumentUpdated}
        onDocumentDeleted={(deletedId) => {
          setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
          setIsDetailOpen(false);
          refreshAnalytics();
        }}
        onPreviewDocument={(doc, verId) => handleOpenPreview(doc, verId)}
        allTags={tags}
      />

      {/* In-App Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        initialVersionId={previewVersionId}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onActivityOccurred={async (docId) => {
          try {
            const fresh = await fetchDocumentById(docId);
            if (selectedDoc?.id === docId) setSelectedDoc(fresh);
            if (previewDoc?.id === docId) setPreviewDoc(fresh);
          } catch {
            // Ignore
          }
        }}
      />
    </div>
  );
}
