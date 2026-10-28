import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 255,
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  mimeType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 127,
  },
  extension: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 16,
    default: '',
  },
  size: {
    type: Number,
    required: true,
    min: 0,
  },
  storageProvider: {
    type: String,
    enum: ['cloudflare-r2'],
    default: 'cloudflare-r2',
    required: true,
  },
  storageKey: {
    type: String,
    required: true,
    select: false,
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: {
    transform(document, result) {
      delete result.storageKey
      delete result.__v
      return result
    },
  },
})

documentSchema.index({ owner: 1, isDeleted: 1, updatedAt: -1 })
documentSchema.index({ owner: 1, folder: 1, isDeleted: 1 })
documentSchema.index({ owner: 1, name: 1 })

const Document = mongoose.model('Document', documentSchema)

export default Document