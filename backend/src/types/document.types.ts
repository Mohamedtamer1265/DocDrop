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
}

export interface CreateDocumentDTO {
  title: string;
  uploader_id?: string;
  tags?: number[];
  department_permissions?: number[];
}

export interface SearchDocumentsQuery {
  q?: string;
  tag?: number | string;
  uploader?: string;
  department_id?: number | string;
}
