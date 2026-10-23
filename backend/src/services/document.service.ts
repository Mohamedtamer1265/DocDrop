import documentRepository, { DocumentRepository } from '../repositories/document.repository';
import { getCached, setCached, invalidateCachePattern } from '../config/redis';
import {
  Document,
  DocumentVersion,
  Department,
  Tag,
  User,
  SearchDocumentsQuery,
  StorageAnalytics,
} from '../types/document.types';

export class DocumentService {
  constructor(private repo: DocumentRepository = documentRepository) {}

  /**
   * Search documents with Redis caching
   */
  async searchDocuments(filters: SearchDocumentsQuery): Promise<Document[]> {
    const cacheKey = `search:${JSON.stringify(filters)}`;
    const cached = await getCached<Document[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.repo.searchDocuments(filters);
    // Cache for 60 seconds
    await setCached(cacheKey, results, 60);
    return results;
  }

  /**
   * Get single document by ID (always live from PostgreSQL so versions & activity logs are real-time)
   */
  async getDocumentById(id: string): Promise<Document | null> {
    return await this.repo.getDocumentById(id);
  }

  /**
   * Upload a new document with initial version
   */
  async uploadDocument(
    title: string,
    uploaderId: string | null,
    file: Express.Multer.File,
    tags: (number | string)[] = [],
    departmentPermissions: number[] = []
  ): Promise<Document> {
    if (!title || !title.trim()) {
      throw new Error('Document title is required.');
    }
    if (!file) {
      throw new Error('A file must be attached.');
    }

    // Check role upload permission if uploaderId is provided
    if (uploaderId) {
      const uploader = await this.repo.getUserById(uploaderId);
      if (uploader && uploader.can_upload === false) {
        throw new Error(
          `Access Denied: ${uploader.full_name} (${uploader.role}) does not have permission to upload documents.`
        );
      }
    }

    // Resolve any custom/new tags by name into tag IDs
    const resolvedTagIds: number[] = [];
    for (const tag of tags) {
      if (typeof tag === 'number') {
        resolvedTagIds.push(tag);
      } else if (typeof tag === 'string' && tag.trim()) {
        const parsedNum = Number(tag);
        if (!isNaN(parsedNum)) {
          resolvedTagIds.push(parsedNum);
        } else {
          const createdTag = await this.repo.findOrCreateTag(tag);
          resolvedTagIds.push(createdTag.id);
        }
      }
    }

    const filePath = file.path.replace(/\\/g, '/');
    const fileSize = file.size;
    const fileType = file.mimetype || 'application/octet-stream';

    const doc = await this.repo.createDocumentWithInitialVersion(
      title.trim(),
      uploaderId || null,
      filePath,
      fileSize,
      fileType,
      resolvedTagIds,
      departmentPermissions
    );

    // Invalidate search and list caches
    await invalidateCachePattern('search:*');
    return doc;
  }

  /**
   * Upload a new version for an existing document
   */
  async uploadNewVersion(
    documentId: string,
    file: Express.Multer.File
  ): Promise<DocumentVersion> {
    const doc = await this.repo.getDocumentById(documentId);
    if (!doc) {
      throw new Error(`Document with ID "${documentId}" not found.`);
    }

    if (!file) {
      throw new Error('A file must be attached for the new version.');
    }

    const filePath = file.path.replace(/\\/g, '/');
    const fileSize = file.size;
    const fileType = file.mimetype || 'application/octet-stream';

    const newVersion = await this.repo.addDocumentVersion(
      documentId,
      filePath,
      fileSize,
      fileType
    );

    // Invalidate caches
    await invalidateCachePattern(`doc:${documentId}`);
    await invalidateCachePattern('search:*');

    return newVersion;
  }

  /**
   * Fetch version history of a document
   */
  async getVersionHistory(documentId: string): Promise<DocumentVersion[]> {
    const doc = await this.repo.getDocumentById(documentId);
    if (!doc) {
      throw new Error(`Document with ID "${documentId}" not found.`);
    }
    return doc.versions || [];
  }

  /**
   * Fetch specific version file details for download or inline preview
   */
  async getVersionForDownload(
    versionId: string,
    actionType?: 'VIEW' | 'DOWNLOAD'
  ): Promise<DocumentVersion> {
    const version = await this.repo.getVersionById(versionId);
    if (!version) {
      throw new Error('Requested document version not found.');
    }

    if (actionType) {
      const details =
        actionType === 'VIEW'
          ? `Previewed version v${version.version_number} inline`
          : `Downloaded version v${version.version_number}`;
      await this.repo.logActivity(version.document_id, actionType, 'Workspace User', details);
    }

    return version;
  }

  /**
   * Delete a specific version (requires company password EEMW)
   */
  async deleteVersion(versionId: string, password?: string): Promise<Document> {
    if (password !== 'EEMW') {
      throw new Error('Unauthorized: Incorrect password. Action requires company authorization.');
    }

    const { filePath, documentId } = await this.repo.deleteDocumentVersion(versionId);
    const fs = await import('fs');
    const path = await import('path');

    try {
      let resolved = filePath;
      if (!path.isAbsolute(resolved)) {
        resolved = path.resolve(__dirname, '../../', resolved);
      }
      if (fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    } catch {
      // Silently skip if file not present
    }

    await invalidateCachePattern(`doc:${documentId}`);
    await invalidateCachePattern('search:*');

    const updated = await this.repo.getDocumentById(documentId);
    return updated!;
  }

  /**
   * Delete a document and its stored files (requires company password EEMW)
   */
  async deleteDocument(id: string, password?: string): Promise<void> {
    if (password !== 'EEMW') {
      throw new Error('Unauthorized: Incorrect password. Action requires company authorization.');
    }

    const filePaths = await this.repo.deleteDocument(id);
    const fs = await import('fs');
    const path = await import('path');

    for (const fp of filePaths) {
      try {
        let resolved = fp;
        if (!path.isAbsolute(resolved)) {
          resolved = path.resolve(__dirname, '../../', resolved);
        }
        if (fs.existsSync(resolved)) {
          fs.unlinkSync(resolved);
        }
      } catch {
        // Silently skip if file already unlinked
      }
    }

    await invalidateCachePattern(`doc:${id}`);
    await invalidateCachePattern('search:*');
  }

  /**
   * Update document details (requires company password EEMW)
   */
  async updateDocument(
    id: string,
    title: string,
    tags?: (number | string)[],
    password?: string
  ): Promise<Document> {
    if (password !== 'EEMW') {
      throw new Error('Unauthorized: Incorrect password. Action requires company authorization.');
    }
    if (!title || !title.trim()) {
      throw new Error('Title cannot be empty.');
    }

    let resolvedTagIds: number[] | undefined;
    if (tags !== undefined) {
      resolvedTagIds = [];
      for (const t of tags) {
        if (typeof t === 'number') {
          resolvedTagIds.push(t);
        } else if (typeof t === 'string' && t.trim()) {
          const num = Number(t);
          if (!isNaN(num)) {
            resolvedTagIds.push(num);
          } else {
            const created = await this.repo.findOrCreateTag(t);
            resolvedTagIds.push(created.id);
          }
        }
      }
    }

    const updated = await this.repo.updateDocument(id, title, resolvedTagIds);
    if (!updated) {
      throw new Error('Document not found.');
    }

    await invalidateCachePattern(`doc:${id}`);
    await invalidateCachePattern('search:*');
    return updated;
  }

  /**
   * Clear all documents and versions, and flush search cache
   */
  async clearAllDocuments(): Promise<void> {
    const { pool } = await import('../config/db');
    await pool.query('TRUNCATE TABLE documents CASCADE');
    await invalidateCachePattern('search:*');
    await invalidateCachePattern('doc:*');
  }

  /**
   * Get metadata options (departments, tags, employees)
   */
  async getMetadata(): Promise<{ departments: Department[]; tags: Tag[]; users: User[] }> {
    const [departments, tags, users] = await Promise.all([
      this.repo.getDepartments(),
      this.repo.getTags(),
      this.repo.getUsers(),
    ]);

    return { departments, tags, users };
  }

  /**
   * Get storage analytics across the repository
   */
  async getStorageAnalytics(): Promise<StorageAnalytics> {
    return await this.repo.getStorageAnalytics();
  }

  /**
   * Update user role & access permissions (requires company password EEMW)
   */
  async updateUserPermissions(
    userId: string,
    canUpload: boolean,
    canView: boolean,
    password?: string
  ): Promise<User> {
    if (password !== 'EEMW') {
      throw new Error('Unauthorized: Admin password EEMW is required to modify user access.');
    }

    const roleName = !canView
      ? 'Restricted (No Access)'
      : !canUpload
      ? 'Viewer (View Only)'
      : 'Editor (Upload & View)';

    const updated = await this.repo.updateUserPermissions(userId, canUpload, canView, roleName);
    if (!updated) {
      throw new Error('User not found.');
    }
    return updated;
  }
}

export default new DocumentService();
