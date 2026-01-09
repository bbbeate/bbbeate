/**
 * Shared cursor module
 * Creates a custom cursor that follows the mouse with smooth animation
 * Two modes:
 *   - 'discoball': shows discoball gif (for empty space)
 *   - 'bird': shows bird png (for clickable elements)
 * Never shows original browser cursor
 */

import discoballGif from './assets/discoball.gif';
import birdPng from './assets/bird.png';

const CURSOR_CONFIG = {
    discoball: {
        src: discoballGif,
        size: 51
    },
    bird: {
        src: birdPng,
        size: 69
    }
};

let cursor = null;
let cursorImg = null;
let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;
let animationId = null;
let currentMode = 'bird';
let isInitialized = false;
let autoDetectEnabled = false;
let styleEl = null;

// Selector for empty space (shows discoball) - everything else shows bird
const EMPTY_SPACE_SELECTOR = '.space, .list-view, body';

// Detect if device is mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window);

function createCursorElement() {
    cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
    `;

    cursorImg = document.createElement('img');
    cursorImg.alt = 'cursor';
    cursorImg.style.cssText = `
        width: 100%;
        height: 100%;
    `;

    cursor.appendChild(cursorImg);
    document.body.appendChild(cursor);
}

function animateCursor() {
    cursorX += (mouseX - cursorX) * 0.2;
    cursorY += (mouseY - cursorY) * 0.2;

    if (cursor) {
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
    }

    animationId = requestAnimationFrame(animateCursor);
}

function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Auto-detect mode: discoball only for empty space, bird for everything else
    if (autoDetectEnabled && !isMobile) {
        // Check if directly on empty space (not on any child element)
        const isEmptySpace = e.target.matches(EMPTY_SPACE_SELECTOR);
        const newMode = isEmptySpace ? 'discoball' : 'bird';
        if (newMode !== currentMode) {
            applyMode(newMode);
        }
    }
}

function applyMode(mode) {
    currentMode = mode;
    const config = CURSOR_CONFIG[mode] || CURSOR_CONFIG.bird;

    cursor.style.display = 'block';
    cursor.style.width = config.size + 'px';
    cursor.style.height = config.size + 'px';
    cursorImg.src = config.src;

    // Always hide browser cursor
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-cursor-style';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
        html, body, *, *::before, *::after { cursor: none !important; }
        *::-webkit-resizer { cursor: none !important; }
        textarea, input, select { cursor: none !important; }
        [style*="cursor"] { cursor: none !important; }
    `;
}

/**
 * Initialize the custom cursor
 * Automatically switches between discoball (empty space) and bird (clickable)
 */
export function initCursor() {
    if (isInitialized) return;
    isInitialized = true;

    // Don't show custom cursor on mobile
    if (isMobile) {
        return;
    }

    autoDetectEnabled = true;
    createCursorElement();
    document.addEventListener('mousemove', handleMouseMove);

    applyMode('discoball');
    animateCursor();
}

/**
 * Manually set cursor mode
 * @param {string} mode - 'discoball' or 'bird'
 */
export function setMode(mode) {
    if (isMobile) return;
    applyMode(mode);
}

/**
 * Get current cursor mode
 * @returns {string} 'discoball' or 'bird'
 */
export function getMode() {
    return currentMode;
}

/**
 * Destroy the custom cursor
 */
export function destroy() {
    if (!isInitialized) return;

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    document.removeEventListener('mousemove', handleMouseMove);

    if (cursor && cursor.parentNode) {
        cursor.remove();
    }

    if (styleEl && styleEl.parentNode) {
        styleEl.remove();
    }

    isInitialized = false;
}

/**
 * Check if running on mobile
 * @returns {boolean}
 */
export function isMobileDevice() {
    return isMobile;
}
