// Mobile Menu Toggle
document.querySelector('.nav-toggle').addEventListener('click', function() {
  this.classList.toggle('active');
  document.querySelector('.nav-menu').classList.toggle('active');
});

// Theme Toggle
document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.querySelector('.theme-toggle');
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
  
  // Header Scroll Effect
  const header = document.querySelector('.site-header');
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
}); 