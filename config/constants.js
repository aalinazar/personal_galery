// Application constants and configuration

const PORT = process.env.PORT || 3000;

// Supported media file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv'];

// Maximum recursion depth for directory scanning
const MAX_SCAN_DEPTH = 20;

// Cache control settings
const IMAGE_CACHE_TIME = 'public, max-age=3600'; // 1 hour for images

// API response formats
const RESPONSE_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error'
};

// Error messages
const ERROR_MESSAGES = {
    PATH_REQUIRED: 'Path is required',
    INVALID_PATH: 'Invalid path',
    PATH_NOT_EXISTS: 'Path does not exist or is not a directory',
    ALBUM_NAME_REQUIRED: 'Album name is required',
    ALBUM_NOT_FOUND: 'Album not found',
    MEDIA_NOT_FOUND: 'Media not found',
    ACCESS_DENIED: 'Access denied',
    FILE_NOT_FOUND: 'File not found',
    NOT_A_FILE: 'Not a file',
    FAILED_SCAN: 'Failed to scan directory',
    FAILED_LIST_DRIVES: 'Failed to list drives',
    FAILED_LIST_DIRECTORIES: 'Failed to list directories',
    FAILED_CREATE_ALBUM: 'Failed to create album',
    FAILED_UPDATE_ALBUM: 'Failed to update album',
    FAILED_DELETE_ALBUM: 'Failed to delete album',
    FAILED_ADD_MEDIA: 'Failed to add media to album',
    FAILED_REMOVE_MEDIA: 'Failed to remove media from album',
    FAILED_FETCH_CAPTION: 'Failed to fetch media caption',
    FAILED_UPDATE_CAPTION: 'Failed to update media caption',
    FAILED_SEARCH: 'Failed to search media',
    FAILED_FETCH_TAGS: 'Failed to fetch tags',
    FAILED_FETCH_STATS: 'Failed to fetch stats',
    SOMETHING_WRONG: 'Something went wrong!',
    INVALID_RATING: 'Rating must be between 1 and 5',
    MEDIA_IDS_REQUIRED: 'Media IDs array is required'
};

module.exports = {
    PORT,
    IMAGE_EXTENSIONS,
    VIDEO_EXTENSIONS,
    MAX_SCAN_DEPTH,
    IMAGE_CACHE_TIME,
    RESPONSE_TYPES,
    ERROR_MESSAGES
};
