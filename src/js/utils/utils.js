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