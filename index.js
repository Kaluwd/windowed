// DOM Elements
const windowsContainer = document.getElementById('windows-container');
const lockScreen = document.getElementById('lockScreen');
const lockPassword = document.getElementById('lockPassword');
const notificationContainer = document.getElementById('notification-container');

// App State
let activeWindows = [];
let currentTheme = 'light';
let isLocked = false;
let currentCamera = 'user'; // 'user' or 'environment'
let videoStream = null;

// Initialize the OS
function initOS() {
  // Load saved theme
  const savedTheme = localStorage.getItem('webos-theme');
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme(currentTheme);
  }

  // Load background settings
  loadBackground();

  // Initialize system info
  updateSystemInfo();

  // Set up drag functionality for all windows
  setupWindowDrag();

  // Set up window controls
  setupWindowControls();

  // Check for camera permission
  checkCameraPermission();

  // Show welcome notification
  showNotification('Welcome to WebOS Toolkit!', 'success');
}

// Window Management
function openApp(appId) {
  if (isLocked) {
    showNotification('Please unlock the system first', 'error');
    return;
  }

  const appWindow = document.getElementById(appId);
  if (!appWindow) {
    showNotification(`App ${appId} not found`, 'error');
    return;
  }

  // Close other windows if they're the same app (prevent duplicates)
  const existingWindow = activeWindows.find(w => w.id === appId);
  if (existingWindow) {
    bringWindowToFront(appId);
    return;
  }

  appWindow.style.display = 'block';
  activeWindows.push({ id: appId, element: appWindow });
  bringWindowToFront(appId);

  // Special initialization for certain apps
  if (appId === 'camera') {
    initCamera();
  } else if (appId === 'browser') {
    initBrowser();
  }
}

function closeApp(appId) {
  const appWindow = document.getElementById(appId);
  if (!appWindow) return;

  appWindow.style.display = 'none';
  activeWindows = activeWindows.filter(w => w.id !== appId);

  // Special cleanup for certain apps
  if (appId === 'camera') {
    stopCamera();
  }
}

function minimizeApp(appId) {
  const appWindow = document.getElementById(appId);
  if (appWindow) {
    appWindow.style.display = 'none';
  }
}

function maximizeApp(appId) {
  const appWindow = document.getElementById(appId);
  if (appWindow) {
    appWindow.classList.toggle('maximized');
  }
}

function bringWindowToFront(appId) {
  const appWindow = document.getElementById(appId);
  if (!appWindow) return;

  // Get current max z-index
  let maxZIndex = 10;
  document.querySelectorAll('.window').forEach(win => {
    const z = parseInt(win.style.zIndex) || 0;
    if (z > maxZIndex) maxZIndex = z;
  });

  appWindow.style.zIndex = maxZIndex + 1;
}

