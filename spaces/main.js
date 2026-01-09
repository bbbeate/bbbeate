import borisImg from '@shared/assets/boris_no_bg.PNG';
import discoballGif from '@shared/assets/discoball.gif';
import { createDatePicker } from './datepicker.js';

// GitHub Gist storage
const GIST_ID = '0eb6f22f2822cdd5d70b92463c839fa7';
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const SPACES_PREFIX = 'spaces_';

// Check for redirect from 404.html
const redirectPath = sessionStorage.getItem('redirect_path');
if (redirectPath) {
    sessionStorage.removeItem('redirect_path');
    window.history.replaceState({}, '', redirectPath);
}

// Get space name from URL path (e.g., /spaces/tryvann -> tryvann)
function getSpaceFromPath() {
    const path = window.location.pathname;
    const match = path.match(/\/spaces\/([^/]+)/);
    return match ? match[1] : null;
}

const currentSpace = getSpaceFromPath();
const listView = document.getElementById('list-view');
const spaceView = document.getElementById('space-view');

// ============ LIST VIEW ============
if (!currentSpace) {
    listView.style.display = 'flex';
    spaceView.style.display = 'none';

    loadSpacesList();
}

async function loadSpacesList() {
    const spacesList = document.getElementById('spaces-list');

    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: GITHUB_TOKEN ? {
                'Authorization': `token ${GITHUB_TOKEN}`
            } : {}
        });
        const gist = await response.json();

        // Filter files starting with spaces_
        const spaces = Object.keys(gist.files)
            .filter(name => name.startsWith(SPACES_PREFIX) && name.endsWith('.json'))
            .map(name => name.replace(SPACES_PREFIX, '').replace('.json', ''));

        if (spaces.length === 0) {
            spacesList.innerHTML = '<div class="loading">no spaces found</div>';
            return;
        }

        spacesList.innerHTML = spaces.map(name =>
            `<a href="/spaces/${name}">${name}</a>`
        ).join('');
    } catch (error) {
        console.error('Failed to load spaces:', error);
        spacesList.innerHTML = '<div class="loading">failed to load</div>';
    }
}

// ============ SPACE VIEW ============
if (currentSpace) {
    listView.style.display = 'none';
    spaceView.style.display = 'block';

    initSpaceView();
}

