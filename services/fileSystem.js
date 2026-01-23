const fs = require('fs-extra');
const path = require('path');

/**
 * Detect available drives on the system
 * @returns {Promise<Object[]>} Array of drive information objects
 */
async function getAvailableDrives() {
    const drives = [];
    const platform = process.platform;
    
    try {
        if (platform === 'win32') {
            drives.push(...await getWindowsDrives());
        } else {
            drives.push(...await getUnixDrives());
        }
    } catch (error) {
        console.error('Error detecting drives:', error);
    }
    
    return drives;
}

/**
 * Get available drives on Windows systems
 * @returns {Promise<Object[]>} Array of Windows drive information
 */
async function getWindowsDrives() {
    const drives = [];
    
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
    
    return drives;
}

/**
 * Get available drives on Unix-like systems (macOS, Linux)
 * @returns {Promise<Object[]>} Array of Unix drive information
 */
async function getUnixDrives() {
    const drives = [];
    const platform = process.platform;
    
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
    
    return drives;
}

/**
 * Get file or directory statistics
 * @param {string} filePath - Path to file or directory
 * @returns {Promise<Object>} File statistics object
 */
async function getFileStats(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return {
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime || stats.ctime,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            exists: true
        };
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

/**
 * Check if a path exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if path exists
 */
async function pathExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Check if a path is a directory
 * @param {string} dirPath - Directory path to check
 * @returns {Promise<boolean>} True if path is a directory
 */
async function isDirectory(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    } catch (error) {
        return false;
    }
}

/**
 * Check if a path is a file
 * @param {string} filePath - File path to check
 * @returns {Promise<boolean>} True if path is a file
 */
async function isFile(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return stats.isFile();
    } catch (error) {
        return false;
    }
}

/**
 * Read directory contents
 * @param {string} dirPath - Directory path to read
 * @returns {Promise<string[]>} Array of item names in directory
 */
async function readDirectory(dirPath) {
    try {
        return await fs.readdir(dirPath);
    } catch (error) {
        throw new Error(`Cannot read directory: ${error.message}`);
    }
}

/**
 * List directories for browsing
 * @param {string} dirPath - Directory path to list
 * @returns {Promise<Object[]>} Array of directory information objects
 */
async function listDirectories(dirPath) {
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
        
        return {
            success: true,
            currentPath: dirPath,
            parentPath: path.dirname(dirPath) !== dirPath ? path.dirname(dirPath) : null,
            directories: directories
        };
        
    } catch (readError) {
        console.error('Error reading directory:', readError);
        return {
            success: false,
            error: `Cannot access directory: ${readError.message}`
        };
    }
}

module.exports = {
    getAvailableDrives,
    getFileStats,
    pathExists,
    isDirectory,
    isFile,
    readDirectory,
    listDirectories,
    getWindowsDrives,
    getUnixDrives
};
