// Main Window Manager Class
class WebOS {
  constructor() {
    this.apps = ['notepad', 'camera', 'location', 'explorer', 'clipboard', 
                'calculator', 'browser', 'clock', 'terminal'];
    this.currentBrowserUrl = '';
    this.calcValue = '0';
    this.maxZIndex = 10;
    this.dragTarget = null;
    this.alarms = [];
    
    this.init();
  }
  
  init() {
    this.initTheme();
    this.initApps();
    this.initClock();
    this.initNotifications();
    this.loadAlarms();
  }
  
  initApps() {
    this.apps.forEach(app => {
      this.makeDraggable(app);
      
      // Add event listeners for window controls
      const addListeners = (element, event) => {
        document.getElementById(`minimize-${app}`)?.addEventListener(event, () => this.minimizeApp(app));
        document.getElementById(`maximize-${app}`)?.addEventListener(event, () => this.maximizeApp(app));
        document.getElementById(`close-${app}`)?.addEventListener(event, () => this.closeApp(app));
      };
      
      addListeners('click', 'click');
      addListeners('touchend', 'touchend');
    });
  }

  // Window Management
  openApp(id) {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.style.display = 'block';
    el.style.zIndex = ++this.maxZIndex;
    
    // Bring to front when clicked
    el.addEventListener('click', () => {
      el.style.zIndex = ++this.maxZIndex;
    });
    
    // App-specific initialization
    switch(id) {
      case 'camera':
        this.startCamera();
        break;
      case 'location':
        this.getLocation();
        break;
      case 'clock':
        this.updateClock();
        break;
      case 'browser':
        this.initBrowser();
        break;
    }
  }
  
