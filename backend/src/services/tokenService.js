import jwt from 'jsonwebtoken'

export const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
  }

  return jwt.sign({}, secret, {
    subject: userId.toString(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET)