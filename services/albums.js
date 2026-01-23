/**
 * Create a new album
 * @param {Object} database - Database instance
 * @param {string} name - Album name
 * @param {string} description - Album description (optional)
 * @returns {Promise<Object>} Created album object
 */
async function createAlbum(database, name, description) {
    if (!name || name.trim() === '') {
        throw new Error('Album name is required');
    }
    
    const result = await database.run(
        'INSERT INTO albums (name, description) VALUES (?, ?)',
        [name.trim(), description || null]
    );
    
    const album = await database.get(
        'SELECT * FROM albums WHERE id = ?',
        [result.id]
    );
    
    return album;
}

/**
 * Get all albums with media count
 * @param {Object} database - Database instance
 * @returns {Promise<Object[]>} Array of album objects with media count
 */
async function getAllAlbums(database) {
    const albums = await database.all(`
        SELECT a.*, COUNT(am.media_id) as media_count
        FROM albums a
        LEFT JOIN album_media am ON a.id = am.album_id
        GROUP BY a.id
        ORDER BY a.created_date DESC
    `);
    
    return albums;
}

/**
 * Get a specific album with its media
 * @param {Object} database - Database instance
 * @param {number} albumId - Album ID
 * @returns {Promise<Object>} Album object with media
 */
async function getAlbumById(database, albumId) {
    const album = await database.get(
        'SELECT * FROM albums WHERE id = ?',
        [albumId]
    );
    
    if (!album) {
        throw new Error('Album not found');
    }
    
    const media = await database.all(`
        SELECT mf.*, mc.caption, mc.title, mc.tags, mc.rating
        FROM media_files mf
        INNER JOIN album_media am ON mf.id = am.media_id
        LEFT JOIN media_captions mc ON mf.id = mc.media_id
        WHERE am.album_id = ?
        ORDER BY am.added_date
    `, [albumId]);
    
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
    
    return {
        ...album,
        media: media
    };
}

/**
 * Update an album
 * @param {Object} database - Database instance
 * @param {number} albumId - Album ID
 * @param {string} name - New album name
 * @param {string} description - New album description (optional)
 * @returns {Promise<Object>} Updated album object
 */
async function updateAlbum(database, albumId, name, description) {
    if (!name || name.trim() === '') {
        throw new Error('Album name is required');
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
    
    if (!album) {
        throw new Error('Album not found');
    }
    
    return album;
}

/**
 * Delete an album
 * @param {Object} database - Database instance
 * @param {number} albumId - Album ID to delete
 * @returns {Promise<boolean>} True if album was deleted
 */
async function deleteAlbum(database, albumId) {
    // Delete album media relationships first
    await database.run('DELETE FROM album_media WHERE album_id = ?', [albumId]);
    
    // Delete the album
    const result = await database.run('DELETE FROM albums WHERE id = ?', [albumId]);
    
    if (result.changes === 0) {
        throw new Error('Album not found');
    }
    
    return true;
}

/**
 * Add media to an album
 * @param {Object} database - Database instance
 * @param {number} albumId - Album ID
 * @param {number[]} mediaIds - Array of media file IDs
 * @returns {Promise<number>} Number of media items added
 */
async function addMediaToAlbum(database, albumId, mediaIds) {
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        throw new Error('Media IDs array is required');
    }
    
    // Verify album exists
    const album = await database.get('SELECT id FROM albums WHERE id = ?', [albumId]);
    if (!album) {
        throw new Error('Album not found');
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
    
    return addedCount;
}

/**
 * Remove media from an album
 * @param {Object} database - Database instance
 * @param {number} albumId - Album ID
 * @param {number} mediaId - Media file ID
 * @returns {Promise<boolean>} True if media was removed
 */
async function removeMediaFromAlbum(database, albumId, mediaId) {
    const result = await database.run(
        'DELETE FROM album_media WHERE album_id = ? AND media_id = ?',
        [albumId, mediaId]
    );
    
    if (result.changes === 0) {
        throw new Error('Media not found in album');
    }
    
    return true;
}

/**
 * Get media not in a specific album
 * @param {Object} database - Database instance
 * @param {number} albumId - Album ID
 * @returns {Promise<Object[]>} Array of media objects
 */
async function getAvailableMedia(database, albumId) {
    const media = await database.all(`
        SELECT mf.*
        FROM media_files mf
        WHERE mf.id NOT IN (
            SELECT media_id FROM album_media WHERE album_id = ?
        )
        ORDER BY mf.name
    `, [albumId]);
    
    return media;
}

/**
 * Check if media is in album
 * @param {Object} database - Database instance
 * @param {number} albumId - Album ID
 * @param {number} mediaId - Media file ID
 * @returns {Promise<boolean>} True if media is in album
 */
async function isMediaInAlbum(database, albumId, mediaId) {
    const result = await database.get(
        'SELECT 1 FROM album_media WHERE album_id = ? AND media_id = ?',
        [albumId, mediaId]
    );
    
    return !!result;
}

/**
 * Get albums that contain a specific media file
 * @param {Object} database - Database instance
 * @param {number} mediaId - Media file ID
 * @returns {Promise<Object[]>} Array of album objects
 */
async function getAlbumsForMedia(database, mediaId) {
    const albums = await database.all(`
        SELECT a.*
        FROM albums a
        INNER JOIN album_media am ON a.id = am.album_id
        WHERE am.media_id = ?
        ORDER BY a.name
    `, [mediaId]);
    
    return albums;
}

/**
 * Get album statistics
 * @param {Object} database - Database instance
 * @returns {Promise<Object>} Album statistics
 */
async function getAlbumStats(database) {
    const totalAlbums = await database.get('SELECT COUNT(*) as count FROM albums');
    const albumsWithMedia = await database.get(`
        SELECT COUNT(DISTINCT album_id) as count 
        FROM album_media
    `);
    const totalMediaInAlbums = await database.get('SELECT COUNT(*) as count FROM album_media');
    
    return {
        totalAlbums: totalAlbums.count,
        albumsWithMedia: albumsWithMedia.count,
        totalMediaInAlbums: totalMediaInAlbums.count,
        emptyAlbums: totalAlbums.count - albumsWithMedia.count
    };
}

module.exports = {
    createAlbum,
    getAllAlbums,
    getAlbumById,
    updateAlbum,
    deleteAlbum,
    addMediaToAlbum,
    removeMediaFromAlbum,
    getAvailableMedia,
    isMediaInAlbum,
    getAlbumsForMedia,
    getAlbumStats
};
