import { verifyToken } from '../services/tokenService.js'

const unauthorized = (res) => res.status(401).json({
  success: false,
  message: 'Authentication required',
  error: 'Unauthorized',
})

const authMiddleware = (req, res, next) => {
  const authorization = req.get('authorization')
  const match = authorization?.match(/^Bearer\s+(\S+)$/i)

  if (!match) return unauthorized(res)

  try {
    const payload = verifyToken(match[1])
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      return unauthorized(res)
    }

    req.user = { _id: payload.sub }
    next()
  } catch {
    unauthorized(res)
  }
}

export default authMiddleware