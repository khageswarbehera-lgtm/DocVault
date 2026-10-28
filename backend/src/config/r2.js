import { S3Client } from '@aws-sdk/client-s3'

let client

const getR2Configuration = () => {
  const configuration = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    endpoint: process.env.R2_ENDPOINT,
  }
  const isMissingValue = Object.values(configuration).some((value) => !value)

  if (isMissingValue) {
    const error = new Error('Cloudflare R2 is not configured')
    error.statusCode = 503
    throw error
  }

  let endpoint
  try {
    endpoint = new URL(configuration.endpoint)
  } catch {
    const error = new Error('Cloudflare R2 endpoint is invalid')
    error.statusCode = 503
    throw error
  }

  if (endpoint.protocol !== 'https:') {
    const error = new Error('Cloudflare R2 endpoint must use HTTPS')
    error.statusCode = 503
    throw error
  }

  const expectedHostname = `${configuration.accountId.toLowerCase()}.r2.cloudflarestorage.com`
  if (endpoint.hostname.toLowerCase() !== expectedHostname || endpoint.pathname !== '/' || endpoint.search || endpoint.hash) {
    const error = new Error('R2_ENDPOINT must be the account endpoint https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com with no bucket name or path')
    error.statusCode = 503
    throw error
  }

  return configuration
}

export const getR2BucketName = () => getR2Configuration().bucketName

export const getR2Client = () => {
  if (client) return client

  const configuration = getR2Configuration()
  client = new S3Client({
    region: 'auto',
    endpoint: configuration.endpoint,
    credentials: {
      accessKeyId: configuration.accessKeyId,
      secretAccessKey: configuration.secretAccessKey,
    },
  })

  return client
}

export const destroyR2Client = () => {
  client?.destroy()
  client = undefined
}