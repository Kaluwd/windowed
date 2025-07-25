// Initialize apps with all available applications
const apps = [
  'notepad', 'camera', 'location', 'explorer', 'clipboard',
  'calculator', 'browser', 'clock', 'terminal', 'settings'
];

// Track active windows and their z-index
let activeWindows = [];
let maxZIndex = 10;
let currentBrowserUrl = '';
let browserHistory = [];
let historyIndex = -1;
let currentStream = null;
let calcValue = '0';
let lastCalculation = null;
let commandHistory = [];
let commandHistoryIndex = -1;

// Initialize the OS when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  initBackground();
  initWindowControls();
  initSystemInfo();
  updateClock();
  requestNotificationPermission();
  
  // Initialize all apps
  apps.forEach(app => {
    makeDraggable(app);
    initWindowControlsForApp(app);
  });
  
  // Set up file drop area
  setupFileDrop();
  
  // Initialize terminal input
  const terminalInput = document.getElementById('terminalInput');
  if (terminalInput) {
    terminalInput.addEventListener('keydown', handleTerminalKey);
  }
});

// Initialize window controls for each app
function initWindowControlsForApp(app) {
  const minimizeBtn = document.getElementById(`minimize-${app}`);
  const maximizeBtn = document.getElementById(`maximize-${app}`);
  const closeBtn = document.getElementById(`close-${app}`);
  
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => minimizeApp(app));
    minimizeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      minimizeApp(app);
    });
  }
  
  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => maximizeApp(app));
    maximizeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      maximizeApp(app);
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeApp(app));
    closeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      closeApp(app);
    });
  }
}

// Window management functions
function openApp(id) {
  const el = document.getElementById(id);
  if (!el) {
    showNotification(`Application ${id} not found`, 'error');
    return;
  }
  
  // Check if window is already open
  if (el.style.display === 'block') {
    bringToFront(id);
    return;
  }
  
  el.style.display = 'block';
  bringToFront(id);
  
  // App-specific initialization
  switch(id) {
    case 'camera':
      startCamera();
      break;
    case 'location':
      getLocation();
      break;
    case 'clock':
      updateClock();
      loadAlarms();
      break;
    case 'explorer':
      updateFileExplorer();
      break;
    case 'settings':
      updateSystemInfo();
      break;
    case 'clipboard':
      showClipboard();
      break;
    case 'terminal':
      document.getElementById('terminalInput').focus();
      break;
  }
  
  // Add to active windows
  if (!activeWindows.includes(id)) {
    activeWindows.push(id);
  }
  
  // Update taskbar item state
  updateTaskbarItemState(id, true);
  
  showNotification(`${id.charAt(0).toUpperCase() + id.slice(1)} opened`);
}

function updateTaskbarItemState(appId, isActive) {
  const taskItems = document.querySelectorAll('.task-item');
  taskItems.forEach(item => {
    if (item.onclick && item.onclick.toString().includes(appId)) {
      if (isActive) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    }
  });
}

function bringToFront(id) {
  const el = document.getElementById(id);
  maxZIndex++;
  el.style.zIndex = maxZIndex;
}

function closeApp(id) {
  const el = document.getElementById(id);
  el.style.display = 'none';
  el.classList.remove('maximized');
  
  // Remove from active windows
  activeWindows = activeWindows.filter(app => app !== id);
  
  // Update taskbar item state
  updateTaskbarItemState(id, false);
  
  // App-specific cleanup
  switch(id) {
    case 'camera':
      stopCamera();
      break;
  }
}

function minimizeApp(id) {
  const el = document.getElementById(id);
  el.style.display = 'none';
  updateTaskbarItemState(id, false);
}

function maximizeApp(id) {
  const el = document.getElementById(id);
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
    el.style.width = '100%';
    el.style.height = 'calc(100vh - 48px)'; // Account for taskbar
  } else {
    // Restore original position and size
    el.style.top = el.dataset.originalTop || '100px';
    el.style.left = el.dataset.originalLeft || '100px';
    el.style.width = el.dataset.originalWidth || '800px';
    el.style.height = el.dataset.originalHeight || '600px';
  }
  
  bringToFront(id);
}

// Draggable window functionality
function makeDraggable(id) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const header = el.querySelector('.header');
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
    
    bringToFront(id);
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
      bringToFront(id);
    }
    
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
  }
}

// Notepad functions
async function saveNote() {
  const content = document.getElementById('notepadText').value;
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        types: [{ description: 'Text Files', accept: {'text/plain': ['.txt']} }]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      showNotification('Note saved successfully');
    } else {
      // Fallback for browsers that don't support File System Access API
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'note.txt';
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Note downloaded as text file');
    }
  } catch (err) {
    console.error('Error saving file:', err);
    showNotification('Error saving file', 'error');
  }
}

async function loadNote() {
  try {
    let file;
    
    if (window.showOpenFilePicker) {
      const [fileHandle] = await window.showOpenFilePicker();
      file = await fileHandle.getFile();
    } else {
      // Fallback for browsers that don't support File System Access API
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,text/plain';
      
      return new Promise((resolve) => {
        input.onchange = async e => {
          file = e.target.files[0];
          const text = await readFileContent(file);
          document.getElementById('notepadText').value = text;
          showNotification('Note loaded successfully');
          resolve();
        };
        input.click();
      });
    }
    
    const text = await file.text();
    document.getElementById('notepadText').value = text;
    showNotification('Note loaded successfully');
  } catch (err) {
    console.error('Error loading file:', err);
    if (err.name !== 'AbortError') {
      showNotification('Error loading file', 'error');
    }
  }
}

function clearNote() {
  document.getElementById('notepadText').value = '';
}