function setupWindowDrag() {
  document.querySelectorAll('.window .header').forEach(header => {
    const windowElement = header.parentElement;
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - windowElement.getBoundingClientRect().left;
      offsetY = e.clientY - windowElement.getBoundingClientRect().top;
      bringWindowToFront(windowElement.id);
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      
      windowElement.style.left = `${x}px`;
      windowElement.style.top = `${y}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  });
}

function setupWindowControls() {
  // Close buttons
  document.querySelectorAll('[id^="close-"]').forEach(btn => {
    const appId = btn.id.replace('close-', '');
    btn.addEventListener('click', () => closeApp(appId));
  });

  // Minimize buttons
  document.querySelectorAll('[id^="minimize-"]').forEach(btn => {
    const appId = btn.id.replace('minimize-', '');
    btn.addEventListener('click', () => minimizeApp(appId));
  });

  // Maximize buttons
  document.querySelectorAll('[id^="maximize-"]').forEach(btn => {
    const appId = btn.id.replace('maximize-', '');
    btn.addEventListener('click', () => maximizeApp(appId));
  });
}

// Theme Management
function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('webos-theme', theme);
  
  // Update theme icon in taskbar
  const themeIcon = document.querySelector('.toggle-theme i');
  if (theme === 'dark') {
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  } else {
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  }
}

function toggleTheme() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

// Background Management
function loadBackground() {
  const bgSettings = JSON.parse(localStorage.getItem('webos-bg')) || {
    type: 'color',
    value: '#f0f0f0'
  };

  applyBackground(bgSettings);
  updateBgPreview(bgSettings);
}

function applyBackground(settings) {
  const body = document.body;
  
  switch(settings.type) {
    case 'color':
      body.style.background = settings.value;
      body.style.backgroundImage = 'none';
      break;
    case 'image':
      body.style.backgroundImage = `url('${settings.value}')`;
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center';
      body.style.backgroundRepeat = 'no-repeat';
      break;
    case 'gradient':
      body.style.background = `linear-gradient(${settings.direction}, ${settings.color1}, ${settings.color2})`;
      body.style.backgroundImage = 'none';
      break;
    default:
      body.style.background = '#f0f0f0';
  }
}

function updateBgPreview(settings) {
  const preview = document.getElementById('currentBgPreview');
  if (!preview) return;

  preview.style.background = settings.type === 'color' ? settings.value : 
    settings.type === 'gradient' ? `linear-gradient(${settings.direction}, ${settings.color1}, ${settings.color2})` : 
    `url('${settings.value}') center/cover no-repeat`;
}

// Modal Management
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'block';
    bringWindowToFront(modalId);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Background Settings Functions
function setSolidColor() {
  const color = document.getElementById('bgColorPicker').value;
  const settings = { type: 'color', value: color };
  localStorage.setItem('webos-bg', JSON.stringify(settings));
  applyBackground(settings);
  updateBgPreview(settings);
  closeModal('bgSettings');
}

function setBgFromUrl() {
  const url = document.getElementById('bgImageUrl').value;
  if (!url) return;

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    showNotification('Please enter a valid URL', 'error');
    return;
  }

  const settings = { type: 'image', value: url };
  localStorage.setItem('webos-bg', JSON.stringify(settings));
  applyBackground(settings);
  updateBgPreview(settings);
  closeModal('bgSettings');
}

function setBgFromUpload() {
  const fileInput = document.getElementById('bgImageUpload');
  if (!fileInput.files.length) return;

  const file = fileInput.files[0];
  if (!file.type.match('image.*')) {
    showNotification('Please select an image file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const settings = { type: 'image', value: e.target.result };
    localStorage.setItem('webos-bg', JSON.stringify(settings));
    applyBackground(settings);
    updateBgPreview(settings);
    closeModal('bgSettings');
  };
  reader.readAsDataURL(file);
}

function setGradientBg() {
  const color1 = document.getElementById('gradientColor1').value;
  const color2 = document.getElementById('gradientColor2').value;
  const direction = document.getElementById('gradientDirection').value;

  const settings = {
    type: 'gradient',
    color1,
    color2,
    direction
  };

  localStorage.setItem('webos-bg', JSON.stringify(settings));
  applyBackground(settings);
  updateBgPreview(settings);
  closeModal('bgSettings');
}

// Notepad Functions
function saveNote() {
  const text = document.getElementById('notepadText').value;
  localStorage.setItem('webos-notepad', text);
  showNotification('Note saved successfully', 'success');
}

function loadNote() {
  const savedText = localStorage.getItem('webos-notepad') || '';
  document.getElementById('notepadText').value = savedText;
}

function clearNote() {
  if (confirm('Are you sure you want to clear the note?')) {
    document.getElementById('notepadText').value = '';
  }
}

// Browser Functions
function initBrowser() {
  const browserUrl = document.getElementById('browserUrl');
  const browserFrame = document.getElementById('browserFrame');
  const browserContent = document.getElementById('browserContent');

  // Load homepage if no URL is set
  if (!browserUrl.value) {
    browserFrame.style.display = 'none';
    browserContent.style.display = 'block';
  }
}

function loadUrl() {
  const urlInput = document.getElementById('browserUrl');
  let url = urlInput.value.trim();

  // Add https:// if not present
  if (url && !url.match(/^https?:\/\//)) {
    url = 'https://' + url;
    urlInput.value = url;
  }

  if (!url) return;

  const browserFrame = document.getElementById('browserFrame');
  const browserContent = document.getElementById('browserContent');

  try {
    browserFrame.src = url;
    browserFrame.style.display = 'block';
    browserContent.style.display = 'none';
  } catch (e) {
    showNotification('Error loading URL', 'error');
    console.error(e);
  }
}

function loadQuickUrl(url) {
  document.getElementById('browserUrl').value = url;
  loadUrl();
}

function browserBack() {
  const browserFrame = document.getElementById('browserFrame');
  try {
    browserFrame.contentWindow.history.back();
  } catch (e) {
    showNotification('Cannot go back', 'error');
  }
}

function browserForward() {
  const browserFrame = document.getElementById('browserFrame');
  try {
    browserFrame.contentWindow.history.forward();
  } catch (e) {
    showNotification('Cannot go forward', 'error');
  }
}

function browserRefresh() {
  const browserFrame = document.getElementById('browserFrame');
  if (browserFrame.src) {
    browserFrame.src = browserFrame.src;
  }
}

function openCurrentInNewTab() {
  const browserFrame = document.getElementById('browserFrame');
  if (browserFrame.src) {
    window.open(browserFrame.src, '_blank');
  }
}

// Camera Functions
function checkCameraPermission() {
  navigator.permissions.query({ name: 'camera' }).then(permissionStatus => {
    if (permissionStatus.state === 'granted') {
      return true;
    }
    return false;
  }).catch(() => false);
}

function requestCameraPermission() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(() => {
      showNotification('Camera permission granted', 'success');
      return true;
    })
    .catch(err => {
      showNotification('Camera permission denied', 'error');
      console.error(err);
      return false;
    });
}

function initCamera() {
  const video = document.getElementById('video');
  
  if (videoStream) {
    video.srcObject = videoStream;
    return;
  }

  const constraints = {
    video: {
      facingMode: currentCamera,
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      videoStream = stream;
      video.srcObject = stream;
    })
    .catch(err => {
      showNotification('Could not access camera', 'error');
      console.error(err);
    });
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
    const video = document.getElementById('video');
    video.srcObject = null;
  }
}

function takePhoto() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('photoCanvas');
  const saveBtn = document.getElementById('savePhotoBtn');
  
  if (!video.srcObject) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  
  saveBtn.disabled = false;
  showNotification('Photo captured! Click Save to download', 'success');
}

function savePhoto() {
  const canvas = document.getElementById('photoCanvas');
  const saveBtn = document.getElementById('savePhotoBtn');
  
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = `webos-photo-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  
  saveBtn.disabled = true;
  showNotification('Photo saved successfully', 'success');
}

function switchCamera() {
  currentCamera = currentCamera === 'user' ? 'environment' : 'user';
  stopCamera();
  initCamera();
}

// File Explorer Functions
function loadFile() {
  const input = document.createElement('input');
  input.type = 'file';
  
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    
    displayFileInfo(file);
    
    if (file.type.match('text.*')) {
      const reader = new FileReader();
      reader.onload = e => {
        document.getElementById('fileContent').textContent = e.target.result;
      };
      reader.readAsText(file);
    } else if (file.type.match('image.*')) {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '100%';
        document.getElementById('fileContent').innerHTML = '';
        document.getElementById('fileContent').appendChild(img);
      };
      reader.readAsDataURL(file);
    } else {
      document.getElementById('fileContent').textContent = 
        `Binary file (${file.type || 'unknown type'}) - cannot display`;
    }
  };
  
  input.click();
}

