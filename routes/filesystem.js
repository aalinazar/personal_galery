const express = require('express');
const router = express.Router();
const fileSystem = require('../services/fileSystem');
const validatePath = require('../middleware/security').validatePath;

/**
 * List available drives on the system
 */
router.get('/list-drives', async (req, res) => {
    try {
        const drives = await fileSystem.getAvailableDrives();
        
        res.json({
            success: true,
            drives: drives,
            count: drives.length
        });
        
    } catch (error) {
        console.error('Error listing drives:', error);
        res.status(500).json({ error: 'Failed to list drives' });
    }
});

/**
 * List directories for browsing
 */
router.post('/list-directories', validatePath, async (req, res) => {
    try {
        const dirPath = req.body.path;
        
        const result = await fileSystem.listDirectories(dirPath);
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        console.error('Error listing directories:', error);
        res.status(500).json({ error: 'Failed to list directories' });
    }
});

/**
 * Get file information
 */
router.post('/file-info', validatePath, async (req, res) => {
    try {
        const filePath = req.body.path;
        
        const fileInfo = await fileSystem.getFileInfo(filePath);
        
        res.json({
            success: true,
            file: fileInfo
        });
        
    } catch (error) {
        console.error('Error getting file info:', error);
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.status(500).json({ error: 'Failed to get file info' });
    }
});

/**
 * Check if path exists and is accessible
 */
router.post('/check-path', async (req, res) => {
    try {
        const { path } = req.body;
        
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }
        
        const result = await fileSystem.checkPath(path);
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        console.error('Error checking path:', error);
        res.status(500).json({ error: 'Failed to check path' });
    }
});

/**
 * Get directory size and statistics
 */
router.post('/directory-stats', validatePath, async (req, res) => {
    try {
        const dirPath = req.body.path;
        const includeSubdirs = req.body.includeSubdirs || false;
        
        const stats = await fileSystem.getDirectoryStats(dirPath, includeSubdirs);
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('Error getting directory stats:', error);
        res.status(500).json({ error: 'Failed to get directory stats' });
    }
});

/**
 * Search for files in a directory
 */
router.post('/search-files', validatePath, async (req, res) => {
    try {
        const { path: dirPath, pattern, extensions, maxResults = 100 } = req.body;
        
        if (!pattern && !extensions) {
            return res.status(400).json({ error: 'Pattern or extensions must be specified' });
        }
        
        const files = await fileSystem.searchFiles(dirPath, {
            pattern,
            extensions,
            maxResults
        });
        
        res.json({
            success: true,
            files: files,
            count: files.length
        });
        
    } catch (error) {
        console.error('Error searching files:', error);
        res.status(500).json({ error: 'Failed to search files' });
    }
});

/**
 * Get parent directory path
 */
router.post('/get-parent', async (req, res) => {
    try {
        const { path } = req.body;
        
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }
        
        const parentPath = fileSystem.getParentPath(path);
        
        res.json({
            success: true,
            parentPath: parentPath,
            hasParent: parentPath !== path
        });
        
    } catch (error) {
        console.error('Error getting parent path:', error);
        res.status(500).json({ error: 'Failed to get parent path' });
    }
});

/**
 * Normalize file path
 */
router.post('/normalize-path', async (req, res) => {
    try {
        const { path } = req.body;
        
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }
        
        const normalizedPath = fileSystem.normalizePath(path);
        
        res.json({
            success: true,
            originalPath: path,
            normalizedPath: normalizedPath
        });
        
    } catch (error) {
        console.error('Error normalizing path:', error);
        res.status(500).json({ error: 'Failed to normalize path' });
    }
});

module.exports = router;
