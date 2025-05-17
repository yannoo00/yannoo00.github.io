// Category and Archive scroll functionality

document.addEventListener('DOMContentLoaded', function() {
  // If there's a hash in the URL, scroll to that element
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const element = document.getElementById(hash);
    
    if (element) {
      // Wait a moment for page to load fully
      setTimeout(function() {
        window.scrollTo({
          top: element.offsetTop - 20,
          behavior: 'smooth'
        });
      }, 100);
    }
  }
});
