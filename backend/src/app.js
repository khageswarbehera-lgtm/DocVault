import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import morgan from 'morgan'
import mongoose from 'mongoose'
import { HeadBucketCommand } from '@aws-sdk/client-s3'

import { errorHandler, notFound } from './middleware/errorMiddleware.js'
import authRoutes from './routes/authRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import folderRoutes from './routes/folderRoutes.js'
import shareRoutes from './routes/shareRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { getR2BucketName, getR2Client } from './config/r2.js'

const app = express()

app.disable('x-powered-by')
app.use(helmet())

export const isHealthReady = ({ database, storage }) => database === 'up' && storage === 'up'

export const createCorsOriginCallback = (env = process.env) => {
  const clientOrigins = (env.CLIENT_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (env.NODE_ENV === 'production' && clientOrigins.length === 0) {
    throw new Error('CLIENT_URL must be defined in production')
  }

  const allowedOrigins = new Set([
    ...clientOrigins,
    ...(env.NODE_ENV === 'production' ? [] : ['http://localhost:5173']),
  ])

  return (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true)
      return
    }

    const error = new Error('Not allowed by CORS')
    error.statusCode = 403
    callback(error)
  }
}

app.use(cors({
  origin: createCorsOriginCallback(),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'))
} else {
  app.use(morgan('dev'))
}
app.use(express.json({ limit: '1mb' }))
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    error: 'RateLimitExceeded',
  },
}))

app.get('/api/health', async (req, res) => {
  const health = {
    success: true,
    message: 'DocVault API is healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'up' : 'down',
      storage: 'checking...',
    },
  }

  try {
    const client = getR2Client()
    await client.send(new HeadBucketCommand({ Bucket: getR2BucketName() }))
    health.services.storage = 'up'
  } catch {
    health.services.storage = 'down'
  }

  health.success = isHealthReady(health.services)
  if (!health.success) {
    return res.status(503).json(health)
  }

  res.json(health)
})

app.use('/api/auth', authRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/folders', folderRoutes)
app.use('/api/shares', shareRoutes)
app.use('/api/user', userRoutes)
app.use(notFound)
app.use(errorHandler)

export default app