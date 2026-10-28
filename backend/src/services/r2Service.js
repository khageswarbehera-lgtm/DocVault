import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2BucketName, getR2Client } from '../config/r2.js'
import { redactSensitiveText } from '../utils/startupError.js'

const logR2Failure = (operation, error) => {
  if (process.env.NODE_ENV === 'production') return

  const details = [
    `name=${redactSensitiveText(error?.name || 'Error')}`,
    `code=${redactSensitiveText(error?.Code || error?.code || 'unknown')}`,
    ...(error?.$metadata?.httpStatusCode
      ? [`status=${error.$metadata.httpStatusCode}`]
      : []),
    ...(error?.$metadata?.requestId
      ? [`requestId=${redactSensitiveText(error.$metadata.requestId)}`]
      : []),
    `message=${redactSensitiveText(error?.message || 'Unknown R2 error')}`,
  ]

  console.error(`[Cloudflare R2 ${operation}] ${details.join(' ')}`)
}

const storageError = (message) => {
  const error = new Error(message)
  error.statusCode = 502
  return error
}

export const uploadFile = async ({ buffer, storageKey, mimeType, size }) => {
  const client = getR2Client()
  const bucketName = getR2BucketName()

  try {
    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
      Body: buffer,
      ContentLength: size,
      ContentType: mimeType,
    }))
  } catch (error) {
    logR2Failure('upload', error)
    throw storageError('File storage upload failed')
  }
}

export const getSignedDownloadUrl = async (storageKey, {
  filename,
  mimeType,
  disposition = 'attachment',
  expiresIn = 300,
} = {}) => {
  const client = getR2Client()
  const bucketName = getR2BucketName()
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    ...(filename ? {
      ResponseContentDisposition: `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
    } : {}),
    ...(mimeType ? { ResponseContentType: mimeType } : {}),
  })

  try {
    return {
      url: await getSignedUrl(client, command, { expiresIn }),
      expiresIn,
    }
  } catch (error) {
    logR2Failure('signed download URL', error)
    throw storageError('File download link could not be generated')
  }
}

export const deleteFile = async (storageKey) => {
  const client = getR2Client()
  const bucketName = getR2BucketName()

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    }))
  } catch (error) {
    logR2Failure('delete', error)
    throw storageError('File storage cleanup failed')
  }
}