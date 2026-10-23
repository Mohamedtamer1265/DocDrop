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

      // Parse tags (can be array or comma-separated string)
      let tags: number[] = [];
      if (req.body.tags) {
        if (Array.isArray(req.body.tags)) {
          tags = req.body.tags.map(Number).filter((n: number) => !isNaN(n));
        } else if (typeof req.body.tags === 'string') {
          try {
            const parsed = JSON.parse(req.body.tags);
            tags = Array.isArray(parsed) ? parsed.map(Number) : [Number(parsed)];
          } catch {
            tags = req.body.tags.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n));
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
      const { q, tag, uploader, department_id } = req.query;

      const documents = await documentService.searchDocuments({
        q: q ? String(q) : undefined,
        tag: tag ? String(tag) : undefined,
        uploader: uploader ? String(uploader) : undefined,
        department_id: department_id ? String(department_id) : undefined,
      });

      return sendSuccess(res, documents, 'Documents fetched successfully.');
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
   * View / download a document version
   * GET /api/documents/download/:versionId
   */
  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const { versionId } = req.params;
      const version = await documentService.getVersionForDownload(versionId);

      const filePath = path.resolve(version.file_path);
      if (!fs.existsSync(filePath)) {
        return sendError(res, 'Physical file not found on disk storage.', 404);
      }

      // Stored as "<timestamp>-<name>.<ext>" -> downloaded as "docdrop-<name>.<ext>"
      const storedName = path.basename(filePath);
      const originalName = storedName.replace(/^\d+-/, '');
      const downloadName = `docdrop-${originalName}`;
      return res.download(filePath, downloadName);
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
}

export default new DocumentController();
