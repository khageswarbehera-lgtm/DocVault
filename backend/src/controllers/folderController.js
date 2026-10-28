import Document from '../models/Document.js'
import Folder from '../models/Folder.js'
import asyncHandler from '../utils/asyncHandler.js'

const folderResponse = (folder) => ({
  id: folder._id.toString(),
  name: folder.name,
  parentFolderId: folder.parentFolder?.toString() || null,
  createdAt: folder.createdAt,
  updatedAt: folder.updatedAt,
})

const folderNotFound = (res) => res.status(404).json({
  success: false,
  message: 'Folder not found',
  error: 'NotFound',
})

const invalidParent = (res) => res.status(404).json({
  success: false,
  message: 'Parent folder not found',
  error: 'NotFound',
})

const paginationFor = (req) => ({
  page: Number(req.query.page) || 1,
  limit: Number(req.query.limit) || 20,
})

const assertParentIsSafe = async ({ parentFolderId, ownerId, currentFolderId, res }) => {
  if (!parentFolderId) return true

  const visited = new Set()
  let parent = await Folder.findOne({ _id: parentFolderId, owner: ownerId }).select('_id parentFolder')
  if (!parent) {
    invalidParent(res)
    return false
  }

  while (parent) {
    const parentId = parent._id.toString()
    if (parentId === currentFolderId || visited.has(parentId)) {
      res.status(400).json({
        success: false,
        message: 'A folder cannot be moved inside itself or one of its descendants',
        error: 'InvalidFolderHierarchy',
      })
      return false
    }
    visited.add(parentId)
    if (!parent.parentFolder) break
    parent = await Folder.findOne({ _id: parent.parentFolder, owner: ownerId }).select('_id parentFolder')
  }

  return true
}

export const listFolders = asyncHandler(async (req, res) => {
  const { page, limit } = paginationFor(req)
  const filter = { owner: req.user._id }
  const [folders, total] = await Promise.all([
    Folder.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Folder.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: folders.map(folderResponse),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

export const getFolderContents = asyncHandler(async (req, res) => {
  const folderId = req.params.id === 'root' ? null : req.params.id

  if (folderId !== null) {
    const folder = await Folder.findOne({ _id: folderId, owner: req.user._id })
    if (!folder) return folderNotFound(res)
  }

  const [folders, documents] = await Promise.all([
    Folder.find({ owner: req.user._id, parentFolder: folderId }).sort({ name: 1 }),
    Document.find({ owner: req.user._id, folder: folderId, isDeleted: false }).sort({ updatedAt: -1 }),
  ])

  res.json({
    success: true,
    data: {
      folders: folders.map(folderResponse),
      documents: documents.map((doc) => ({
        id: doc._id.toString(),
        name: doc.name,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        extension: doc.extension,
        size: doc.size,
        updatedAt: doc.updatedAt,
      })),
    },
  })
})

export const createFolder = asyncHandler(async (req, res) => {
  const parentFolderId = req.body.parentFolder || null
  if (parentFolderId && !await assertParentIsSafe({
    parentFolderId,
    ownerId: req.user._id,
    res,
  })) return

  const folder = await Folder.create({
    owner: req.user._id,
    name: req.body.name,
    parentFolder: parentFolderId,
  })

  res.status(201).json({
    success: true,
    message: 'Folder created successfully',
    data: folderResponse(folder),
  })
})

export const updateFolder = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, owner: req.user._id }
  const currentFolder = await Folder.findOne(filter)
  if (!currentFolder) return folderNotFound(res)

  const changes = {}
  if (Object.hasOwn(req.body, 'name')) changes.name = req.body.name
  if (Object.hasOwn(req.body, 'parentFolder')) {
    const parentFolderId = req.body.parentFolder || null
    if (parentFolderId && !await assertParentIsSafe({
      parentFolderId,
      ownerId: req.user._id,
      currentFolderId: currentFolder._id.toString(),
      res,
    })) return
    changes.parentFolder = parentFolderId
  }

  const folder = await Folder.findOneAndUpdate(filter, { $set: changes }, { new: true, runValidators: true })
  if (!folder) return folderNotFound(res)

  res.json({
    success: true,
    message: 'Folder updated successfully',
    data: folderResponse(folder),
  })
})

export const deleteFolder = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, owner: req.user._id }
  const folder = await Folder.findOne(filter)
  if (!folder) return folderNotFound(res)

  const [hasChildren, hasDocuments] = await Promise.all([
    Folder.exists({ owner: req.user._id, parentFolder: folder._id }),
    Document.exists({ owner: req.user._id, folder: folder._id }),
  ])

  if (hasChildren || hasDocuments) {
    return res.status(409).json({
      success: false,
      message: 'Move child folders and documents before deleting this folder',
      error: 'FolderNotEmpty',
    })
  }

  await Folder.deleteOne(filter)
  res.json({ success: true, message: 'Folder deleted successfully', data: {} })
})