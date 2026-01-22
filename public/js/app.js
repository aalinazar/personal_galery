// Media Mind - Frontend Application
class MediaMind {
    constructor() {
        this.currentDirectory = '';
        this.mediaFiles = [];
        this.currentIndex = -1;
        this.viewMode = 'grid'; // 'grid' or 'list'
        this.sortBy = 'name';
        this.isSlideshow = false;
        this.slideshowInterval = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeTheme();
        this.loadQuickAccess();
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
        // In a real browser environment, we'd use the File System Access API
        // For now, we'll show a prompt for the directory path
        const path = prompt('Enter the full path to your media directory:');
        if (path && path.trim()) {
            this.directoryInput.value = path.trim();
            this.validateDirectoryInput();
        }
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
                this.loadSubdirectories();
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

    async loadSubdirectories() {
        if (!this.currentDirectory) return;

        try {
            const response = await fetch('/api/get-directories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path: this.currentDirectory }),
            });

            const data = await response.json();
            if (data.success && data.directories.length > 0) {
                this.displayQuickAccess(data.directories);
            }
        } catch (error) {
            console.error('Error loading subdirectories:', error);
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

        content += `
            <div class="media-info-overlay">
                <div class="media-filename">${file.name}</div>
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
}

// Global function for closing error message
function hideError() {
    document.getElementById('error-message').style.display = 'none';
}

// Global function for closing help modal
function closeHelp() {
    document.getElementById('help-modal').style.display = 'none';
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MediaMind();
});
