import discoballGif from './assets/discoball.gif';

const cursor = document.querySelector('.custom-cursor');
const cursorImg = document.getElementById('cursor-img');
cursorImg.src = discoballGif;

let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;
let isMouseDown = false;
let lastPlaceTime = 0;

// Detect if device is mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || ('ontouchstart' in window);

// Hide custom cursor on mobile
if (isMobile) {
    cursor.style.display = 'none';
    document.body.style.cursor = 'auto';
}

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Place disco balls while dragging
    if (isMouseDown) {
        const now = Date.now();
        if (now - lastPlaceTime > 50) { // Place every 50ms while dragging
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
    placeDisco(e.clientX, e.clientY);
});

// Mobile touch drawing
let isTouching = false;

document.addEventListener('touchstart', (e) => {
    // Don't place disco balls if touching a button or input
    if (e.target.closest('button, input, .text-container')) {
        return;
    }
    isTouching = true;
    const touch = e.touches[0];
    placeDisco(touch.clientX, touch.clientY);
});

document.addEventListener('touchmove', (e) => {
    if (isTouching) {
        // Don't place disco balls if over a button
        if (e.target.closest('button, input')) {
            return;
        }
        e.preventDefault(); // Prevent scrolling while drawing
        const touch = e.touches[0];
        const now = Date.now();
        if (now - lastPlaceTime > 50) {
            placeDisco(touch.clientX, touch.clientY);
            lastPlaceTime = now;
        }
    }
});

document.addEventListener('touchend', (e) => {
    isTouching = false;
});

// Double tap detection for mobile
let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;
const DOUBLE_TAP_DELAY = 300; // milliseconds
const DOUBLE_TAP_DISTANCE = 50; // pixels

document.addEventListener('touchend', (e) => {
    // Don't trigger double-tap for buttons or inputs
    if (e.target.closest('button, input, .text-container')) {
        return;
    }
    
    const touch = e.changedTouches[0];
    const currentTime = Date.now();
    const timeDiff = currentTime - lastTapTime;
    const distance = Math.sqrt(
        Math.pow(touch.clientX - lastTapX, 2) + 
        Math.pow(touch.clientY - lastTapY, 2)
    );
    
    if (timeDiff < DOUBLE_TAP_DELAY && distance < DOUBLE_TAP_DISTANCE) {
        // Double tap detected
        e.preventDefault();
        createTextInput(touch.clientX, touch.clientY);
    }
    
    lastTapTime = currentTime;
    lastTapX = touch.clientX;
    lastTapY = touch.clientY;
});

function createEditInput(x, y, initialValue = '', onSave, onCancel) {
    const form = document.createElement('form');
    form.style.position = 'absolute';
    form.style.left = x + 'px';
    form.style.top = y + 'px';
    form.style.transform = 'translate(-50%, -50%)';
    
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'text-input';
    editInput.value = initialValue;
    editInput.style.position = 'static';
    editInput.style.transform = 'none';
    
    if (isMobile) {
        editInput.setAttribute('enterkeyhint', 'done');
    }
    
    form.appendChild(editInput);
    document.body.appendChild(form);
    editInput.focus();
    if (initialValue) editInput.select();
    
    let isHandled = false;
    
    const handleSubmit = () => {
        if (isHandled) return;
        isHandled = true;
        const text = editInput.value.trim();
        if (form.parentNode) form.remove();
        if (onSave) onSave(text);
    };
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmit();
    });
    
    editInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSubmit();
        } else if (event.key === 'Escape') {
            isHandled = true;
            if (form.parentNode) form.remove();
            if (onCancel) onCancel();
        }
    });
    
    editInput.addEventListener('blur', () => {
        setTimeout(() => {
            if (!isHandled && form.parentNode) {
                form.remove();
                if (onCancel) onCancel();
            }
        }, 100);
    });
}

function createTextInput(x, y) {
    createEditInput(x, y, '', (text) => {
        if (!text) return;
        
        const container = document.createElement('div');
        container.className = 'text-container';
        container.style.left = x + 'px';
        container.style.top = y + 'px';
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'text-name';
        nameLabel.textContent = '';
        nameLabel.style.display = 'none'; // Hide until saved
        
        const textElement = document.createElement('div');
        textElement.className = 'placed-text';
        textElement.textContent = text;
        
        container.appendChild(nameLabel);
        container.appendChild(textElement);
        
        // Make text editable on click
        textElement.addEventListener('click', (clickEvent) => {
            clickEvent.stopPropagation();
            
            createEditInput(
                parseInt(container.style.left),
                parseInt(container.style.top),
                textElement.textContent,
                (newText) => {
                    if (newText) {
                        textElement.textContent = newText;
                    } else {
                        container.remove();
                    }
                }
            );
        });
        
        document.body.appendChild(container);
    });
}