function initSpaceView() {
    const datePickerContainer = document.getElementById('datepicker-container');
    const messyTitle = document.getElementById('messy-title');

    // Set messy title
    messyTitle.querySelectorAll('span').forEach(span => {
        span.textContent = currentSpace;
    });

    let currentSpaceData = null;

    // Get today's date in local time (YYYY-MM-DD)
    function getTodayDate() {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    // Get date from URL or default to today
    function getDateFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('date') || getTodayDate();
    }

    // Update URL with date
    function updateUrlDate(date) {
        const url = new URL(window.location);
        if (date === getTodayDate()) {
            url.searchParams.delete('date');
        } else {
            url.searchParams.set('date', date);
        }
        window.history.pushState({}, '', url);
    }

    let selectedDate = getDateFromUrl();

    // Create custom date picker
    const datePicker = createDatePicker(datePickerContainer, {
        onDateChange: (date) => {
            selectedDate = date;
            updateUrlDate(date);
            renderTexts();
        },
        getPostCountForDate: (date) => getPostCount(date)
    });

    // Set initial date in picker
    datePicker.setValue(selectedDate);

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        selectedDate = getDateFromUrl();
        datePicker.setValue(selectedDate);
        renderTexts();
    });

    // Detect if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || ('ontouchstart' in window);

    // Show 404 with boris
    function show404() {
        const spaceEl = document.querySelector('.space');
        spaceEl.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 2rem;">
                <img src="${borisImg}" alt="not found" style="max-width: 666px; max-height: 666px;">
                <div style="font-size: 1.5rem; color: var(--second);">space not found</div>
                <a href="/spaces/" style="color: var(--first);">← back to spaces</a>
            </div>
        `;
        // Hide controls
        document.querySelector('.header').style.display = 'none';
        document.querySelector('.button-container').style.display = 'none';
    }

    // Load space content
    async function loadSpace() {
        try {
            const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                headers: GITHUB_TOKEN ? {
                    'Authorization': `token ${GITHUB_TOKEN}`
                } : {}
            });
            const gist = await response.json();

            const filename = SPACES_PREFIX + currentSpace + '.json';
            const file = gist.files[filename];

            if (!file) {
                console.error('Space not found:', currentSpace);
                show404();
                return;
            }

            currentSpaceData = JSON.parse(file.content);
            renderTexts();
        } catch (error) {
            console.error('Failed to load space:', error);
        }
    }

    // Refresh date picker display
    function updateDateIndicator() {
        datePicker.refresh();
    }

    // Get date entry from data
    function getDateEntry(date) {
        if (!Array.isArray(currentSpaceData)) return null;
        return currentSpaceData.find(entry => entry.date === date);
    }

    // Get number of posts for a date
    function getPostCount(date) {
        const entry = getDateEntry(date);
        return entry?.txts?.length || 0;
    }

    // Render texts for current date
    function renderTexts() {
        document.querySelectorAll('.text-container').forEach(el => el.remove());

        const entry = getDateEntry(selectedDate);
        if (!entry?.txts) return;

        entry.txts.forEach(item => {
            createTextElement(item);
        });

        updateDateIndicator();
    }

    // Create a text element on the canvas
    function createTextElement(item) {
        const container = document.createElement('div');
        container.className = 'text-container';
        container.style.left = item.x + 'px';
        container.style.top = item.y + 'px';

        const nameLabel = document.createElement('div');
        nameLabel.className = 'text-name';
        nameLabel.textContent = item.name || '';

        const textElement = document.createElement('div');
        textElement.className = 'placed-text';
        textElement.textContent = item.text;
        textElement.style.fontSize = (item.size || 27) + 'px';

        container.appendChild(nameLabel);
        container.appendChild(textElement);

        // Make text editable on click
        textElement.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentSize = parseInt(textElement.style.fontSize) || 27;
            createEditInput(
                parseInt(container.style.left),
                parseInt(container.style.top),
                textElement.textContent,
                currentSize,
                (newText, newSize) => {
                    if (newText) {
                        textElement.textContent = newText;
                        textElement.style.fontSize = newSize + 'px';
                    } else {
                        container.remove();
                    }
                }
            );
        });

        document.body.appendChild(container);
    }

    // Create input for editing text
    function createEditInput(x, y, initialValue = '', initialSize = 27, onSave, onCancel) {
        const MIN_SIZE = 16;
        const MAX_SIZE = 69;

        const form = document.createElement('form');
        form.style.position = 'absolute';
        form.style.left = x + 'px';
        form.style.top = y + 'px';
        form.style.transform = 'translate(-50%, -50%)';
        form.style.zIndex = '1001';

        const editInput = document.createElement('textarea');
        editInput.className = 'text-input';
        editInput.value = initialValue;
        editInput.rows = 1;
        editInput.style.position = 'static';
        editInput.style.transform = 'none';
        editInput.style.fontSize = initialSize + 'px';
        editInput.style.height = (initialSize * 1.8) + 'px';

        if (isMobile) {
            editInput.setAttribute('enterkeyhint', 'done');
        }

        // Update font size based on textarea height
        const updateFontSize = () => {
            const height = editInput.offsetHeight;
            const newSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(height / 1.8)));
            editInput.style.fontSize = newSize + 'px';
        };

        // Watch for resize
        const resizeObserver = new ResizeObserver(updateFontSize);
        resizeObserver.observe(editInput);

        // Wand cursor when near resize corner
        editInput.addEventListener('mousemove', (e) => {
            const rect = editInput.getBoundingClientRect();
            const cornerSize = 20;
            const nearCorner = (rect.right - e.clientX < cornerSize) && (rect.bottom - e.clientY < cornerSize);
            editInput.style.cursor = nearCorner ? 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'><text y=\'24\' font-size=\'24\'>🪄</text></svg>") 4 4, nwse-resize' : 'text';
        });

        form.appendChild(editInput);
        document.body.appendChild(form);
        editInput.focus();
        if (initialValue) editInput.select();

        let isHandled = false;
        let currentSize = initialSize;

        const handleSubmit = () => {
            if (isHandled) return;
            isHandled = true;
            resizeObserver.disconnect();
            const text = editInput.value.trim();
            currentSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(editInput.offsetHeight / 1.8)));
            if (form.parentNode) form.remove();
            if (onSave) onSave(text, currentSize);
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSubmit();
        });

        editInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                handleSubmit();
            } else if (event.key === 'Escape') {
                isHandled = true;
                resizeObserver.disconnect();
                if (form.parentNode) form.remove();
                if (onCancel) onCancel();
            }
        });

        editInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (!isHandled && form.parentNode) {
                    handleSubmit();
                }
            }, 150);
        });
    }

    // Create new text at position
    function createTextInput(x, y) {
        createEditInput(x, y, '', 27, (text, size) => {
            if (!text) return;

            const item = {
                text,
                name: '',
                size,
                x,
                y,
                date: selectedDate
            };

            createTextElement(item);
        });
    }

    const noTypeZone = 'button, input, select, textarea, a, .text-container, .header, .messy-title, .button-container';

    // Disco ball on click/drag
    let isMouseDown = false;
    let lastPlaceTime = 0;

    function placeDisco(x, y) {
        const discoball = document.createElement('div');
        discoball.className = 'placed-disco';
        discoball.innerHTML = `<img src="${discoballGif}" alt="disco">`;
        discoball.style.left = x + 'px';
        discoball.style.top = y + 'px';
        document.body.appendChild(discoball);

        setTimeout(() => {
            discoball.style.opacity = '0';
            setTimeout(() => discoball.remove(), 300);
        }, 3000);
    }

    document.addEventListener('mousemove', (e) => {
        if (isMouseDown && !e.target.closest(noTypeZone)) {
            const now = Date.now();
            if (now - lastPlaceTime > 50) {
                placeDisco(e.clientX, e.clientY);
                lastPlaceTime = now;
            }
        }
    });

    document.addEventListener('mousedown', () => {
        isMouseDown = true;
    });

    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest(noTypeZone)) {
            placeDisco(e.clientX, e.clientY);
        }
    });

    // Touch drag for disco balls
    let isTouching = false;

    document.addEventListener('touchstart', (e) => {
        if (e.target.closest(noTypeZone)) return;
        isTouching = true;
        const touch = e.touches[0];
        placeDisco(touch.clientX, touch.clientY);
    });

    document.addEventListener('touchmove', (e) => {
        if (isTouching && !e.target.closest(noTypeZone)) {
            const touch = e.touches[0];
            const now = Date.now();
            if (now - lastPlaceTime > 50) {
                placeDisco(touch.clientX, touch.clientY);
                lastPlaceTime = now;
            }
        }
    });

    document.addEventListener('touchend', () => {
        isTouching = false;
    });

    // Double-click to create text
    document.addEventListener('dblclick', (e) => {
        if (!e.target.closest(noTypeZone)) {
            createTextInput(e.clientX, e.clientY);
        }
    });

    // Touch events - double tap to create text
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    const DOUBLE_TAP_DELAY = 300;
    const DOUBLE_TAP_DISTANCE = 50;

    document.addEventListener('touchend', (e) => {
        if (e.target.closest(noTypeZone)) return;

        const touch = e.changedTouches[0];
        const currentTime = Date.now();
        const timeDiff = currentTime - lastTapTime;
        const distance = Math.sqrt(
            Math.pow(touch.clientX - lastTapX, 2) +
            Math.pow(touch.clientY - lastTapY, 2)
        );

        if (timeDiff < DOUBLE_TAP_DELAY && distance < DOUBLE_TAP_DISTANCE) {
            e.preventDefault();
            createTextInput(touch.clientX, touch.clientY);
        }

        lastTapTime = currentTime;
        lastTapX = touch.clientX;
        lastTapY = touch.clientY;
    });

    // Save content
    async function saveContent() {
        const enteredName = prompt('Enter your name:');
        if (!enteredName) return;

        // Get currently visible texts from DOM
        const visibleTexts = Array.from(document.querySelectorAll('.text-container')).map(container => {
            const textEl = container.querySelector('.placed-text');
            const nameEl = container.querySelector('.text-name');
            const currentName = nameEl.textContent;

            if (!currentName || currentName === enteredName) {
                nameEl.textContent = enteredName;
            }

            return {
                text: textEl.textContent,
                name: nameEl.textContent,
                size: parseInt(textEl.style.fontSize) || 27,
                x: parseInt(container.style.left),
                y: parseInt(container.style.top)
            };
        });

        // Build new data structure: array of date entries
        let newData = Array.isArray(currentSpaceData) ? [...currentSpaceData] : [];

        // Remove existing entry for this date
        newData = newData.filter(entry => entry.date !== selectedDate);

        // Add new entry for this date (only if there are texts)
        if (visibleTexts.length > 0) {
            newData.push({
                date: selectedDate,
                txts: visibleTexts
            });
        }

        // Sort by date
        newData.sort((a, b) => a.date.localeCompare(b.date));

        const content = newData;

        const filename = SPACES_PREFIX + currentSpace + '.json';

        try {
            await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        [filename]: {
                            content: JSON.stringify(content, null, 2)
                        }
                    }
                })
            });

            currentSpaceData = content;
        } catch (error) {
            console.error('Failed to save content:', error);
        }
    }

    // Refresh
    async function handleRefresh() {
        await loadSpace();
    }

    const handleSave = async () => {
        const btn = document.getElementById('save-btn');
        if (btn.disabled) return;

        const originalText = btn.textContent;
        btn.textContent = '💾';
        btn.disabled = true;
        btn.classList.add('spinning');

        await saveContent();

        btn.classList.remove('spinning');
        btn.textContent = originalText;
        btn.disabled = false;
    };

    document.getElementById('save-btn').addEventListener('click', handleSave);
    document.getElementById('save-btn').addEventListener('touchend', (e) => {
        e.preventDefault();
        handleSave();
    });

    document.getElementById('refresh-btn').addEventListener('click', handleRefresh);
    document.getElementById('refresh-btn').addEventListener('touchend', (e) => {
        e.preventDefault();
        handleRefresh();
    });

    // Initialize
    loadSpace();
}
