import { Router } from 'express';
import documentController from '../controllers/document.controller';
import upload from '../middlewares/upload.middleware';

const router = Router();

// Reset all documents
router.delete('/documents/reset', (req, res, next) =>
  documentController.resetAllDocuments(req, res, next)
);

// Metadata lookup (departments, tags, users)
router.get('/metadata', (req, res, next) => documentController.getMetadata(req, res, next));

// Update user access permissions (Admin only with EEMW password)
router.put('/users/:id/permissions', (req, res, next) =>
  documentController.updateUserPermissions(req, res, next)
);

// Storage analytics lookup
router.get('/analytics', (req, res, next) => documentController.getAnalytics(req, res, next));

// Document search & listing
router.get('/documents', (req, res, next) => documentController.search(req, res, next));

// Document upload (initial version)
router.post('/documents', upload.single('file'), (req, res, next) =>
  documentController.upload(req, res, next)
);

// View file directly in browser tab (inline preview)
router.get('/documents/view/:versionId', (req, res, next) =>
  documentController.view(req, res, next)
);

// Download specific version (attachment)
router.get('/documents/download/:versionId', (req, res, next) =>
  documentController.download(req, res, next)
);

// Delete specific version (requires EEMW password)
router.delete('/documents/versions/:versionId', (req, res, next) =>
  documentController.deleteVersion(req, res, next)
);

// Fetch document details & its metadata
router.get('/documents/:id', (req, res, next) =>
  documentController.getById(req, res, next)
);

// Edit document (title/tags with EEMW password)
router.put('/documents/:id', (req, res, next) =>
  documentController.update(req, res, next)
);

// Delete document (with EEMW password)
router.delete('/documents/:id', (req, res, next) =>
  documentController.delete(req, res, next)
);

// Fetch version history
router.get('/documents/:id/versions', (req, res, next) =>
  documentController.getVersions(req, res, next)
);

// Upload new version for existing document
router.post('/documents/:id/versions', upload.single('file'), (req, res, next) =>
  documentController.uploadVersion(req, res, next)
);

export default router;
