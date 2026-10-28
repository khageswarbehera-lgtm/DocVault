import path from 'node:path'
import multer from 'multer'

const allowedMimeTypes = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const configuredMaxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB)
const maxFileSizeMb = Number.isFinite(configuredMaxFileSizeMb)
  && Number.isInteger(configuredMaxFileSizeMb)
  && configuredMaxFileSizeMb > 0
  && configuredMaxFileSizeMb <= 1024
  ? configuredMaxFileSizeMb
  : 25
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024

const uploadError = (message, statusCode, code) => {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  return error
}

const originalBaseName = (originalName) => path.posix.basename(originalName.replaceAll('\\', '/'))

const hasPrefix = (buffer, prefix) => prefix.every((byte, index) => buffer[index] === byte)

const hasValidContent = (file, extension) => {
  const { buffer } = file

  if (extension === 'pdf') return buffer.subarray(0, 5).toString() === '%PDF-'
  if (extension === 'png') return hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (extension === 'jpg' || extension === 'jpeg') return hasPrefix(buffer, [0xff, 0xd8, 0xff])

  if (['doc', 'xls', 'ppt'].includes(extension)) {
    return hasPrefix(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  }

  if (['docx', 'xlsx', 'pptx'].includes(extension)) {
    return buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(buffer[2])
  }

  if (extension === 'txt') {
    try {
      return !buffer.includes(0) && Boolean(new TextDecoder('utf-8', { fatal: true }).decode(buffer))
    } catch {
      return false
    }
  }

  return false
}

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeBytes,
    files: 1,
  },
  fileFilter(req, file, callback) {
    const extension = path.posix.extname(originalBaseName(file.originalname)).slice(1).toLowerCase()
    const expectedMimeType = allowedMimeTypes[extension]

    if (!expectedMimeType || file.mimetype.toLowerCase() !== expectedMimeType) {
      return callback(uploadError('File extension and MIME type are not allowed', 415, 'UnsupportedMediaType'))
    }

    callback(null, true)
  },
}).single('file')

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    const extension = path.posix.extname(originalBaseName(file.originalname)).slice(1).toLowerCase()
    const expectedMimeType = ['jpg', 'jpeg'].includes(extension) ? 'image/jpeg' : extension === 'png' ? 'image/png' : null
    if (!expectedMimeType || file.mimetype.toLowerCase() !== expectedMimeType) {
      return callback(uploadError('Avatar must be a JPG or PNG image', 415, 'UnsupportedMediaType'))
    }
    callback(null, true)
  },
}).single('avatar')

const uploadMiddleware = (req, res, next) => {
  multerUpload(req, res, (error) => {
    if (error) {
      const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.statusCode || 400
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? `File exceeds the ${maxFileSizeMb} MB size limit`
        : error.statusCode
          ? error.message
          : 'Invalid multipart upload request'

      return res.status(statusCode).json({
        success: false,
        message,
        error: error.code || 'InvalidUpload',
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'A file is required in the "file" field',
        error: 'FileRequired',
      })
    }

    const filename = originalBaseName(req.file.originalname)
    const extension = path.posix.extname(filename).slice(1).toLowerCase()
    if (filename.length > 255 || !hasValidContent(req.file, extension)) {
      return res.status(415).json({
        success: false,
        message: 'File content does not match an allowed document format',
        error: 'InvalidFileContent',
      })
    }

    req.file.originalName = filename
    req.file.extension = extension
    next()
  })
}

export default uploadMiddleware

export const avatarUploadMiddleware = (req, res, next) => {
  avatarUpload(req, res, (error) => {
    if (error) {
      const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.statusCode || 400
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Avatar exceeds the 5 MB size limit'
        : error.statusCode
          ? error.message
          : 'Invalid avatar upload request'
      return res.status(statusCode).json({ success: false, message, error: error.code || 'InvalidUpload' })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'An image is required in the "avatar" field', error: 'FileRequired' })
    }

    const filename = originalBaseName(req.file.originalname)
    const extension = path.posix.extname(filename).slice(1).toLowerCase()
    if (!hasValidContent(req.file, extension)) {
      return res.status(415).json({ success: false, message: 'Avatar content does not match its image type', error: 'InvalidFileContent' })
    }

    req.file.originalName = filename
    req.file.extension = extension
    next()
  })
}