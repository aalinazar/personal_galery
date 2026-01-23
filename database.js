const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'personal_gallery.db');

class Database {
    constructor() {
        this.db = null;
    }

    // Initialize database connection and create tables
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database.');
                    this.createTables()
                        .then(() => resolve())
                        .catch(reject);
                }
            });
        });
    }

    // Create all necessary tables
    async createTables() {
        const tables = [
            // Directories that have been scanned
            `CREATE TABLE IF NOT EXISTS scanned_directories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                scan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                file_count INTEGER DEFAULT 0,
                last_modified DATETIME,
                is_active BOOLEAN DEFAULT 1
            )`,

            // Individual media files with metadata
            `CREATE TABLE IF NOT EXISTS media_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                directory_id INTEGER,
                name TEXT NOT NULL,
                full_path TEXT UNIQUE NOT NULL,
                relative_path TEXT,
                file_type TEXT CHECK(file_type IN ('image', 'video')),
                file_size INTEGER,
                modified_time DATETIME,
                mime_type TEXT,
                scan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (directory_id) REFERENCES scanned_directories(id)
            )`,

            // Albums for organizing media
            `CREATE TABLE IF NOT EXISTS albums (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                modified_date DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Album-media relationships (many-to-many)
            `CREATE TABLE IF NOT EXISTS album_media (
                album_id INTEGER,
                media_id INTEGER,
                added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (album_id, media_id),
                FOREIGN KEY (album_id) REFERENCES albums(id),
                FOREIGN KEY (media_id) REFERENCES media_files(id)
            )`,

            // Photo captions and metadata
            `CREATE TABLE IF NOT EXISTS media_captions (
                media_id INTEGER PRIMARY KEY,
                caption TEXT,
                title TEXT,
                tags TEXT, -- JSON array of tags
                rating INTEGER CHECK(rating >= 1 AND rating <= 5),
                created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                modified_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (media_id) REFERENCES media_files(id)
            )`
        ];

        // Create indexes for better performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_media_files_directory_id ON media_files(directory_id)',
            'CREATE INDEX IF NOT EXISTS idx_media_files_full_path ON media_files(full_path)',
            'CREATE INDEX IF NOT EXISTS idx_scanned_directories_path ON scanned_directories(path)',
            'CREATE INDEX IF NOT EXISTS idx_album_media_album_id ON album_media(album_id)',
            'CREATE INDEX IF NOT EXISTS idx_album_media_media_id ON album_media(media_id)'
        ];

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Create tables
                tables.forEach(sql => {
                    this.db.run(sql, (err) => {
                        if (err) {
                            console.error('Error creating table:', err);
                            reject(err);
                            return;
                        }
                    });
                });

                // Create indexes
                indexes.forEach(sql => {
                    this.db.run(sql, (err) => {
                        if (err) {
                            console.error('Error creating index:', err);
                            reject(err);
                            return;
                        }
                    });
                });

                console.log('Database tables and indexes created successfully.');
                resolve();
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed.');
                }
            });
        }
    }

    // Helper method to run queries with promises
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Helper method to get single row
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Helper method to get all rows
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}

// Create and export singleton instance
const database = new Database();

module.exports = database;