function saveFile() {
  const content = document.getElementById('fileContent').textContent;
  if (!content) {
    showNotification('No content to save', 'error');
    return;
  }
  
  const blob = new Blob([content], { type: 'text/plain' });
  const link = document.createElement('a');
  link.download = `webos-file-${new Date().toISOString().slice(0, 10)}.txt`;
  link.href = URL.createObjectURL(blob);
  link.click();
  showNotification('File saved successfully', 'success');
}

function createNewFile() {
  document.getElementById('fileContent').textContent = '';
  document.getElementById('fileInfo').innerHTML = '<p>New file</p>';
}

function displayFileInfo(file) {
  const fileInfo = document.getElementById('fileInfo');
  fileInfo.innerHTML = `
    <p><strong>Name:</strong> ${file.name}</p>
    <p><strong>Type:</strong> ${file.type || 'unknown'}</p>
    <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
    <p><strong>Last Modified:</strong> ${new Date(file.lastModified).toLocaleString()}</p>
  `;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Set up file drop area
function setupFileDrop() {
  const dropArea = document.getElementById('fileDropArea');
  
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

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length) {
      const file = files[0];
      displayFileInfo(file);
      
      if (file.type.match('text.*')) {
        const reader = new FileReader();
        reader.onload = e => {
          document.getElementById('fileContent').textContent = e.target.result;
        };
        reader.readAsText(file);
      } else if (file.type.match('image.*')) {
        const reader = new FileReader();
        reader.onload = e => {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.maxWidth = '100%';
          document.getElementById('fileContent').innerHTML = '';
          document.getElementById('fileContent').appendChild(img);
        };
        reader.readAsDataURL(file);
      } else {
        document.getElementById('fileContent').textContent = 
          `Binary file (${file.type || 'unknown type'}) - cannot display`;
      }
    }
  }
}

