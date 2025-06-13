import { CollapsibleSections } from './js/ui/collapsibleSections.js'; 

async function initializeApp() {
    console.log("Loading site...");

    try {
        // --- Initialize Page-Specific Components ---
        const pagePath = window.location.pathname; // Get path for context if needed
        console.log("Current page path:", pagePath);
        
        // Initialize Collapsible Sections if the container exists on the current page
        if (document.querySelector('.collapse-button-container')) {
            console.log("Initializing collapsibleSections.js");
            const collapsibleSections = new CollapsibleSections();
            collapsibleSections.initialize();
            console.log("collapsibleSections.js initialized");
        }

        console.log("Site loaded!");

    } catch (error) {
        console.error("Site load failed:", error);
        // Display a simple error message to the user
        const body = document.querySelector('body');
        if (body) {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "Error loading site. See console for details.";
            body.prepend(errorMsg);
        }
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);