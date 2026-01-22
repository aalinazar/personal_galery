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

// API endpoint to scan directory for media files
app.post('/api/scan-directory', validatePath, async (req, res) => {
    try {
        const dirPath = req.body.path;
        const files = await fs.readdir(dirPath);
        
        const mediaFiles = [];
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile() && isMediaFile(file)) {
                mediaFiles.push({
                    name: file,
                    path: filePath,
                    type: getMediaType(file),
                    size: stats.size,
                    modified: stats.mtime,
                    mimeType: mime.lookup(file) || 'application/octet-stream'
                });
            }
        }
        
        // Sort files by name
        mediaFiles.sort((a, b) => a.name.localeCompare(b.name));
        
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

// API endpoint to get subdirectories
app.post('/api/get-directories', validatePath, async (req, res) => {
    try {
        const dirPath = req.body.path;
        const items = await fs.readdir(dirPath);
        
        const directories = [];
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory() && !item.startsWith('.')) {
                directories.push({
                    name: item,
                    path: itemPath
                });
            }
        }
        
        // Sort directories by name
        directories.sort((a, b) => a.name.localeCompare(b.name));
        
        res.json({
            success: true,
            directories: directories
        });
        
    } catch (error) {
        console.error('Error getting directories:', error);
        res.status(500).json({ error: 'Failed to get directories' });
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
    console.log(`Media Mind server running on http://localhost:${PORT}`);
    console.log('Open your browser and navigate to http://localhost:3000');
});

module.exports = app;
