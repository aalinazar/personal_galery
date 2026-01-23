const { getMediaFileById } = require('./scanCache');

/**
 * Get media file with caption and metadata
 * @param {Object} database - Database instance
 * @param {number} mediaId - Media file ID
 * @returns {Promise<Object>} Media object with metadata
 */
async function getMediaWithMetadata(database, mediaId) {
    const media = await database.get(`
        SELECT mf.*, mc.caption, mc.title, mc.tags, mc.rating
        FROM media_files mf
        LEFT JOIN media_captions mc ON mf.id = mc.media_id
        WHERE mf.id = ?
    `, [mediaId]);
    
    if (!media) {
        throw new Error('Media not found');
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
    
    return media;
}

/**
 * Update media caption and metadata
 * @param {Object} database - Database instance
 * @param {number} mediaId - Media file ID
 * @param {string} caption - Media caption (optional)
 * @param {string} title - Media title (optional)
 * @param {string[]} tags - Array of tags (optional)
 * @param {number} rating - Media rating (1-5, optional)
 * @returns {Promise<Object>} Updated media object with metadata
 */
async function updateMediaMetadata(database, mediaId, caption, title, tags, rating) {
    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
    }
    
    // Verify media exists
    const media = await getMediaFileById(database, mediaId);
    if (!media) {
        throw new Error('Media not found');
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
    const updatedMedia = await getMediaWithMetadata(database, mediaId);
    
    return updatedMedia;
}

/**
 * Search media files with various filters
 * @param {Object} database - Database instance
 * @param {Object} filters - Search filters
 * @param {string} filters.query - Text search query (optional)
 * @param {string|string[]} filters.tags - Tag(s) to filter by (optional)
 * @param {number} filters.rating - Minimum rating (optional)
 * @param {string} filters.type - Media type ('image' or 'video') (optional)
 * @param {string} filters.directory - Directory path filter (optional)
 * @returns {Promise<Object[]>} Array of media objects
 */
async function searchMedia(database, filters = {}) {
    const { query, tags, rating, type, directory } = filters;
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
    
    return media;
}

/**
 * Get all unique tags from media captions
 * @param {Object} database - Database instance
 * @returns {Promise<string[]>} Array of unique tags
 */
async function getAllTags(database) {
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
    
    return Array.from(allTags).sort();
}

/**
 * Get media files by tag(s)
 * @param {Object} database - Database instance
 * @param {string|string[]} tags - Tag(s) to search for
 * @returns {Promise<Object[]>} Array of media objects
 */
async function getMediaByTags(database, tags) {
    return await searchMedia(database, { tags });
}

/**
 * Get media files by minimum rating
 * @param {Object} database - Database instance
 * @param {number} minRating - Minimum rating (1-5)
 * @returns {Promise<Object[]>} Array of media objects
 */
async function getMediaByRating(database, minRating) {
    return await searchMedia(database, { rating: minRating });
}

/**
 * Get media files by type
 * @param {Object} database - Database instance
 * @param {string} type - Media type ('image' or 'video')
 * @returns {Promise<Object[]>} Array of media objects
 */
async function getMediaByType(database, type) {
    return await searchMedia(database, { type });
}

/**
 * Get media statistics including metadata
 * @param {Object} database - Database instance
 * @returns {Promise<Object>} Media statistics
 */
async function getMediaStats(database) {
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
    
    // Rating distribution
    const ratingDistribution = await database.all(`
        SELECT rating, COUNT(*) as count 
        FROM media_captions 
        WHERE rating IS NOT NULL 
        GROUP BY rating 
        ORDER BY rating
    `);
    stats.ratingDistribution = {};
    ratingDistribution.forEach(row => {
        stats.ratingDistribution[row.rating] = row.count;
    });
    
    // Total tags count
    const tagsStats = await getTagStats(database);
    stats.totalTags = tagsStats.totalTags;
    stats.mostUsedTags = tagsStats.mostUsedTags;
    
    return stats;
}

/**
 * Get tag statistics
 * @param {Object} database - Database instance
 * @returns {Promise<Object>} Tag statistics
 */
async function getTagStats(database) {
    const captions = await database.all('SELECT tags FROM media_captions WHERE tags IS NOT NULL');
    
    const tagCounts = new Map();
    captions.forEach(item => {
        if (item.tags) {
            try {
                const tags = JSON.parse(item.tags);
                tags.forEach(tag => {
                    if (tag && tag.trim()) {
                        const count = tagCounts.get(tag) || 0;
                        tagCounts.set(tag, count + 1);
                    }
                });
            } catch (e) {
                // Skip invalid JSON
            }
        }
    });
    
    // Sort by usage count
    const sortedTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20) // Top 20 tags
        .map(([tag, count]) => ({ tag, count }));
    
    return {
        totalTags: tagCounts.size,
        mostUsedTags: sortedTags
    };
}

/**
 * Delete metadata for a media file
 * @param {Object} database - Database instance
 * @param {number} mediaId - Media file ID
 * @returns {Promise<boolean>} True if metadata was deleted
 */
async function deleteMediaMetadata(database, mediaId) {
    const result = await database.run(
        'DELETE FROM media_captions WHERE media_id = ?',
        [mediaId]
    );
    
    return result.changes > 0;
}

module.exports = {
    getMediaWithMetadata,
    updateMediaMetadata,
    searchMedia,
    getAllTags,
    getMediaByTags,
    getMediaByRating,
    getMediaByType,
    getMediaStats,
    getTagStats,
    deleteMediaMetadata
};
