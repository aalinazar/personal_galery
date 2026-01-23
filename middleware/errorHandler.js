const { ERROR_MESSAGES } = require('../config/constants');

/**
 * Centralized error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
    console.error('Error:', err.stack);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    let statusCode = 500;
    let message = ERROR_MESSAGES.SOMETHING_WRONG;
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized access';
    } else if (err.code === 'ENOENT') {
        statusCode = 404;
        message = ERROR_MESSAGES.FILE_NOT_FOUND;
    } else if (err.code === 'EACCES') {
        statusCode = 403;
        message = ERROR_MESSAGES.ACCESS_DENIED;
    }
    
    const errorResponse = {
        success: false,
        error: message
    };
    
    // Include stack trace in development
    if (isDevelopment) {
        errorResponse.stack = err.stack;
        errorResponse.details = err.message;
    }
    
    res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`
    });
}

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler
};