// Settings Functions
function openSettingsTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll('.settings-tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab content
  document.getElementById(`${tabId}-tab`).style.display = 'block';
  
  // Add active class to clicked button
  event.target.classList.add('active');
}

function toggleWindowTransparency() {
  const isTransparent = document.getElementById('transparencyToggle').checked;
  document.querySelectorAll('.window').forEach(win => {
    win.style.backgroundColor = isTransparent ? 'rgba(255, 255, 255, 0.8)' : '#fff';
  });
}

function changeTransparencyLevel() {
  const level = document.getElementById('transparencyLevel').value;
  document.querySelectorAll('.window').forEach(win => {
    win.style.backgroundColor = `rgba(255, 255, 255, ${level / 100})`;
  });
}

function updateSystemInfo() {
  // Browser info
  const browserInfo = document.getElementById('browserInfo');
  browserInfo.textContent = navigator.userAgent.split(') ')[0].split('(')[1] || 'Unknown';
  
  // Screen info
  const screenInfo = document.getElementById('screenInfo');
  screenInfo.textContent = `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio}x)`;
  
  // Memory info (not all browsers support this)
  const memoryInfo = document.getElementById('memoryInfo');
  if (navigator.deviceMemory) {
    memoryInfo.textContent = `${navigator.deviceMemory} GB`;
  } else {
    memoryInfo.textContent = 'Not available';
  }
}

// Lock Screen Functions
function lockScreen() {
  isLocked = true;
  lockScreen.style.display = 'flex';
  document.querySelectorAll('.window').forEach(win => {
    win.style.display = 'none';
  });
}

function unlockScreen() {
  const password = lockPassword.value;
  // In a real app, you would verify the password here
  if (password) {
    isLocked = false;
    lockScreen.style.display = 'none';
    lockPassword.value = '';
    showNotification('System unlocked', 'success');
  } else {
    showNotification('Please enter a password', 'error');
  }
}

// Notification System
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 
                     type === 'success' ? 'fa-check-circle' : 
                     'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="close-notification" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  notificationContainer.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// Initialize the OS when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initOS();
  setupFileDrop();
});

// Make functions available globally
window.openApp = openApp;
window.closeApp = closeApp;
window.minimizeApp = minimizeApp;
window.maximizeApp = maximizeApp;
window.setTheme = setTheme;
window.toggleTheme = toggleTheme;
window.openModal = openModal;
window.closeModal = closeModal;
window.setSolidColor = setSolidColor;
window.setBgFromUrl = setBgFromUrl;
window.setBgFromUpload = setBgFromUpload;
window.setGradientBg = setGradientBg;
window.saveNote = saveNote;
window.loadNote = loadNote;
window.clearNote = clearNote;
window.loadUrl = loadUrl;
window.loadQuickUrl = loadQuickUrl;
window.browserBack = browserBack;
window.browserForward = browserForward;
window.browserRefresh = browserRefresh;
window.openCurrentInNewTab = openCurrentInNewTab;
window.takePhoto = takePhoto;
window.savePhoto = savePhoto;
window.switchCamera = switchCamera;
window.loadFile = loadFile;
window.saveFile = saveFile;
window.createNewFile = createNewFile;
window.openSettingsTab = openSettingsTab;
window.toggleWindowTransparency = toggleWindowTransparency;
window.changeTransparencyLevel = changeTransparencyLevel;
window.requestCameraPermission = requestCameraPermission;
window.requestLocationPermission = requestLocationPermission;
window.requestNotificationPermission = requestNotificationPermission;
window.lockScreen = lockScreen;
window.unlockScreen = unlockScreen;
window.showNotification = showNotification;
