const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
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

// API endpoint to scan directory for media files recursively
app.post('/api/scan-directory', validatePath, async (req, res) => {
    try {
        const dirPath = req.body.path;
        
        // Use recursive scanning to find all media files
        const mediaFiles = await scanDirectoryRecursive(dirPath);
        
        // Sort files by relative path first, then by name
        mediaFiles.sort((a, b) => {
            const pathCompare = (a.relativePath || '').localeCompare(b.relativePath || '');
            if (pathCompare !== 0) return pathCompare;
            return a.name.localeCompare(b.name);
        });
        
        res.json({
            success: true,
            directory: dirPath,
            files: mediaFiles,
            count: mediaFiles.length
        });
        
    } catch (error) {
        console.error('Error scanning directory:', error);
        res.status(500).json({ error: 'Failed to scan directory' });
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
app.listen(PORT, () => {
    console.log(`Personal Galery server running on http://localhost:${PORT}`);
    console.log('Open your browser and navigate to http://localhost:3000');
});

module.exports = app;