  closeApp(id) {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.style.display = 'none';
    el.classList.remove('maximized');
    
    // Stop camera when closing
    if (id === 'camera') {
      const video = document.getElementById('video');
      if (video?.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
    }
  }
  
  minimizeApp(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  
  maximizeApp(id) {
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
      el.style.width = '100%';
      el.style.height = 'calc(100vh - 48px)';
    } else {
      // Restore original position and size
      el.style.top = el.dataset.originalTop || '100px';
      el.style.left = el.dataset.originalLeft || '100px';
      el.style.width = el.dataset.originalWidth || '800px';
      el.style.height = el.dataset.originalHeight || '600px';
    }
    
    el.style.zIndex = ++this.maxZIndex;
  }
  
  makeDraggable(id) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const header = el.querySelector('.header');
    let isDragging = false;
    let offsetX, offsetY;
    let startX, startY;

    const startDrag = (e) => {
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
      
      if (e.type === 'touchstart') e.preventDefault();
    };

    const drag = (e) => {
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
      el.style.zIndex = ++this.maxZIndex;
      
      if (e.type === 'touchmove') e.preventDefault();
    };

    const stopDrag = (e) => {
      if (!isDragging) return;
      
      const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
      const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
      
      // Check if this was a click (minimal movement)
      if (Math.abs(clientX - startX) < 5 && Math.abs(clientY - startY) < 5) {
        el.style.zIndex = ++this.maxZIndex;
      }
      
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('touchmove', drag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchend', stopDrag);
    };

    header.addEventListener('mousedown', startDrag);
    header.addEventListener('touchstart', startDrag, { passive: false });
  }

  // Browser Functions
  initBrowser() {
    // Set up quick links
    const quickLinks = [
      { name: 'Google', url: 'https://google.com', icon: 'fab fa-google' },
      { name: 'YouTube', url: 'https://youtube.com', icon: 'fab fa-youtube' },
      { name: 'GitHub', url: 'https://github.com', icon: 'fab fa-github' },
      { name: 'Twitter', url: 'https://twitter.com', icon: 'fab fa-twitter' },
      { name: 'Wikipedia', url: 'https://wikipedia.org', icon: 'fab fa-wikipedia-w' }
    ];
    
    const quickLinksContainer = document.querySelector('.quick-links');
    if (quickLinksContainer) {
      quickLinksContainer.innerHTML = quickLinks.map(link => `
        <button onclick="webOS.loadQuickUrl('${link.url}')">
          <i class="${link.icon}"></i> ${link.name}
        </button>
      `).join('');
    }
    
    // Set up URL input handler
    const urlInput = document.getElementById('browserUrl');
    if (urlInput) {
      urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.loadUrl();
      });
    }
  }
  
  loadUrl() {
    const urlInput = document.getElementById('browserUrl');
    if (!urlInput) return;
    
    const url = urlInput.value.trim();
    if (!url) return;
    
    const browserContent = document.getElementById('browserContent');
    if (!browserContent) return;
    
    browserContent.innerHTML = '<div class="browser-message">Loading...</div>';
    
    try {
      // Format URL properly
      let formattedUrl = url;
      if (!url.match(/^https?:\/\//)) {
        formattedUrl = 'https://' + url;
      }
      
      // Validate URL
      new URL(formattedUrl);
      this.currentBrowserUrl = formattedUrl;
      urlInput.value = formattedUrl;
      
      this.tryEmbedUrl(formattedUrl);
    } catch (e) {
      this.showBrowserError("Invalid URL format. Please include http:// or https://");
    }
  }
  
  loadQuickUrl(url) {
    const urlInput = document.getElementById('browserUrl');
    if (urlInput) urlInput.value = url;
    this.loadUrl();
  }
  
  tryEmbedUrl(url) {
    const browserContent = document.getElementById('browserContent');
    if (!browserContent) return;
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'browserFrame';
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    // Handle iframe events
    iframe.onload = () => {
      setTimeout(() => {
        try {
          // Try accessing iframe content (will throw if cross-origin)
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (!iframeDoc || !iframeDoc.body) {
            throw new Error("Cross-origin frame");
          }
        } catch (e) {
          this.showBrowserFallback(url);
        }
      }, 1000);
    };
    
    iframe.onerror = () => this.showBrowserFallback(url);
    
    // Clear and add iframe
    browserContent.innerHTML = '';
    browserContent.appendChild(iframe);
    
    // Hide welcome message and show iframe
    document.querySelector('.browser-message')?.style.display = 'none';
    iframe.style.display = 'block';
  }
  
  showBrowserFallback(url) {
    const browserContent = document.getElementById('browserContent');
    if (!browserContent) return;
    
    const hostname = url ? new URL(url).hostname : '';
    
    browserContent.innerHTML = `
      <div class="browser-message">
        <p>This website cannot be embedded due to security restrictions.</p>
        <a href="${url}" target="_blank" class="browser-link">
          <i class="fas fa-external-link-alt"></i> Open ${hostname} in New Tab
        </a>
      </div>
    `;
  }
  
  showBrowserError(message) {
    const browserContent = document.getElementById('browserContent');
    if (!browserContent) return;
    
    browserContent.innerHTML = `
      <div class="browser-message browser-error">
        <i class="fas fa-exclamation-triangle"></i> ${message}
      </div>
    `;
  }
  
  browserBack() {
    const frame = document.getElementById('browserFrame');
    try {
      frame?.contentWindow?.history?.back();
    } catch (e) {
      console.log("Can't go back");
    }
  }
  
  browserForward() {
    const frame = document.getElementById('browserFrame');
    try {
      frame?.contentWindow?.history?.forward();
    } catch (e) {
      console.log("Can't go forward");
    }
  }
  
  browserRefresh() {
    const frame = document.getElementById('browserFrame');
    if (frame?.src) {
      frame.src = frame.src;
    }
  }
  
  openCurrentInNewTab() {
    if (this.currentBrowserUrl) {
      window.open(this.currentBrowserUrl, '_blank');
    } else {
      alert('Please enter and load a URL first');
    }
  }

  // Notepad Functions
  async saveNote() {
    const content = document.getElementById('notepadText')?.value;
    if (!content) return;
    
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          types: [{ description: 'Text Files', accept: {'text/plain': ['.txt']} }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        // Fallback
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'note.txt';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error saving file:', err);
      alert('Error saving file. Your browser may not support this feature.');
    }
  }

  async loadNote() {
    try {
      if (window.showOpenFilePicker) {
        const [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        const text = await file.text();
        const notepadText = document.getElementById('notepadText');
        if (notepadText) notepadText.value = text;
      } else {
        // Fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,text/plain';
        input.onchange = e => {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = event => {
            const notepadText = document.getElementById('notepadText');
            if (notepadText) notepadText.value = event.target.result;
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (err) {
      console.error('Error loading file:', err);
      if (err.name !== 'AbortError') {
        alert('Error loading file. Your browser may not support this feature.');
      }
    }
  }

  // Camera Functions
  startCamera() {
    const video = document.getElementById('video');
    if (!video) return;
    
    if (video.srcObject) return; // Camera already started
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        video.srcObject = stream;
      })
      .catch(err => {
        console.error('Camera error:', err);
        video.srcObject = null;
        const contentDiv = document.getElementById('camera')?.querySelector('.content');
        if (contentDiv) {
          contentDiv.innerHTML = `
            <p>Could not access camera. Please ensure you've granted permission.</p>
            <button onclick="webOS.startCamera()">Try Again</button>
          `;
        }
      });
  }

  takePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('photoCanvas');
    const contentDiv = document.getElementById('camera')?.querySelector('.content');
    
    if (!video?.srcObject || !canvas || !contentDiv) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Show the photo
    const imgUrl = canvas.toDataURL('image/png');
    contentDiv.innerHTML = `
      <img src="${imgUrl}" style="max-width: 100%; border-radius: 0.5rem;" />
      <button onclick="webOS.savePhoto('${imgUrl}')"><i class="fas fa-save"></i> Save Photo</button>
      <button onclick="webOS.startCamera()"><i class="fas fa-undo"></i> Back to Camera</button>
    `;
  }

  savePhoto(imgUrl) {
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = 'photo.png';
    a.click();
  }

  // Location Functions
  getLocation() {
    const loc = document.getElementById('locationInfo');
    if (!loc) return;
    
    loc.textContent = 'Getting location...';
    
    if (!navigator.geolocation) {
      loc.textContent = 'Geolocation is not supported by your browser';
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
        
        // Show simple map
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
      },
      err => {
        console.error('Geolocation error:', err);
        loc.textContent = 'Unable to retrieve your location: ' + 
          (err.message || 'Permission denied or location unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // File Explorer Functions
  async loadFile() {
    try {
      let file;
      
      if (window.showOpenFilePicker) {
        const [fileHandle] = await window.showOpenFilePicker();
        file = await fileHandle.getFile();
      } else {
        // Fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
          file = e.target.files[0];
          this.readFileContent(file);
        };
        input.click();
        return;
      }
      
      this.readFileContent(file);
    } catch (err) {
      console.error('Error loading file:', err);
      if (err.name !== 'AbortError') {
        alert('Error loading file. Your browser may not support this feature.');
      }
    }
  }

  readFileContent(file) {
    const reader = new FileReader();
    reader.onload = event => {
      const fileContent = document.getElementById('fileContent');
      if (fileContent) fileContent.textContent = event.target.result;
    };
    reader.onerror = () => {
      const fileContent = document.getElementById('fileContent');
      if (fileContent) fileContent.textContent = 'Error reading file';
    };
    reader.readAsText(file);
  }

  async saveFile() {
    const fileContent = document.getElementById('fileContent');
    if (!fileContent) return;
    
    const content = fileContent.textContent;
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker();
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        // Fallback
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'file.txt';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error saving file:', err);
      alert('Error saving file. Your browser may not support this feature.');
    }
  }

  // Clipboard Functions
  async showClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const clipboardText = document.getElementById('clipboardText');
      const clipboardStatus = document.getElementById('clipboardStatus');
      
      if (clipboardText) clipboardText.value = text || 'Clipboard is empty.';
      if (clipboardStatus) {
        clipboardStatus.textContent = 'Clipboard content loaded';
        setTimeout(() => {
          clipboardStatus.textContent = '';
        }, 2000);
      }
    } catch (err) {
      console.error('Clipboard error:', err);
      const clipboardStatus = document.getElementById('clipboardStatus');
      if (clipboardStatus) {
        clipboardStatus.textContent = 'Clipboard access denied. Paste manually.';
      }
      const clipboardText = document.getElementById('clipboardText');
      if (clipboardText) {
        clipboardText.value = '';
        clipboardText.focus();
      }
    }
  }

  async copyToClipboard() {
    const clipboardText = document.getElementById('clipboardText');
    if (!clipboardText) return;
    
    const text = clipboardText.value;
    const clipboardStatus = document.getElementById('clipboardStatus');
    
    try {
      await navigator.clipboard.writeText(text);
      if (clipboardStatus) {
        clipboardStatus.textContent = 'Copied to clipboard!';
        setTimeout(() => {
          clipboardStatus.textContent = '';
        }, 2000);
      }
    } catch (err) {
      console.error('Copy error:', err);
      if (clipboardStatus) {
        clipboardStatus.textContent = 'Failed to copy. Your browser may not support this feature.';
      }
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        if (clipboardStatus) {
          clipboardStatus.textContent = 'Copied to clipboard!';
          setTimeout(() => {
            clipboardStatus.textContent = '';
          }, 2000);
        }
      } catch (err) {
        if (clipboardStatus) {
          clipboardStatus.textContent = 'Failed to copy. Please copy manually.';
        }
      }
      document.body.removeChild(textarea);
    }
  }

  // Calculator Functions
  appendToCalc(char) {
    if (this.calcValue === '0' && char !== '.') {
      this.calcValue = char;
    } else {
      this.calcValue += char;
    }
    this.updateCalcDisplay();
  }

  clearCalculator() {
    this.calcValue = '0';
    this.updateCalcDisplay();
  }

  backspaceCalc() {
    if (this.calcValue.length > 1) {
      this.calcValue = this.calcValue.slice(0, -1);
    } else {
      this.calcValue = '0';
    }
    this.updateCalcDisplay();
  }

  calculate() {
    try {
      this.calcValue = eval(this.calcValue).toString();
      this.updateCalcDisplay();
    } catch (e) {
      this.calcValue = 'Error';
      this.updateCalcDisplay();
      setTimeout(() => {
        this.calcValue = '0';
        this.updateCalcDisplay();
      }, 1000);
    }
  }

  updateCalcDisplay() {
    const calcDisplay = document.getElementById('calcDisplay');
    if (calcDisplay) calcDisplay.textContent = this.calcValue;
  }

  // Clock Functions
  initClock() {
    this.updateClock();
  }
  
  updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const dateStr = now.toLocaleDateString(undefined, { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const timeDisplay = document.getElementById('timeDisplay');
    const dateDisplay = document.getElementById('dateDisplay');
    
    if (timeDisplay) timeDisplay.textContent = timeStr;
    if (dateDisplay) dateDisplay.textContent = dateStr;
    
    this.checkAlarms(now);
    
    setTimeout(() => this.updateClock(), 1000);
  }

  // Alarm Functions
  setAlarm() {
    const timeInput = document.getElementById('alarmTime');
    const labelInput = document.getElementById('alarmLabel');
    
    if (!timeInput?.value) return;
    
    this.alarms.push({
      time: timeInput.value,
      label: labelInput?.value || 'Alarm',
      id: Date.now()
    });
    
    this.saveAlarms();
    this.loadAlarms();
    
    // Clear inputs
    if (timeInput) timeInput.value = '';
    if (labelInput) labelInput.value = '';
  }

  loadAlarms() {
    try {
      const savedAlarms = localStorage.getItem('alarms');
      if (savedAlarms) {
        this.alarms = JSON.parse(savedAlarms);
      }
    } catch (e) {
      console.error('Error loading alarms:', e);
      this.alarms = [];
    }
    
    const alarmList = document.getElementById('alarmList');
    if (!alarmList) return;
    
    alarmList.innerHTML = '';
    
    this.alarms.forEach(alarm => {
      const alarmItem = document.createElement('div');
      alarmItem.className = 'alarm-item';
      alarmItem.innerHTML = `
        <span>${alarm.label} - ${alarm.time}</span>
        <button onclick="webOS.deleteAlarm(${alarm.id})"><i class="fas fa-trash"></i></button>
      `;
      alarmList.appendChild(alarmItem);
    });
  }

  saveAlarms() {
    try {
      localStorage.setItem('alarms', JSON.stringify(this.alarms));
    } catch (e) {
      console.error('Error saving alarms:', e);
    }
  }

  deleteAlarm(id) {
    this.alarms = this.alarms.filter(alarm => alarm.id !== id);
    this.saveAlarms();
    this.loadAlarms();
  }

  checkAlarms(now) {
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    
    this.alarms.forEach(alarm => {
      if (alarm.time === currentTime) {
        // Trigger alarm
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
        
        // Remove the alarm
        this.deleteAlarm(alarm.id);
      }
    });
  }

  // Terminal Functions
  handleTerminalKey(e) {
    if (e.key === 'Enter') {
      this.executeCommand();
    }
  }

  executeCommand() {
    const input = document.getElementById('terminalInput');
    if (!input) return;
    
    const command = input.value.trim();
    input.value = '';
    
    if (!command) return;
    
    const output = document.getElementById('terminalOutput');
    if (!output) return;
    
    output.innerHTML += `$ ${command}<br>`;
    
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
          date - Show current date<br><br>`;
        break;
      case 'clear':
        output.innerHTML = '';
        break;
      case 'open':
        if (args.length < 2) {
          output.innerHTML += 'Usage: open [app]<br>Available apps: ' + this.apps.join(', ') + '<br><br>';
        } else {
          const app = args[1].toLowerCase();
          if (this.apps.includes(app)) {
            this.openApp(app);
            output.innerHTML += `Opening ${app}<br><br>`;
          } else {
            output.innerHTML += `Unknown app: ${app}<br><br>`;
          }
        }
        break;
      case 'theme':
        if (args.length < 2) {
          output.innerHTML += 'Usage: theme [light/dark]<br><br>';
        } else {
          const theme = args[1].toLowerCase();
          if (theme === 'light' || theme === 'dark') {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
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
      default:
        output.innerHTML += `Command not found: ${cmd}<br>Type "help" for available commands<br><br>`;
    }
    
    // Scroll to bottom
    output.scrollTop = output.scrollHeight;
  }

  // Lock Screen Functions
  lockScreen() {
    const lockScreen = document.getElementById('lockScreen');
    if (lockScreen) lockScreen.style.display = 'flex';
    
    // Minimize all apps
    this.apps.forEach(app => {
      this.minimizeApp(app);
    });
  }

  unlockScreen() {
    const passwordInput = document.getElementById('lockPassword');
    if (!passwordInput) return;
    
    const password = passwordInput.value;
    // Simple password check (in a real app, use proper authentication)
    if (password === '1234' || !localStorage.getItem('lockPassword')) {
      const lockScreen = document.getElementById('lockScreen');
      if (lockScreen) lockScreen.style.display = 'none';
      passwordInput.value = '';
      
      // If this is the first time, set the password
      if (!localStorage.getItem('lockPassword')) {
        localStorage.setItem('lockPassword', '1234');
      }
    } else {
      alert('Incorrect password');
    }
  }

  // Theme Functions
  initTheme() {
    try {
      const savedTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      
      // Update theme icon
      const themeIcon = document.querySelector('.toggle-theme i');
      if (themeIcon) {
        if (savedTheme === 'dark') {
          themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
          themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
      }
    } catch (e) {
      console.error('Error loading theme preference:', e);
    }
  }
  
  toggleTheme() {
    const html = document.documentElement;
    const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    
    // Update theme icon
    const themeIcon = document.querySelector('.toggle-theme i');
    if (themeIcon) {
      if (newTheme === 'dark') {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
      } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
      }
    }
    
    // Save preference
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.error('Error saving theme preference:', e);
    }
  }

  // Notification Functions
  initNotifications() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
}

// Initialize the WebOS
const webOS = new WebOS();

// Global functions for HTML event handlers
window.openApp = (id) => webOS.openApp(id);
window.toggleTheme = () => webOS.toggleTheme();
window.loadUrl = () => webOS.loadUrl();
window.loadQuickUrl = (url) => webOS.loadQuickUrl(url);
window.browserBack = () => webOS.browserBack();
window.browserForward = () => webOS.browserForward();
window.browserRefresh = () => webOS.browserRefresh();
window.openCurrentInNewTab = () => webOS.openCurrentInNewTab();
window.saveNote = () => webOS.saveNote();
window.loadNote = () => webOS.loadNote();
window.startCamera = () => webOS.startCamera();
window.takePhoto = () => webOS.takePhoto();
window.savePhoto = (imgUrl) => webOS.savePhoto(imgUrl);
window.getLocation = () => webOS.getLocation();
window.loadFile = () => webOS.loadFile();
window.saveFile = () => webOS.saveFile();
window.showClipboard = () => webOS.showClipboard();
window.copyToClipboard = () => webOS.copyToClipboard();
window.appendToCalc = (char) => webOS.appendToCalc(char);
window.clearCalculator = () => webOS.clearCalculator();
window.backspaceCalc = () => webOS.backspaceCalc();
window.calculate = () => webOS.calculate();
window.setAlarm = () => webOS.setAlarm();
window.deleteAlarm = (id) => webOS.deleteAlarm(id);
window.handleTerminalKey = (e) => webOS.handleTerminalKey(e);
window.executeCommand = () => webOS.executeCommand();
window.lockScreen = () => webOS.lockScreen();
window.unlockScreen = () => webOS.unlockScreen();
