const path = require('path');
const mime = require('mime-types');
const { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } = require('../config/constants');

/**
 * Check if file is a media file based on extension
 * @param {string} filename - File name to check
 * @returns {boolean} True if file is media file
 */
function isMediaFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Get media type based on file extension
 * @param {string} filename - File name
 * @returns {string} Media type ('image', 'video', or 'unknown')
 */
function getMediaType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    return 'unknown';
}

/**
 * Get MIME type for a file
 * @param {string} filename - File name
 * @returns {string} MIME type
 */
function getMimeType(filename) {
    return mime.lookup(filename) || 'application/octet-stream';
}

/**
 * Create a media file object with metadata
 * @param {string} name - File name
 * @param {string} filePath - Full file path
 * @param {string} relativePath - Relative path from scan root
 * @param {number} depth - Directory depth
 * @param {Object} stats - File stats object
 * @returns {Object} Media file object
 */
function createMediaFileObject(name, filePath, relativePath, depth, stats) {
    return {
        name,
        path: filePath,
        relativePath,
        depth,
        type: getMediaType(name),
        size: stats.size,
        modified: stats.mtime,
        mimeType: getMimeType(name)
    };
}

/**
 * Filter an array of file names to only include media files
 * @param {string[]} filenames - Array of file names
 * @returns {string[]} Filtered array with only media files
 */
function filterMediaFiles(filenames) {
    return filenames.filter(isMediaFile);
}

/**
 * Group media files by type
 * @param {Object[]} mediaFiles - Array of media file objects
 * @returns {Object} Object with 'image' and 'video' arrays
 */
function groupMediaByType(mediaFiles) {
    return mediaFiles.reduce((groups, file) => {
        const type = file.type;
        if (!groups[type]) {
            groups[type] = [];
        }
        groups[type].push(file);
        return groups;
    }, { image: [], video: [], unknown: [] });
}

/**
 * Sort media files by name (case-insensitive)
 * @param {Object[]} mediaFiles - Array of media file objects
 * @returns {Object[]} Sorted array
 */
function sortMediaByName(mediaFiles) {
    return mediaFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Sort media files by modification date (newest first)
 * @param {Object[]} mediaFiles - Array of media file objects
 * @returns {Object[]} Sorted array
 */
function sortMediaByDate(mediaFiles) {
    return mediaFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified));
}

/**
 * Sort media files by size (largest first)
 * @param {Object[]} mediaFiles - Array of media file objects
 * @returns {Object[]} Sorted array
 */
function sortMediaBySize(mediaFiles) {
    return mediaFiles.sort((a, b) => b.size - a.size);
}

/**
 * Sort media files by relative path, then by name
 * @param {Object[]} mediaFiles - Array of media file objects
 * @returns {Object[]} Sorted array
 */
function sortMediaByPathAndName(mediaFiles) {
    return mediaFiles.sort((a, b) => {
        const pathCompare = (a.relativePath || '').localeCompare(b.relativePath || '');
        if (pathCompare !== 0) return pathCompare;
        return a.name.localeCompare(b.name);
    });
}

module.exports = {
    isMediaFile,
    getMediaType,
    getMimeType,
    createMediaFileObject,
    filterMediaFiles,
    groupMediaByType,
    sortMediaByName,
    sortMediaByDate,
    sortMediaBySize,
    sortMediaByPathAndName
};
