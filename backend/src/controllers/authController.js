import User from '../models/User.js'
import { generateToken } from '../services/tokenService.js'
import asyncHandler from '../utils/asyncHandler.js'
import { safeUserResponse } from '../utils/userResponse.js'

const authResponse = async (res, user, message, status = 200) => {
  res.status(status).json({
    success: true,
    message,
    data: {
      user: await safeUserResponse(user),
      token: generateToken(user._id),
    },
  })
}

export const register = asyncHandler(async (req, res) => {
  const existingUser = await User.exists({ email: req.body.email })
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists',
      error: 'Conflict',
    })
  }

  try {
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    })
    await authResponse(res, user, 'Account created successfully', 201)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        error: 'Conflict',
      })
    }
    throw error
  }
})

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password')
  const passwordMatches = user && await user.comparePassword(req.body.password)

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message: 'Email or password is incorrect',
      error: 'Unauthorized',
    })
  }

  await authResponse(res, user, 'Login successful')
})

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'Unauthorized',
    })
  }

  res.json({
    success: true,
    message: 'Authenticated user retrieved',
    data: { user: await safeUserResponse(user) },
  })
})

export const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully. Remove the bearer token from the client.',
    data: {},
  })
}