// File Explorer functions
function setupFileDrop() {
  const dropArea = document.getElementById('fileDropArea');
  if (!dropArea) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropArea.classList.add('highlight');
  }

  function unhighlight() {
    dropArea.classList.remove('highlight');
  }

  dropArea.addEventListener('drop', handleDrop, false);

  async function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      const file = files[0];
      await displayFileInfo(file);
      await readFileContent(file, 'fileContent');
    }
  }
}

async function loadFile() {
  try {
    let file;
    
    if (window.showOpenFilePicker) {
      const [fileHandle] = await window.showOpenFilePicker();
      file = await fileHandle.getFile();
    } else {
      // Fallback for browsers that don't support File System Access API
      const input = document.createElement('input');
      input.type = 'file';
      
      return new Promise((resolve) => {
        input.onchange = async e => {
          file = e.target.files[0];
          await displayFileInfo(file);
          await readFileContent(file, 'fileContent');
          resolve();
        };
        input.click();
      });
    }
    
    await displayFileInfo(file);
    await readFileContent(file, 'fileContent');
  } catch (err) {
    console.error('Error loading file:', err);
    if (err.name !== 'AbortError') {
      showNotification('Error loading file', 'error');
    }
  }
}

async function saveFile() {
  const content = document.getElementById('fileContent').textContent;
  if (!content) {
    showNotification('No content to save', 'warning');
    return;
  }
  
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker();
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      showNotification('File saved successfully');
    } else {
      // Fallback for browsers that don't support File System Access API
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'file.txt';
      a.click();
      URL.revokeObjectURL(url);
      showNotification('File downloaded');
    }
  } catch (err) {
    console.error('Error saving file:', err);
    showNotification('Error saving file', 'error');
  }
}

function createNewFile() {
  document.getElementById('fileContent').textContent = '';
  document.getElementById('fileInfo').innerHTML = '<p>New file</p>';
  showNotification('New file created');
}

async function displayFileInfo(file) {
  const fileInfo = document.getElementById('fileInfo');
  if (!fileInfo) return;
  
  fileInfo.innerHTML = `
    <p><strong>Name:</strong> ${file.name}</p>
    <p><strong>Type:</strong> ${file.type || 'unknown'}</p>
    <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
    <p><strong>Last modified:</strong> ${new Date(file.lastModified).toLocaleString()}</p>
  `;
}

async function readFileContent(file, targetElementId = 'fileContent') {
  const target = document.getElementById(targetElementId);
  if (!target) return;
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = event => {
      if (file.type.startsWith('image/')) {
        target.innerHTML = `<img src="${event.target.result}" style="max-width: 100%;" />`;
      } else if (file.type.startsWith('text/') || file.type === '') {
        target.textContent = event.target.result;
      } else {
        target.textContent = `Binary file content (${file.type}) cannot be displayed`;
      }
      resolve();
    };
    
    reader.onerror = () => {
      target.textContent = 'Error reading file';
      reject(new Error('File reading error'));
    };
    
    if (file.type.startsWith('text/') || file.type === '') {
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateFileExplorer() {
  // Could be enhanced to show directory structure
  document.getElementById('fileContent').innerHTML = '<p class="placeholder">Select or drop a file here</p>';
  document.getElementById('fileInfo').innerHTML = '<p>No file selected</p>';
}

// Camera functions
async function startCamera() {
  const video = document.getElementById('video');
  if (!video) return;
  
  if (currentStream) {
    return; // Camera already started
  }
  
  try {
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    currentStream = stream;
    document.getElementById('savePhotoBtn').disabled = true;
  } catch (err) {
    console.error('Camera error:', err);
    const contentDiv = document.getElementById('camera').querySelector('.content');
    contentDiv.innerHTML = `
      <div class="camera-error">
        <p>Could not access camera. Please ensure you've granted permission.</p>
        <button onclick="startCamera()">Try Again</button>
      </div>
    `;
    showNotification('Camera access denied', 'error');
  }
}

function stopCamera() {
  const video = document.getElementById('video');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    currentStream = null;
  }
}

function takePhoto() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('photoCanvas');
  const contentDiv = document.getElementById('camera').querySelector('.content');
  
  if (!video || !video.srcObject) {
    showNotification('Camera not active', 'warning');
    return;
  }
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Show the photo
  const imgUrl = canvas.toDataURL('image/png');
  contentDiv.innerHTML = `
    <img src="${imgUrl}" style="max-width: 100%; border-radius: 0.5rem;" />
    <div class="camera-controls">
      <button onclick="savePhoto('${imgUrl}')" id="savePhotoBtn"><i class="fas fa-save"></i> Save Photo</button>
      <button onclick="startCamera()"><i class="fas fa-redo"></i> Take Another</button>
    </div>
  `;
  
  document.getElementById('savePhotoBtn').disabled = false;
}

