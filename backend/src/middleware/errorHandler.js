/**
 * Global Express error handler.
 * Returns consistent error shape: { error, code }
 */
function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let code = 'INTERNAL_ERROR';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(', ');
  }

  // Mongoose CastError (bad ObjectId)
  if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `Duplicate value for field: ${field}` : 'Duplicate key error';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    code = 'TOKEN_INVALID';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  }

  // Log 5xx errors
  if (status >= 500) {
    const traceId = req.traceId || 'unknown';
    console.error(`[${traceId}] ${status} ${err.message}`, err.stack);
  }

  const response = { error: message, code };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = errorHandler;
