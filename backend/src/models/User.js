import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  avatar: {
    type: String,
    default: '',
  },
  storageUsed: {
    type: Number,
    default: 0,
    min: 0,
  },
  storageLimit: {
    type: Number,
    default: 5 * 1024 ** 3,
    min: 0,
  },
}, {
  timestamps: true,
  toJSON: {
    transform(document, result) {
      delete result.password
      delete result.__v
      return result
    },
  },
})

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model('User', userSchema)

export default User