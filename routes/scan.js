const express = require('express');
const fs = require('fs-extra');
const router = express.Router();
const directoryScanner = require('../services/directoryScanner');
const scanCache = require('../services/scanCache');
const fileSystem = require('../services/fileSystem');

/**
 * Scan directory for media files recursively with caching
 */
router.post('/scan-directory', async (req, res) => {
    try {
        const dirPath = req.body.path;
        const forceRescan = req.body.forceRescan || false;
        
        // Get directory modification time
        const dirStats = await fs.statSync(dirPath);
        const dirModifiedTime = dirStats.mtime;
        
        // Check if we have cached results
        if (!forceRescan) {
            const cachedResults = await scanCache.getCachedScanResults(req.database, dirPath, dirModifiedTime);
            if (cachedResults) {
                return res.json({
                    success: true,
                    ...cachedResults
                });
            }
        }
        
        // Perform fresh scan
        console.log(`Scanning directory: ${dirPath} (force=${forceRescan})`);
        const mediaFiles = await directoryScanner.scanDirectoryRecursive(dirPath);
        
        // Sort files by relative path first, then by name
        mediaFiles.sort((a, b) => {
            const pathCompare = (a.relativePath || '').localeCompare(b.relativePath || '');
            if (pathCompare !== 0) return pathCompare;
            return a.name.localeCompare(b.name);
        });
        
        // Store results in database
        await scanCache.storeScanResults(req.database, dirPath, mediaFiles, dirModifiedTime);
        
        res.json({
            success: true,
            directory: dirPath,
            files: mediaFiles,
            count: mediaFiles.length,
            cached: false,
            scanDate: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error scanning directory:', error);
        res.status(500).json({ error: 'Failed to scan directory' });
    }
});

/**
 * Force rescan a directory
 */
router.post('/force-rescan', async (req, res) => {
    try {
        const dirPath = req.body.path;
        
        // Get directory modification time
        const dirStats = await fs.statSync(dirPath);
        const dirModifiedTime = dirStats.mtime;
        
        console.log(`Force rescanning directory: ${dirPath}`);
        const mediaFiles = await directoryScanner.scanDirectoryRecursive(dirPath);
        
        // Sort files
        mediaFiles.sort((a, b) => {
            const pathCompare = (a.relativePath || '').localeCompare(b.relativePath || '');
            if (pathCompare !== 0) return pathCompare;
            return a.name.localeCompare(b.name);
        });
        
        // Store fresh results
        await scanCache.storeScanResults(req.database, dirPath, mediaFiles, dirModifiedTime);
        
        res.json({
            success: true,
            directory: dirPath,
            files: mediaFiles,
            count: mediaFiles.length,
            cached: false,
            scanDate: new Date().toISOString(),
            forced: true
        });
        
    } catch (error) {
        console.error('Error force rescanning directory:', error);
        res.status(500).json({ error: 'Failed to force rescan directory' });
    }
});

/**
 * List cached directories
 */
router.get('/cached-directories', async (req, res) => {
    try {
        const cachedDirs = await scanCache.getCachedDirectories(req.database);
        
        res.json({
            success: true,
            directories: cachedDirs,
            count: cachedDirs.length
        });
        
    } catch (error) {
        console.error('Error listing cached directories:', error);
        res.status(500).json({ error: 'Failed to list cached directories' });
    }
});

/**
 * Remove directory from cache
 */
router.delete('/cached-directory/:id', async (req, res) => {
    try {
        const dirId = req.params.id;
        
        await scanCache.removeFromCache(req.database, dirId);
        
        res.json({
            success: true,
            message: 'Directory removed from cache'
        });
        
    } catch (error) {
        console.error('Error removing cached directory:', error);
        res.status(500).json({ error: 'Failed to remove cached directory' });
    }
});

module.exports = router;
