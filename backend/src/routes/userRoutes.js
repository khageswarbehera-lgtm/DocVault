import { Router } from 'express'
import { getAvatar, getStorage, uploadAvatar } from '../controllers/userController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import { avatarUploadMiddleware } from '../middleware/uploadMiddleware.js'

const router = Router()

router.use(authMiddleware)
router.get('/avatar', getAvatar)
router.post('/avatar', avatarUploadMiddleware, uploadAvatar)
router.get('/storage', getStorage)

export default router