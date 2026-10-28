import mongoose from 'mongoose'
import Document from '../models/Document.js'
import User from '../models/User.js'

// Storage accounting counts every document owned by the user, including
// soft-deleted ones: a trashed document keeps its R2 object until it is
// permanently deleted, so its bytes are still occupied space.
const toObjectId = (userId) => (mongoose.isValidObjectId(userId)
  ? new mongoose.Types.ObjectId(String(userId))
  : null)

export const invalidUserIdError = () => {
  const error = new Error('Authenticated user id is invalid')
  error.statusCode = 401
  return error
}

// Keeps the persisted User.storageUsed counter in step with document
// lifecycle events, clamped so a stray decrement can never go negative.
export const adjustStorageUsed = async (userId, delta) => {
  const owner = toObjectId(userId)
  if (!owner || !Number.isFinite(delta) || delta === 0) return null

  return User.findOneAndUpdate(
    { _id: owner },
    [{ $set: { storageUsed: { $max: [0, { $add: ['$storageUsed', delta] }] } } }],
    { new: true },
  )
}

// Best-effort counter update used by the document lifecycle. A failure is
// logged rather than surfaced, because getStorageSummary() recomputes the
// counter from the documents themselves and repairs it on the next read.
export const trackStorageChange = async (userId, delta, context) => {
  try {
    await adjustStorageUsed(userId, delta)
  } catch {
    console.error(`Storage accounting update failed after ${context}`)
  }
}

const emptySummary = (storageLimit = 0) => ({
  storageUsed: 0,
  storageLimit,
  percentageUsed: 0,
  totalDocuments: 0,
  activeDocuments: 0,
  activeBytes: 0,
  trashedDocuments: 0,
  trashedBytes: 0,
  favoriteDocuments: 0,
  fileTypes: [],
})

// Bytes a user is actually occupying in object storage: every document they
// own, trashed ones included, because those objects have not been removed.
export const getUsedStorage = async (userId) => {
  const owner = toObjectId(userId)
  if (!owner) throw invalidUserIdError()

  const [bucket] = await Document.aggregate([
    { $match: { owner } },
    { $group: { _id: null, bytes: { $sum: '$size' } } },
  ])

  return bucket?.bytes || 0
}

const describeBytes = (bytes) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = Math.max(0, Number(bytes) || 0)
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit === 0 || value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

// Guards uploads against the owner's allowance. The cached counter is the fast
// path; when it suggests the upload would not fit, the authoritative aggregate
// is re-read first so stale bookkeeping can never block a valid upload, and the
// counter is repaired when the two disagree.
export const assertStorageQuota = async (userId, incomingSize) => {
  const owner = toObjectId(userId)
  if (!owner) throw invalidUserIdError()

  const user = await User.findById(owner).select('storageUsed storageLimit')
  if (!user) throw invalidUserIdError()

  const limit = user.storageLimit || 0
  const cached = user.storageUsed || 0
  if (limit <= 0) return { used: cached, limit }
  if (cached + incomingSize <= limit) return { used: cached, limit }

  const used = await getUsedStorage(owner)
  if (user.storageUsed !== used) {
    user.storageUsed = used
    await user.save()
  }
  if (used + incomingSize <= limit) return { used, limit }

  const error = new Error(used >= limit
    ? `You are out of storage: ${describeBytes(used)} of ${describeBytes(limit)} used. Empty your trash or remove files to free up space.`
    : `That file does not fit: ${describeBytes(used)} of ${describeBytes(limit)} used, with ${describeBytes(Math.max(0, limit - used))} free.`)
  error.statusCode = 413
  error.code = 'STORAGE_QUOTA_EXCEEDED'
  error.details = { used, limit, incomingSize }
  throw error
}

export const getStorageSummary = async (userId) => {
  const owner = toObjectId(userId)
  if (!owner) throw invalidUserIdError()

  const user = await User.findById(owner).select('storageUsed storageLimit')
  if (!user) throw invalidUserIdError()

  const [usageBuckets, fileTypes] = await Promise.all([
    Document.aggregate([
      { $match: { owner } },
      {
        $group: {
          _id: '$isDeleted',
          bytes: { $sum: '$size' },
          count: { $sum: 1 },
        },
      },
    ]),
    Document.aggregate([
      { $match: { owner, isDeleted: false } },
      {
        $group: {
          _id: { $cond: [{ $eq: ['$extension', ''] }, 'other', { $toLower: '$extension' }] },
          bytes: { $sum: '$size' },
          count: { $sum: 1 },
        },
      },
      { $sort: { bytes: -1 } },
    ]),
  ])

  const active = usageBuckets.find((bucket) => bucket._id === false)
  const trashed = usageBuckets.find((bucket) => bucket._id === true)
  const activeDocuments = active?.count || 0
  const activeBytes = active?.bytes || 0
  const trashedDocuments = trashed?.count || 0
  const trashedBytes = trashed?.bytes || 0
  const storageUsed = activeBytes + trashedBytes
  const storageLimit = user.storageLimit || 0

  // A vault with no documents at all still has to reconcile the counter, but it
  // does not need the favorite count or the breakdown mapping below.
  if (!activeDocuments && !trashedDocuments) {
    if (user.storageUsed !== 0) {
      user.storageUsed = 0
      await user.save()
    }

    return emptySummary(storageLimit)
  }

  const favoriteDocuments = await Document.countDocuments({
    owner,
    isDeleted: false,
    isFavorite: true,
  })

  // The stored counter is a fast path maintained by upload/permanent-delete
  // events. Reconcile it here so it can never drift from the documents.
  if (user.storageUsed !== storageUsed) {
    user.storageUsed = storageUsed
    await user.save()
  }

  return {
    storageUsed,
    storageLimit,
    percentageUsed: storageLimit > 0
      ? Math.min(100, Number(((storageUsed / storageLimit) * 100).toFixed(2)))
      : 0,
    totalDocuments: activeDocuments + trashedDocuments,
    activeDocuments,
    activeBytes,
    trashedDocuments,
    trashedBytes,
    favoriteDocuments,
    fileTypes: fileTypes.map((fileType) => ({
      extension: fileType._id || 'other',
      bytes: fileType.bytes,
      count: fileType.count,
      percentage: storageUsed > 0
        ? Number(((fileType.bytes / storageUsed) * 100).toFixed(1))
        : 0,
    })),
  }
}
