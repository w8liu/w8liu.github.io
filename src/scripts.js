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
        
        // Initialize Theme Toggle for Homepage
        setupThemeToggle('homeLightModeToggle', 'homeThemeLabel');

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

// --- Shared UI Logic ---
export function setupThemeToggle(toggleId, labelId) {
    const toggle = document.getElementById(toggleId);
    const label = document.getElementById(labelId);

    if (toggle) {
        const updateState = () => {
            document.body.classList.toggle('light-mode', toggle.checked);
            if (label) label.textContent = toggle.checked ? 'Light Mode' : 'Dark Mode';
        };
        
        toggle.addEventListener('change', updateState);
        // Initialize state based on default check or local storage if added later
        updateState();
    }
}