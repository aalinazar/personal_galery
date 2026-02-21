# GEMINI.md

## Project Overview

This project is a web-based local media gallery application. It allows users to scan local directories for images and videos, and then browse and view them in a web interface. The application is built with Node.js and Express on the backend, and vanilla JavaScript on the frontend. It uses a SQLite database to store metadata about the scanned media.

The application is structured as follows:

-   **Backend:**
    -   `server.js`: The main entry point for the application. It sets up the Express server, middleware, and API routes.
    -   `database.js`: Manages the SQLite database connection and schema.
    -   `routes/`: Contains the API route handlers for different functionalities like scanning, albums, metadata, and filesystem operations.
    -   `services/`: Contains the business logic for interacting with the database and filesystem.
-   **Frontend:**
    -   `public/index.html`: The main HTML file for the application.
    -   `public/css/styles.css`: The stylesheet for the application.
    -   `public/js/app.js`: The main JavaScript file that handles all client-side logic, including user interactions, API calls, and dynamic UI updates.

## Building and Running

### Prerequisites

-   Node.js and npm

### Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

-   **Development Mode:**
    To run the application in development mode with hot-reloading (using `nodemon`):
    ```bash
    npm run dev
    ```

-   **Production Mode:**
    To run the application in production mode:
    ```bash
    npm start
    ```

After starting the server, you can access the application by opening a web browser and navigating to `http://localhost:3000`.

## Development Conventions

-   **Code Style:** The JavaScript code follows a modern, class-based approach on the frontend (`PersonalGalery` class in `app.js`). The backend uses CommonJS modules.
-   **API:** The application exposes a RESTful API for the frontend to interact with the backend. The API routes are defined in the `routes/` directory.
-   **Database:** The application uses a SQLite database, which is managed through the `database.js` file. The database schema is created programmatically if it doesn't exist.
-   **Error Handling:** The application has a centralized error handler middleware (`middleware/errorHandler.js`) to manage errors.
-   **Security:** The application has basic security measures in place, such as path validation (`middleware/security.js`).
-   **Dependencies:** The project uses `express` for the web server, `sqlite3` for the database, and other libraries like `fs-extra` for file system operations.
