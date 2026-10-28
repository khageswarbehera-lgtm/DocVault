import mongoose from 'mongoose'

const shareSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sharedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  permission: {
    type: String,
    enum: ['viewer', 'editor'],
    default: 'viewer',
    required: true,
  },
}, { timestamps: true })

shareSchema.index({ document: 1, sharedWith: 1 }, { unique: true })
shareSchema.index({ sharedWith: 1, createdAt: -1 })

const Share = mongoose.model('Share', shareSchema)

export default Share