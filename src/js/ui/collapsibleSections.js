import { toggleCollapse } from '../utils/utils.js';

export class CollapsibleSections {
    constructor() {
        // Select all buttons with the class 'collapse-button' that also have a 'data-target' attribute
        this.collapseButtons = document.querySelectorAll(".collapse-button[data-target]");
    }

    initialize() {
        if (!this.collapseButtons.length) {
            console.warn("No collapsible buttons with data-target found.");
            return;
            // Exit if no buttons found
        }

        this.collapseButtons.forEach(button => {
            // Retrieve the target ID from the button's data-target attribute
            const targetId = button.dataset.target;
            // Access data-target attribute

            if (targetId) {
                // Ensure targetId is not empty
                button.addEventListener("click", () => {
                    // Call toggleCollapse with the dynamically retrieved ID
                    toggleCollapse(button, targetId);
                });
            } else {
                // Optional: Warn if a button has the class but an empty data-target
                console.warn(`Button with ID "${button.id || 'N/A'}" has an empty data-target attribute.`);
            }
        }
        );
    }
}