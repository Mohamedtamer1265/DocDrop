import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import documentService from '../services/document.service';
import { sendSuccess, sendError } from '../utils/response.util';

export class DocumentController {
  /**
   * Upload a new document and its metadata
   * POST /api/documents
   */
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, uploader_id } = req.body;
      const file = req.file;

      if (!file) {
        return sendError(res, 'File is required.', 400);
      }
      if (!title || !title.trim()) {
        return sendError(res, 'Document title is required.', 400);
      }
      if (title.trim().length > 255) {
        return sendError(res, 'Document title cannot exceed 255 characters.', 400);
      }

      // Parse tags (can be array of IDs or names)
      let tags: (number | string)[] = [];
      if (req.body.tags) {
        if (Array.isArray(req.body.tags)) {
          tags = req.body.tags;
        } else if (typeof req.body.tags === 'string') {
          try {
            const parsed = JSON.parse(req.body.tags);
            tags = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            tags = req.body.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      }

      // Parse department permissions
      let departmentPermissions: number[] = [];
      if (req.body.department_permissions) {
        if (Array.isArray(req.body.department_permissions)) {
          departmentPermissions = req.body.department_permissions.map(Number).filter((n: number) => !isNaN(n));
        } else if (typeof req.body.department_permissions === 'string') {
          try {
            const parsed = JSON.parse(req.body.department_permissions);
            departmentPermissions = Array.isArray(parsed) ? parsed.map(Number) : [Number(parsed)];
          } catch {
            departmentPermissions = req.body.department_permissions.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n));
          }
        }
      }

      const doc = await documentService.uploadDocument(
        title,
        uploader_id || null,
        file,
        tags,
        departmentPermissions
      );

      return sendSuccess(res, doc, 'Document uploaded successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Search documents by title, tags, uploader, or department access
   * GET /api/documents
   */
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, tag, tags, uploader, department_id } = req.query;

      let tagList: string[] | undefined;
      if (tags) {
        tagList = Array.isArray(tags) ? (tags as string[]) : [tags as string];
      }

      const documents = await documentService.searchDocuments({
        q: q ? String(q) : undefined,
        tag: tag ? String(tag) : undefined,
        tags: tagList,
        uploader: uploader ? String(uploader) : undefined,
        department_id: department_id ? String(department_id) : undefined,
      });

      return sendSuccess(res, documents, 'Documents fetched successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Edit document title and tags (requires EEMW password)
   * PUT /api/documents/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { title, tags, password } = req.body;

      const updated = await documentService.updateDocument(id, title, tags, password);
      return sendSuccess(res, updated, 'Document updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete document (requires EEMW password)
   * DELETE /api/documents/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { password } = req.body;

      await documentService.deleteDocument(id, password);
      return sendSuccess(res, null, 'Document deleted successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete specific version (requires EEMW password)
   * DELETE /api/documents/versions/:versionId
   */
  async deleteVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const { versionId } = req.params;
      const { password } = req.body;

      const updated = await documentService.deleteVersion(versionId, password);
      return sendSuccess(res, updated, 'Document version deleted successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Fetch single document with metadata & versions
   * GET /api/documents/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const doc = await documentService.getDocumentById(id);

      if (!doc) {
        return sendError(res, `Document with ID "${id}" was not found.`, 404);
      }

      return sendSuccess(res, doc);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Upload a new version for an existing document
   * POST /api/documents/:id/versions
   */
  async uploadVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return sendError(res, 'File is required for the new version.', 400);
      }

      const newVersion = await documentService.uploadNewVersion(id, file);
      return sendSuccess(res, newVersion, 'New version uploaded successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Fetch version history of a document
   * GET /api/documents/:id/versions
   */
  async getVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const versions = await documentService.getVersionHistory(id);
      return sendSuccess(res, versions);
    } catch (err) {
      next(err);
    }
  }

  /**
   * View / stream file inline in browser
   * GET /api/documents/view/:versionId
   */
  async view(req: Request, res: Response, next: NextFunction) {
    try {
      const { versionId } = req.params;
      const version = await documentService.getVersionForDownload(versionId, 'VIEW');

      // Resolve path handling both relative and absolute paths
      let filePath = version.file_path;
      if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(__dirname, '../../', filePath);
      }
      if (!fs.existsSync(filePath)) {
        // Fallback: check uploads directory directly by basename
        const fallback = path.resolve(__dirname, '../../uploads', path.basename(filePath));
        if (fs.existsSync(fallback)) {
          filePath = fallback;
        } else {
          return sendError(res, 'Physical file not found on disk storage.', 404);
        }
      }

      res.setHeader('Content-Type', version.file_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', 'inline');
      return res.sendFile(path.resolve(filePath));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Download a document version (forces download attachment)
   * GET /api/documents/download/:versionId
   */
  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const { versionId } = req.params;
      const version = await documentService.getVersionForDownload(versionId, 'DOWNLOAD');

      let filePath = version.file_path;
      if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(__dirname, '../../', filePath);
      }
      if (!fs.existsSync(filePath)) {
        const fallback = path.resolve(__dirname, '../../uploads', path.basename(filePath));
        if (fs.existsSync(fallback)) {
          filePath = fallback;
        } else {
          return sendError(res, 'Physical file not found on disk storage.', 404);
        }
      }

      // Stored as "<timestamp>-<name>.<ext>" -> downloaded as "docdrop-<name>.<ext>"
      const storedName = path.basename(filePath);
      const originalName = storedName.replace(/^\d+-/, '');
      const downloadName = `docdrop-${originalName}`;
      return res.download(path.resolve(filePath), downloadName);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reset / Delete all documents and versions (keeps users, departments, tags)
   * DELETE /api/documents/reset
   */
  async resetAllDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      await documentService.clearAllDocuments();
      return sendSuccess(res, null, 'All documents and versions have been deleted.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get metadata lookups (departments, tags, users)
   * GET /api/metadata
   */
  async getMetadata(req: Request, res: Response, next: NextFunction) {
    try {
      const metadata = await documentService.getMetadata();
      return sendSuccess(res, metadata);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get repository storage analytics
   * GET /api/analytics
   */
  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await documentService.getStorageAnalytics();
      return sendSuccess(res, analytics);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update an employee's access permissions (Admin action, requires EEMW password)
   * PUT /api/users/:id/permissions
   */
  async updateUserPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { can_upload, can_view, password } = req.body;
      const updated = await documentService.updateUserPermissions(
        id,
        Boolean(can_upload),
        Boolean(can_view),
        password
      );
      return sendSuccess(res, updated, 'User permissions updated successfully.');
    } catch (err) {
      next(err);
    }
  }
}

export default new DocumentController();
