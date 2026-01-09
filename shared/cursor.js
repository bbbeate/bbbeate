/**
 * Shared cursor module
 * Creates a custom cursor that follows the mouse with smooth animation
 * Supports different modes: 'discoball' (default for pointer), 'default', etc.
 */

import discoballGif from './assets/discoball.gif';

const CURSOR_MODES = {
    discoball: {
        src: discoballGif,
        size: 64
    },
    default: {
        src: null,
        size: 0
    }
};

let cursor = null;
let cursorImg = null;
let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;
let animationId = null;
let currentMode = 'default';
let isInitialized = false;

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
        transition: opacity 0.2s;
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

    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';

    animationId = requestAnimationFrame(animateCursor);
}

function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
}

/**
 * Initialize the custom cursor
 * @param {string} mode - Initial cursor mode ('discoball', 'default')
 */
export function initCursor(mode = 'discoball') {
    if (isInitialized) return;
    isInitialized = true;

    // Don't show custom cursor on mobile
    if (isMobile) {
        document.body.style.cursor = 'auto';
        return;
    }

    createCursorElement();
    document.addEventListener('mousemove', handleMouseMove);

    setMode(mode);
    animateCursor();
}

/**
 * Set cursor mode
 * @param {string} mode - Cursor mode ('discoball', 'default')
 */
export function setMode(mode) {
    if (isMobile) return;

    currentMode = mode;
    const config = CURSOR_MODES[mode] || CURSOR_MODES.default;

    if (config.src) {
        cursor.style.display = 'block';
        cursor.style.width = config.size + 'px';
        cursor.style.height = config.size + 'px';
        cursorImg.src = config.src;
        document.body.style.cursor = 'none';
    } else {
        cursor.style.display = 'none';
        document.body.style.cursor = 'auto';
    }
}

/**
 * Get current cursor mode
 * @returns {string} Current mode
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

    document.body.style.cursor = 'auto';
    isInitialized = false;
}

/**
 * Check if running on mobile
 * @returns {boolean}
 */
export function isMobileDevice() {
    return isMobile;
}
