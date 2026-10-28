import Document from '../models/Document.js'
import Share from '../models/Share.js'
import User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'

const sharedDocumentFields = 'name originalName mimeType extension size folder isFavorite isDeleted deletedAt createdAt updatedAt owner'

const documentSummary = (document) => ({
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

export const createShare = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.body.documentId,
    owner: req.user._id,
    isDeleted: false,
  })
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found', error: 'NotFound' })
  }

  const recipient = req.body.email
    ? await User.findOne({ email: req.body.email })
    : await User.findById(req.body.sharedWith)
  if (!recipient) {
    return res.status(404).json({ success: false, message: 'Recipient user not found', error: 'NotFound' })
  }
  if (recipient._id.equals(req.user._id)) {
    return res.status(400).json({ success: false, message: 'You cannot share a document with yourself', error: 'InvalidRecipient' })
  }

  const share = await Share.findOneAndUpdate(
    { document: document._id, sharedWith: recipient._id },
    {
      $set: { owner: req.user._id, permission: req.body.permission || 'viewer' },
      $setOnInsert: { document: document._id, sharedWith: recipient._id },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  )

  res.status(201).json({
    success: true,
    message: 'Document shared successfully',
    data: {
      id: share._id.toString(),
      documentId: document._id.toString(),
      sharedWith: { id: recipient._id.toString(), name: recipient.name, email: recipient.email },
      permission: share.permission,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
    },
  })
})

export const listMyShares = asyncHandler(async (req, res) => {
  const shares = await Share.find({ owner: req.user._id })
    .sort({ updatedAt: -1 })
    .populate({ path: 'document', match: { isDeleted: false }, select: sharedDocumentFields })
    .populate({ path: 'sharedWith', select: 'name email' })

  res.json({
    success: true,
    data: shares.filter((share) => share.document && share.sharedWith).map((share) => ({
      id: share._id.toString(),
      document: documentSummary(share.document),
      sharedWith: {
        id: share.sharedWith._id.toString(),
        name: share.sharedWith.name,
        email: share.sharedWith.email,
      },
      permission: share.permission,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
    })),
  })
})

export const listSharedWithMe = asyncHandler(async (req, res) => {
  const shares = await Share.find({ sharedWith: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'document', match: { isDeleted: false }, select: sharedDocumentFields })
    .populate({ path: 'owner', select: 'name email' })

  res.json({
    success: true,
    data: shares.filter((share) => share.document && share.owner).map((share) => ({
      ...documentSummary(share.document),
      shareId: share._id.toString(),
      owner: {
        id: share.owner._id.toString(),
        name: share.owner.name,
        email: share.owner.email,
      },
      permission: share.permission,
      sharedAt: share.createdAt,
    })),
  })
})

export const deleteShare = asyncHandler(async (req, res) => {
  const share = await Share.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
  if (!share) {
    return res.status(404).json({ success: false, message: 'Share not found', error: 'NotFound' })
  }

  res.json({ success: true, message: 'Share removed successfully', data: {} })
})