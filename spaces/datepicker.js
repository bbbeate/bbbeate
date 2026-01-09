/**
 * Simple custom date picker
 * Easy to replace with a library later - just export the same interface
 */

export function createDatePicker(container, { onDateChange, getPostCountForDate }) {
    let currentDate = new Date();
    let selectedDate = new Date();
    let isOpen = false;

    // Create elements
    const wrapper = document.createElement('div');
    wrapper.className = 'datepicker';

    const display = document.createElement('button');
    display.className = 'datepicker-display';
    display.type = 'button';

    const dropdown = document.createElement('div');
    dropdown.className = 'datepicker-dropdown';

    wrapper.appendChild(display);
    wrapper.appendChild(dropdown);
    container.appendChild(wrapper);

    // Format date as YYYY-MM-DD using local time
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Format for display
    function formatDisplayDate(date) {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        });
    }

    // Update display button
    function updateDisplay() {
        const count = getPostCountForDate ? getPostCountForDate(formatDate(selectedDate)) : 0;
        display.innerHTML = `
            <span class="datepicker-date">${formatDisplayDate(selectedDate)}</span>
            ${count > 0 ? `<span class="datepicker-count">${count}</span>` : ''}
        `;
    }

    // Render calendar
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay() || 7; // Monday = 1

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        let html = `
            <div class="datepicker-header">
                <button type="button" class="datepicker-nav" data-action="prev">←</button>
                <span class="datepicker-month">${monthNames[month]} ${year}</span>
                <button type="button" class="datepicker-nav" data-action="next">→</button>
            </div>
            <div class="datepicker-weekdays">
                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
            </div>
            <div class="datepicker-days">
        `;

        // Empty cells before first day
        for (let i = 1; i < startDay; i++) {
            html += '<span class="datepicker-day empty"></span>';
        }

        // Days of month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            const dateStr = formatDate(date);
            const isSelected = formatDate(selectedDate) === dateStr;
            const isToday = formatDate(new Date()) === dateStr;
            const postCount = getPostCountForDate ? getPostCountForDate(dateStr) : 0;

            let classes = 'datepicker-day';
            if (isSelected) classes += ' selected';
            if (isToday) classes += ' today';
            if (postCount > 0) classes += ' has-posts';

            html += `<span class="${classes}" data-date="${dateStr}">${day}</span>`;
        }

        html += '</div>';
        dropdown.innerHTML = html;

        // Add event listeners
        dropdown.querySelectorAll('.datepicker-nav').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (btn.dataset.action === 'prev') {
                    currentDate.setMonth(currentDate.getMonth() - 1);
                } else {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }
                renderCalendar();
            });
        });

        dropdown.querySelectorAll('.datepicker-day:not(.empty)').forEach(day => {
            day.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedDate = new Date(day.dataset.date);
                currentDate = new Date(selectedDate);
                close();
                updateDisplay();
                if (onDateChange) onDateChange(formatDate(selectedDate));
            });
        });
    }

    // Open/close
    function open() {
        isOpen = true;
        dropdown.classList.add('open');
        renderCalendar();
    }

    function close() {
        isOpen = false;
        dropdown.classList.remove('open');
    }

    function toggle() {
        if (isOpen) close();
        else open();
    }

    // Event listeners
    display.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            close();
        }
    });

    // Public interface
    updateDisplay();

    return {
        getValue: () => formatDate(selectedDate),
        setValue: (dateStr) => {
            selectedDate = new Date(dateStr);
            currentDate = new Date(selectedDate);
            updateDisplay();
        },
        refresh: () => {
            updateDisplay();
            if (isOpen) renderCalendar();
        },
        destroy: () => {
            wrapper.remove();
        }
    };
}
