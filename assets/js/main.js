// Consolidated DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
  // Mobile Menu Toggle - with null check
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
  }

  // Initialize theme from localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark-mode') {
    document.documentElement.classList.add('dark-mode');
  }
  
  const themeToggle = document.querySelector('.theme-toggle');
  
  if (!themeToggle) {
    console.warn('🎨 Theme toggle not found');
    // Don't return here, continue with other functionality
  } else {
    const icon = themeToggle.querySelector('i');
    
    // Set initial icon based on theme
    if (document.documentElement.classList.contains('dark-mode')) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    }
    
    themeToggle.addEventListener('click', function() {
      document.documentElement.classList.toggle('dark-mode');
      
      if (document.documentElement.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark-mode');
      } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light-mode');
      }
    });
  }
  
  // Header Scroll Effect
  const header = document.querySelector('.site-header');
  
  if (header) {
    let lastScrollY = window.scrollY;
    
    // Function to update header on scroll
    function updateHeaderOnScroll() {
      // At top of page - more transparent
      if (window.scrollY < 10) {
        header.style.backgroundColor = 'rgba(var(--header-bg-rgb), 0.5)';
        header.style.backdropFilter = 'blur(7px)';
        header.style.boxShadow = 'none';
      } 
      // Scrolled down - more opaque
      else {
        header.style.backgroundColor = 'rgba(var(--header-bg-rgb), 0.85)';
        header.style.backdropFilter = 'blur(15px)';
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
      }
      
      lastScrollY = window.scrollY;
    }
    
    // Initial call
    updateHeaderOnScroll();
    
    // Add scroll event listener
    window.addEventListener('scroll', updateHeaderOnScroll);
  } else {
    console.warn('🎨 Header not found');
  }

  // Header Search Functionality
  initializeHeaderSearch();
  
  // Mobile Search Functionality  
  console.log('📱 About to initialize mobile search...');
  initializeMobileSearch();
  
  console.log('✅ All initialization complete!');
});

// Header Search Implementation
function initializeHeaderSearch() {
  console.log('🔍 Initializing header search...');
  
  const searchToggle = document.querySelector('.search-toggle');
  const searchExpandable = document.querySelector('.header-search-expandable');
  const searchInput = document.getElementById('header-search-input');
  const clearButton = document.getElementById('header-clear-search');
  const searchResults = document.getElementById('header-search-results');
  
  console.log('🔍 Search elements found:', {
    searchToggle: !!searchToggle,
    searchExpandable: !!searchExpandable,
    searchInput: !!searchInput,
    clearButton: !!clearButton,
    searchResults: !!searchResults
  });
  
  if (!searchToggle || !searchExpandable || !searchInput) {
    console.warn('🔍 Search elements not found, exiting header search initialization');
    return; // Exit if elements don't exist
  }
  
  let headerSearchInstance = null;
  let isSearchExpanded = false;
  
  // Initialize Simple Jekyll Search for header
  function initHeaderSearch() {
    if (typeof SimpleJekyllSearch !== 'undefined' && !headerSearchInstance) {
      console.log('🔍 Initializing Simple Jekyll Search...');
      const searchJsonUrl = (window.siteConfig?.baseurl || '') + '/blog/search.json';
      headerSearchInstance = SimpleJekyllSearch({
        searchInput: searchInput,
        resultsContainer: searchResults,
        json: searchJsonUrl,
        searchResultTemplate: '<div class="search-result-item"><h4><a href="{url}">{title}</a></h4><p>{excerpt}</p><div class="search-date">{date}</div></div>',
        noResultsText: '<div class="no-search-results">No results found</div>',
        limit: 8,
        fuzzy: false,
        exclude: ['date']
      });
    } else {
      console.warn('🔍 SimpleJekyllSearch not available');
    }
  }
  
  // Toggle search expansion
  searchToggle.addEventListener('click', function(e) {
    console.log('🔍 Search toggle clicked!');
    e.preventDefault();
    e.stopPropagation();
    
    isSearchExpanded = !isSearchExpanded;
    console.log('🔍 Search expanded state:', isSearchExpanded);
    
    if (isSearchExpanded) {
      // Expand search
      console.log('🔍 Expanding search...');
      searchToggle.classList.add('active');
      searchExpandable.classList.add('expanded');
      document.body.classList.add('search-expanded');
      
      // Initialize search if not already done
      if (!headerSearchInstance) {
        initHeaderSearch();
      }
      
      // Focus on input after animation
      setTimeout(() => {
        searchInput.focus();
        console.log('🔍 Search input focused');
      }, 200);
    } else {
      // Collapse search
      console.log('🔍 Collapsing search...');
      collapseHeaderSearch();
    }
  });
  
  // Handle input changes
  searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    
    if (query.length > 0) {
      if (clearButton) {
        clearButton.style.display = 'flex';
      }
      // Show results container immediately and add show class for animation
      searchResults.style.display = 'block';
      setTimeout(() => {
        searchResults.classList.add('show');
      }, 10);
    } else {
      if (clearButton) {
        clearButton.style.display = 'none';
      }
      // Hide results with animation
      searchResults.classList.remove('show');
      setTimeout(() => {
        searchResults.style.display = 'none';
      }, 300);
    }
  });
  
  // Clear search functionality
  if (clearButton) {
    clearButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      searchInput.value = '';
      
      // Hide results with animation
      searchResults.classList.remove('show');
      setTimeout(() => {
        searchResults.style.display = 'none';
      }, 300);
      
      clearButton.style.display = 'none';
      searchInput.focus();
    });
  }
  
  // Handle keyboard navigation
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      collapseHeaderSearch();
    }
  });
  
  // Close search when clicking outside
  document.addEventListener('click', function(e) {
    if (isSearchExpanded && 
        !searchExpandable.contains(e.target) && 
        !searchToggle.contains(e.target)) {
      collapseHeaderSearch();
    }
  });
  
  // Prevent search from closing when clicking inside
  searchExpandable.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  // Function to collapse search - updated for new design
  function collapseHeaderSearch() {
    console.log('🔍 Collapsing header search...');
    isSearchExpanded = false;
    searchToggle.classList.remove('active');
    searchExpandable.classList.remove('expanded');
    document.body.classList.remove('search-expanded');
    
    // Hide results with animation
    searchResults.classList.remove('show');
    setTimeout(() => {
      searchResults.style.display = 'none';
    }, 300);
    
    searchInput.value = '';
    if (clearButton) {
      clearButton.style.display = 'none';
    }
    searchInput.blur();
  }
  
  console.log('🔍 Header search initialization complete!');
}

