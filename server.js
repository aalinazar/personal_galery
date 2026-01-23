const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const database = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;

// Supported media file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv'];

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Security middleware to prevent directory traversal
function validatePath(req, res, next) {
    const dirPath = req.query.path || req.body.path;
    if (!dirPath) {
        return res.status(400).json({ error: 'Path is required' });
    }
    
    // Basic path validation - prevent directory traversal
    if (dirPath.includes('..') || dirPath.includes('~')) {
        return res.status(400).json({ error: 'Invalid path' });
    }
    
    // Check if path exists and is a directory
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        return res.status(400).json({ error: 'Path does not exist or is not a directory' });
    }
    
    next();
}

// Helper function to check if file is media
function isMediaFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext);
}

// Helper function to get file type
function getMediaType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    return 'unknown';
}

// Helper function to detect available drives on the system
async function getAvailableDrives() {
    const drives = [];
    const platform = process.platform;
    
    try {
        if (platform === 'win32') {
            // Windows: Check drive letters A-Z
            for (let i = 65; i <= 90; i++) {
                const driveLetter = String.fromCharCode(i) + ':\\';
                try {
                    if (fs.existsSync(driveLetter)) {
                        const stats = fs.statSync(driveLetter);
                        let driveInfo = {
                            letter: driveLetter,
                            name: `Drive ${String.fromCharCode(i)}`,
                            path: driveLetter,
                            type: 'unknown',
                            size: 0,
                            free: 0
                        };
                        
                        // Try to get more detailed drive information
                        try {
                            // On Windows, we can try to get volume information
                            const drivePaths = [driveLetter, driveLetter + '\\'];
                            for (const testPath of drivePaths) {
                                try {
                                    const testStats = fs.statSync(testPath);
                                    driveInfo = {
                                        ...driveInfo,
                                        name: `Local Disk (${String.fromCharCode(i)})`,
                                        type: 'hdd'
                                    };
                                    break;
                                } catch (e) {
                                    // Continue to next path
                                }
                            }
                        } catch (error) {
                            // Keep basic info if detailed check fails
                        }
                        
                        drives.push(driveInfo);
                    }
                } catch (error) {
                    // Skip inaccessible drives
                    continue;
                }
            }
        } else {
            // Unix-like systems (macOS, Linux)
            const rootPaths = ['/'];
            
            // On macOS, also check /Volumes
            if (platform === 'darwin') {
                rootPaths.push('/Volumes');
            }
            
            for (const rootPath of rootPaths) {
                try {
                    if (fs.existsSync(rootPath)) {
                        const stats = fs.statSync(rootPath);
                        const driveInfo = {
                            letter: rootPath,
                            name: rootPath === '/' ? 'Root Filesystem' : 'Volumes',
                            path: rootPath,
                            type: 'hdd',
                            size: 0,
                            free: 0
                        };
                        
                        drives.push(driveInfo);
                        
                        // If this is /Volumes on macOS, list the mounted volumes
                        if (rootPath === '/Volumes') {
                            try {
                                const volumes = fs.readdirSync('/Volumes');
                                for (const volume of volumes) {
                                    if (!volume.startsWith('.')) {
                                        const volumePath = path.join('/Volumes', volume);
                                        try {
                                            if (fs.statSync(volumePath).isDirectory()) {
                                                drives.push({
                                                    letter: volumePath,
                                                    name: volume,
                                                    path: volumePath,
                                                    type: 'hdd',
                                                    size: 0,
                                                    free: 0
                                                });
                                            }
                                        } catch (error) {
                                            // Skip inaccessible volumes
                                            continue;
                                        }
                                    }
                                }
                            } catch (error) {
                                // Can't read volumes, continue
                            }
                        }
                    }
                } catch (error) {
                    // Skip inaccessible paths
                    continue;
                }
            }
        }
    } catch (error) {
        console.error('Error detecting drives:', error);
    }
    
    return drives;
}

