const browserApp = {
  loadUrl: function() {
    const urlInput = document.getElementById('browserUrl').value.trim();
    if (!urlInput) return;
    
    const browserContent = document.getElementById('browserContent');
    
    // Validate URL
    let url;
    try {
      // Add https:// if not present
      url = urlInput.includes('://') ? urlInput : `https://${urlInput}`;
      new URL(url); // This will throw if invalid
    } catch (e) {
      browserContent.innerHTML = 'Invalid URL. Please enter a valid web address (e.g., example.com)';
      return;
    }
    
    // Create iframe
    browserContent.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '0.5rem';
    
    // Handle iframe errors
    iframe.onerror = () => {
      browserContent.innerHTML = 'Could not load this website. It may be blocked or unavailable.';
    };
    
    browserContent.appendChild(iframe);
  }
};