// Mobile Search Implementation
function initializeMobileSearch() {
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const mobileClearButton = document.getElementById('mobile-clear-search');
  const mobileSearchResults = document.getElementById('mobile-search-results');
  
  if (!mobileSearchInput) {
    return; // Exit if elements don't exist
  }
  
  let mobileSearchInstance = null;
  
  // Initialize Simple Jekyll Search for mobile
  function initMobileSearch() {
    if (typeof SimpleJekyllSearch !== 'undefined' && !mobileSearchInstance) {
      const searchJsonUrl = (window.siteConfig?.baseurl || '') + '/blog/search.json';
      mobileSearchInstance = SimpleJekyllSearch({
        searchInput: mobileSearchInput,
        resultsContainer: mobileSearchResults,
        json: searchJsonUrl,
        searchResultTemplate: '<div class="search-result-item"><h4><a href="{url}">{title}</a></h4><p>{excerpt}</p><div class="search-date">{date}</div></div>',
        noResultsText: '<div class="no-search-results">No results found</div>',
        limit: 6,
        fuzzy: false,
        exclude: ['date']
      });
    }
  }
  
  // Initialize mobile search on first input
  mobileSearchInput.addEventListener('focus', function() {
    if (!mobileSearchInstance) {
      initMobileSearch();
    }
  });
  
  // Handle mobile input changes
  mobileSearchInput.addEventListener('input', function() {
    const query = this.value.trim();
    
    if (query.length > 0) {
      if (mobileClearButton) {
        mobileClearButton.style.display = 'flex';
      }
      if (mobileSearchResults) {
        mobileSearchResults.style.display = 'block';
      }
    } else {
      if (mobileClearButton) {
        mobileClearButton.style.display = 'none';
      }
      if (mobileSearchResults) {
        mobileSearchResults.style.display = 'none';
      }
    }
  });
  
  // Clear mobile search
  if (mobileClearButton) {
    mobileClearButton.addEventListener('click', function(e) {
      e.preventDefault();
      mobileSearchInput.value = '';
      if (mobileSearchResults) {
        mobileSearchResults.style.display = 'none';
      }
      mobileClearButton.style.display = 'none';
      mobileSearchInput.focus();
    });
  }
  
  // Close mobile search results when clicking outside
  document.addEventListener('click', function(e) {
    if (mobileSearchResults && 
        !mobileSearchInput.contains(e.target) && 
        !mobileSearchResults.contains(e.target)) {
      mobileSearchResults.style.display = 'none';
    }
  });
} 