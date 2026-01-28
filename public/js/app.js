// Personal Galery - Frontend Application
class PersonalGalery {
    constructor() {
        this.currentDirectory = '';
        this.mediaFiles = [];
        this.currentIndex = -1;
        this.viewMode = 'grid'; // 'grid' or 'list'
        this.sortBy = 'name';
        this.isSlideshow = false;
        this.slideshowInterval = null;
        this.currentAlbum = null;
        this.albums = [];
        
        this.initializeElements();
        this.bindEvents();
        this.initializeTheme();
        this.loadQuickAccess();
        this.loadAlbums();
    }

    initializeElements() {
        // Input elements
        this.directoryInput = document.getElementById('directory-input');
        this.browseBtn = document.getElementById('browse-btn');
        this.scanBtn = document.getElementById('scan-btn');
        
        // Display elements
        this.mediaGrid = document.getElementById('media-grid');
        this.loading = document.getElementById('loading');
        this.errorMessage = document.getElementById('error-message');
        this.emptyState = document.getElementById('empty-state');
        
        // Info bar elements
        this.mediaInfoBar = document.getElementById('media-info-bar');
        this.currentDirectorySpan = document.getElementById('current-directory');
        this.mediaCountSpan = document.getElementById('media-count');
        this.sortSelect = document.getElementById('sort-select');
        
        // View controls
        this.gridViewBtn = document.getElementById('grid-view-btn');
        this.listViewBtn = document.getElementById('list-view-btn');
        
        // Quick access
        this.quickAccess = document.getElementById('quick-access');
        this.quickAccessGrid = document.getElementById('quick-access-grid');
        
        // Media viewer
        this.mediaViewer = document.getElementById('media-viewer');
        this.viewerMedia = document.getElementById('viewer-media');
        this.viewerFilename = document.getElementById('viewer-filename');
        this.viewerInfo = document.getElementById('viewer-info');
        this.viewerPrev = document.getElementById('viewer-prev');
        this.viewerNext = document.getElementById('viewer-next');
        this.viewerClose = document.getElementById('viewer-close');
        this.viewerFullscreen = document.getElementById('viewer-fullscreen');
        this.viewerDownload = document.getElementById('viewer-download');
        this.viewerSlideshow = document.getElementById('viewer-slideshow');
        
        // Theme and help
        this.themeToggle = document.getElementById('theme-toggle');
        this.helpBtn = document.getElementById('help-btn');
        this.helpModal = document.getElementById('help-modal');
        
        // Directory browser
        this.directoryBrowserModal = document.getElementById('directory-browser-modal');
        this.currentPathDisplay = document.getElementById('current-path-display');
        this.directoryList = document.getElementById('directory-list');
        this.selectDirectoryBtn = document.getElementById('select-directory-btn');
        this.currentBrowsePath = '';
        this.selectedDirectory = '';
        this.clickTimeout = null;
        
        // Navigation tabs
        this.mediaTab = document.getElementById('media-tab');
        this.albumsTab = document.getElementById('albums-tab');
        this.mediaSection = document.getElementById('media-section');
        this.albumsSection = document.getElementById('albums-section');
        
        // Albums
        this.albumsGrid = document.getElementById('albums-grid');
        this.albumsCount = document.getElementById('albums-count');
        this.createAlbumBtn = document.getElementById('create-album-btn');
        this.albumsEmptyState = document.getElementById('albums-empty-state');
        
        // Album modals
        this.createAlbumModal = document.getElementById('create-album-modal');
        this.albumDetailModal = document.getElementById('album-detail-modal');
        this.albumNameInput = document.getElementById('album-name');
        this.albumDescriptionInput = document.getElementById('album-description');
        this.saveAlbumBtn = document.getElementById('save-album-btn');
        this.editAlbumNameInput = document.getElementById('edit-album-name');
        this.editAlbumDescriptionInput = document.getElementById('edit-album-description');
        this.updateAlbumBtn = document.getElementById('update-album-btn');
        this.deleteAlbumBtn = document.getElementById('delete-album-btn');
        this.addMediaToAlbumBtn = document.getElementById('add-media-to-album-btn');
        this.albumDetailTitle = document.getElementById('album-detail-title');
        this.albumMediaCount = document.getElementById('album-media-count');
        this.albumCreatedDate = document.getElementById('album-created-date');
        this.albumMediaGrid = document.getElementById('album-media-grid');
        this.albumMediaEmpty = document.getElementById('album-media-empty');
    }

