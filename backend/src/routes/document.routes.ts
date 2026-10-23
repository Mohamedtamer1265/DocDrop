import { Router } from 'express';
import documentController from '../controllers/document.controller';
import upload from '../middlewares/upload.middleware';

const router = Router();

// Metadata lookup (departments, tags, users)
router.get('/metadata', (req, res, next) => documentController.getMetadata(req, res, next));

// Document search & listing
router.get('/documents', (req, res, next) => documentController.search(req, res, next));

// Document upload (initial version)
router.post('/documents', upload.single('file'), (req, res, next) =>
  documentController.upload(req, res, next)
);

// View / download specific version
router.get('/documents/download/:versionId', (req, res, next) =>
  documentController.download(req, res, next)
);

// Fetch document details & its metadata
router.get('/documents/:id', (req, res, next) =>
  documentController.getById(req, res, next)
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
