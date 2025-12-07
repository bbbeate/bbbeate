const cursor = document.querySelector('.custom-cursor');
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
    isTouching = true;
    const touch = e.touches[0];
    placeDisco(touch.clientX, touch.clientY);
});

document.addEventListener('touchmove', (e) => {
    if (isTouching) {
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

function createTextInput(x, y) {
    // Create input box at click location
    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.className = 'text-input';
    inputBox.style.left = x + 'px';
    inputBox.style.top = y + 'px';
    
    // Use native mobile keyboard if available
    if (isMobile) {
        inputBox.setAttribute('autocapitalize', 'sentences');
        inputBox.setAttribute('autocorrect', 'on');
    }
    
    document.body.appendChild(inputBox);
    inputBox.focus();
    
    let isHandled = false;
    
    inputBox.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            isHandled = true;
            const text = inputBox.value.trim();
            if (text && userName) {
                const container = document.createElement('div');
                container.className = 'text-container';
                container.style.left = x + 'px';
                container.style.top = y + 'px';
                
                const nameLabel = document.createElement('div');
                nameLabel.className = 'text-name';
                nameLabel.textContent = userName;
                
                const textElement = document.createElement('div');
                textElement.className = 'placed-text';
                textElement.textContent = text;
                
                container.appendChild(nameLabel);
                container.appendChild(textElement);
                
                // Make text editable on click
                textElement.addEventListener('click', (clickEvent) => {
                    clickEvent.stopPropagation();
                    const editInput = document.createElement('input');
                    editInput.type = 'text';
                    editInput.className = 'text-input';
                    editInput.value = textElement.textContent;
                    editInput.style.left = container.style.left;
                    editInput.style.top = container.style.top;
                    document.body.appendChild(editInput);
                    editInput.focus();
                    editInput.select();
                    
                    let isEditHandled = false;
                    
                    editInput.addEventListener('keydown', (editEvent) => {
                        if (editEvent.key === 'Enter') {
                            isEditHandled = true;
                            const newText = editInput.value.trim();
                            if (newText) {
                                textElement.textContent = newText;
                            } else {
                                container.remove();
                            }
                            if (editInput.parentNode) editInput.remove();
                        } else if (editEvent.key === 'Escape') {
                            isEditHandled = true;
                            if (editInput.parentNode) editInput.remove();
                        }
                    });
                    
                    editInput.addEventListener('blur', () => {
                        if (!isEditHandled && editInput.parentNode) {
                            editInput.remove();
                        }
                    });
                });
                
                document.body.appendChild(container);
            }
            if (inputBox.parentNode) inputBox.remove();
        } else if (event.key === 'Escape') {
            isHandled = true;
            if (inputBox.parentNode) inputBox.remove();
        }
    });
    
    inputBox.addEventListener('blur', () => {
        if (!isHandled && inputBox.parentNode) {
            inputBox.remove();
        }
    });
}

document.addEventListener('dblclick', (e) => {
    createTextInput(e.clientX, e.clientY);
});

function placeDisco(x, y) {
    const discoball = document.createElement('div');
    discoball.className = 'placed-disco';
    discoball.innerHTML = '<img src="assets/discoball.gif" alt="disco">';
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
let userName = localStorage.getItem('space-username') || null;

// Load saved content on page load
async function loadContent() {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`);
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
            
            // Make text editable on click (same as before)
            textElement.addEventListener('click', (clickEvent) => {
                clickEvent.stopPropagation();
                const editInput = document.createElement('input');
                editInput.type = 'text';
                editInput.className = 'text-input';
                editInput.value = textElement.textContent;
                editInput.style.left = container.style.left;
                editInput.style.top = container.style.top;
                document.body.appendChild(editInput);
                editInput.focus();
                editInput.select();
                
                let isEditHandled = false;
                
                editInput.addEventListener('keydown', (editEvent) => {
                    if (editEvent.key === 'Enter') {
                        isEditHandled = true;
                        const newText = editInput.value.trim();
                        if (newText) {
                            textElement.textContent = newText;
                        } else {
                            container.remove();
                        }
                        if (editInput.parentNode) editInput.remove();
                    } else if (editEvent.key === 'Escape') {
                        isEditHandled = true;
                        if (editInput.parentNode) editInput.remove();
                    }
                });
                
                editInput.addEventListener('blur', () => {
                    if (!isEditHandled && editInput.parentNode) {
                        editInput.remove();
                    }
                });
            });
            
            document.body.appendChild(container);
        });
    } catch (error) {
        console.error('Failed to load content:', error);
    }
}

// Save content to gist
async function saveContent() {
    if (!userName) {
        userName = prompt('Enter your name:');
        if (!userName) return;
        localStorage.setItem('space-username', userName);
    }
    
    const texts = Array.from(document.querySelectorAll('.text-container')).map(container => {
        const textEl = container.querySelector('.placed-text');
        const nameEl = container.querySelector('.text-name');
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
document.getElementById('save-btn').addEventListener('click', () => {
    saveContent();
    const btn = document.getElementById('save-btn');
    btn.textContent = '✓ Saved';
    setTimeout(() => btn.textContent = '💾 Save', 1500);
});

// Load content on page load
loadContent();