document.addEventListener('dblclick', (e) => {
    createTextInput(e.clientX, e.clientY);
});

function placeDisco(x, y) {
    const discoball = document.createElement('div');
    discoball.className = 'placed-disco';
    discoball.innerHTML = `<img src="${discoballGif}" alt="disco">`;
    discoball.style.left = x + 'px';
    discoball.style.top = y + 'px';
    
    document.body.appendChild(discoball);
    
    // Remove after 3 seconds
    setTimeout(() => {
        discoball.style.opacity = '0';
        setTimeout(() => discoball.remove(), 300);
    }, 3000);
}

function animateCursor() {
    // Smooth follow effect
    cursorX += (mouseX - cursorX) * 0.2;
    cursorY += (mouseY - cursorY) * 0.2;
    
    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';
    
    requestAnimationFrame(animateCursor);
}

animateCursor();

// GitHub Gist storage
const GIST_ID = 'c0644353ef70721d4fb81dd8b65b044d';
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GIST_FILENAME = 'space.json';
let userName = null;

// Load saved content on page load
async function loadContent() {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        const gist = await response.json();
        
        // Check if the file exists in the gist
        if (!gist.files || !gist.files[GIST_FILENAME]) {
            console.log('No saved content found');
            return;
        }
        
        const content = JSON.parse(gist.files[GIST_FILENAME].content);
        
        // Restore text elements
        content.txts.forEach(item => {
            const container = document.createElement('div');
            container.className = 'text-container';
            container.style.left = item.x + 'px';
            container.style.top = item.y + 'px';
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'text-name';
            nameLabel.textContent = item.name;
            
            const textElement = document.createElement('div');
            textElement.className = 'placed-text';
            textElement.textContent = item.text;
            
            container.appendChild(nameLabel);
            container.appendChild(textElement);
            
            // Make text editable on click
            textElement.addEventListener('click', (clickEvent) => {
                clickEvent.stopPropagation();
                
                createEditInput(
                    parseInt(container.style.left),
                    parseInt(container.style.top),
                    textElement.textContent,
                    (newText) => {
                        if (newText) {
                            textElement.textContent = newText;
                        } else {
                            container.remove();
                        }
                    }
                );
            });
            
            document.body.appendChild(container);
        });
    } catch (error) {
        console.error('Failed to load content:', error);
    }
}

// Save content to gist
async function saveContent() {
    const enteredName = prompt('Enter your name:');
    if (!enteredName) return;
    
    const texts = Array.from(document.querySelectorAll('.text-container')).map(container => {
        const textEl = container.querySelector('.placed-text');
        const nameEl = container.querySelector('.text-name');
        const currentName = nameEl.textContent;
        
        // Only update name if it's empty or matches entered name
        if (!currentName || currentName === enteredName) {
            nameEl.textContent = enteredName;
            nameEl.style.display = ''; // Show name after saving
        }
        
        return {
            text: textEl.textContent,
            name: nameEl.textContent,
            x: parseInt(container.style.left),
            y: parseInt(container.style.top)
        };
    });
    
    const content = { txts: texts };
    
    try {
        await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [GIST_FILENAME]: {
                        content: JSON.stringify(content, null, 2)
                    }
                }
            })
        });
    } catch (error) {
        console.error('Failed to save content:', error);
    }
}

// Manual save button
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

// Refresh button - show disco balls and reload content
const handleRefresh = async () => {
    const centerX = window.innerWidth / 2 + window.scrollX;
    const centerY = window.innerHeight / 2 + window.scrollY;
    
    // Create three large disco balls in center
    [-150, 0, 150].forEach((offset, index) => {
        setTimeout(() => {
            const largeDisco = document.createElement('div');
            largeDisco.className = 'placed-disco';
            largeDisco.style.width = '200px';
            largeDisco.style.height = '200px';
            largeDisco.innerHTML = `<img src="${discoballGif}" alt="disco" style="width: 100%; height: 100%;">`;
            largeDisco.style.left = (centerX + offset) + 'px';
            largeDisco.style.top = centerY + 'px';
            largeDisco.style.position = 'absolute';
            largeDisco.style.transform = 'translate(-50%, -50%)';
            
            document.body.appendChild(largeDisco);
            
            // Remove after 3 seconds
            setTimeout(() => {
                largeDisco.style.opacity = '0';
                setTimeout(() => largeDisco.remove(), 300);
            }, 3000);
        }, index * 100);
    });
    
    // Clear existing text containers
    document.querySelectorAll('.text-container').forEach(el => el.remove());
    
    // Reload content from gist
    await loadContent();
};

document.getElementById('refresh-btn').addEventListener('click', handleRefresh);
document.getElementById('refresh-btn').addEventListener('touchend', (e) => {
    e.preventDefault();
    handleRefresh();
});

// Load content on page load
loadContent();
