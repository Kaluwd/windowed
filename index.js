// Initialize apps
const apps = [
  'notepad', 'camera', 'explorer', 'browser', 'settings'
];

// Initialize window controls for each app
apps.forEach(app => {
  const appElement = document.getElementById(app);
  if (appElement) {
    makeDraggable(app);
    
    // Add event listeners for window controls
    const minimizeBtn = document.getElementById(`minimize-${app}`);
    const maximizeBtn = document.getElementById(`maximize-${app}`);
    const closeBtn = document.getElementById(`close-${app}`);
    
    if (minimizeBtn) minimizeBtn.addEventListener('click', () => minimizeApp(app));
    if (maximizeBtn) maximizeBtn.addEventListener('click', () => maximizeApp(app));
    if (closeBtn) closeBtn.addEventListener('click', () => closeApp(app));
    
    // Add touch event listeners for mobile
    if (minimizeBtn) minimizeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      minimizeApp(app);
    });
    if (maximizeBtn) maximizeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      maximizeApp(app);
    });
    if (closeBtn) closeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      closeApp(app);
    });
  }
});

// Window management functions
function openApp(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`App with ID ${id} not found`);
    return;
  }
  
  el.style.display = 'block';
  el.style.zIndex = Date.now();
  
  // Bring to front when clicked
  el.addEventListener('click', function() {
    this.style.zIndex = Date.now();
  });
  
  // App-specific initialization
  switch(id) {
    case 'camera':
      startCamera();
      break;
    case 'browser':
      document.getElementById('browserFrame').style.display = 'none';
      document.getElementById('browserContent').style.display = 'block';
      break;
    case 'settings':
      openSettingsTab('appearance');
      updateSystemInfo();
      break;
  }
}

function closeApp(id) {
  const el = document.getElementById(id);
  if (!el) return;
  
  el.style.display = 'none';
  el.classList.remove('maximized');
  
  // Stop camera when closing
  if (id === 'camera') {
    const video = document.getElementById('video');
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
  }
}

function minimizeApp(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function maximizeApp(id) {
  const el = document.getElementById(id);
  if (!el) return;
  
  el.classList.toggle('maximized');
  
  if (el.classList.contains('maximized')) {
    // Store original position and size
    el.dataset.originalTop = el.style.top;
    el.dataset.originalLeft = el.style.left;
    el.dataset.originalWidth = el.style.width;
    el.dataset.originalHeight = el.style.height;
    
    // Maximize
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = 'calc(100% - 4px)';
    el.style.height = 'calc(100% - 4px)';
  } else {
    // Restore original position and size
    el.style.top = el.dataset.originalTop || '100px';
    el.style.left = el.dataset.originalLeft || '100px';
    el.style.width = el.dataset.originalWidth || '800px';
    el.style.height = el.dataset.originalHeight || '600px';
  }
}

function makeDraggable(id) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const header = document.getElementById(`drag-${id}`);
  if (!header) return;
  
  let isDragging = false;
  let offsetX, offsetY;
  let startX, startY;

  header.addEventListener('mousedown', startDrag);
  header.addEventListener('touchstart', startDrag, { passive: false });

  function startDrag(e) {
    if (el.classList.contains('maximized')) return;
    
    isDragging = true;
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    offsetX = clientX - el.getBoundingClientRect().left;
    offsetY = clientY - el.getBoundingClientRect().top;
    
    startX = clientX;
    startY = clientY;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
    
    if (e.type === 'touchstart') {
      e.preventDefault();
    }
  }

  function drag(e) {
    if (!isDragging) return;
    
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    // Calculate new position
    let newLeft = clientX - offsetX;
    let newTop = clientY - offsetY;
    
    // Constrain to viewport
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - el.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - el.offsetHeight));
    
    el.style.left = newLeft + 'px';
    el.style.top = newTop + 'px';
    
    if (e.type === 'touchmove') {
      e.preventDefault();
    }
  }

  function stopDrag(e) {
    if (!isDragging) return;
    
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
    
    // Check if this was a click (minimal movement)
    if (Math.abs(clientX - startX) < 5 && Math.abs(clientY - startY) < 5) {
      el.style.zIndex = Date.now();
    }
    
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
  }
}