async function savePhoto(imgUrl) {
  if (!imgUrl) {
    const canvas = document.getElementById('photoCanvas');
    imgUrl = canvas.toDataURL('image/png');
  }
  
  const a = document.createElement('a');
  a.href = imgUrl;
  a.download = `photo_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  a.click();
  showNotification('Photo saved');
}

async function switchCamera() {
  stopCamera();
  
  // Toggle between front and back camera
  const video = document.getElementById('video');
  const constraints = {
    video: {
      facingMode: video.dataset.facingMode === 'user' ? 'environment' : 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };
  
  video.dataset.facingMode = constraints.video.facingMode;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    currentStream = stream;
  } catch (err) {
    console.error('Error switching camera:', err);
    showNotification('Error switching camera', 'error');
  }
}

// Browser functions
function loadUrl() {
  const urlInput = document.getElementById('browserUrl').value.trim();
  if (!urlInput) return;
  
  const browserContent = document.getElementById('browserContent');
  browserContent.innerHTML = '<div class="browser-message">Loading...</div>';
  
  try {
    // Format URL properly
    let url = urlInput;
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }
    
    // Validate URL
    new URL(url);
    currentBrowserUrl = url;
    
    // Add to history
    browserHistory.push(url);
    historyIndex = browserHistory.length - 1;
    updateBrowserControls();
    
    // Try to embed in iframe (will fail for most sites due to security)
    tryEmbedUrl(url);
  } catch (e) {
    showBrowserError("Invalid URL format. Please include http:// or https://");
  }
}

function loadQuickUrl(url) {
  document.getElementById('browserUrl').value = url;
  loadUrl();
}

function tryEmbedUrl(url) {
  const browserContent = document.getElementById('browserContent');
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  
  // Handle iframe events
  iframe.onload = function() {
    // This may not trigger for cross-origin iframes
    setTimeout(() => {
      try {
        // Try accessing iframe content (will throw if cross-origin)
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc || !iframeDoc.body) {
          throw new Error("Cross-origin frame");
        }
      } catch (e) {
        // If we can't access the iframe content, show fallback
        showBrowserFallback(url);
      }
    }, 1000);
  };
  
  iframe.onerror = function() {
    showBrowserFallback(url);
  };
  
  // Clear and add iframe
  browserContent.innerHTML = '';
  browserContent.appendChild(iframe);
}

function showBrowserFallback(url) {
  const browserContent = document.getElementById('browserContent');
  browserContent.innerHTML = `
    <div class="browser-message">
      <p>This website cannot be embedded due to security restrictions.</p>
      <a href="${url}" target="_blank" class="browser-link">Open ${new URL(url).hostname} in New Tab</a>
      <p class="browser-note">Most modern websites block being embedded in iframes</p>
    </div>
  `;
}

function showBrowserError(message) {
  const browserContent = document.getElementById('browserContent');
  browserContent.innerHTML = `
    <div class="browser-message browser-error">
      <p>${message}</p>
      <p class="browser-note">Example valid URLs: google.com, https://example.com</p>
    </div>
  `;
}

function browserBack() {
  if (historyIndex > 0) {
    historyIndex--;
    const url = browserHistory[historyIndex];
    document.getElementById('browserUrl').value = url;
    tryEmbedUrl(url);
    updateBrowserControls();
  }
}

function browserForward() {
  if (historyIndex < browserHistory.length - 1) {
    historyIndex++;
    const url = browserHistory[historyIndex];
    document.getElementById('browserUrl').value = url;
    tryEmbedUrl(url);
    updateBrowserControls();
  }
}

function browserRefresh() {
  if (currentBrowserUrl) {
    tryEmbedUrl(currentBrowserUrl);
  }
}

function updateBrowserControls() {
  const backBtn = document.querySelector('#browser .browser-toolbar button:nth-child(1)');
  const forwardBtn = document.querySelector('#browser .browser-toolbar button:nth-child(2)');
  
  if (backBtn) backBtn.disabled = historyIndex <= 0;
  if (forwardBtn) forwardBtn.disabled = historyIndex >= browserHistory.length - 1;
}

function openCurrentInNewTab() {
  if (currentBrowserUrl) {
    window.open(currentBrowserUrl, '_blank');
  } else {
    showNotification('Please load a URL first', 'warning');
  }
}

// Settings functions
function openSettingsTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.settings-tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Deactivate all tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab and activate its button
  document.getElementById(`${tabName}-tab`).style.display = 'block';
  document.querySelector(`.tab-btn[onclick="openSettingsTab('${tabName}')"]`).classList.add('active');
}

function setTheme(theme) {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  showNotification(`Theme set to ${theme}`);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
}

// Background customization
function initBackground() {
  const savedBg = localStorage.getItem('background');
  if (savedBg) {
    try {
      const bg = JSON.parse(savedBg);
      applyBackground(bg);
      updateBgPreview(bg);
    } catch (e) {
      console.error('Error loading background:', e);
    }
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    bringToFront(modalId);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

function setSolidColor() {
  const color = document.getElementById('bgColorPicker').value;
  const bg = { type: 'color', value: color };
  applyBackground(bg);
  saveBackground(bg);
  closeModal('bgSettings');
}

function setBgFromUrl() {
  const url = document.getElementById('bgImageUrl').value.trim();
  if (!url) return;
  
  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    showNotification('Invalid URL', 'error');
    return;
  }
  
  const bg = { type: 'image-url', value: url };
  applyBackground(bg);
  saveBackground(bg);
  closeModal('bgSettings');
}

function setBgFromUpload() {
  const input = document.getElementById('bgImageUpload');
  if (!input.files || !input.files[0]) return;
  
  const file = input.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const bg = { type: 'image-data', value: e.target.result };
    applyBackground(bg);
    saveBackground(bg);
    closeModal('bgSettings');
  };
  
  reader.readAsDataURL(file);
}

function setGradientBg() {
  const color1 = document.getElementById('gradientColor1').value;
  const color2 = document.getElementById('gradientColor2').value;
  const direction = document.getElementById('gradientDirection').value;
  
  const bg = {
    type: 'gradient',
    value: {
      color1,
      color2,
      direction
    }
  };
  
  applyBackground(bg);
  saveBackground(bg);
  closeModal('bgSettings');
}

function applyBackground(bg) {
  let bgStyle = '';
  
  switch(bg.type) {
    case 'color':
      bgStyle = bg.value;
      break;
    case 'image-url':
      bgStyle = `url('${bg.value}')`;
      break;
    case 'image-data':
      bgStyle = `url('${bg.value}')`;
      break;
    case 'gradient':
      bgStyle = `linear-gradient(${bg.value.direction}, ${bg.value.color1}, ${bg.value.color2})`;
      break;
    default:
      bgStyle = 'var(--bg)';
  }
  
  document.body.style.background = bgStyle;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundAttachment = 'fixed';
  
  updateBgPreview(bg);
}

function saveBackground(bg) {
  localStorage.setItem('background', JSON.stringify(bg));
}

function updateBgPreview(bg) {
  const preview = document.getElementById('currentBgPreview');
  if (!preview) return;
  
  preview.style.background = getBgStyle(bg);
  preview.style.backgroundSize = 'cover';
  preview.style.backgroundPosition = 'center';
}

function getBgStyle(bg) {
  if (!bg) return 'var(--bg)';
  
  switch(bg.type) {
    case 'color':
      return bg.value;
    case 'image-url':
      return `url('${bg.value}')`;
    case 'image-data':
      return `url('${bg.value}')`;
    case 'gradient':
      return `linear-gradient(${bg.value.direction}, ${bg.value.color1}, ${bg.value.color2})`;
    default:
      return 'var(--bg)';
  }
}

function toggleWindowTransparency() {
  const transparencyToggle = document.getElementById('transparencyToggle');
  const windows = document.querySelectorAll('.window');
  
  windows.forEach(window => {
    if (transparencyToggle.checked) {
      window.style.backgroundColor = 'rgba(var(--window-bg-rgb), 0.9)';
    } else {
      window.style.backgroundColor = 'var(--window-bg)';
    }
  });
}

function changeTransparencyLevel() {
  const level = document.getElementById('transparencyLevel').value / 100;
  const windows = document.querySelectorAll('.window');
  
  windows.forEach(window => {
    window.style.backgroundColor = `rgba(var(--window-bg-rgb), ${level})`;
  });
}

// System information
function initSystemInfo() {
  if (!document.getElementById('systemInfo')) return;
  
  // Browser info
  const browserInfo = document.getElementById('browserInfo');
  if (browserInfo) {
    browserInfo.textContent = getBrowserInfo();
  }
  
  // Screen info
  const screenInfo = document.getElementById('screenInfo');
  if (screenInfo) {
    screenInfo.textContent = `${window.screen.width}x${window.screen.height}`;
  }
  
  // Memory info (if supported)
  const memoryInfo = document.getElementById('memoryInfo');
  if (memoryInfo && navigator.deviceMemory) {
    memoryInfo.textContent = `${navigator.deviceMemory} GB`;
  }
}

function updateSystemInfo() {
  initSystemInfo(); // Refresh info when settings app is opened
}

function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName;
  
  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "Chrome";
  } else if (userAgent.match(/firefox|fxios/i)) {
    browserName = "Firefox";
  } else if (userAgent.match(/safari/i)) {
    browserName = "Safari";
  } else if (userAgent.match(/opr\//i)) {
    browserName = "Opera";
  } else if (userAgent.match(/edg/i)) {
    browserName = "Edge";
  } else {
    browserName = "Unknown";
  }
  
  return `${browserName} (${navigator.platform})`;
}

// Permission requests
function requestCameraPermission() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      stream.getTracks().forEach(track => track.stop());
      showNotification('Camera permission granted', 'success');
    })
    .catch(err => {
      console.error('Camera permission error:', err);
      showNotification('Camera permission denied', 'error');
    });
}

function requestLocationPermission() {
  navigator.geolocation.getCurrentPosition(
    () => showNotification('Location permission granted', 'success'),
    (err) => {
      console.error('Location permission error:', err);
      showNotification('Location permission denied', 'error');
    }
  );
}

function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted');
      }
    });
  }
}

// Notification system
function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  // Auto-remove after delay
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Clock and Alarm functions
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  const dateStr = now.toLocaleDateString(undefined, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const timeDisplay = document.getElementById('timeDisplay');
  const dateDisplay = document.getElementById('dateDisplay');
  
  if (timeDisplay) timeDisplay.textContent = timeStr;
  if (dateDisplay) dateDisplay.textContent = dateStr;
  
  // Check alarms
  checkAlarms(now);
  
  setTimeout(updateClock, 1000);
}

function setAlarm() {
  const timeInput = document.getElementById('alarmTime').value;
  const labelInput = document.getElementById('alarmLabel').value || 'Alarm';
  
  if (!timeInput) {
    showNotification('Please set a time for the alarm', 'warning');
    return;
  }
  
  const alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
  alarms.push({
    time: timeInput,
    label: labelInput,
    id: Date.now()
  });
  
  localStorage.setItem('alarms', JSON.stringify(alarms));
  loadAlarms();
  
  // Clear inputs
  document.getElementById('alarmTime').value = '';
  document.getElementById('alarmLabel').value = '';
  
  showNotification('Alarm set');
}

function loadAlarms() {
  const alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
  const alarmList = document.getElementById('alarmList');
  
  if (!alarmList) return;
  
  alarmList.innerHTML = '';
  
  if (alarms.length === 0) {
    alarmList.innerHTML = '<p>No alarms set</p>';
    return;
  }
  
  alarms.forEach(alarm => {
    const alarmItem = document.createElement('div');
    alarmItem.className = 'alarm-item';
    alarmItem.innerHTML = `
      <span>${alarm.label} - ${alarm.time}</span>
      <button onclick="deleteAlarm(${alarm.id})"><i class="fas fa-trash"></i></button>
    `;
    alarmList.appendChild(alarmItem);
  });
}

function deleteAlarm(id) {
  let alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
  alarms = alarms.filter(alarm => alarm.id !== id);
  localStorage.setItem('alarms', JSON.stringify(alarms));
  loadAlarms();
  showNotification('Alarm deleted');
}

function checkAlarms(now) {
  const alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0');
  
  alarms.forEach(alarm => {
    if (alarm.time === currentTime) {
      // Trigger alarm
      triggerAlarm(alarm);
      // Remove the alarm if it's a one-time alarm
      deleteAlarm(alarm.id);
    }
  });
}

function triggerAlarm(alarm) {
  if (Notification.permission === 'granted') {
    new Notification(alarm.label, {
      body: 'Alarm! It\'s ' + alarm.time
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(alarm.label, {
          body: 'Alarm! It\'s ' + alarm.time
        });
      }
    });
  }
  
  // Play sound
  const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
  audio.play();
  
  showNotification(`ALARM: ${alarm.label} at ${alarm.time}`, 'warning');
}

// Location functions
function getLocation() {
  const loc = document.getElementById('locationInfo');
  if (!loc) return;
  
  loc.textContent = 'Getting location...';
  
  if (!navigator.geolocation) {
    loc.textContent = 'Geolocation is not supported by your browser';
    showNotification('Geolocation not supported', 'error');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      loc.innerHTML = `
        <strong>Latitude:</strong> ${latitude.toFixed(6)}<br>
        <strong>Longitude:</strong> ${longitude.toFixed(6)}<br>
        <strong>Accuracy:</strong> ${Math.round(accuracy)} meters
      `;
      
      // Show simple map (using OpenStreetMap iframe)
      const map = document.getElementById('map');
      if (map) {
        map.innerHTML = `
          <iframe 
            width="100%" 
            height="100%" 
            frameborder="0" 
            scrolling="no" 
            marginheight="0" 
            marginwidth="0" 
            src="https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01}%2C${latitude-0.01}%2C${longitude+0.01}%2C${latitude+0.01}&amp;layer=mapnik&amp;marker=${latitude}%2C${longitude}"
            style="border-radius: 0.5rem;">
          </iframe>
        `;
      }
      
      showNotification('Location retrieved');
    },
    err => {
      console.error('Geolocation error:', err);
      loc.textContent = 'Unable to retrieve your location: ' + 
        (err.message || 'Permission denied or location unavailable');
      showNotification('Location error', 'error');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// Clipboard functions
async function showClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('clipboardText').value = text || 'Clipboard is empty.';
    document.getElementById('clipboardStatus').textContent = 'Clipboard content loaded';
    setTimeout(() => {
      document.getElementById('clipboardStatus').textContent = '';
    }, 2000);
    showNotification('Clipboard content loaded');
  } catch (err) {
    console.error('Clipboard error:', err);
    document.getElementById('clipboardStatus').textContent = 'Clipboard access denied. Paste manually.';
    // Fallback for browsers that don't support clipboard API
    document.getElementById('clipboardText').value = '';
    document.getElementById('clipboardText').focus();
    showNotification('Clipboard access denied', 'error');
  }
}

async function copyToClipboard() {
  const text = document.getElementById('clipboardText').value;
  try {
    await navigator.clipboard.writeText(text);
    document.getElementById('clipboardStatus').textContent = 'Copied to clipboard!';
    setTimeout(() => {
      document.getElementById('clipboardStatus').textContent = '';
    }, 2000);
    showNotification('Copied to clipboard');
  } catch (err) {
    console.error('Copy error:', err);
    document.getElementById('clipboardStatus').textContent = 'Failed to copy. Your browser may not support this feature.';
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.getElementById('clipboardStatus').textContent = 'Copied to clipboard!';
      setTimeout(() => {
        document.getElementById('clipboardStatus').textContent = '';
      }, 2000);
      showNotification('Copied to clipboard');
    } catch (err) {
      document.getElementById('clipboardStatus').textContent = 'Failed to copy. Please copy manually.';
      showNotification('Failed to copy to clipboard', 'error');
    }
    document.body.removeChild(textarea);
  }
}

// Calculator functions
function appendToCalc(char) {
  if (calcValue === '0' && char !== '.') {
    calcValue = char;
  } else {
    calcValue += char;
  }
  updateCalcDisplay();
}

function clearCalculator() {
  calcValue = '0';
  lastCalculation = null;
  updateCalcDisplay();
}

function backspaceCalc() {
  if (calcValue.length > 1) {
    calcValue = calcValue.slice(0, -1);
  } else {
    calcValue = '0';
  }
  updateCalcDisplay();
}

function calculate() {
  try {
    lastCalculation = calcValue;
    calcValue = eval(calcValue).toString();
    updateCalcDisplay();
  } catch (e) {
    calcValue = 'Error';
    updateCalcDisplay();
    setTimeout(() => {
      calcValue = '0';
      updateCalcDisplay();
    }, 1000);
  }
}

function updateCalcDisplay() {
  const display = document.getElementById('calcDisplay');
  if (display) {
    display.textContent = calcValue;
  }
}

function useLastResult() {
  if (lastCalculation) {
    calcValue = lastCalculation;
    updateCalcDisplay();
  }
}

function handleTerminalKey(e) {
  if (e.key === 'Enter') {
    executeCommand();
  } else if (e.key === 'ArrowUp') {
    // Navigate command history up
    if (commandHistory.length > 0 && commandHistoryIndex < commandHistory.length - 1) {
      commandHistoryIndex++;
      document.getElementById('terminalInput').value = 
        commandHistory[commandHistory.length - 1 - commandHistoryIndex];
    }
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    // Navigate command history down
    if (commandHistoryIndex > 0) {
      commandHistoryIndex--;
      document.getElementById('terminalInput').value = 
        commandHistory[commandHistory.length - 1 - commandHistoryIndex];
    } else if (commandHistoryIndex === 0) {
      commandHistoryIndex--;
      document.getElementById('terminalInput').value = '';
    }
    e.preventDefault();
  }
}

function executeCommand() {
  const input = document.getElementById('terminalInput');
  const command = input.value.trim();
  input.value = '';
  
  if (!command) return;
  
  // Add to command history
  commandHistory.push(command);
  commandHistoryIndex = -1;
  
  const output = document.getElementById('terminalOutput');
  output.innerHTML += `<span class="prompt">$</span> ${command}<br>`;
  
  // Process command
  const args = command.split(' ');
  const cmd = args[0].toLowerCase();
  
  switch(cmd) {
    case 'help':
      output.innerHTML += `Available commands:<br>
        help - Show this help<br>
        clear - Clear terminal<br>
        open [app] - Open an app (notepad, camera, etc.)<br>
        theme [light/dark] - Change theme<br>
        time - Show current time<br>
        date - Show current date<br>
        ls - List available apps<br>
        bg - Change background (color, image, gradient)<br><br>`;
      break;
    case 'clear':
      output.innerHTML = '';
      break;
    case 'open':
      if (args.length < 2) {
        output.innerHTML += 'Usage: open [app]<br>Available apps: ' + apps.join(', ') + '<br><br>';
      } else {
        const app = args[1].toLowerCase();
        if (apps.includes(app)) {
          openApp(app);
          output.innerHTML += `Opening ${app}<br><br>`;
        } else {
          output.innerHTML += `Unknown app: ${app}<br><br>`;
        }
      }
      break;
    case 'theme':
      if (args.length < 2) {
        output.innerHTML += 'Usage: theme [light/dark/auto]<br><br>';
      } else {
        const theme = args[1].toLowerCase();
        if (theme === 'light' || theme === 'dark' || theme === 'auto') {
          setTheme(theme);
          output.innerHTML += `Theme set to ${theme}<br><br>`;
        } else {
          output.innerHTML += `Invalid theme: ${theme}<br><br>`;
        }
      }
      break;
    case 'time':
      output.innerHTML += new Date().toLocaleTimeString() + '<br><br>';
      break;
    case 'date':
      output.innerHTML += new Date().toLocaleDateString() + '<br><br>';
      break;
    case 'ls':
      output.innerHTML += 'Available apps: ' + apps.join(', ') + '<br><br>';
      break;
    case 'bg':
      openModal('bgSettings');
      output.innerHTML += 'Opening background settings<br><br>';
      break;
    default:
      output.innerHTML += `Command not found: ${cmd}<br>Type "help" for available commands<br><br>`;
  }
  
  // Scroll to bottom
  output.scrollTop = output.scrollHeight;
}

// Lock screen functions
function lockScreen() {
  document.getElementById('lockScreen').style.display = 'flex';
  bringToFront('lockScreen');
  
  // Disable all apps
  apps.forEach(app => {
    document.getElementById(app).style.display = 'none';
    updateTaskbarItemState(app, false);
  });
  
  activeWindows = [];
}

function unlockScreen() {
  const password = document.getElementById('lockPassword').value;
  
  // Simple password check (in a real app, use proper authentication)
  const savedPassword = localStorage.getItem('lockPassword') || '1234';
  
  if (password === savedPassword) {
    document.getElementById('lockScreen').style.display = 'none';
    document.getElementById('lockPassword').value = '';
    
    // If this is the first time, set the password
    if (!localStorage.getItem('lockPassword')) {
      localStorage.setItem('lockPassword', '1234');
    }
    
    showNotification('Screen unlocked');
  } else {
    showNotification('Incorrect password', 'error');
    document.getElementById('lockPassword').value = '';
    document.getElementById('lockPassword').focus();
  }
}
// Initialize the OS when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  initBackground();
  initWindowControls();
  initSystemInfo();
  updateClock();
  requestNotificationPermission();
  
  // Initialize all apps
  apps.forEach(app => {
    makeDraggable(app);
    initWindowControlsForApp(app);
  });
  
  // Set up file drop area
  setupFileDrop();
  
  // Initialize terminal input
  const terminalInput = document.getElementById('terminalInput');
  if (terminalInput) {
    terminalInput.addEventListener('keydown', handleTerminalKey);
  }
  
  // Initialize calculator buttons
  initCalculator();
});

// Initialize calculator buttons
function initCalculator() {
  const calculator = document.getElementById('calculator');
  if (!calculator) return;
  
  // Number buttons
  for (let i = 0; i <= 9; i++) {
    const btn = document.getElementById(`calc-${i}`);
    if (btn) {
      btn.addEventListener('click', () => appendToCalc(i.toString()));
    }
  }
  
  // Operator buttons
  const operators = ['add', 'subtract', 'multiply', 'divide', 'decimal'];
  operators.forEach(op => {
    const btn = document.getElementById(`calc-${op}`);
    if (btn) {
      btn.addEventListener('click', () => appendToCalc(op === 'add' ? '+' : 
                                      op === 'subtract' ? '-' : 
                                      op === 'multiply' ? '*' : 
                                      op === 'divide' ? '/' : '.'));
    }
  });
  
  // Other buttons
  document.getElementById('calc-clear')?.addEventListener('click', clearCalculator);
  document.getElementById('calc-backspace')?.addEventListener('click', backspaceCalc);
  document.getElementById('calc-equals')?.addEventListener('click', calculate);
}

// Initialize window controls for each app
function initWindowControlsForApp(app) {
  const minimizeBtn = document.getElementById(`minimize-${app}`);
  const maximizeBtn = document.getElementById(`maximize-${app}`);
  const closeBtn = document.getElementById(`close-${app}`);
  
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => minimizeApp(app));
    minimizeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      minimizeApp(app);
    });
  }
  
  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => maximizeApp(app));
    maximizeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      maximizeApp(app);
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeApp(app));
    closeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      closeApp(app);
    });
  }
}

// Window management functions
function openApp(id) {
  const el = document.getElementById(id);
  if (!el) {
    showNotification(`Application ${id} not found`, 'error');
    return;
  }
  
  // Check if window is already open
  if (el.style.display === 'block') {
    bringToFront(id);
    return;
  }
  
  el.style.display = 'block';
  bringToFront(id);
  
  // App-specific initialization
  switch(id) {
    case 'camera':
      startCamera();
      break;
    case 'location':
      getLocation();
      break;
    case 'clock':
      updateClock();
      loadAlarms();
      break;
    case 'explorer':
      updateFileExplorer();
      break;
    case 'settings':
      updateSystemInfo();
      break;
    case 'clipboard':
      showClipboard();
      break;
    case 'terminal':
      document.getElementById('terminalInput').focus();
      break;
    case 'calculator':
      updateCalcDisplay();
      break;
  }
  
  // Add to active windows
  if (!activeWindows.includes(id)) {
    activeWindows.push(id);
  }
  
  // Update taskbar item state
  updateTaskbarItemState(id, true);
  
  showNotification(`${id.charAt(0).toUpperCase() + id.slice(1)} opened`);
}

// [Previous window management functions remain the same...]

/* ==================== */
/* LOCATION APP FUNCTIONS */
/* ==================== */

function getLocation() {
  const loc = document.getElementById('locationInfo');
  const map = document.getElementById('map');
  
  if (!loc || !map) return;
  
  loc.innerHTML = '<p>Getting location...</p>';
  map.innerHTML = '<p>Loading map...</p>';
  
  if (!navigator.geolocation) {
    loc.innerHTML = '<p>Geolocation is not supported by your browser</p>';
    showNotification('Geolocation not supported', 'error');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude, accuracy } = position.coords;
      loc.innerHTML = `
        <p><strong>Latitude:</strong> ${latitude.toFixed(6)}</p>
        <p><strong>Longitude:</strong> ${longitude.toFixed(6)}</p>
        <p><strong>Accuracy:</strong> ${Math.round(accuracy)} meters</p>
      `;
      
      // Update map iframe
      map.innerHTML = `
        <iframe 
          width="100%" 
          height="100%" 
          frameborder="0" 
          scrolling="no" 
          src="https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01}%2C${latitude-0.01}%2C${longitude+0.01}%2C${latitude+0.01}&amp;layer=mapnik&amp;marker=${latitude}%2C${longitude}"
          style="border-radius: 0.5rem;">
        </iframe>
      `;
      
      showNotification('Location retrieved successfully');
    },
    error => {
      let errorMessage = 'Unable to retrieve your location';
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access was denied';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable';
          break;
        case error.TIMEOUT:
          errorMessage = 'The request to get location timed out';
          break;
      }
      loc.innerHTML = `<p>${errorMessage}</p>`;
      map.innerHTML = '<p>Map unavailable</p>';
      showNotification(errorMessage, 'error');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

/* ==================== */
/* CLIPBOARD APP FUNCTIONS */
/* ==================== */

async function showClipboard() {
  const clipboardText = document.getElementById('clipboardText');
  const clipboardStatus = document.getElementById('clipboardStatus');
  
  if (!clipboardText || !clipboardStatus) return;
  
  try {
    const text = await navigator.clipboard.readText();
    clipboardText.value = text || 'Clipboard is empty';
    clipboardStatus.textContent = 'Clipboard content loaded';
    setTimeout(() => clipboardStatus.textContent = '', 2000);
    showNotification('Clipboard content loaded');
  } catch (err) {
    console.error('Failed to read clipboard:', err);
    clipboardText.value = '';
    clipboardStatus.textContent = 'Clipboard access denied. Paste manually.';
    showNotification('Clipboard access denied', 'error');
  }
}

async function copyToClipboard() {
  const clipboardText = document.getElementById('clipboardText');
  const clipboardStatus = document.getElementById('clipboardStatus');
  
  if (!clipboardText || !clipboardStatus) return;
  
  const text = clipboardText.value;
  if (!text.trim()) {
    showNotification('Nothing to copy', 'warning');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(text);
    clipboardStatus.textContent = 'Copied to clipboard!';
    setTimeout(() => clipboardStatus.textContent = '', 2000);
    showNotification('Copied to clipboard');
  } catch (err) {
    console.error('Failed to write to clipboard:', err);
    clipboardStatus.textContent = 'Failed to copy. Please try again.';
    showNotification('Failed to copy to clipboard', 'error');
  }
}

/* ==================== */
/* CALCULATOR APP FUNCTIONS */
/* ==================== */

function appendToCalc(char) {
  if (calcValue === '0' && !['.', '+', '-', '*', '/'].includes(char)) {
    calcValue = char;
  } else {
    calcValue += char;
  }
  updateCalcDisplay();
}

function clearCalculator() {
  calcValue = '0';
  lastCalculation = null;
  updateCalcDisplay();
}

function backspaceCalc() {
  if (calcValue.length > 1) {
    calcValue = calcValue.slice(0, -1);
  } else {
    calcValue = '0';
  }
  updateCalcDisplay();
}

function calculate() {
  try {
    lastCalculation = calcValue;
    calcValue = eval(calcValue).toString();
    updateCalcDisplay();
    showNotification('Calculation complete');
  } catch (e) {
    calcValue = 'Error';
    updateCalcDisplay();
    showNotification('Calculation error', 'error');
    setTimeout(() => {
      calcValue = '0';
      updateCalcDisplay();
    }, 1000);
  }
}

function updateCalcDisplay() {
  const display = document.getElementById('calcDisplay');
  if (display) {
    display.textContent = calcValue;
  }
}

/* ==================== */
/* CLOCK APP FUNCTIONS */
/* ==================== */

function updateClock() {
  const now = new Date();
  const timeDisplay = document.getElementById('timeDisplay');
  const dateDisplay = document.getElementById('dateDisplay');
  const alarmList = document.getElementById('alarmList');
  
  if (timeDisplay) {
    timeDisplay.textContent = now.toLocaleTimeString();
  }
  
  if (dateDisplay) {
    dateDisplay.textContent = now.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  // Check alarms
  checkAlarms(now);
  
  // Update every second
  setTimeout(updateClock, 1000);
}

function setAlarm() {
  const alarmTime = document.getElementById('alarmTime');
  const alarmLabel = document.getElementById('alarmLabel');
  
  if (!alarmTime || !alarmLabel) return;
  
  const time = alarmTime.value;
  const label = alarmLabel.value || 'Alarm';
  
  if (!time) {
    showNotification('Please set a time for the alarm', 'warning');
    return;
  }
  
  const alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
  alarms.push({
    time,
    label,
    id: Date.now()
  });
  
  localStorage.setItem('alarms', JSON.stringify(alarms));
  loadAlarms();
  
  // Clear inputs
  alarmTime.value = '';
  alarmLabel.value = '';
  
  showNotification('Alarm set successfully');
}

function loadAlarms() {
  const alarmList = document.getElementById('alarmList');
  if (!alarmList) return;
  
  const alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
  alarmList.innerHTML = '';
  
  if (alarms.length === 0) {
    alarmList.innerHTML = '<p>No alarms set</p>';
    return;
  }
  
  alarms.forEach(alarm => {
    const alarmItem = document.createElement('div');
    alarmItem.className = 'alarm-item';
    alarmItem.innerHTML = `
      <span>${alarm.label} - ${alarm.time}</span>
      <button onclick="deleteAlarm(${alarm.id})">
        <i class="fas fa-trash"></i>
      </button>
    `;
    alarmList.appendChild(alarmItem);
  });
}

function deleteAlarm(id) {
  let alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
  alarms = alarms.filter(alarm => alarm.id !== id);
  localStorage.setItem('alarms', JSON.stringify(alarms));
  loadAlarms();
  showNotification('Alarm deleted');
}

function checkAlarms(now) {
  const alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0');
  
  alarms.forEach(alarm => {
    if (alarm.time === currentTime) {
      triggerAlarm(alarm);
      // Remove the alarm if it's a one-time alarm
      deleteAlarm(alarm.id);
    }
  });
}

function triggerAlarm(alarm) {
  // Show notification
  showNotification(`ALARM: ${alarm.label} at ${alarm.time}`, 'warning');
  
  // Play sound
  const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
  audio.play().catch(e => console.error('Audio playback failed:', e));
  
  // Vibrate if supported
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
}

/* ==================== */
/* TERMINAL APP FUNCTIONS */
/* ==================== */

function handleTerminalKey(e) {
  if (e.key === 'Enter') {
    executeCommand();
  } else if (e.key === 'ArrowUp') {
    // Navigate command history up
    if (commandHistory.length > 0 && commandHistoryIndex < commandHistory.length - 1) {
      commandHistoryIndex++;
      document.getElementById('terminalInput').value = 
        commandHistory[commandHistory.length - 1 - commandHistoryIndex];
    }
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    // Navigate command history down
    if (commandHistoryIndex > 0) {
      commandHistoryIndex--;
      document.getElementById('terminalInput').value = 
        commandHistory[commandHistory.length - 1 - commandHistoryIndex];
    } else if (commandHistoryIndex === 0) {
      commandHistoryIndex--;
      document.getElementById('terminalInput').value = '';
    }
    e.preventDefault();
  }
}

function executeCommand() {
  const input = document.getElementById('terminalInput');
  const output = document.getElementById('terminalOutput');
  
  if (!input || !output) return;
  
  const command = input.value.trim();
  input.value = '';
  
  if (!command) return;
  
  // Add to command history
  commandHistory.push(command);
  commandHistoryIndex = -1;
  
  // Display command
  output.innerHTML += `<span class="prompt">$</span> ${command}<br>`;
  
  // Process command
  const args = command.split(' ');
  const cmd = args[0].toLowerCase();
  
  let response = '';
  
  switch(cmd) {
    case 'help':
      response = `Available commands:<br>
        help - Show this help<br>
        clear - Clear terminal<br>
        open [app] - Open an app (notepad, camera, etc.)<br>
        theme [light/dark] - Change theme<br>
        time - Show current time<br>
        date - Show current date<br>
        ls - List available apps<br>
        bg - Change background (color, image, gradient)<br>`;
      break;
      
    case 'clear':
      output.innerHTML = '';
      return;
      
    case 'open':
      if (args.length < 2) {
        response = 'Usage: open [app]<br>Available apps: ' + apps.join(', ');
      } else {
        const app = args[1].toLowerCase();
        if (apps.includes(app)) {
          openApp(app);
          response = `Opening ${app}`;
        } else {
          response = `Unknown app: ${app}`;
        }
      }
      break;
      
    case 'theme':
      if (args.length < 2) {
        response = 'Usage: theme [light/dark/auto]';
      } else {
        const theme = args[1].toLowerCase();
        if (theme === 'light' || theme === 'dark' || theme === 'auto') {
          setTheme(theme);
          response = `Theme set to ${theme}`;
        } else {
          response = `Invalid theme: ${theme}`;
        }
      }
      break;
      
    case 'time':
      response = new Date().toLocaleTimeString();
      break;
      
    case 'date':
      response = new Date().toLocaleDateString();
      break;
      
    case 'ls':
      response = 'Available apps: ' + apps.join(', ');
      break;
      
    case 'bg':
      openModal('bgSettings');
      response = 'Opening background settings';
      break;
      
    default:
      response = `Command not found: ${cmd}<br>Type "help" for available commands`;
  }
  
  // Display response
  if (response) {
    output.innerHTML += response + '<br>';
  }
  
  // Scroll to bottom
  output.scrollTop = output.scrollHeight;
}
// Initialize window controls
function initWindowControls() {
  // Make sure all windows can be brought to front when clicked
  document.querySelectorAll('.window').forEach(window => {
    window.addEventListener('mousedown', function() {
      bringToFront(this.id);
    });
  });
}
