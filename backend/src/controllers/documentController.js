import { randomUUID } from 'node:crypto'
import Document from '../models/Document.js'
import Folder from '../models/Folder.js'
import { deleteFile, getSignedDownloadUrl, uploadFile } from '../services/r2Service.js'
import { getAccessibleDocument } from '../services/documentAccessService.js'
import { assertStorageQuota, trackStorageChange } from '../services/storageService.js'
import asyncHandler from '../utils/asyncHandler.js'

const documentResponse = (document) => ({
  id: document._id.toString(),
  name: document.name,
  originalName: document.originalName,
  mimeType: document.mimeType,
  extension: document.extension,
  size: document.size,
  folderId: document.folder?.toString() || null,
  isFavorite: document.isFavorite,
  isDeleted: document.isDeleted,
  deletedAt: document.deletedAt,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
})

const notFound = (res) => res.status(404).json({
  success: false,
  message: 'Document not found',
  error: 'NotFound',
})

const sendDocumentPage = async (req, res, filter, sort = { updatedAt: -1 }, defaultLimit = 20) => {
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || defaultLimit
  const [documents, total] = await Promise.all([
    Document.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Document.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: documents.map(documentResponse),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export const listDocuments = asyncHandler(async (req, res) => {
  await sendDocumentPage(req, res, { owner: req.user._id, isDeleted: false })
})

export const listTrash = asyncHandler(async (req, res) => {
  await sendDocumentPage(req, res, { owner: req.user._id, isDeleted: true })
})

export const listFavorites = asyncHandler(async (req, res) => {
  await sendDocumentPage(req, res, { owner: req.user._id, isDeleted: false, isFavorite: true })
})

export const listRecent = asyncHandler(async (req, res) => {
  await sendDocumentPage(req, res, { owner: req.user._id, isDeleted: false }, { updatedAt: -1 }, 10)
})

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const searchDocuments = asyncHandler(async (req, res) => {
  const expression = new RegExp(escapeRegex(req.query.q), 'i')
  await sendDocumentPage(req, res, {
    owner: req.user._id,
    isDeleted: false,
    $or: [
      { name: expression },
      { originalName: expression },
      { mimeType: expression },
    ],
  })
})

export const getDocument = asyncHandler(async (req, res) => {
  const access = await getAccessibleDocument(req.params.id, req.user._id)
  if (!access) return notFound(res)

  res.json({
    success: true,
    data: documentResponse(access.document),
  })
})

export const renameDocument = asyncHandler(async (req, res) => {
  const access = await getAccessibleDocument(req.params.id, req.user._id)
  if (!access) return notFound(res)
  if (!access.isOwner && access.permission !== 'editor') {
    return res.status(403).json({ success: false, message: 'Editor permission is required', error: 'Forbidden' })
  }

  access.document.name = req.body.name
  await access.document.save()

  res.json({
    success: true,
    message: 'Document renamed successfully',
    data: documentResponse(access.document),
  })
})

export const softDeleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date() } },
    { new: true },
  )

  if (!document) return notFound(res)

  res.json({
    success: true,
    message: 'Document moved to trash',
    data: documentResponse(document),
  })
})

export const uploadDocument = asyncHandler(async (req, res) => {
  const { file } = req
  // Quota is enforced before any byte reaches R2, so a rejected upload leaves
  // no orphan object behind.
  await assertStorageQuota(req.user._id, file.size)
  const storageKey = `users/${req.user._id}/documents/${randomUUID()}.${file.extension}`

  await uploadFile({
    buffer: file.buffer,
    storageKey,
    mimeType: file.mimetype,
    size: file.size,
  })

  let document
  try {
    document = await Document.create({
      owner: req.user._id,
      name: file.originalName,
      originalName: file.originalName,
      mimeType: file.mimetype,
      extension: file.extension,
      size: file.size,
      storageProvider: 'cloudflare-r2',
      storageKey,
    })
  } catch {
    try {
      await deleteFile(storageKey)
    } catch {
      console.error('R2 upload rollback failed after document metadata creation failed')
    }

    const error = new Error('Document metadata could not be saved after upload')
    error.statusCode = 500
    throw error
  }

  await trackStorageChange(req.user._id, file.size, 'document upload')

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: documentResponse(document),
  })
})

export const getDocumentDownloadUrl = asyncHandler(async (req, res) => {
  const access = await getAccessibleDocument(req.params.id, req.user._id)
  if (!access) return notFound(res)

  const download = await getSignedDownloadUrl(access.document.storageKey, {
    filename: access.document.originalName,
    mimeType: access.document.mimeType,
  })

  res.json({
    success: true,
    message: 'Temporary download link generated',
    data: download,
  })
})

export const restoreDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id, isDeleted: true },
    { $set: { isDeleted: false, deletedAt: null } },
    { new: true },
  )

  if (!document) return notFound(res)

  res.json({
    success: true,
    message: 'Document restored successfully',
    data: documentResponse(document),
  })
})

export const toggleFavorite = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: false,
  })

  if (!document) return notFound(res)

  document.isFavorite = !document.isFavorite
  await document.save()

  res.json({
    success: true,
    message: document.isFavorite ? 'Document added to favorites' : 'Document removed from favorites',
    data: documentResponse(document),
  })
})

export const moveDocument = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, owner: req.user._id, isDeleted: false }
  const document = await Document.findOne(filter)
  if (!document) return notFound(res)

  const folderId = req.body.folderId
  if (folderId !== null) {
    const folder = await Folder.findOne({
      _id: folderId,
      owner: req.user._id,
    })
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
        error: 'NotFound',
      })
    }
  }

  document.folder = folderId
  await document.save()

  res.json({
    success: true,
    message: 'Document moved successfully',
    data: documentResponse(document),
  })
})

export const getDocumentPreviewUrl = asyncHandler(async (req, res) => {
  const access = await getAccessibleDocument(req.params.id, req.user._id)
  if (!access) return notFound(res)

  const preview = await getSignedDownloadUrl(access.document.storageKey, {
    filename: access.document.originalName,
    mimeType: access.document.mimeType,
    disposition: 'inline',
  })

  res.json({
    success: true,
    message: 'Temporary preview link generated',
    data: preview,
  })
})

export const permanentlyDeleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: true,
  }).select('+storageKey')

  if (!document) return notFound(res)

  await deleteFile(document.storageKey)
  const deletedSize = document.size
  const deletion = await Document.deleteOne({ _id: document._id, owner: req.user._id })
  if (deletion.deletedCount !== 1) {
    const error = new Error('File was removed from storage, but document metadata could not be removed')
    error.statusCode = 500
    throw error
  }

  await trackStorageChange(req.user._id, -deletedSize, 'permanent document deletion')

  res.json({
    success: true,
    message: 'Document permanently deleted',
    data: {},
  })
})
