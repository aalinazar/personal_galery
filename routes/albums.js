const express = require('express');
const router = express.Router();
const albums = require('../services/albums');

/**
 * Create a new album
 */
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;
        
        const album = await albums.createAlbum(req.database, name, description);
        
        res.json({
            success: true,
            album: album
        });
        
    } catch (error) {
        console.error('Error creating album:', error);
        if (error.message.includes('required')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create album' });
    }
});

/**
 * Get all albums
 */
router.get('/', async (req, res) => {
    try {
        const albumsList = await albums.getAllAlbums(req.database);
        
        res.json({
            success: true,
            albums: albumsList
        });
        
    } catch (error) {
        console.error('Error fetching albums:', error);
        res.status(500).json({ error: 'Failed to fetch albums' });
    }
});

/**
 * Get a specific album with its media
 */
router.get('/:id', async (req, res) => {
    try {
        const albumId = req.params.id;
        
        const album = await albums.getAlbumById(req.database, albumId);
        
        res.json({
            success: true,
            album: album
        });
        
    } catch (error) {
        console.error('Error fetching album:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to fetch album' });
    }
});

/**
 * Update an album
 */
router.put('/:id', async (req, res) => {
    try {
        const albumId = req.params.id;
        const { name, description } = req.body;
        
        const album = await albums.updateAlbum(req.database, albumId, name, description);
        
        res.json({
            success: true,
            album: album
        });
        
    } catch (error) {
        console.error('Error updating album:', error);
        if (error.message.includes('required')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update album' });
    }
});

/**
 * Delete an album
 */
router.delete('/:id', async (req, res) => {
    try {
        const albumId = req.params.id;
        
        await albums.deleteAlbum(req.database, albumId);
        
        res.json({
            success: true,
            message: 'Album deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting album:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to delete album' });
    }
});

/**
 * Add media to an album
 */
router.post('/:id/media', async (req, res) => {
    try {
        const albumId = req.params.id;
        const { mediaIds } = req.body;
        
        const addedCount = await albums.addMediaToAlbum(req.database, albumId, mediaIds);
        
        res.json({
            success: true,
            message: `Added ${addedCount} media items to album`,
            addedCount: addedCount
        });
        
    } catch (error) {
        console.error('Error adding media to album:', error);
        if (error.message.includes('required') || error.message.includes('not found')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to add media to album' });
    }
});

/**
 * Remove media from an album
 */
router.delete('/:id/media/:mediaId', async (req, res) => {
    try {
        const albumId = req.params.id;
        const mediaId = req.params.mediaId;
        
        await albums.removeMediaFromAlbum(req.database, albumId, mediaId);
        
        res.json({
            success: true,
            message: 'Media removed from album successfully'
        });
        
    } catch (error) {
        console.error('Error removing media from album:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to remove media from album' });
    }
});

/**
 * Get media not in a specific album
 */
router.get('/:id/available-media', async (req, res) => {
    try {
        const albumId = req.params.id;
        
        const media = await albums.getAvailableMedia(req.database, albumId);
        
        res.json({
            success: true,
            media: media
        });
        
    } catch (error) {
        console.error('Error fetching available media:', error);
        res.status(500).json({ error: 'Failed to fetch available media' });
    }
});

/**
 * Get albums that contain a specific media file
 */
router.get('/media/:mediaId/albums', async (req, res) => {
    try {
        const mediaId = req.params.mediaId;
        
        const albumsList = await albums.getAlbumsForMedia(req.database, mediaId);
        
        res.json({
            success: true,
            albums: albumsList
        });
        
    } catch (error) {
        console.error('Error fetching albums for media:', error);
        res.status(500).json({ error: 'Failed to fetch albums for media' });
    }
});

module.exports = router;
