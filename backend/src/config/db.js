import mongoose from 'mongoose'

const connectDB = async () => {
  const { MONGODB_URI } = process.env

  if (!MONGODB_URI) {
    const error = new Error('MONGODB_URI is not configured')
    error.code = 'MONGODB_URI_MISSING'
    throw error
  }

  await mongoose.connect(MONGODB_URI)
  console.log('MongoDB connected')
}

export default connectDB