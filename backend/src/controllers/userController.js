import { randomUUID } from 'node:crypto'
import User from '../models/User.js'
import { deleteFile, getSignedDownloadUrl, uploadFile } from '../services/r2Service.js'
import { getStorageSummary } from '../services/storageService.js'
import asyncHandler from '../utils/asyncHandler.js'
import { safeUserResponse } from '../utils/userResponse.js'

const ownedAvatarKey = (key, userId) => typeof key === 'string'
  && key.startsWith(`users/${userId}/profile/`)

export const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found', error: 'NotFound' })
  }

  const oldAvatarKey = user.avatar
  const storageKey = `users/${user._id}/profile/avatar-${randomUUID()}.${req.file.extension}`
  await uploadFile({
    buffer: req.file.buffer,
    storageKey,
    mimeType: req.file.mimetype,
    size: req.file.size,
  })

  user.avatar = storageKey
  try {
    await user.save()
  } catch {
    try {
      await deleteFile(storageKey)
    } catch {
      console.error('R2 avatar rollback failed after user metadata update failed')
    }
    const error = new Error('Avatar metadata could not be saved after upload')
    error.statusCode = 500
    throw error
  }

  if (ownedAvatarKey(oldAvatarKey, user._id.toString())) {
    try {
      await deleteFile(oldAvatarKey)
    } catch {
      console.error('Old R2 avatar cleanup failed after avatar replacement')
    }
  }

  res.json({
    success: true,
    message: 'Profile photo updated successfully',
    data: { user: await safeUserResponse(user) },
  })
})

export const getAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user || !user.avatar) {
    return res.status(404).json({ success: false, message: 'Avatar not found' })
  }
  const { url } = await getSignedDownloadUrl(user.avatar, { expiresIn: 600 })
  res.json({ success: true, url })
})

export const getStorage = asyncHandler(async (req, res) => {
  const summary = await getStorageSummary(req.user._id)

  res.json({
    success: true,
    message: 'Storage usage retrieved',
    data: summary,
  })
})
