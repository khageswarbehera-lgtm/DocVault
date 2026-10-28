import request from 'supertest'
import app, { createCorsOriginCallback, isHealthReady } from '../src/app.js'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import User from '../src/models/User.js'

let mongoServer
let user

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  user = await User.create({ name: 'Test', email: 'test@test.com', password: 'password123' })
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

describe('CORS', () => {
  const checkOrigin = (originCallback, origin) => new Promise((resolve) => {
    originCallback(origin, (error, allowed) => resolve({ error, allowed }))
  })

  test('production allows only configured frontend origins', async () => {
    expect(() => createCorsOriginCallback({
      NODE_ENV: 'production',
      CLIENT_URL: ' , ',
    })).toThrow('CLIENT_URL must be defined in production')

    const originCallback = createCorsOriginCallback({
      NODE_ENV: 'production',
      CLIENT_URL: 'https://app.example.com, https://admin.example.com',
    })

    await expect(checkOrigin(originCallback, 'https://app.example.com'))
      .resolves.toEqual({ error: null, allowed: true })
    await expect(checkOrigin(originCallback, 'https://admin.example.com'))
      .resolves.toEqual({ error: null, allowed: true })
    await expect(checkOrigin(originCallback, 'http://localhost:5173'))
      .resolves.toMatchObject({ error: { statusCode: 403 }, allowed: undefined })
    await expect(checkOrigin(originCallback, 'https://unexpected.example.com'))
      .resolves.toMatchObject({ error: { statusCode: 403 }, allowed: undefined })
  })

  test('development allows localhost and configured frontend origins', async () => {
    const originCallback = createCorsOriginCallback({
      NODE_ENV: 'development',
      CLIENT_URL: 'https://app.example.com',
    })

    await expect(checkOrigin(originCallback, 'http://localhost:5173'))
      .resolves.toEqual({ error: null, allowed: true })
    await expect(checkOrigin(originCallback, 'https://app.example.com'))
      .resolves.toEqual({ error: null, allowed: true })
  })

  test('HTTP requests with unexpected origins receive 403', async () => {
    const response = await request(app)
      .get('/api/documents')
      .set('Origin', 'https://unexpected.example.com')

    expect(response.status).toBe(403)
  })
})

describe('Health readiness', () => {
  test('requires both MongoDB and R2 to be available', () => {
    expect(isHealthReady({ database: 'up', storage: 'up' })).toBe(true)
    expect(isHealthReady({ database: 'down', storage: 'up' })).toBe(false)
    expect(isHealthReady({ database: 'up', storage: 'down' })).toBe(false)
  })
})

describe('Auth & Ownership', () => {
  test('GET /api/documents should return 401 without auth', async () => {
    const res = await request(app).get('/api/documents')
    expect(res.status).toBe(401)
  })

  test('POST /api/documents/upload should return 401 without auth', async () => {
    const res = await request(app).post('/api/documents/upload')
    expect(res.status).toBe(401)
  })

  test('GET /api/documents should succeed with valid auth', async () => {
    process.env.JWT_SECRET = 'test_secret_key_at_least_32_chars_long'
    const token = jwt.sign({}, process.env.JWT_SECRET, {
        subject: user._id.toString()
    })
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })
})
