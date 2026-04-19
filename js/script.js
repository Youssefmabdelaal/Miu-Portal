// Common JavaScript for the application
// This file will contain shared functions and event handlers

// Initialize common functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    highlightCurrentPage();
});

// Function to highlight the current page in navigation
function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    // Get all navigation links
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        // Remove any existing active class
        link.classList.remove('active');
        
        // Get the href attribute and extract the page name
        const href = link.getAttribute('href');
        if (href) {
            const linkPage = href.split('/').pop();
            
            // Check if this link matches the current page
            if (linkPage === currentPage) {
                link.classList.add('active');
            }
        }
    });
}