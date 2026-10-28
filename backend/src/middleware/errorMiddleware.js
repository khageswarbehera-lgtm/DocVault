export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
}

export const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || error.status || 500
  const isProduction = process.env.NODE_ENV === 'production'
  const message = statusCode >= 500 && isProduction
    ? 'Internal server error'
    : error.message || 'Request failed'

  if (!isProduction && statusCode >= 500) {
    console.error(error)
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: isProduction ? 'Request failed' : error.name || 'Error',
  })
}