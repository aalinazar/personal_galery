const fs = require('fs-extra');

/**
 * Store scan results in database
 * @param {Object} database - Database instance
 * @param {string} dirPath - Directory path that was scanned
 * @param {Object[]} mediaFiles - Array of media file objects
 * @param {Date} dirModifiedTime - Directory modification time
 */
async function storeScanResults(database, dirPath, mediaFiles, dirModifiedTime) {
    try {
        // Insert or update scanned directory record
        const dirResult = await database.run(
            `INSERT OR REPLACE INTO scanned_directories 
             (path, scan_date, file_count, last_modified, is_active) 
             VALUES (?, ?, ?, ?, 1)`,
            [dirPath, new Date().toISOString(), mediaFiles.length, dirModifiedTime.toISOString()]
        );
        
        const directoryId = dirResult.id;
        
        // Clear existing media files for this directory
        await database.run('DELETE FROM media_files WHERE directory_id = ?', [directoryId]);
        
        // Insert media files
        for (const file of mediaFiles) {
            await database.run(
                `INSERT INTO media_files 
                 (directory_id, name, full_path, relative_path, file_type, file_size, modified_time, mime_type, scan_date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    directoryId,
                    file.name,
                    file.path,
                    file.relativePath,
                    file.type,
                    file.size,
                    file.modified.toISOString(),
                    file.mimeType,
                    new Date().toISOString()
                ]
            );
        }
        
        console.log(`Stored ${mediaFiles.length} files for directory: ${dirPath}`);
        
    } catch (error) {
        console.error('Error storing scan results:', error);
        throw error;
    }
}

/**
 * Get cached scan results for a directory
 * @param {Object} database - Database instance
 * @param {string} dirPath - Directory path
 * @param {Date} dirModifiedTime - Directory modification time
 * @returns {Promise<Object|null>} Cached results or null if not available/valid
 */
async function getCachedScanResults(database, dirPath, dirModifiedTime) {
    try {
        const cachedDir = await database.get(
            'SELECT * FROM scanned_directories WHERE path = ? AND is_active = 1',
            [dirPath]
        );
        
        // Check if we have valid cached results
        if (!cachedDir || new Date(cachedDir.last_modified) < dirModifiedTime) {
            return null;
        }
        
        console.log(`Returning cached results for: ${dirPath}`);
        
        const cachedFiles = await database.all(
            `SELECT mf.* FROM media_files mf 
             WHERE mf.directory_id = ? 
             ORDER BY mf.relative_path, mf.name`,
            [cachedDir.id]
        );
        
        // Convert database rows to expected format
        const mediaFiles = cachedFiles.map(file => ({
            name: file.name,
            path: file.full_path,
            relativePath: file.relative_path,
            depth: 0, // Not stored in cache, but could be calculated if needed
            type: file.file_type,
            size: file.file_size,
            modified: new Date(file.modified_time),
            mimeType: file.mime_type
        }));
        
        return {
            directory: dirPath,
            files: mediaFiles,
            count: mediaFiles.length,
            cached: true,
            scanDate: cachedDir.scan_date
        };
        
    } catch (error) {
        console.error('Error getting cached scan results:', error);
        return null;
    }
}

/**
 * Get all cached directories
 * @param {Object} database - Database instance
 * @returns {Promise<Object[]>} Array of cached directory objects
 */
async function getCachedDirectories(database) {
    try {
        const cachedDirs = await database.all(
            'SELECT * FROM scanned_directories WHERE is_active = 1 ORDER BY scan_date DESC'
        );
        
        return cachedDirs;
    } catch (error) {
        console.error('Error listing cached directories:', error);
        throw error;
    }
}

/**
 * Remove directory from cache (soft delete by setting is_active = 0)
 * @param {Object} database - Database instance
 * @param {number} dirId - Directory ID to remove from cache
 */
async function removeFromCache(database, dirId) {
    try {
        await database.run(
            'UPDATE scanned_directories SET is_active = 0 WHERE id = ?',
            [dirId]
        );
    } catch (error) {
        console.error('Error removing cached directory:', error);
        throw error;
    }
}

/**
 * Get media files for a directory from cache
 * @param {Object} database - Database instance
 * @param {number} directoryId - Directory ID
 * @returns {Promise<Object[]>} Array of media file objects
 */
async function getMediaFilesFromCache(database, directoryId) {
    try {
        const cachedFiles = await database.all(
            'SELECT * FROM media_files WHERE directory_id = ? ORDER BY relative_path, name',
            [directoryId]
        );
        
        return cachedFiles.map(file => ({
            id: file.id,
            name: file.name,
            path: file.full_path,
            relativePath: file.relative_path,
            type: file.file_type,
            size: file.file_size,
            modified: new Date(file.modified_time),
            mimeType: file.mime_type,
            scanDate: file.scan_date
        }));
    } catch (error) {
        console.error('Error getting media files from cache:', error);
        throw error;
    }
}

/**
 * Get media file by ID from cache
 * @param {Object} database - Database instance
 * @param {number} mediaId - Media file ID
 * @returns {Promise<Object|null>} Media file object or null
 */
async function getMediaFileById(database, mediaId) {
    try {
        const media = await database.get(
            'SELECT * FROM media_files WHERE id = ?',
            [mediaId]
        );
        
        if (!media) {
            return null;
        }
        
        return {
            id: media.id,
            directoryId: media.directory_id,
            name: media.name,
            path: media.full_path,
            relativePath: media.relative_path,
            type: media.file_type,
            size: media.file_size,
            modified: new Date(media.modified_time),
            mimeType: media.mime_type,
            scanDate: media.scan_date
        };
    } catch (error) {
        console.error('Error getting media file by ID:', error);
        throw error;
    }
}

/**
 * Clear all cached scan data
 * @param {Object} database - Database instance
 */
async function clearAllCache(database) {
    try {
        await database.run('UPDATE scanned_directories SET is_active = 0');
        console.log('Cleared all scan cache');
    } catch (error) {
        console.error('Error clearing cache:', error);
        throw error;
    }
}

/**
 * Get cache statistics
 * @param {Object} database - Database instance
 * @returns {Promise<Object>} Cache statistics
 */
async function getCacheStats(database) {
    try {
        const dirCount = await database.get(
            'SELECT COUNT(*) as count FROM scanned_directories WHERE is_active = 1'
        );
        
        const fileCount = await database.get(
            'SELECT COUNT(*) as count FROM media_files mf INNER JOIN scanned_directories sd ON mf.directory_id = sd.id WHERE sd.is_active = 1'
        );
        
        const oldestScan = await database.get(
            'SELECT MIN(scan_date) as oldest FROM scanned_directories WHERE is_active = 1'
        );
        
        const newestScan = await database.get(
            'SELECT MAX(scan_date) as newest FROM scanned_directories WHERE is_active = 1'
        );
        
        return {
            cachedDirectories: dirCount.count,
            totalFiles: fileCount.count,
            oldestScan: oldestScan.oldest,
            newestScan: newestScan.newest
        };
    } catch (error) {
        console.error('Error getting cache stats:', error);
        throw error;
    }
}

module.exports = {
    storeScanResults,
    getCachedScanResults,
    getCachedDirectories,
    removeFromCache,
    getMediaFilesFromCache,
    getMediaFileById,
    clearAllCache,
    getCacheStats
};