// Notepad functions
function saveNote() {
  const content = document.getElementById('notepadText').value;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'note.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function loadNote() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,text/plain';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = event => {
      document.getElementById('notepadText').value = event.target.result;
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearNote() {
  document.getElementById('notepadText').value = '';
}

// Camera functions
let currentStream = null;

function startCamera() {
  const video = document.getElementById('video');
  
  if (currentStream) {
    return; // Camera already started
  }
  
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      currentStream = stream;
    })
    .catch(err => {
      console.error('Camera error:', err);
      alert('Could not access camera. Please ensure you\'ve granted permission.');
    });
}

function takePhoto() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('photoCanvas');
  
  if (!video.srcObject) return;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Enable save button
  document.getElementById('savePhotoBtn').disabled = false;
}

function savePhoto() {
  const canvas = document.getElementById('photoCanvas');
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'photo.png';
  a.click();
}

function switchCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  startCamera();
}

// Browser functions
let currentBrowserUrl = '';

function loadUrl() {
  const urlInput = document.getElementById('browserUrl').value.trim();
  if (!urlInput) return;
  
  try {
    // Format URL properly
    let url = urlInput;
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }
    
    // Validate URL
    new URL(url);
    currentBrowserUrl = url;
    
    // Load in iframe
    const iframe = document.getElementById('browserFrame');
    iframe.src = url;
    iframe.style.display = 'block';
    document.getElementById('browserContent').style.display = 'none';
  } catch (e) {
    alert("Invalid URL format. Please include http:// or https://");
  }
}

function browserBack() {
  const iframe = document.getElementById('browserFrame');
  try {
    iframe.contentWindow.history.back();
  } catch (e) {
    console.error("Cannot navigate back:", e);
  }
}

function browserForward() {
  const iframe = document.getElementById('browserFrame');
  try {
    iframe.contentWindow.history.forward();
  } catch (e) {
    console.error("Cannot navigate forward:", e);
  }
}

function browserRefresh() {
  const iframe = document.getElementById('browserFrame');
  iframe.src = iframe.src;
}

function loadQuickUrl(url) {
  document.getElementById('browserUrl').value = url;
  loadUrl();
}

function openCurrentInNewTab() {
  if (currentBrowserUrl) {
    window.open(currentBrowserUrl, '_blank');
  } else {
    alert('Please enter and load a URL first');
  }
}

// File Explorer functions
function loadFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = event => {
      document.getElementById('fileInfo').innerHTML = `
        <p><strong>Name:</strong> ${file.name}</p>
        <p><strong>Type:</strong> ${file.type}</p>
        <p><strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
      `;
      
      if (file.type.startsWith('text/')) {
        document.getElementById('fileContent').textContent = event.target.result;
      } else {
        document.getElementById('fileContent').innerHTML = `
          <p>File preview not available for this file type</p>
        `;
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function saveFile() {
  const content = document.getElementById('fileContent').textContent;
  if (!content) {
    alert('No file content to save');
    return;
  }
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'file.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function createNewFile() {
  document.getElementById('fileInfo').innerHTML = '<p>New file</p>';
  document.getElementById('fileContent').textContent = '';
}

// Setup file drop area
const fileDropArea = document.getElementById('fileDropArea');
if (fileDropArea) {
  fileDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropArea.classList.add('dragover');
  });
  
  fileDropArea.addEventListener('dragleave', () => {
    fileDropArea.classList.remove('dragover');
  });
  
  fileDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropArea.classList.remove('dragover');
    
    if (e.dataTransfer.files.length) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = event => {
        document.getElementById('fileInfo').innerHTML = `
          <p><strong>Name:</strong> ${file.name}</p>
          <p><strong>Type:</strong> ${file.type}</p>
          <p><strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
        `;
        document.getElementById('fileContent').textContent = event.target.result;
      };
      reader.readAsText(file);
    }
  });
}

// Settings functions
function openSettingsTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.settings-tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Deactivate all tab buttons
  document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(`${tabName}-tab`).style.display = 'block';
  
  // Activate selected button
  document.querySelector(`.settings-tabs .tab-btn[onclick*="${tabName}"]`).classList.add('active');
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function toggleWindowTransparency() {
  const windows = document.querySelectorAll('.window');
  const isTransparent = document.getElementById('transparencyToggle').checked;
  
  windows.forEach(window => {
    if (isTransparent) {
      window.classList.add('transparent');
    } else {
      window.classList.remove('transparent');
    }
  });
}

function changeTransparencyLevel() {
  const level = document.getElementById('transparencyLevel').value;
  document.documentElement.style.setProperty('--window-opacity', level / 100);
}

