import { Document, DocumentVersion, MetadataResponse, ApiResponse } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Fetch all documents with optional filters (search query, tag or multiple tags, uploader, department permissions)
 */
export async function fetchDocuments(params?: {
  q?: string;
  tag?: string | number;
  tags?: string[];
  uploader?: string;
  department_id?: string | number;
}): Promise<Document[]> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set('q', params.q);
  if (params?.tags && params.tags.length > 0) {
    params.tags.forEach((t) => searchParams.append('tags', t));
  } else if (params?.tag) {
    searchParams.set('tag', String(params.tag));
  }
  if (params?.uploader) searchParams.set('uploader', params.uploader);
  if (params?.department_id) searchParams.set('department_id', String(params.department_id));

  const url = `${API_BASE_URL}/documents${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch documents (${res.status})`);
  }
  const json: ApiResponse<Document[]> = await res.json();
  return json.data || [];
}

/**
 * Edit document title & tags with EEMW password
 */
export async function updateDocument(
  id: string,
  data: { title: string; tags?: (number | string)[]; password: string }
): Promise<Document> {
  const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<Document> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to update document.');
  }
  return json.data;
}

/**
 * Delete document with EEMW password
 */
export async function deleteDocument(id: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const json: ApiResponse<null> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to delete document.');
  }
}

/**
 * Delete a specific document version with EEMW password
 */
export async function deleteDocumentVersion(
  versionId: string,
  password: string
): Promise<Document> {
  const res = await fetch(`${API_BASE_URL}/documents/versions/${versionId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const json: ApiResponse<Document> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to delete version.');
  }
  return json.data;
}

/**
 * Fetch a single document by ID including all metadata and versions
 */
export async function fetchDocumentById(id: string): Promise<Document> {
  const res = await fetch(`${API_BASE_URL}/documents/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Document not found (${res.status})`);
  }
  const json: ApiResponse<Document> = await res.json();
  return json.data;
}

/**
 * Fetch lookup metadata (departments, tags, users)
 */
export async function fetchMetadata(): Promise<MetadataResponse> {
  const res = await fetch(`${API_BASE_URL}/metadata`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata (${res.status})`);
  }
  const json: ApiResponse<MetadataResponse> = await res.json();
  return json.data;
}

/**
 * Upload a new document with file and metadata
 */
export async function uploadDocument(formData: FormData): Promise<Document> {
  const res = await fetch(`${API_BASE_URL}/documents`, {
    method: 'POST',
    body: formData,
  });

  const json: ApiResponse<Document> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Upload failed.');
  }
  return json.data;
}

/**
 * Upload a new version to an existing document
 */
export async function uploadNewVersion(documentId: string, file: File): Promise<DocumentVersion> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/documents/${documentId}/versions`, {
    method: 'POST',
    body: formData,
  });

  const json: ApiResponse<DocumentVersion> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to upload new version.');
  }
  return json.data;
}

/**
 * Generate direct view/preview link (inline in browser)
 */
export function getViewUrl(versionId: string): string {
  return `${API_BASE_URL}/documents/view/${versionId}`;
}

/**
 * Generate direct download link for a version (forced attachment)
 */
export function getDownloadUrl(versionId: string): string {
  return `${API_BASE_URL}/documents/download/${versionId}`;
}

/**
 * Check backend and database status
 */
export async function fetchDbStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/db-status`, { cache: 'no-store' });
    return await res.json();
  } catch (err: any) {
    return { status: 'error', error: err.message };
  }
}
