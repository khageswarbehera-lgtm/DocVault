import { Router } from 'express'
import {
  createFolder,
  deleteFolder,
  getFolderContents,
  listFolders,
  updateFolder,
} from '../controllers/folderController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import validationMiddleware from '../middleware/validationMiddleware.js'
import {
  createFolderValidation,
  folderIdValidation,
  folderListValidation,
  updateFolderValidation,
} from '../validators/folderValidator.js'

const router = Router()

router.use(authMiddleware)
router.post('/', validationMiddleware(createFolderValidation), createFolder)
router.get('/', validationMiddleware(folderListValidation), listFolders)
router.get('/:id/contents', validationMiddleware(folderIdValidation), getFolderContents)
router.put('/:id', validationMiddleware(updateFolderValidation), updateFolder)
router.delete('/:id', validationMiddleware(folderIdValidation), deleteFolder)

export default router