function updateSystemInfo() {
  document.getElementById('browserInfo').textContent = navigator.userAgent;
  document.getElementById('screenInfo').textContent = `${window.screen.width}x${window.screen.height}`;
  
  // Memory info (not all browsers support this)
  if (navigator.deviceMemory) {
    document.getElementById('memoryInfo').textContent = `${navigator.deviceMemory} GB`;
  } else {
    document.getElementById('memoryInfo').textContent = 'Not available';
  }
}

function requestCameraPermission() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(() => {
      alert('Camera permission granted');
    })
    .catch(() => {
      alert('Camera permission denied');
    });
}

function requestLocationPermission() {
  navigator.geolocation.getCurrentPosition(
    () => alert('Location permission granted'),
    () => alert('Location permission denied')
  );
}

function requestNotificationPermission() {
  Notification.requestPermission().then(permission => {
    alert(`Notification permission: ${permission}`);
  });
}

// Background settings functions
function openModal(id) {
  document.getElementById(id).style.display = 'block';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function setSolidColor() {
  const color = document.getElementById('bgColorPicker').value;
  document.body.style.background = color;
  localStorage.setItem('background', JSON.stringify({ type: 'color', value: color }));
}

function setBgFromUrl() {
  const url = document.getElementById('bgImageUrl').value;
  if (!url) return;
  
  document.body.style.backgroundImage = `url('${url}')`;
  document.body.style.backgroundSize = 'cover';
  localStorage.setItem('background', JSON.stringify({ type: 'image-url', value: url }));
}

function setBgFromUpload() {
  const input = document.getElementById('bgImageUpload');
  if (!input.files.length) return;
  
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    document.body.style.backgroundImage = `url('${e.target.result}')`;
    document.body.style.backgroundSize = 'cover';
    localStorage.setItem('background', JSON.stringify({ type: 'image-upload', value: e.target.result }));
  };
  reader.readAsDataURL(file);
}

function setGradientBg() {
  const color1 = document.getElementById('gradientColor1').value;
  const color2 = document.getElementById('gradientColor2').value;
  const direction = document.getElementById('gradientDirection').value;
  
  const gradient = `linear-gradient(${direction}, ${color1}, ${color2})`;
  document.body.style.background = gradient;
  localStorage.setItem('background', JSON.stringify({ 
    type: 'gradient', 
    value: { color1, color2, direction }
  }));
}

// Lock screen functions
function lockScreen() {
  document.getElementById('lockScreen').style.display = 'flex';
  // Bring to front
  document.getElementById('lockScreen').style.zIndex = '9999';
}

function unlockScreen() {
  const password = document.getElementById('lockPassword').value;
  // Simple password check (in a real app, use proper authentication)
  if (password === '1234' || !localStorage.getItem('lockPassword')) {
    document.getElementById('lockScreen').style.display = 'none';
    document.getElementById('lockPassword').value = '';
    
    // If this is the first time, set the password
    if (!localStorage.getItem('lockPassword')) {
      localStorage.setItem('lockPassword', '1234');
    }
  } else {
    alert('Incorrect password');
  }
}

// Initialize the app
function init() {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Load saved background
  const savedBg = localStorage.getItem('background');
  if (savedBg) {
    try {
      const bg = JSON.parse(savedBg);
      switch(bg.type) {
        case 'color':
          document.body.style.background = bg.value;
          break;
        case 'image-url':
          document.body.style.backgroundImage = `url('${bg.value}')`;
          document.body.style.backgroundSize = 'cover';
          break;
        case 'image-upload':
          document.body.style.backgroundImage = `url('${bg.value}')`;
          document.body.style.backgroundSize = 'cover';
          break;
        case 'gradient':
          const { color1, color2, direction } = bg.value;
          document.body.style.background = `linear-gradient(${direction}, ${color1}, ${color2})`;
          break;
      }
    } catch (e) {
      console.error('Error loading background:', e);
    }
  }
  
  // Initialize transparency settings
  const transparencyToggle = document.getElementById('transparencyToggle');
  if (transparencyToggle) {
    transparencyToggle.addEventListener('change', toggleWindowTransparency);
  }
  
  const transparencyLevel = document.getElementById('transparencyLevel');
  if (transparencyLevel) {
    transparencyLevel.addEventListener('input', changeTransparencyLevel);
  }
  
  // Request notification permission
  if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
