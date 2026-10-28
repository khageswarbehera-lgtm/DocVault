import { Router } from 'express'
import {
  createShare,
  deleteShare,
  listMyShares,
  listSharedWithMe,
} from '../controllers/shareController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import validationMiddleware from '../middleware/validationMiddleware.js'
import { createShareValidation, shareIdValidation } from '../validators/shareValidator.js'

const router = Router()

router.use(authMiddleware)
router.post('/', validationMiddleware(createShareValidation), createShare)
router.get('/', listMyShares)
router.get('/with-me', listSharedWithMe)
router.delete('/:id', validationMiddleware(shareIdValidation), deleteShare)

export default router