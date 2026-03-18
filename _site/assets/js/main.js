// Search functionality
let searchIndex;

// Initialize Lunr search index
const initSearch = () => {
    if (typeof searchData === 'undefined') {
        console.error('Search data not loaded');
        return;
    }
    
    searchIndex = lunr(function() {
        this.field('title', { boost: 10 });
        this.field('content');
        this.ref('url');

        searchData.docs.forEach(doc => {
            this.add(doc);
        });
    });
};

// Initialize search when search data is loaded
document.addEventListener('DOMContentLoaded', initSearch);

// Handle search input
const searchButton = document.querySelector('.search-button');
const searchInput = document.querySelector('.search-input');

if (searchButton && searchInput) {
    const handleSearch = () => {
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `/pages/search?q=${encodeURIComponent(query)}`;
        }
    };

    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}

// Update search results handling
if (window.location.pathname.includes('/pages/search')) {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    
    if (query) {
        document.getElementById('search-info').textContent = `Search results for: "${query}"`;
        
        if (searchIndex) {
            const results = searchIndex.search(query);
            
            if (results.length > 0) {
                const resultsHtml = results.map(result => {
                    const doc = searchData.docs.find(d => d.url === result.ref);
                    return `
                        <div class="result-item">
                            <h2><a href="${doc.url}">${doc.title}</a></h2>
                            <p class="result-excerpt">${doc.content.substring(0, 200)}...</p>
                        </div>
                    `;
                }).join('');
                document.getElementById('results-container').innerHTML = resultsHtml;
            } else {
                document.getElementById('results-container').innerHTML = `
                    <div class="result-item">
                        <h2>No results found</h2>
                        <p class="result-excerpt">No matching content found for "${query}". Please try different search terms.</p>
                    </div>
                `;
            }
        }
    } else {
        document.getElementById('search-info').textContent = 'Please enter a search term';
    }
}

// Mobile menu toggle
const mobileMenuButton = document.createElement('button');
mobileMenuButton.className = 'mobile-menu-toggle';
mobileMenuButton.setAttribute('aria-label', 'Toggle menu');
mobileMenuButton.innerHTML = '☰';
document.querySelector('.header-content').prepend(mobileMenuButton);

mobileMenuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const nav = document.querySelector('.main-nav');
    const isExpanding = !nav.classList.contains('active');
    nav.classList.toggle('active');
    mobileMenuButton.innerHTML = isExpanding ? '✕' : '☰';
    
    if (isExpanding) {
        nav.querySelector('.search-input')?.focus();
    }
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const nav = document.querySelector('.main-nav');
    const button = document.querySelector('.mobile-menu-toggle');
    if (nav.classList.contains('active') && 
        !nav.contains(e.target) && 
        !button.contains(e.target)) {
        nav.classList.remove('active');
    }
});