    bindEvents() {
        // Directory selection
        this.browseBtn.addEventListener('click', () => this.browseDirectory());
        this.scanBtn.addEventListener('click', () => this.scanDirectory());
        this.directoryInput.addEventListener('input', () => this.validateDirectoryInput());
        this.directoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.scanBtn.disabled) {
                this.scanDirectory();
            }
        });

        // View controls
        this.sortSelect.addEventListener('change', (e) => this.changeSortOrder(e.target.value));
        this.gridViewBtn.addEventListener('click', () => this.setViewMode('grid'));
        this.listViewBtn.addEventListener('click', () => this.setViewMode('list'));

        // Media viewer controls
        this.viewerPrev.addEventListener('click', () => this.navigateMedia(-1));
        this.viewerNext.addEventListener('click', () => this.navigateMedia(1));
        this.viewerClose.addEventListener('click', () => this.closeViewer());
        this.viewerFullscreen.addEventListener('click', () => this.toggleFullscreen());
        this.viewerDownload.addEventListener('click', () => this.downloadCurrentMedia());
        this.viewerSlideshow.addEventListener('click', () => this.toggleSlideshow());

        // Theme and help
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.helpBtn.addEventListener('click', () => this.showHelp());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Close modals on background click
        this.helpModal.addEventListener('click', (e) => {
            if (e.target === this.helpModal) {
                this.closeHelp();
            }
        });
        
        // Directory browser close on background click
        this.directoryBrowserModal.addEventListener('click', (e) => {
            if (e.target === this.directoryBrowserModal) {
                this.closeDirectoryBrowser();
            }
        });
        
        // Directory browser buttons
        this.selectDirectoryBtn.addEventListener('click', () => this.confirmDirectorySelection());
        
        // Navigation tabs
        this.mediaTab.addEventListener('click', () => this.switchTab('media'));
        this.albumsTab.addEventListener('click', () => this.switchTab('albums'));
        
        // Album management
        this.createAlbumBtn.addEventListener('click', () => this.showCreateAlbumModal());
        this.saveAlbumBtn.addEventListener('click', () => this.createAlbum());
        this.updateAlbumBtn.addEventListener('click', () => this.updateAlbum());
        this.deleteAlbumBtn.addEventListener('click', () => this.deleteAlbum());
        this.addMediaToAlbumBtn.addEventListener('click', () => this.showAddMediaModal());
        
        // Modal close events
        this.createAlbumModal.addEventListener('click', (e) => {
            if (e.target === this.createAlbumModal) {
                this.closeCreateAlbumModal();
            }
        });
        
        this.albumDetailModal.addEventListener('click', (e) => {
            if (e.target === this.albumDetailModal) {
                this.closeAlbumDetailModal();
            }
        });
        
        // Form validation
        this.albumNameInput.addEventListener('input', () => this.validateAlbumForm());
        this.editAlbumNameInput.addEventListener('input', () => this.validateAlbumForm());
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('media-mind-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    updateThemeIcon(theme) {
        this.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('media-mind-theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    async browseDirectory() {
        // Start with current directory value if it exists and is valid, otherwise use a default
        let startPath = this.directoryInput.value.trim();
        
        // If current path doesn't exist, start at drives view
        if (!startPath) {
            this.currentBrowsePath = 'drives';
            await this.loadDrives();
        } else {
            this.currentBrowsePath = startPath;
            await this.loadDirectories(startPath);
        }
        
        this.directoryBrowserModal.style.display = 'flex';
    }

    async loadDrives() {
        try {
            this.directoryList.innerHTML = '<div class="loading">Loading drives...</div>';
            this.currentPathDisplay.textContent = 'Drives';
            
            const response = await fetch('/api/list-drives');
            const data = await response.json();

            if (data.success) {
                this.displayDrives(data.drives);
                this.selectedDirectory = '';
                this.selectDirectoryBtn.disabled = true;
            } else {
                this.directoryList.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--danger-color);">Error: ${data.error}</div>`;
            }
        } catch (error) {
            console.error('Error loading drives:', error);
            this.directoryList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--danger-color);">Failed to load drives</div>';
        }
    }

    async loadDirectories(path) {
        try {
            this.directoryList.innerHTML = '<div class="loading">Loading directories...</div>';
            
            const response = await fetch('/api/list-directories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path }),
            });

            const data = await response.json();

            if (data.success) {
                this.currentBrowsePath = data.currentPath;
                this.displayDirectories(data.directories, data.parentPath);
                this.currentPathDisplay.textContent = data.currentPath;
                this.selectedDirectory = '';
                this.selectDirectoryBtn.disabled = true;
            } else {
                this.directoryList.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--danger-color);">Error: ${data.error}</div>`;
            }
        } catch (error) {
            console.error('Error loading directories:', error);
            this.directoryList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--danger-color);">Failed to load directories</div>';
        }
    }

    displayDrives(drives) {
        this.directoryList.innerHTML = '';
        
        if (drives.length === 0) {
            this.directoryList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">No drives found</div>';
            return;
        }
        
        drives.forEach(drive => {
            const item = this.createDriveItem(drive);
            this.directoryList.appendChild(item);
        });
    }

    displayDirectories(directories, parentPath) {
        this.directoryList.innerHTML = '';
        
        // Add parent directory option if it exists
        if (parentPath) {
            const parentItem = this.createDirectoryItem({
                name: '.. (Parent Directory)',
                path: parentPath
            }, true);
            this.directoryList.appendChild(parentItem);
        }
        
        // Add directories
        directories.forEach(dir => {
            const item = this.createDirectoryItem(dir, false);
            this.directoryList.appendChild(item);
        });
        
        // Show message if no directories found
        if (directories.length === 0 && !parentPath) {
            this.directoryList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">No subdirectories found</div>';
        }
    }

    createDriveItem(drive) {
        const item = document.createElement('div');
        item.className = 'directory-item drive-item';
        
        // Get drive icon based on type or letter
        let driveIcon = '💾';
        if (drive.type === 'ssd') driveIcon = '🔹';
        else if (drive.type === 'cd') driveIcon = '💿';
        else if (drive.type === 'network') driveIcon = '🌐';
        else if (drive.letter.includes('/')) driveIcon = '📀'; // Unix-like
        
        item.innerHTML = `
            <span class="directory-icon drive-icon">${driveIcon}</span>
            <div class="drive-info">
                <span class="directory-name drive-name">${drive.name}</span>
                <span class="drive-letter">${drive.letter}</span>
            </div>
        `;
        
        // Handle drive click - navigate to the drive
        item.addEventListener('click', () => {
            this.loadDirectories(drive.path);
        });
        
        return item;
    }

    createDirectoryItem(directory, isParent) {
        const item = document.createElement('div');
        item.className = isParent ? 'directory-item parent-directory-item' : 'directory-item';
        item.innerHTML = `
            <span class="directory-icon">📁</span>
            <span class="directory-name">${directory.name}</span>
        `;
        
        item.addEventListener('click', () => {
            if (isParent) {
                // Navigate to parent directory immediately
                this.loadDirectories(directory.path);
            } else {
                // Handle single-click with potential double-click detection
                this.handleDirectoryClick(directory.path, item);
            }
        });
        
        // Add double-click for regular directories only
        if (!isParent) {
            item.addEventListener('dblclick', (e) => {
                e.preventDefault(); // Prevent any default double-click behavior
                this.loadDirectories(directory.path);
            });
        }
        
        return item;
    }

    handleDirectoryClick(path, element) {
        // Clear any existing timeout
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }
        
        // Set a timeout for single-click action
        this.clickTimeout = setTimeout(() => {
            this.selectDirectory(path, element);
            this.clickTimeout = null;
        }, 200); // 200ms delay to detect potential double-click
    }

    selectDirectory(path, element) {
        // Remove previous selection
        document.querySelectorAll('.directory-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        element.classList.add('selected');
        this.selectedDirectory = path;
        this.selectDirectoryBtn.disabled = false;
    }

    confirmDirectorySelection() {
        if (this.selectedDirectory) {
            this.directoryInput.value = this.selectedDirectory;
            this.validateDirectoryInput();
            this.closeDirectoryBrowser();
        }
    }

    closeDirectoryBrowser() {
        this.directoryBrowserModal.style.display = 'none';
        this.selectedDirectory = '';
        this.selectDirectoryBtn.disabled = true;
    }

    validateDirectoryInput() {
        const hasValue = this.directoryInput.value.trim().length > 0;
        this.scanBtn.disabled = !hasValue;
    }

    async scanDirectory() {
        const path = this.directoryInput.value.trim();
        if (!path) return;

        this.showLoading(true);
        this.hideError();

        try {
            const response = await fetch('/api/scan-directory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path }),
            });

            const data = await response.json();

            if (data.success) {
                this.currentDirectory = data.directory;
                this.mediaFiles = data.files;
                this.currentIndex = -1;
                this.displayMediaFiles();
                this.showMediaInfo(data.directory, data.count);
                this.addToQuickAccess(data.directory);
            } else {
                this.showError(data.error || 'Failed to scan directory');
            }
        } catch (error) {
            console.error('Error scanning directory:', error);
            this.showError('Failed to connect to server. Make sure the server is running.');
        } finally {
            this.showLoading(false);
        }
    }


    displayMediaFiles() {
        const sortedFiles = this.sortMediaFiles(this.mediaFiles, this.sortBy);
        
        if (sortedFiles.length === 0) {
            this.showEmptyState(true);
            this.mediaGrid.innerHTML = '';
            return;
        }

        this.showEmptyState(false);
        this.mediaGrid.innerHTML = '';

        sortedFiles.forEach((file, index) => {
            const mediaItem = this.createMediaItem(file, index);
            this.mediaGrid.appendChild(mediaItem);
        });
    }

    createMediaItem(file, index) {
        const item = document.createElement('div');
        item.className = 'media-item';
        item.dataset.index = index;
        item.dataset.fileName = file.name;
        item.dataset.filePath = file.path;
        item.dataset.fileType = file.type;

        let content = '';
        
        if (file.type === 'image') {
            content = `<img src="/media/${encodeURIComponent(file.path)}" alt="${file.name}" class="media-thumbnail" loading="lazy">`;
        } else if (file.type === 'video') {
            content = `
                <div class="media-icon">🎥</div>
                <span class="media-type-icon">🎥</span>
            `;
        }

        // Show folder context if file is in a subdirectory
        let folderInfo = '';
        if (file.relativePath && file.relativePath !== file.name) {
            const folderPath = file.relativePath.substring(0, file.relativePath.lastIndexOf('/') || file.relativePath.lastIndexOf('\\'));
            if (folderPath) {
                folderInfo = `<div class="media-folder">📁 ${folderPath}</div>`;
            }
        }

        content += `
            <div class="media-info-overlay">
                <div class="media-filename">${file.name}</div>
                ${folderInfo}
            </div>
        `;

        item.innerHTML = content;
        item.addEventListener('click', () => this.openMediaViewer(index));

        return item;
    }

    sortMediaFiles(files, sortBy) {
        const sorted = [...files];
        
        switch (sortBy) {
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'date':
                sorted.sort((a, b) => new Date(b.modified) - new Date(a.modified));
                break;
            case 'size':
                sorted.sort((a, b) => b.size - a.size);
                break;
            case 'type':
                sorted.sort((a, b) => {
                    if (a.type !== b.type) {
                        return a.type === 'image' ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name);
                });
                break;
        }
        
        return sorted;
    }

    changeSortOrder(sortBy) {
        this.sortBy = sortBy;
        this.displayMediaFiles();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        
        // Update button states
        this.gridViewBtn.classList.toggle('active', mode === 'grid');
        this.listViewBtn.classList.toggle('active', mode === 'list');
        
        // Update grid class
        this.mediaGrid.classList.toggle('list-view', mode === 'list');
    }

    openMediaViewer(index) {
        const sortedFiles = this.sortMediaFiles(this.mediaFiles, this.sortBy);
        this.currentIndex = index;
        const file = sortedFiles[index];
        
        this.viewerFilename.textContent = file.name;
        this.displayMediaInViewer(file);
        this.updateViewerInfo(file);
        this.mediaViewer.style.display = 'flex';
        
        // Update active state in grid
        document.querySelectorAll('.media-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
    }

    displayMediaInViewer(file) {
        if (file.type === 'image') {
            this.viewerMedia.innerHTML = `<img src="/media/${encodeURIComponent(file.path)}" alt="${file.name}">`;
        } else if (file.type === 'video') {
            this.viewerMedia.innerHTML = `
                <video controls autoplay>
                    <source src="/media/${encodeURIComponent(file.path)}" type="${file.mimeType}">
                    Your browser does not support the video tag.
                </video>
            `;
        }
    }

    updateViewerInfo(file) {
        const fileSize = this.formatFileSize(file.size);
        const modifiedDate = new Date(file.modified).toLocaleDateString();
        this.viewerInfo.textContent = `${fileSize} • Modified: ${modifiedDate}`;
    }

    navigateMedia(direction) {
        const sortedFiles = this.sortMediaFiles(this.mediaFiles, this.sortBy);
        const newIndex = this.currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < sortedFiles.length) {
            this.openMediaViewer(newIndex);
        }
    }

    closeViewer() {
        this.mediaViewer.style.display = 'none';
        this.stopSlideshow();
        
        // Stop any playing video
        const video = this.viewerMedia.querySelector('video');
        if (video) {
            video.pause();
        }
        
        // Remove active state
        document.querySelectorAll('.media-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.mediaViewer.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    downloadCurrentMedia() {
        const sortedFiles = this.sortMediaFiles(this.mediaFiles, this.sortBy);
        const file = sortedFiles[this.currentIndex];
        
        if (file) {
            const link = document.createElement('a');
            link.href = `/media/${encodeURIComponent(file.path)}`;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    toggleSlideshow() {
        if (this.isSlideshow) {
            this.stopSlideshow();
        } else {
            this.startSlideshow();
        }
    }

    startSlideshow() {
        this.isSlideshow = true;
        this.viewerSlideshow.textContent = '⏸️ Pause Slideshow';
        
        this.slideshowInterval = setInterval(() => {
            const sortedFiles = this.sortMediaFiles(this.mediaFiles, this.sortBy);
            if (this.currentIndex < sortedFiles.length - 1) {
                this.navigateMedia(1);
            } else {
                // Loop back to start
                this.openMediaViewer(0);
            }
        }, 3000); // 3 seconds per slide
    }

    stopSlideshow() {
        this.isSlideshow = false;
        this.viewerSlideshow.textContent = '▶️ Slideshow';
        
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
    }

    handleKeyPress(event) {
        if (this.mediaViewer.style.display !== 'none' && this.mediaViewer.style.display !== '') {
            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    this.navigateMedia(-1);
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.navigateMedia(1);
                    break;
                case 'Escape':
                    event.preventDefault();
                    this.closeViewer();
                    break;
                case 'f':
                case 'F':
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
                case ' ':
                    event.preventDefault();
                    // Handle video play/pause or slideshow toggle
                    const video = this.viewerMedia.querySelector('video');
                    if (video) {
                        if (video.paused) {
                            video.play();
                        } else {
                            video.pause();
                        }
                    } else {
                        this.toggleSlideshow();
                    }
                    break;
            }
        }
    }

    showLoading(show) {
        this.loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorText = this.errorMessage.querySelector('.error-text');
        errorText.textContent = message;
        this.errorMessage.style.display = 'flex';
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }

    showMediaInfo(directory, count) {
        this.currentDirectorySpan.textContent = directory;
        this.mediaCountSpan.textContent = `${count} file${count !== 1 ? 's' : ''}`;
        this.mediaInfoBar.style.display = 'flex';
    }

    showEmptyState(show) {
        this.emptyState.style.display = show ? 'block' : 'none';
        this.mediaGrid.style.display = show ? 'none' : 'grid';
    }

    displayQuickAccess(directories) {
        this.quickAccessGrid.innerHTML = '';
        
        directories.forEach(dir => {
            const item = document.createElement('div');
            item.className = 'quick-access-item';
            item.textContent = dir.name;
            item.addEventListener('click', () => {
                this.directoryInput.value = dir.path;
                this.scanDirectory();
            });
            this.quickAccessGrid.appendChild(item);
        });
        
        this.quickAccess.style.display = directories.length > 0 ? 'block' : 'none';
    }

    addToQuickAccess(directory) {
        let quickAccessList = JSON.parse(localStorage.getItem('media-mind-quick-access') || '[]');
        
        // Remove if already exists
        quickAccessList = quickAccessList.filter(dir => dir !== directory);
        
        // Add to beginning
        quickAccessList.unshift(directory);
        
        // Keep only last 10
        quickAccessList = quickAccessList.slice(0, 10);
        
        localStorage.setItem('media-mind-quick-access', JSON.stringify(quickAccessList));
        this.displaySavedQuickAccess();
    }

    loadQuickAccess() {
        this.displaySavedQuickAccess();
    }

    displaySavedQuickAccess() {
        const quickAccessList = JSON.parse(localStorage.getItem('media-mind-quick-access') || '[]');
        
        // Remove any existing recent directories sections
        const existingSections = document.querySelectorAll('.recent-directories');
        existingSections.forEach(section => section.remove());
        
        if (quickAccessList.length > 0) {
            const recentSection = document.createElement('div');
            recentSection.className = 'quick-access recent-directories';
            recentSection.style.display = 'block';
            recentSection.innerHTML = `
                <h3>Recent Directories</h3>
                <div class="quick-access-grid"></div>
            `;
            
            const grid = recentSection.querySelector('.quick-access-grid');
            
            quickAccessList.forEach(dir => {
                const item = document.createElement('div');
                item.className = 'quick-access-item';
                item.textContent = dir.split(/[\\/]/).pop() || dir;
                item.title = dir;
                item.addEventListener('click', () => {
                    this.directoryInput.value = dir;
                    this.scanDirectory();
                });
                grid.appendChild(item);
            });
            
            // Insert before quick access or after directory section
            const existingQuickAccess = document.getElementById('quick-access');
            if (existingQuickAccess) {
                existingQuickAccess.parentNode.insertBefore(recentSection, existingQuickAccess);
            } else {
                document.querySelector('.directory-section').appendChild(recentSection);
            }
        }
    }

    showHelp() {
        this.helpModal.style.display = 'flex';
    }

    closeHelp() {
        this.helpModal.style.display = 'none';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Album Management Methods
    switchTab(tab) {
        if (tab === 'media') {
            this.mediaTab.classList.add('active');
            this.albumsTab.classList.remove('active');
            this.mediaSection.classList.add('active');
            this.albumsSection.classList.remove('active');
        } else if (tab === 'albums') {
            this.mediaTab.classList.remove('active');
            this.albumsTab.classList.add('active');
            this.mediaSection.classList.remove('active');
            this.albumsSection.classList.add('active');
            this.loadAlbums();
        }
    }

    async loadAlbums() {
        try {
            const response = await fetch('/api/albums');
            const data = await response.json();

            if (data.success) {
                this.albums = data.albums;
                this.displayAlbums();
                this.updateAlbumsCount();
            } else {
                this.showError('Failed to load albums');
            }
        } catch (error) {
            console.error('Error loading albums:', error);
            this.showError('Failed to connect to server');
        }
    }

    displayAlbums() {
        if (this.albums.length === 0) {
            this.albumsEmptyState.style.display = 'block';
            this.albumsGrid.style.display = 'none';
            return;
        }

        this.albumsEmptyState.style.display = 'none';
        this.albumsGrid.style.display = 'grid';
        this.albumsGrid.innerHTML = '';

        this.albums.forEach(album => {
            const albumItem = this.createAlbumItem(album);
            this.albumsGrid.appendChild(albumItem);
        });
    }

    createAlbumItem(album) {
        const item = document.createElement('div');
        item.className = 'album-item';
        item.dataset.albumId = album.id;

        // Create album cover (use first media item or placeholder)
        let coverContent = '';
        if (album.media_count > 0) {
            // For now, show placeholder - in future we could load actual thumbnail
            coverContent = '<div class="album-cover-empty">📷</div>';
        } else {
            coverContent = '<div class="album-cover-empty">📚</div>';
        }

        const createdDate = new Date(album.created_date).toLocaleDateString();

        item.innerHTML = `
            <div class="album-cover">
                ${coverContent}
            </div>
            <div class="album-info">
                <div class="album-name">${album.name}</div>
                <div class="album-description">${album.description || 'No description'}</div>
                <div class="album-meta">
                    <span class="album-media-count">${album.media_count} media ${album.media_count === 1 ? 'item' : 'items'}</span>
                    <div class="album-actions">
                        <button class="album-action-btn" onclick="app.editAlbum(${album.id})">✏️</button>
                        <button class="album-action-btn" onclick="app.viewAlbum(${album.id})">👁️</button>
                    </div>
                </div>
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('album-action-btn')) {
                this.viewAlbum(album.id);
            }
        });

        return item;
    }

    updateAlbumsCount() {
        const totalAlbums = this.albums.length;
        const totalMedia = this.albums.reduce((sum, album) => sum + album.media_count, 0);
        this.albumsCount.textContent = `${totalAlbums} album${totalAlbums !== 1 ? 's' : ''} • ${totalMedia} total media ${totalMedia === 1 ? 'item' : 'items'}`;
    }

    showCreateAlbumModal() {
        this.albumNameInput.value = '';
        this.albumDescriptionInput.value = '';
        this.saveAlbumBtn.disabled = true;
        this.createAlbumModal.style.display = 'flex';
        this.albumNameInput.focus();
    }

    closeCreateAlbumModal() {
        this.createAlbumModal.style.display = 'none';
    }

    validateAlbumForm() {
        const nameValid = this.albumNameInput.value.trim().length > 0;
        this.saveAlbumBtn.disabled = !nameValid;
    }

    async createAlbum() {
        const name = this.albumNameInput.value.trim();
        const description = this.albumDescriptionInput.value.trim();

        if (!name) {
            this.showError('Album name is required');
            return;
        }

        try {
            const response = await fetch('/api/albums', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, description }),
            });

            const data = await response.json();

            if (data.success) {
                this.closeCreateAlbumModal();
                this.loadAlbums();
                this.showSuccess('Album created successfully');
            } else {
                this.showError(data.error || 'Failed to create album');
            }
        } catch (error) {
            console.error('Error creating album:', error);
            this.showError('Failed to connect to server');
        }
    }

    async viewAlbum(albumId) {
        try {
            const response = await fetch(`/api/albums/${albumId}`);
            const data = await response.json();

            if (data.success) {
                this.currentAlbum = data.album;
                this.showAlbumDetailModal();
            } else {
                this.showError(data.error || 'Failed to load album');
            }
        } catch (error) {
            console.error('Error loading album:', error);
            this.showError('Failed to connect to server');
        }
    }

    async editAlbum(albumId) {
        await this.viewAlbum(albumId);
        // The modal will open with edit mode enabled
    }

    showAlbumDetailModal() {
        if (!this.currentAlbum) return;

        this.albumDetailTitle.textContent = this.currentAlbum.name;
        this.editAlbumNameInput.value = this.currentAlbum.name;
        this.editAlbumDescriptionInput.value = this.currentAlbum.description || '';
        
        const createdDate = new Date(this.currentAlbum.created_date).toLocaleDateString();
        this.albumCreatedDate.textContent = `Created: ${createdDate}`;
        this.albumMediaCount.textContent = `${this.currentAlbum.media ? this.currentAlbum.media.length : 0} media items`;

        this.displayAlbumMedia();
        this.albumDetailModal.style.display = 'flex';
    }

    closeAlbumDetailModal() {
        this.albumDetailModal.style.display = 'none';
        this.currentAlbum = null;
    }

    displayAlbumMedia() {
        if (!this.currentAlbum || !this.currentAlbum.media || this.currentAlbum.media.length === 0) {
            this.albumMediaGrid.style.display = 'none';
            this.albumMediaEmpty.style.display = 'block';
            return;
        }

        this.albumMediaGrid.style.display = 'grid';
        this.albumMediaEmpty.style.display = 'none';
        this.albumMediaGrid.innerHTML = '';

        this.currentAlbum.media.forEach((media, index) => {
            const mediaItem = this.createAlbumMediaItem(media, index);
            this.albumMediaGrid.appendChild(mediaItem);
        });
    }

    createAlbumMediaItem(media, index) {
        const item = document.createElement('div');
        item.className = 'album-media-item';
        item.dataset.mediaId = media.id;

        let content = '';
        if (media.type === 'image') {
            content = `<img src="/media/${encodeURIComponent(media.path)}" alt="${media.name}" class="media-thumbnail" loading="lazy">`;
        } else if (media.type === 'video') {
            content = `<div class="media-icon">🎥</div>`;
        }

        const mediaItemDiv = document.createElement('div');
        mediaItemDiv.className = 'media-item';
        mediaItemDiv.innerHTML = content + `
            <div class="media-info-overlay">
                <div class="media-filename">${media.name}</div>
            </div>
            <button class="remove-media-btn" onclick="app.removeMediaFromAlbum(${this.currentAlbum.id}, ${media.id})" title="Remove from album">×</button>
        `;

        mediaItemDiv.addEventListener('click', () => {
            // Open media viewer with album media
            this.openAlbumMediaViewer(index);
        });

        item.appendChild(mediaItemDiv);
        return item;
    }

    async updateAlbum() {
        if (!this.currentAlbum) return;

        const name = this.editAlbumNameInput.value.trim();
        const description = this.editAlbumDescriptionInput.value.trim();

        if (!name) {
            this.showError('Album name is required');
            return;
        }

        try {
            const response = await fetch(`/api/albums/${this.currentAlbum.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, description }),
            });

            const data = await response.json();

            if (data.success) {
                this.closeAlbumDetailModal();
                this.loadAlbums();
                this.showSuccess('Album updated successfully');
            } else {
                this.showError(data.error || 'Failed to update album');
            }
        } catch (error) {
            console.error('Error updating album:', error);
            this.showError('Failed to connect to server');
        }
    }

    async deleteAlbum() {
        if (!this.currentAlbum) return;

        if (!confirm(`Are you sure you want to delete "${this.currentAlbum.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/albums/${this.currentAlbum.id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                this.closeAlbumDetailModal();
                this.loadAlbums();
                this.showSuccess('Album deleted successfully');
            } else {
                this.showError(data.error || 'Failed to delete album');
            }
        } catch (error) {
            console.error('Error deleting album:', error);
            this.showError('Failed to connect to server');
        }
    }

    async removeMediaFromAlbum(albumId, mediaId) {
        try {
            const response = await fetch(`/api/albums/${albumId}/media/${mediaId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                // Refresh the album view
                await this.viewAlbum(albumId);
                this.loadAlbums();
                this.showSuccess('Media removed from album');
            } else {
                this.showError(data.error || 'Failed to remove media from album');
            }
        } catch (error) {
            console.error('Error removing media from album:', error);
            this.showError('Failed to connect to server');
        }
    }

    showAddMediaModal() {
        // This will be implemented in Phase 2
        alert('Add media functionality will be implemented in the next phase. For now, you can scan directories and media will be available for adding to albums.');
    }

    openAlbumMediaViewer(index) {
        if (!this.currentAlbum || !this.currentAlbum.media) return;

        // Create a temporary media files array for the album
        const albumMediaFiles = this.currentAlbum.media.map(media => ({
            ...media,
            // Ensure consistent structure with regular media files
            name: media.name,
            path: media.path,
            type: media.type,
            size: media.size || 0,
            modified: media.modified || new Date().toISOString(),
            mimeType: media.mimeType || (media.type === 'image' ? 'image/jpeg' : 'video/mp4')
        }));

        // Temporarily replace mediaFiles and set current index
        const originalMediaFiles = this.mediaFiles;
        const originalCurrentDirectory = this.currentDirectory;
        
        this.mediaFiles = albumMediaFiles;
        this.currentIndex = index;
        
        // Open the viewer
        this.openMediaViewer(index);
        
        // Restore original media files when viewer closes (with a small delay)
        const originalCloseViewer = this.closeViewer.bind(this);
        this.closeViewer = () => {
            this.mediaFiles = originalMediaFiles;
            this.currentDirectory = originalCurrentDirectory;
            this.closeViewer = originalCloseViewer;
            originalCloseViewer();
        };
    }

    showSuccess(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'error-message';
        successDiv.style.backgroundColor = '#10b981';
        successDiv.style.borderColor = '#10b981';
        successDiv.innerHTML = `
            <span class="error-icon">✅</span>
            <span class="error-text">${message}</span>
            <button class="error-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(successDiv, mainContent.firstChild);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentElement) {
                successDiv.remove();
            }
        }, 3000);
    }
}

// Global function for closing error message
function hideError() {
    document.getElementById('error-message').style.display = 'none';
}

// Global function for closing help modal
function closeHelp() {
    document.getElementById('help-modal').style.display = 'none';
}

// Global function for closing directory browser modal
function closeDirectoryBrowser() {
    document.getElementById('directory-browser-modal').style.display = 'none';
}

// Global functions for modal closing
function closeCreateAlbumModal() {
    document.getElementById('create-album-modal').style.display = 'none';
}

function closeAlbumDetailModal() {
    document.getElementById('album-detail-modal').style.display = 'none';
}

// Initialize the application when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PersonalGalery();
});
