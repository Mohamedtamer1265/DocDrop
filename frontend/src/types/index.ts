export interface Department {
  id: number;
  name: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  department_id: number | null;
  department_name?: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  document_id: string;
  action: string;
  actor_name: string;
  details: string;
  created_at: string;
}

export interface StorageAnalytics {
  total_documents: number;
  total_versions: number;
  total_bytes: number;
  quota_bytes: number;
  by_department: { department: string; bytes: number; count: number }[];
  by_type: { category: string; bytes: number; count: number }[];
}

export interface Document {
  id: string;
  title: string;
  uploader_id: string | null;
  uploader_name?: string;
  uploader_email?: string;
  uploader_department?: string;
  created_at: string;
  updated_at: string;
  current_version: number;
  file_type: string;
  file_size: number;
  latest_version_id?: string;
  tags: Tag[];
  department_permissions: Department[];
  versions?: DocumentVersion[];
  activity_logs?: ActivityLog[];
}

export interface UploadQueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  destination: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface MetadataResponse {
  departments: Department[];
  tags: Tag[];
  users: User[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: any;
}
