const express = require('express');
const path = require('path');

/**
 * Create and configure Express application
 * @param {Object} database - Database instance
 * @returns {Object} Configured Express app
 */
function createApp(database) {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.static('public'));

    // Serve the main HTML file
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    return app;
}

/**
 * Start the server with database initialization
 * @param {Object} app - Express application
 * @param {Object} database - Database instance
 * @param {number} port - Port to listen on
 */
async function startServer(app, database, port) {
    try {
        // Initialize database
        await database.initialize();
        console.log('Database initialized successfully.');
        
        app.listen(port, () => {
            console.log(`Personal Galery server running on http://localhost:${port}`);
            console.log('Open your browser and navigate to http://localhost:' + port);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

module.exports = {
    createApp,
    startServer
};
