import dns from 'node:dns'
import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'
import connectDB from './config/db.js'
import { destroyR2Client } from './config/r2.js'
import { logStartupError } from './utils/startupError.js'

const startServer = async () => {
  try {
    const dnsServers = process.env.DNS_SERVERS
      ?.split(',')
      .map((server) => server.trim())
      .filter(Boolean)

    if (dnsServers?.length) dns.setServers(dnsServers)

    const requiredEnvVars = [
      'JWT_SECRET',
      'MONGODB_URI',
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
      'R2_ENDPOINT',
    ]
    const missingEnvVar = requiredEnvVars.find((key) => !process.env[key])
    if (missingEnvVar) {
      const error = new Error(`Missing required environment variable: ${missingEnvVar}`)
      error.code = 'ENV_VAR_MISSING'
      throw error
    }

    if (process.env.JWT_SECRET.length < 32) {
      const error = new Error('JWT_SECRET must be at least 32 characters long')
      error.code = 'JWT_SECRET_TOO_SHORT'
      throw error
    }


    await connectDB()

    const port = Number(process.env.PORT) || 5000
    const server = await new Promise((resolve, reject) => {
      const listeningServer = app.listen(port)
      listeningServer.once('listening', () => resolve(listeningServer))
      listeningServer.once('error', reject)
    })
    console.log(`DocVault API listening on port ${port}`)

    let shuttingDown = false
    const shutdown = (signal) => {
      if (shuttingDown) return
      shuttingDown = true
      console.log(`${signal} received; shutting down DocVault API`)

      server.close(async (error) => {
        let shutdownError = error
        try {
          await mongoose.disconnect()
        } catch (databaseError) {
          shutdownError ??= databaseError
        }

        try {
          destroyR2Client()
        } catch (storageError) {
          shutdownError ??= storageError
        }

        if (shutdownError) {
          console.error('DocVault API shutdown failed', shutdownError)
          process.exitCode = 1
          return
        }

        console.log('DocVault API shut down cleanly')
      })
    }

    process.once('SIGTERM', () => shutdown('SIGTERM'))
    process.once('SIGINT', () => shutdown('SIGINT'))
  } catch (error) {
    logStartupError(error)
    process.exit(1)
  }
}

startServer()