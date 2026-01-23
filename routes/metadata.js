const express = require('express');
const router = express.Router();
const metadata = require('../services/metadata');

/**
 * Get media with caption and metadata
 */
router.get('/media/:id/caption', async (req, res) => {
    try {
        const mediaId = req.params.id;
        
        const media = await metadata.getMediaWithCaption(req.database, mediaId);
        
        res.json({
            success: true,
            media: media
        });
        
    } catch (error) {
        console.error('Error fetching media caption:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to fetch media caption' });
    }
});

/**
 * Update media caption and metadata
 */
router.put('/media/:id/caption', async (req, res) => {
    try {
        const mediaId = req.params.id;
        const { caption, title, tags, rating } = req.body;
        
        const updatedMedia = await metadata.updateMediaCaption(req.database, mediaId, caption, title, tags, rating);
        
        res.json({
            success: true,
            media: updatedMedia
        });
        
    } catch (error) {
        console.error('Error updating media caption:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Rating must be')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update media caption' });
    }
});

/**
 * Search media
 */
router.get('/search', async (req, res) => {
    try {
        const { query, tags, rating, type, directory } = req.query;
        
        const searchOptions = {
            query,
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
            rating: rating ? parseInt(rating) : undefined,
            type,
            directory
        };
        
        const searchResults = await metadata.searchMedia(req.database, searchOptions);
        
        res.json({
            success: true,
            media: searchResults.media,
            count: searchResults.count
        });
        
    } catch (error) {
        console.error('Error searching media:', error);
        res.status(500).json({ error: 'Failed to search media' });
    }
});

/**
 * Get all unique tags
 */
router.get('/tags', async (req, res) => {
    try {
        const tags = await metadata.getAllTags(req.database);
        
        res.json({
            success: true,
            tags: tags,
            count: tags.length
        });
        
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
    }
});

/**
 * Get media statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await metadata.getMediaStats(req.database);
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * Delete media caption and metadata
 */
router.delete('/media/:id/caption', async (req, res) => {
    try {
        const mediaId = req.params.id;
        
        await metadata.deleteMediaCaption(req.database, mediaId);
        
        res.json({
            success: true,
            message: 'Media caption and metadata deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting media caption:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to delete media caption' });
    }
});

/**
 * Bulk update media captions and metadata
 */
router.put('/media/bulk-update', async (req, res) => {
    try {
        const { updates } = req.body; // Array of { mediaId, caption, title, tags, rating }
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'Updates array is required' });
        }
        
        const results = await metadata.bulkUpdateMediaCaptions(req.database, updates);
        
        res.json({
            success: true,
            results: results
        });
        
    } catch (error) {
        console.error('Error bulk updating media captions:', error);
        res.status(500).json({ error: 'Failed to bulk update media captions' });
    }
});

/**
 * Get media by rating
 */
router.get('/media/rating/:rating', async (req, res) => {
    try {
        const rating = parseInt(req.params.rating);
        
        if (isNaN(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        
        const media = await metadata.getMediaByRating(req.database, rating);
        
        res.json({
            success: true,
            media: media,
            count: media.length
        });
        
    } catch (error) {
        console.error('Error fetching media by rating:', error);
        res.status(500).json({ error: 'Failed to fetch media by rating' });
    }
});

module.exports = router;