// Helper function to scan directory recursively
async function scanDirectoryRecursive(rootPath, maxDepth = 20) {
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
                    
                    if (stats.isFile() && isMediaFile(item)) {
                        mediaFiles.push({
                            name: item,
                            path: itemPath,
                            relativePath: itemRelativePath,
                            depth: depth,
                            type: getMediaType(item),
                            size: stats.size,
                            modified: stats.mtime,
                            mimeType: mime.lookup(item) || 'application/octet-stream'
                        });
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
    
    return mediaFiles;
}

// API endpoint to scan directory for media files recursively with caching
app.post('/api/scan-directory', validatePath, async (req, res) => {
    try {
        const dirPath = req.body.path;
        const forceRescan = req.body.forceRescan || false;
        
        // Get directory modification time
        const dirStats = fs.statSync(dirPath);
        const dirModifiedTime = dirStats.mtime;
        
        // Check if we have cached results
        const cachedDir = await database.get(
            'SELECT * FROM scanned_directories WHERE path = ? AND is_active = 1',
            [dirPath]
        );
        
        // If we have cached results and directory hasn't been modified, return cached data
        if (!forceRescan && cachedDir && new Date(cachedDir.last_modified) >= dirModifiedTime) {
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
            
            return res.json({
                success: true,
                directory: dirPath,
                files: mediaFiles,
                count: mediaFiles.length,
                cached: true,
                scanDate: cachedDir.scan_date
            });
        }
        
        // Perform fresh scan
        console.log(`Scanning directory: ${dirPath} (force=${forceRescan})`);
        const mediaFiles = await scanDirectoryRecursive(dirPath);
        
        // Sort files by relative path first, then by name
        mediaFiles.sort((a, b) => {
            const pathCompare = (a.relativePath || '').localeCompare(b.relativePath || '');
            if (pathCompare !== 0) return pathCompare;
            return a.name.localeCompare(b.name);
        });
        
        // Store results in database
        await storeScanResults(dirPath, mediaFiles, dirModifiedTime);
        
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

// Helper function to store scan results in database
async function storeScanResults(dirPath, mediaFiles, dirModifiedTime) {
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

// API endpoint to force rescan a directory
app.post('/api/force-rescan', validatePath, async (req, res) => {
    try {
        const dirPath = req.body.path;
        
        // Call scan endpoint with forceRescan flag
        req.body.forceRescan = true;
        
        // Reuse the scan logic
        const dirStats = fs.statSync(dirPath);
        const dirModifiedTime = dirStats.mtime;
        
        console.log(`Force rescanning directory: ${dirPath}`);
        const mediaFiles = await scanDirectoryRecursive(dirPath);
        
        // Sort files
        mediaFiles.sort((a, b) => {
            const pathCompare = (a.relativePath || '').localeCompare(b.relativePath || '');
            if (pathCompare !== 0) return pathCompare;
            return a.name.localeCompare(b.name);
        });
        
        // Store fresh results
        await storeScanResults(dirPath, mediaFiles, dirModifiedTime);
        
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

// API endpoint to list cached directories
app.get('/api/cached-directories', async (req, res) => {
    try {
        const cachedDirs = await database.all(
            'SELECT * FROM scanned_directories WHERE is_active = 1 ORDER BY scan_date DESC'
        );
        
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

// API endpoint to remove directory from cache
app.delete('/api/cached-directory/:id', async (req, res) => {
    try {
        const dirId = req.params.id;
        
        await database.run(
            'UPDATE scanned_directories SET is_active = 0 WHERE id = ?',
            [dirId]
        );
        
        res.json({
            success: true,
            message: 'Directory removed from cache'
        });
        
    } catch (error) {
        console.error('Error removing cached directory:', error);
        res.status(500).json({ error: 'Failed to remove cached directory' });
    }
});

// ==================== ALBUM MANAGEMENT API ====================

// API endpoint to create a new album
app.post('/api/albums', async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Album name is required' });
        }
        
        const result = await database.run(
            'INSERT INTO albums (name, description) VALUES (?, ?)',
            [name.trim(), description || null]
        );
        
        const album = await database.get(
            'SELECT * FROM albums WHERE id = ?',
            [result.id]
        );
        
        res.json({
            success: true,
            album: album
        });
        
    } catch (error) {
        console.error('Error creating album:', error);
        res.status(500).json({ error: 'Failed to create album' });
    }
});

// API endpoint to get all albums
app.get('/api/albums', async (req, res) => {
    try {
        const albums = await database.all(`
            SELECT a.*, COUNT(am.media_id) as media_count
            FROM albums a
            LEFT JOIN album_media am ON a.id = am.album_id
            GROUP BY a.id
            ORDER BY a.created_date DESC
        `);
        
        res.json({
            success: true,
            albums: albums
        });
        
    } catch (error) {
        console.error('Error fetching albums:', error);
        res.status(500).json({ error: 'Failed to fetch albums' });
    }
});

// API endpoint to get a specific album with its media
app.get('/api/albums/:id', async (req, res) => {
    try {
        const albumId = req.params.id;
        
        const album = await database.get(
            'SELECT * FROM albums WHERE id = ?',
            [albumId]
        );
        
        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }
        
        const media = await database.all(`
            SELECT mf.*, mc.caption, mc.title, mc.tags, mc.rating
            FROM media_files mf
            INNER JOIN album_media am ON mf.id = am.media_id
            LEFT JOIN media_captions mc ON mf.id = mc.media_id
            WHERE am.album_id = ?
            ORDER BY am.added_date
        `, [albumId]);
        
        res.json({
            success: true,
            album: album,
            media: media
        });
        
    } catch (error) {
        console.error('Error fetching album:', error);
        res.status(500).json({ error: 'Failed to fetch album' });
    }
});

// API endpoint to update an album
app.put('/api/albums/:id', async (req, res) => {
    try {
        const albumId = req.params.id;
        const { name, description } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Album name is required' });
        }
        
        await database.run(`
            UPDATE albums 
            SET name = ?, description = ?, modified_date = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name.trim(), description || null, albumId]);
        
        const album = await database.get(
            'SELECT * FROM albums WHERE id = ?',
            [albumId]
        );
        
        res.json({
            success: true,
            album: album
        });
        
    } catch (error) {
        console.error('Error updating album:', error);
        res.status(500).json({ error: 'Failed to update album' });
    }
});

// API endpoint to delete an album
app.delete('/api/albums/:id', async (req, res) => {
    try {
        const albumId = req.params.id;
        
        // Delete album media relationships first
        await database.run('DELETE FROM album_media WHERE album_id = ?', [albumId]);
        
        // Delete the album
        const result = await database.run('DELETE FROM albums WHERE id = ?', [albumId]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Album not found' });
        }
        
        res.json({
            success: true,
            message: 'Album deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting album:', error);
        res.status(500).json({ error: 'Failed to delete album' });
    }
});

// API endpoint to add media to an album
app.post('/api/albums/:id/media', async (req, res) => {
    try {
        const albumId = req.params.id;
        const { mediaIds } = req.body;
        
        if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
            return res.status(400).json({ error: 'Media IDs array is required' });
        }
        
        // Verify album exists
        const album = await database.get('SELECT id FROM albums WHERE id = ?', [albumId]);
        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }
        
        let addedCount = 0;
        for (const mediaId of mediaIds) {
            try {
                await database.run(
                    'INSERT OR IGNORE INTO album_media (album_id, media_id) VALUES (?, ?)',
                    [albumId, mediaId]
                );
                addedCount++;
            } catch (error) {
                console.error(`Error adding media ${mediaId} to album:`, error);
            }
        }
        
        res.json({
            success: true,
            message: `Added ${addedCount} media items to album`,
            addedCount: addedCount
        });
        
    } catch (error) {
        console.error('Error adding media to album:', error);
        res.status(500).json({ error: 'Failed to add media to album' });
    }
});

// API endpoint to remove media from an album
app.delete('/api/albums/:id/media/:mediaId', async (req, res) => {
    try {
        const albumId = req.params.id;
        const mediaId = req.params.mediaId;
        
        const result = await database.run(
            'DELETE FROM album_media WHERE album_id = ? AND media_id = ?',
            [albumId, mediaId]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Media not found in album' });
        }
        
        res.json({
            success: true,
            message: 'Media removed from album successfully'
        });
        
    } catch (error) {
        console.error('Error removing media from album:', error);
        res.status(500).json({ error: 'Failed to remove media from album' });
    }
});

// API endpoint to get media not in a specific album
app.get('/api/albums/:id/available-media', async (req, res) => {
    try {
        const albumId = req.params.id;
        const media = await database.all(`
            SELECT mf.*
            FROM media_files mf
            WHERE mf.id NOT IN (
                SELECT media_id FROM album_media WHERE album_id = ?
            )
            ORDER BY mf.name
        `, [albumId]);
        
        res.json({
            success: true,
            media: media
        });
        
    } catch (error) {
        console.error('Error fetching available media:', error);
        res.status(500).json({ error: 'Failed to fetch available media' });
    }
});

// ==================== CAPTION AND METADATA API ====================

// API endpoint to get media with captions
app.get('/api/media/:id/caption', async (req, res) => {
    try {
        const mediaId = req.params.id;
        
        const media = await database.get(`
            SELECT mf.*, mc.caption, mc.title, mc.tags, mc.rating
            FROM media_files mf
            LEFT JOIN media_captions mc ON mf.id = mc.media_id
            WHERE mf.id = ?
        `, [mediaId]);
        
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }
        
        // Parse tags if they exist
        if (media.tags) {
            try {
                media.tags = JSON.parse(media.tags);
            } catch (e) {
                media.tags = [];
            }
        } else {
            media.tags = [];
        }
        
        res.json({
            success: true,
            media: media
        });
        
    } catch (error) {
        console.error('Error fetching media caption:', error);
        res.status(500).json({ error: 'Failed to fetch media caption' });
    }
});

// API endpoint to update media caption and metadata
app.put('/api/media/:id/caption', async (req, res) => {
    try {
        const mediaId = req.params.id;
        const { caption, title, tags, rating } = req.body;
        
        // Validate rating if provided
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        
        // Verify media exists
        const media = await database.get('SELECT id FROM media_files WHERE id = ?', [mediaId]);
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }
        
        // Prepare tags array for storage
        let tagsJson = null;
        if (tags && Array.isArray(tags)) {
            tagsJson = JSON.stringify(tags.filter(tag => tag && tag.trim() !== ''));
        }
        
        // Update or insert caption
        await database.run(`
            INSERT OR REPLACE INTO media_captions 
            (media_id, caption, title, tags, rating, modified_date) 
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [mediaId, caption || null, title || null, tagsJson, rating || null]);
        
        // Return updated media info
        const updatedMedia = await database.get(`
            SELECT mf.*, mc.caption, mc.title, mc.tags, mc.rating
            FROM media_files mf
            LEFT JOIN media_captions mc ON mf.id = mc.media_id
            WHERE mf.id = ?
        `, [mediaId]);
        
        // Parse tags for response
        if (updatedMedia.tags) {
            try {
                updatedMedia.tags = JSON.parse(updatedMedia.tags);
            } catch (e) {
                updatedMedia.tags = [];
            }
        } else {
            updatedMedia.tags = [];
        }
        
        res.json({
            success: true,
            media: updatedMedia
        });
        
    } catch (error) {
        console.error('Error updating media caption:', error);
        res.status(500).json({ error: 'Failed to update media caption' });
    }
});

// API endpoint to search media
app.get('/api/search', async (req, res) => {
    try {
        const { query, tags, rating, type, directory } = req.query;
        let whereConditions = [];
        let params = [];
        
        // Build WHERE conditions
        if (query) {
            whereConditions.push(`(
                mf.name LIKE ? OR 
                mc.caption LIKE ? OR 
                mc.title LIKE ?
            )`);
            const searchTerm = `%${query}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            const tagConditions = tagArray.map(() => `mc.tags LIKE ?`).join(' OR ');
            whereConditions.push(`(${tagConditions})`);
            tagArray.forEach(tag => params.push(`%"${tag}"%`));
        }
        
        if (rating) {
            whereConditions.push('mc.rating >= ?');
            params.push(parseInt(rating));
        }
        
        if (type) {
            whereConditions.push('mf.file_type = ?');
            params.push(type);
        }
        
        if (directory) {
            whereConditions.push('mf.full_path LIKE ?');
            params.push(`%${directory}%`);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        const media = await database.all(`
            SELECT mf.*, mc.caption, mc.title, mc.tags, mc.rating
            FROM media_files mf
            LEFT JOIN media_captions mc ON mf.id = mc.media_id
            ${whereClause}
            ORDER BY mf.name
        `, params);
        
        // Parse tags for each media item
        media.forEach(item => {
            if (item.tags) {
                try {
                    item.tags = JSON.parse(item.tags);
                } catch (e) {
                    item.tags = [];
                }
            } else {
                item.tags = [];
            }
        });
        
        res.json({
            success: true,
            media: media,
            count: media.length
        });
        
    } catch (error) {
        console.error('Error searching media:', error);
        res.status(500).json({ error: 'Failed to search media' });
    }
});

// API endpoint to get all unique tags
app.get('/api/tags', async (req, res) => {
    try {
        const captions = await database.all('SELECT tags FROM media_captions WHERE tags IS NOT NULL');
        
        const allTags = new Set();
        captions.forEach(item => {
            if (item.tags) {
                try {
                    const tags = JSON.parse(item.tags);
                    tags.forEach(tag => allTags.add(tag));
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        });
        
        const sortedTags = Array.from(allTags).sort();
        
        res.json({
            success: true,
            tags: sortedTags,
            count: sortedTags.length
        });
        
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
    }
});

// API endpoint to get media statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = {};
        
        // Total media count
        const totalResult = await database.get('SELECT COUNT(*) as count FROM media_files');
        stats.totalMedia = totalResult.count;
        
        // Media by type
        const typeResults = await database.all(`
            SELECT file_type, COUNT(*) as count 
            FROM media_files 
            GROUP BY file_type
        `);
        stats.mediaByType = {};
        typeResults.forEach(row => {
            stats.mediaByType[row.file_type] = row.count;
        });
        
        // Albums count
        const albumResult = await database.get('SELECT COUNT(*) as count FROM albums');
        stats.totalAlbums = albumResult.count;
        
        // Media with captions
        const captionResult = await database.get(`
            SELECT COUNT(*) as count FROM media_captions 
            WHERE caption IS NOT NULL OR title IS NOT NULL
        `);
        stats.mediaWithCaptions = captionResult.count;
        
        // Media with ratings
        const ratingResult = await database.get(`
            SELECT COUNT(*) as count FROM media_captions 
            WHERE rating IS NOT NULL
        `);
        stats.mediaWithRatings = ratingResult.count;
        
        // Average rating
        const avgRatingResult = await database.get(`
            SELECT AVG(rating) as avg_rating FROM media_captions 
            WHERE rating IS NOT NULL
        `);
        stats.averageRating = avgRatingResult.avg_rating ? parseFloat(avgRatingResult.avg_rating).toFixed(1) : null;
        
        // Scanned directories count
        const dirResult = await database.get('SELECT COUNT(*) as count FROM scanned_directories WHERE is_active = 1');
        stats.scannedDirectories = dirResult.count;
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});


// API endpoint to list available drives
app.get('/api/list-drives', async (req, res) => {
    try {
        const drives = await getAvailableDrives();
        
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

// API endpoint to list directories for browsing
app.post('/api/list-directories', validatePath, async (req, res) => {
    try {
        const dirPath = req.body.path;
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
            
            // Get parent directory path
            const parentPath = path.dirname(dirPath);
            const hasParent = parentPath !== dirPath;
            
            res.json({
                success: true,
                currentPath: dirPath,
                parentPath: hasParent ? parentPath : null,
                directories: directories
            });
            
        } catch (readError) {
            console.error('Error reading directory:', readError);
            res.json({
                success: false,
                error: `Cannot access directory: ${readError.message}`
            });
        }
        
    } catch (error) {
        console.error('Error listing directories:', error);
        res.status(500).json({ error: 'Failed to list directories' });
    }
});


// Serve static files from user-selected directories
app.get('/media/*', (req, res) => {
    const filePath = decodeURIComponent(req.params[0]);
    
    // Security check - ensure the path is valid
    if (filePath.includes('..') || filePath.includes('~')) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
        return res.status(400).json({ error: 'Not a file' });
    }
    
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    
    // For images, enable caching
    if (mimeType.startsWith('image/')) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    
    res.sendFile(filePath);
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
async function startServer() {
    try {
        // Initialize database
        await database.initialize();
        console.log('Database initialized successfully.');
        
        app.listen(PORT, () => {
            console.log(`Personal Galery server running on http://localhost:${PORT}`);
            console.log('Open your browser and navigate to http://localhost:3000');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
