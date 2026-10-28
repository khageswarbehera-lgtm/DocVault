import { validationResult } from 'express-validator'

const validationMiddleware = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)))

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Request validation failed',
      error: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    })
  }

  next()
}

export default validationMiddleware