const express = require('express');
const path = require('path');
const mime = require('mime-types');
const fs = require('fs-extra');
const database = require('./database');

// Import configuration and middleware
const PORT = process.env.PORT || 3000;
const { validatePath } = require('./middleware/security');
const { errorHandler } = require('./middleware/errorHandler');

// Import route modules
const scanRoutes = require('./routes/scan');
const albumRoutes = require('./routes/albums');
const metadataRoutes = require('./routes/metadata');
const filesystemRoutes = require('./routes/filesystem');
const mediaRoutes = require('./routes/media');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database middleware - attach database to request
app.use((req, res, next) => {
    req.database = database;
    next();
});

// API Routes
app.use('/api', scanRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api', metadataRoutes);
app.use('/api', filesystemRoutes);
app.use('/api/media', mediaRoutes);

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

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
    try {
        // Initialize database
        await database.initialize();
        console.log('Database initialized successfully.');
        
        app.listen(PORT, () => {
            console.log(`Personal Gallery server running on http://localhost:${PORT}`);
            console.log('Open your browser and navigate to http://localhost:3000');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
