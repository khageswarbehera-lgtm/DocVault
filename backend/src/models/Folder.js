import mongoose from 'mongoose'

const folderSchema = new mongoose.Schema({
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
    maxlength: 100,
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
}, {
  timestamps: true,
})

folderSchema.index({ owner: 1, parentFolder: 1, name: 1 })

const Folder = mongoose.model('Folder', folderSchema)

export default Folder