import { Router } from 'express'
import { getMe, login, logout, register } from '../controllers/authController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import validationMiddleware from '../middleware/validationMiddleware.js'
import { loginValidation, registerValidation } from '../validators/authValidator.js'

const router = Router()

router.post('/register', validationMiddleware(registerValidation), register)
router.post('/login', validationMiddleware(loginValidation), login)
router.get('/me', authMiddleware, getMe)
router.post('/logout', authMiddleware, logout)

export default router