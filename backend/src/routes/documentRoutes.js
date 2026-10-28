import { Router } from 'express'
import {
  getDocument,
  getDocumentDownloadUrl,
  getDocumentPreviewUrl,
  listDocuments,
  listFavorites,
  listRecent,
  listTrash,
  moveDocument,
  permanentlyDeleteDocument,
  restoreDocument,
  renameDocument,
  searchDocuments,
  softDeleteDocument,
  toggleFavorite,
  uploadDocument,
} from '../controllers/documentController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import uploadMiddleware from '../middleware/uploadMiddleware.js'
import validationMiddleware from '../middleware/validationMiddleware.js'
import {
  documentIdValidation,
  documentListValidation,
  moveDocumentValidation,
  renameDocumentValidation,
  searchDocumentsValidation,
} from '../validators/documentValidator.js'

const router = Router()

router.use(authMiddleware)
router.post('/upload', uploadMiddleware, uploadDocument)
router.get('/trash', validationMiddleware(documentListValidation), listTrash)
router.get('/favorites', validationMiddleware(documentListValidation), listFavorites)
router.get('/recent', validationMiddleware(documentListValidation), listRecent)
router.get('/search', validationMiddleware(searchDocumentsValidation), searchDocuments)
router.get('/', validationMiddleware(documentListValidation), listDocuments)
router.patch('/:id/move', validationMiddleware(moveDocumentValidation), moveDocument)
router.patch('/:id/restore', validationMiddleware(documentIdValidation), restoreDocument)
router.patch('/:id/favorite', validationMiddleware(documentIdValidation), toggleFavorite)
router.get('/:id/preview', validationMiddleware(documentIdValidation), getDocumentPreviewUrl)
router.get('/:id/download', validationMiddleware(documentIdValidation), getDocumentDownloadUrl)
router.get('/:id', validationMiddleware(documentIdValidation), getDocument)
router.put('/:id', validationMiddleware(renameDocumentValidation), renameDocument)
router.delete('/:id/permanent', validationMiddleware(documentIdValidation), permanentlyDeleteDocument)
router.delete('/:id', validationMiddleware(documentIdValidation), softDeleteDocument)

export default router