/**
 * BrainTumorAI — Professional Medical AI Frontend Logic
 * Features:
 * - Dark / Light theme toggle with local storage persistence
 * - Collapsible sidebar and responsive mobile drawer
 * - Interactive drag-and-drop MRI upload with instant preview and scanning animation
 * - Interactive Before/After image comparison slider
 * - Medical image zoom, pan, and fullscreen viewport inspection
 * - Dynamic overlay opacity slider
 * - Delete confirmation modal
 * - Client toast notifications
 */

(function () {
    'use strict';

    // =========================================================================
    // 1. Theme Manager
    // =========================================================================
    const ThemeManager = {
        STORAGE_KEY: 'braintumor_theme',
        
        init() {
            const savedTheme = localStorage.getItem(this.STORAGE_KEY);
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const activeTheme = savedTheme || (prefersDark ? 'dark' : 'light');
            this.setTheme(activeTheme);

            const toggleBtn = document.getElementById('theme-toggle-btn');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const current = document.documentElement.getAttribute('data-theme') || 'dark';
                    const next = current === 'dark' ? 'light' : 'dark';
                    this.setTheme(next);
                });
            }
        },

        setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(this.STORAGE_KEY, theme);
            
            const sunIcon = document.getElementById('theme-icon-sun');
            const moonIcon = document.getElementById('theme-icon-moon');
            if (sunIcon && moonIcon) {
                if (theme === 'light') {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                } else {
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                }
            }
        }
    };

    // =========================================================================
    // 2. Sidebar & Navigation Manager
    // =========================================================================
    const NavigationManager = {
        STORAGE_KEY: 'braintumor_sidebar_collapsed',

        init() {
            const sidebar = document.getElementById('app-sidebar');
            const toggleBtn = document.getElementById('sidebar-toggle-btn');
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const mobileBackdrop = document.getElementById('sidebar-backdrop');

            // Restore desktop collapsed state
            if (localStorage.getItem(this.STORAGE_KEY) === 'true') {
                document.body.classList.add('sidebar-collapsed');
            }

            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    document.body.classList.toggle('sidebar-collapsed');
                    const isCollapsed = document.body.classList.contains('sidebar-collapsed');
                    localStorage.setItem(this.STORAGE_KEY, isCollapsed);
                });
            }

            if (mobileMenuBtn && sidebar) {
                mobileMenuBtn.addEventListener('click', () => {
                    sidebar.classList.toggle('mobile-open');
                    if (mobileBackdrop) mobileBackdrop.classList.toggle('active');
                });
            }

            if (mobileBackdrop) {
                mobileBackdrop.addEventListener('click', () => {
                    if (sidebar) sidebar.classList.remove('mobile-open');
                    mobileBackdrop.classList.remove('active');
                });
            }
        }
    };

    // =========================================================================
    // 3. MRI Upload & Processing Workspace
    // =========================================================================
    const UploadWorkspace = {
        init() {
            const dropzone = document.getElementById('mri-dropzone');
            const fileInput = document.getElementById('mri-file-input');
            const previewCard = document.getElementById('upload-preview-card');
            const previewImg = document.getElementById('preview-image-elem');
            const form = document.getElementById('mri-upload-form');
            const submitBtn = document.getElementById('mri-submit-btn');
            const removeBtn = document.getElementById('preview-remove-btn');
            const replaceBtn = document.getElementById('preview-replace-btn');

            if (!dropzone || !fileInput) return;

            // Click dropzone to browse
            dropzone.addEventListener('click', () => fileInput.click());

            // Drag and drop events
            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.remove('dragover');
                });
            });

            dropzone.addEventListener('drop', (e) => {
                if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    fileInput.files = e.dataTransfer.files;
                    this.handleFileSelected(file);
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    this.handleFileSelected(fileInput.files[0]);
                }
            });

            if (replaceBtn) {
                replaceBtn.addEventListener('click', () => fileInput.click());
            }

            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    fileInput.value = '';
                    if (previewCard) previewCard.classList.remove('active');
                    dropzone.style.display = 'flex';
                });
            }

            if (form && submitBtn) {
                form.addEventListener('submit', (e) => {
                    if (!fileInput.files || fileInput.files.length === 0) {
                        e.preventDefault();
                        ToastManager.show('Please select an MRI image first.', 'error');
                        return;
                    }

                    // Prevent accidental duplicate submission
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = `
                        <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                            <path d="M12 2a10 10 0 0 1 10 10"></path>
                        </svg>
                        Analyzing MRI Scan...
                    `;

                    // Trigger scanning animation
                    if (previewCard) {
                        previewCard.classList.add('is-processing');
                    }

                    // Cycle informative processing steps
                    const stepText = document.getElementById('processing-step-label');
                    if (stepText) {
                        const steps = [
                            'Preparing & normalizing 256×256 MRI matrix...',
                            'Executing U-Net convolutional neural inference...',
                            'Extracting thresholded mask (threshold: 0.40)...',
                            'Compositing diagnostic overlay visualization...'
                        ];
                        let stepIdx = 0;
                        setInterval(() => {
                            stepIdx = (stepIdx + 1) % steps.length;
                            stepText.textContent = steps[stepIdx];
                        }, 900);
                    }
                });
            }
        },

        handleFileSelected(file) {
            const dropzone = document.getElementById('mri-dropzone');
            const previewCard = document.getElementById('upload-preview-card');
            const previewImg = document.getElementById('preview-image-elem');

            // Client validation: format & size
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
            const validExtensions = /\.(jpe?g|png)$/i;

            if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
                ToastManager.show('Unsupported file format. Please upload JPG or PNG MRI scans.', 'error');
                return;
            }

            if (file.size > 15 * 1024 * 1024) {
                ToastManager.show('File is too large (maximum 15MB).', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImg) {
                    previewImg.src = e.target.result;
                    previewImg.onload = () => {
                        const dimElem = document.getElementById('meta-dimensions');
                        if (dimElem) {
                            dimElem.textContent = `${previewImg.naturalWidth} × ${previewImg.naturalHeight}`;
                        }
                    };
                }

                const nameElem = document.getElementById('meta-filename');
                const sizeElem = document.getElementById('meta-filesize');
                if (nameElem) nameElem.textContent = file.name;
                if (sizeElem) sizeElem.textContent = this.formatFileSize(file.size);

                if (dropzone) dropzone.style.display = 'none';
                if (previewCard) previewCard.classList.add('active');
            };
            reader.readAsDataURL(file);
        },

        formatFileSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
    };

    // =========================================================================
    // 4. Interactive Image Comparison & Inspection Viewer
    // =========================================================================
    const ComparisonViewer = {
        zoomLevel: 1.0,
        isPanning: false,
        panStart: { x: 0, y: 0 },
        panOffset: { x: 0, y: 0 },

        init() {
            const container = document.getElementById('comparison-slider-container');
            if (!container) return;

            this.setupSlider(container);
            this.setupTabs();
            this.setupZoomPan();
            this.setupOpacitySlider();
            this.setupFullscreen();
        },

        setupSlider(container) {
            const divider = document.getElementById('slider-divider');
            const overlayWrapper = document.getElementById('slider-overlay-wrapper');
            let isDragging = false;

            const updateSlider = (clientX) => {
                const rect = container.getBoundingClientRect();
                let x = clientX - rect.left;
                if (x < 0) x = 0;
                if (x > rect.width) x = rect.width;
                const percentage = (x / rect.width) * 100;

                if (divider) divider.style.left = `${percentage}%`;
                if (overlayWrapper) {
                    // Clip right side to reveal the original left image
                    overlayWrapper.style.clipPath = `inset(0 0 0 ${percentage}%)`;
                }
            };

            const onStart = (e) => {
                isDragging = true;
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                updateSlider(clientX);
            };

            const onMove = (e) => {
                if (!isDragging) return;
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                updateSlider(clientX);
            };

            const onEnd = () => {
                isDragging = false;
            };

            container.addEventListener('mousedown', onStart);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);

            container.addEventListener('touchstart', onStart, { passive: true });
            window.addEventListener('touchmove', onMove, { passive: true });
            window.addEventListener('touchend', onEnd);

            // Keyboard accessibility for slider
            if (divider) {
                divider.setAttribute('tabindex', '0');
                divider.setAttribute('role', 'slider');
                divider.setAttribute('aria-label', 'MRI Segmentation Comparison Divider');
                divider.addEventListener('keydown', (e) => {
                    let currentLeft = parseFloat(divider.style.left) || 50;
                    if (e.key === 'ArrowLeft') {
                        currentLeft = Math.max(0, currentLeft - 5);
                    } else if (e.key === 'ArrowRight') {
                        currentLeft = Math.min(100, currentLeft + 5);
                    } else {
                        return;
                    }
                    e.preventDefault();
                    divider.style.left = `${currentLeft}%`;
                    if (overlayWrapper) {
                        overlayWrapper.style.clipPath = `inset(0 0 0 ${currentLeft}%)`;
                    }
                });
            }
        },

        setupTabs() {
            const tabs = document.querySelectorAll('.tab-btn[data-view]');
            const sliderView = document.getElementById('view-slider');
            const sbsView = document.getElementById('view-side-by-side');
            const singleOverlayView = document.getElementById('view-single-overlay');
            const singleMaskView = document.getElementById('view-single-mask');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    const view = tab.getAttribute('data-view');
                    if (sliderView) sliderView.style.display = (view === 'slider') ? 'block' : 'none';
                    if (sbsView) sbsView.style.display = (view === 'sbs') ? 'grid' : 'none';
                    if (singleOverlayView) singleOverlayView.style.display = (view === 'overlay') ? 'block' : 'none';
                    if (singleMaskView) singleMaskView.style.display = (view === 'mask') ? 'block' : 'none';

                    // Reset zoom upon tab change
                    this.resetZoom();
                });
            });
        },

        setupZoomPan() {
            const zoomInBtn = document.getElementById('btn-zoom-in');
            const zoomOutBtn = document.getElementById('btn-zoom-out');
            const zoomResetBtn = document.getElementById('btn-zoom-reset');
            const panToggleBtn = document.getElementById('btn-pan-toggle');
            const viewport = document.getElementById('image-viewport');
            const content = document.getElementById('viewport-content');

            if (zoomInBtn) {
                zoomInBtn.addEventListener('click', () => {
                    this.zoomLevel = Math.min(this.zoomLevel + 0.25, 3.5);
                    this.applyTransform();
                });
            }

            if (zoomOutBtn) {
                zoomOutBtn.addEventListener('click', () => {
                    this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.75);
                    this.applyTransform();
                });
            }

            if (zoomResetBtn) {
                zoomResetBtn.addEventListener('click', () => this.resetZoom());
            }

            if (panToggleBtn && viewport) {
                panToggleBtn.addEventListener('click', () => {
                    viewport.classList.toggle('is-panning');
                    panToggleBtn.classList.toggle('active');
                });
            }

            if (viewport && content) {
                viewport.addEventListener('mousedown', (e) => {
                    if (!viewport.classList.contains('is-panning') && this.zoomLevel <= 1.0) return;
                    this.isPanning = true;
                    viewport.classList.add('is-dragging-pan');
                    this.panStart = { x: e.clientX - this.panOffset.x, y: e.clientY - this.panOffset.y };
                });

                window.addEventListener('mousemove', (e) => {
                    if (!this.isPanning) return;
                    this.panOffset = {
                        x: e.clientX - this.panStart.x,
                        y: e.clientY - this.panStart.y
                    };
                    this.applyTransform();
                });

                window.addEventListener('mouseup', () => {
                    this.isPanning = false;
                    viewport.classList.remove('is-dragging-pan');
                });
            }
        },

        resetZoom() {
            this.zoomLevel = 1.0;
            this.panOffset = { x: 0, y: 0 };
            this.applyTransform();
        },

        applyTransform() {
            const content = document.getElementById('viewport-content');
            if (content) {
                content.style.transform = `translate(${this.panOffset.x}px, ${this.panOffset.y}px) scale(${this.zoomLevel})`;
            }
            const zoomBadge = document.getElementById('zoom-percentage-badge');
            if (zoomBadge) {
                zoomBadge.textContent = `${Math.round(this.zoomLevel * 100)}%`;
            }
        },

        setupOpacitySlider() {
            const slider = document.getElementById('overlay-opacity-range');
            const overlayImgs = document.querySelectorAll('.overlay-layer-img');
            const label = document.getElementById('opacity-value-label');

            if (slider) {
                slider.addEventListener('input', (e) => {
                    const val = e.target.value;
                    if (label) label.textContent = `${val}%`;
                    overlayImgs.forEach(img => {
                        img.style.opacity = (val / 100);
                    });
                });
            }
        },

        setupFullscreen() {
            const fullscreenBtn = document.getElementById('btn-fullscreen-toggle');
            const viewport = document.getElementById('image-viewport');
            if (fullscreenBtn && viewport) {
                fullscreenBtn.addEventListener('click', () => {
                    if (!document.fullscreenElement) {
                        viewport.requestFullscreen().catch(err => {
                            ToastManager.show('Could not enter fullscreen mode: ' + err.message, 'error');
                        });
                    } else {
                        document.exitFullscreen();
                    }
                });
            }
        }
    };

    // =========================================================================
    // 5. History & Delete Modal
    // =========================================================================
    const HistoryManager = {
        init() {
            const modal = document.getElementById('delete-confirm-modal');
            const form = document.getElementById('delete-modal-form');
            const scanIdElem = document.getElementById('delete-modal-scan-id');
            const cancelBtn = document.getElementById('delete-modal-cancel');
            const deleteButtons = document.querySelectorAll('.btn-trigger-delete');

            if (!modal) return;

            deleteButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const scanId = btn.getAttribute('data-scan-id');
                    const deleteUrl = btn.getAttribute('data-delete-url');

                    if (scanIdElem) scanIdElem.textContent = `#${scanId}`;
                    if (form) form.action = deleteUrl;
                    modal.classList.add('active');
                });
            });

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
            }

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
            });
        }
    };

    // =========================================================================
    // 6. Toast Notification Manager
    // =========================================================================
    const ToastManager = {
        container: null,

        getContainer() {
            if (!this.container) {
                this.container = document.getElementById('toast-container');
                if (!this.container) {
                    this.container = document.createElement('div');
                    this.container.id = 'toast-container';
                    this.container.className = 'toast-container';
                    document.body.appendChild(this.container);
                }
            }
            return this.container;
        },

        show(message, type = 'info') {
            const container = this.getContainer();
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            const iconSvg = type === 'success'
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>'
                : type === 'error'
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

            toast.innerHTML = `
                ${iconSvg}
                <div style="flex: 1;">${message}</div>
                <button class="toast-close" style="color: var(--text-muted); padding: 2px;">&times;</button>
            `;

            toast.querySelector('.toast-close').addEventListener('click', () => {
                toast.remove();
            });

            container.appendChild(toast);

            setTimeout(() => {
                toast.style.transition = 'opacity 0.3s, transform 0.3s';
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(40px)';
                setTimeout(() => toast.remove(), 300);
            }, 4500);
        }
    };

    // Expose ToastManager globally for template integration
    window.BrainTumorToast = ToastManager;

    // =========================================================================
    // Initialization
    // =========================================================================
    document.addEventListener('DOMContentLoaded', () => {
        ThemeManager.init();
        NavigationManager.init();
        UploadWorkspace.init();
        ComparisonViewer.init();
        HistoryManager.init();
    });

})();