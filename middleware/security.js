const fs = require('fs-extra');
const { ERROR_MESSAGES } = require('../config/constants');

/**
 * Security middleware to prevent directory traversal and validate paths
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validatePath(req, res, next) {
    const dirPath = req.query.path || req.body.path;
    
    if (!dirPath) {
        return res.status(400).json({ error: ERROR_MESSAGES.PATH_REQUIRED });
    }
    
    // Basic path validation - prevent directory traversal
    if (dirPath.includes('..') || dirPath.includes('~')) {
        return res.status(400).json({ error: ERROR_MESSAGES.INVALID_PATH });
    }
    
    // Check if path exists and is a directory
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        return res.status(400).json({ error: ERROR_MESSAGES.PATH_NOT_EXISTS });
    }
    
    next();
}

/**
 * Middleware to validate file paths for media serving
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateFilePath(req, res, next) {
    const filePath = decodeURIComponent(req.params[0]);
    
    // Security check - ensure the path is valid
    if (filePath.includes('..') || filePath.includes('~')) {
        return res.status(403).json({ error: ERROR_MESSAGES.ACCESS_DENIED });
    }
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: ERROR_MESSAGES.FILE_NOT_FOUND });
    }
    
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
        return res.status(400).json({ error: ERROR_MESSAGES.NOT_A_FILE });
    }
    
    // Add validated file path to request for use in next handler
    req.validatedFilePath = filePath;
    req.fileStats = stat;
    
    next();
}

module.exports = {
    validatePath,
    validateFilePath
};
