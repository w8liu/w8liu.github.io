/**
 * Toggles the visibility of a collapsible content element and the active state of its button.
 * @param {HTMLElement} button The button element that was clicked.
 * @param {string} targetId The ID of the content element to toggle.
 */
export function toggleCollapse(button, targetId) {
    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
        console.error(`Target element with ID "${targetId}" not found.`);
        return;
    }

    if (!button) {
        console.error(`Button element not provided for target "${targetId}".`);
        return;
    }

    // Toggle the 'active' class on the button (for the arrow rotation)
    button.classList.toggle('active');

    // Toggle the 'show' class on the content div (for display and transitions)
    targetElement.classList.toggle('show');

    // Optional: Add ARIA attributes for accessibility
    const isExpanded = button.classList.contains('active');
    button.setAttribute('aria-expanded', isExpanded);
    targetElement.setAttribute('aria-hidden', !isExpanded);
}

/**
 * Escapes HTML special characters in a string.
 * @param {*} unsafe The input value. If not a string, it's returned as is.
 * @returns {string} The escaped string or the original value if not a string.
 */
export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe; // Return non-strings as is
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

 /**
  * Creates a debounced function that delays invoking func until after wait milliseconds
  * have elapsed since the last time the debounced function was invoked.
  * @param {Function} func The function to debounce.
  * @param {number} wait The number of milliseconds to delay.
  * @returns {Function} Returns the new debounced function.
  */
 export function debounce(func, wait) {
   let timeout;
   return function executedFunction(...args) {
     // The function to be executed after the debounce time
     const later = () => {
       clearTimeout(timeout);
       // Call the original function with the correct 'this' context and arguments
       func.apply(this, args);
     };
     // Clear the previous timeout timer
     clearTimeout(timeout);
     // Set a new timeout timer
     timeout = setTimeout(later, wait);
   };
 }

 /**
  * Sets up an event listener for a toggle switch (e.g., a checkbox).
  * @param {HTMLInputElement} switchElement The switch input element.
  * @param {Function} onStateChangeCallback A callback function that is called when the switch state changes.
  *                                         It receives the new checked state (boolean) as an argument.
  */
 export function setupToggleSwitch(switchElement, onStateChangeCallback) {
    if (!switchElement || typeof switchElement.addEventListener !== 'function') {
        console.error("Invalid switch element provided for setupToggleSwitch.");
        return;
    }
    switchElement.addEventListener('change', () => {
        onStateChangeCallback(switchElement.checked);
    });
 }
