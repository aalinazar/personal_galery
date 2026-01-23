const fs = require('fs-extra');
const path = require('path');
const { MAX_SCAN_DEPTH } = require('../config/constants');
const { createMediaFileObject, sortMediaByPathAndName } = require('./mediaUtils');

/**
 * Scan directory recursively for media files
 * @param {string} rootPath - Root directory path to scan
 * @param {number} maxDepth - Maximum recursion depth (optional)
 * @returns {Promise<Object[]>} Array of media file objects
 */
async function scanDirectoryRecursive(rootPath, maxDepth = MAX_SCAN_DEPTH) {
    const mediaFiles = [];
    const queue = [{ dirPath: rootPath, relativePath: '', depth: 0 }];
    
    while (queue.length > 0) {
        const { dirPath, relativePath, depth } = queue.shift();
        
        // Skip if we've exceeded max depth
        if (depth > maxDepth) {
            console.warn(`Max depth (${maxDepth}) reached at: ${dirPath}`);
            continue;
        }
        
        try {
            const items = await fs.readdir(dirPath);
            
            for (const item of items) {
                // Skip hidden files and directories
                if (item.startsWith('.')) continue;
                
                const itemPath = path.join(dirPath, item);
                const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
                
                try {
                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isFile()) {
                        // Create media file object (will be checked if it's media)
                        const mediaFile = createMediaFileObject(item, itemPath, itemRelativePath, depth, stats);
                        
                        // Only include if it's actually a media file
                        if (mediaFile.type !== 'unknown') {
                            mediaFiles.push(mediaFile);
                        }
                    } else if (stats.isDirectory()) {
                        // Add directory to queue for recursive scanning
                        queue.push({
                            dirPath: itemPath,
                            relativePath: itemRelativePath,
                            depth: depth + 1
                        });
                    }
                } catch (statError) {
                    // Skip files/directories we can't access
                    console.warn(`Cannot access ${itemPath}:`, statError.message);
                    continue;
                }
            }
        } catch (readError) {
            // Skip directories we can't read
            console.warn(`Cannot read directory ${dirPath}:`, readError.message);
            continue;
        }
    }
    
    return sortMediaByPathAndName(mediaFiles);
}

/**
 * Get basic directory information
 * @param {string} dirPath - Directory path
 * @returns {Promise<Object>} Directory information object
 */
async function getDirectoryInfo(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        return {
            path: dirPath,
            exists: true,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime || stats.ctime
        };
    } catch (error) {
        return {
            path: dirPath,
            exists: false,
            isDirectory: false,
            error: error.message
        };
    }
}

/**
 * List immediate subdirectories of a directory
 * @param {string} dirPath - Directory path
 * @returns {Promise<Object[]>} Array of directory objects
 */
async function listSubdirectories(dirPath) {
    const directories = [];
    
    try {
        const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
            // Skip hidden files and directories
            if (item.name.startsWith('.')) continue;
            
            try {
                if (item.isDirectory()) {
                    const fullPath = path.join(dirPath, item.name);
                    directories.push({
                        name: item.name,
                        path: fullPath
                    });
                }
            } catch (statError) {
                // Skip directories we can't access
                console.warn(`Cannot access ${item.name}:`, statError.message);
                continue;
            }
        }
        
        // Sort directories alphabetically
        directories.sort((a, b) => a.name.localeCompare(b.name));
        
    } catch (readError) {
        console.error('Error reading directory:', readError);
        throw new Error(`Cannot access directory: ${readError.message}`);
    }
    
    return directories;
}

/**
 * Get parent directory path
 * @param {string} dirPath - Directory path
 * @returns {string|null} Parent directory path or null if at root
 */
function getParentDirectory(dirPath) {
    const parentPath = path.dirname(dirPath);
    return parentPath !== dirPath ? parentPath : null;
}

/**
 * Check if directory is accessible and readable
 * @param {string} dirPath - Directory path to check
 * @returns {Promise<boolean>} True if directory is accessible
 */
async function isDirectoryAccessible(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
            return false;
        }
        
        // Try to read the directory to check accessibility
        await fs.access(dirPath, fs.constants.R_OK);
        await fs.readdir(dirPath);
        
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    scanDirectoryRecursive,
    getDirectoryInfo,
    listSubdirectories,
    getParentDirectory,
    isDirectoryAccessible
};
