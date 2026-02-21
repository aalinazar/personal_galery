const express = require('express');
const router = express.Router();

/**
 * Get all media files from the database
 * This endpoint is used to get media IDs for file paths when adding to albums
 */
router.get('/files', async (req, res) => {
    try {
        const media = await req.database.all(`
            SELECT id, name, full_path as path, file_type as type, file_size as size, 
                   modified_time as modified, mime_type as mimeType
            FROM media_files
            ORDER BY name
        `);
        
        res.json({
            success: true,
            files: media
        });
        
    } catch (error) {
        console.error('Error fetching media files:', error);
        res.status(500).json({ error: 'Failed to fetch media files' });
    }
});

module.exports = router;