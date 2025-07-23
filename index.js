  // Initialize apps
  const apps = [
    'notepad', 'camera', 'location', 'explorer', 'clipboard',
    'calculator', 'browser', 'clock', 'terminal'
  ];
  
  // Initialize window controls for each app
  apps.forEach(app => {
    makeDraggable(app);
    
    // Add event listeners for window controls
    document.getElementById(`minimize-${app}`).addEventListener('click', () => minimizeApp(app));
    document.getElementById(`maximize-${app}`).addEventListener('click', () => maximizeApp(app));
    document.getElementById(`close-${app}`).addEventListener('click', () => closeApp(app));
    
    // Add touch event listeners for mobile
    document.getElementById(`minimize-${app}`).addEventListener('touchend', (e) => {
      e.preventDefault();
      minimizeApp(app);
    });
    document.getElementById(`maximize-${app}`).addEventListener('touchend', (e) => {
      e.preventDefault();
      maximizeApp(app);
    });
    document.getElementById(`close-${app}`).addEventListener('touchend', (e) => {
      e.preventDefault();
      closeApp(app);
    });
  });

  // Window management functions
  function openApp(id) {
    const el = document.getElementById(id);
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
      case 'location':
        getLocation();
        break;
      case 'clock':
        updateClock();
        loadAlarms();
        break;
    }
  }

  function closeApp(id) {
    const el = document.getElementById(id);
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
    document.getElementById(id).style.display = 'none';
  }

  function maximizeApp(id) {
    const el = document.getElementById(id);
    el.classList.toggle('maximized');
    
    if (el.classList.contains('maximized')) {
      // Store original position and size
      el.dataset.originalTop = el.style.top;
      el.dataset.originalLeft = el.style.left;
      el.dataset.originalWidth = el.style.width;
      
      // Maximize
      el.style.top = '0';
      el.style.left = '0';
      el.style.width = '100%';
      el.style.height = '100%';
    } else {
      // Restore original position and size
      el.style.top = el.dataset.originalTop;
      el.style.left = el.dataset.originalLeft;
      el.style.width = el.dataset.originalWidth;
      el.style.height = '';
    }
  }

  function makeDraggable(id) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const header = el.querySelector('.header');
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
      } else {
        // Fallback for browsers that don't support File System Access API
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

  async function loadNote() {
    try {
      if (window.showOpenFilePicker) {
        const [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        const text = await file.text();
        document.getElementById('notepadText').value = text;
      } else {
        // Fallback for browsers that don't support File System Access API
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
    } catch (err) {
      console.error('Error loading file:', err);
      if (err.name !== 'AbortError') {
        alert('Error loading file. Your browser may not support this feature.');
      }
    }
  }

  // Camera functions
  function startCamera() {
    const video = document.getElementById('video');
    
    if (video.srcObject) {
      return; // Camera already started
    }
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        video.srcObject = stream;
      })
      .catch(err => {
        console.error('Camera error:', err);
        video.srcObject = null;
        document.getElementById('camera').querySelector('.content').innerHTML = `
          <p>Could not access camera. Please ensure you've granted permission.</p>
          <button onclick="startCamera()">Try Again</button>
        `;
      });
  }

  function takePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('photoCanvas');
    const contentDiv = document.getElementById('camera').querySelector('.content');
    
    if (!video.srcObject) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Show the photo
    const imgUrl = canvas.toDataURL('image/png');
    contentDiv.innerHTML = `
      <img src="${imgUrl}" style="max-width: 100%; border-radius: 0.5rem;" />
      <button onclick="savePhoto('${imgUrl}')">💾 Save Photo</button>
      <button onclick="startCamera()">↩️ Back to Camera</button>
    `;
  }

  function savePhoto(imgUrl) {
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = 'photo.png';
    a.click();
  }

  // Location functions
  function getLocation() {
    const loc = document.getElementById('locationInfo');
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
        
        // Show simple map (using OpenStreetMap iframe)
        document.getElementById('map').innerHTML = `
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
      },
      err => {
        console.error('Geolocation error:', err);
        loc.textContent = 'Unable to retrieve your location: ' + 
          (err.message || 'Permission denied or location unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // File Explorer functions
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
        input.onchange = e => {
          file = e.target.files[0];
          readFileContent(file);
        };
        input.click();
        return;
      }
      
      readFileContent(file);
    } catch (err) {
      console.error('Error loading file:', err);
      if (err.name !== 'AbortError') {
        alert('Error loading file. Your browser may not support this feature.');
      }
    }
  }

  function readFileContent(file) {
    const reader = new FileReader();
    reader.onload = event => {
      document.getElementById('fileContent').textContent = event.target.result;
    };
    reader.onerror = () => {
      document.getElementById('fileContent').textContent = 'Error reading file';
    };
    reader.readAsText(file);
  }

  async function saveFile() {
    const content = document.getElementById('fileContent').textContent;
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker();
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        // Fallback for browsers that don't support File System Access API
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

  // Clipboard functions
  async function showClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('clipboardText').value = text || 'Clipboard is empty.';
      document.getElementById('clipboardStatus').textContent = 'Clipboard content loaded';
      setTimeout(() => {
        document.getElementById('clipboardStatus').textContent = '';
      }, 2000);
    } catch (err) {
      console.error('Clipboard error:', err);
      document.getElementById('clipboardStatus').textContent = 'Clipboard access denied. Paste manually.';
      // Fallback for browsers that don't support clipboard API
      document.getElementById('clipboardText').value = '';
      document.getElementById('clipboardText').focus();
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
      } catch (err) {
        document.getElementById('clipboardStatus').textContent = 'Failed to copy. Please copy manually.';
      }
      document.body.removeChild(textarea);
    }
  }

  // Calculator functions
  let calcValue = '0';

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
    document.getElementById('calcDisplay').textContent = calcValue;
  }

  // Browser functions
  let currentBrowserUrl = '';

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
      
      // Try to embed in iframe (will fail for most sites due to security)
      tryEmbedUrl(url);
    } catch (e) {
      showBrowserError("Invalid URL format. Please include http:// or https://");
    }
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
      <div class="browser-message">This website cannot be embedded due to security restrictions.</div>
      <a href="${url}" target="_blank" class="browser-link">Open ${new URL(url).hostname} in New Tab</a>
      <div class="browser-note">Most modern websites block being embedded in iframes</div>
    `;
  }

  function showBrowserError(message) {
    const browserContent = document.getElementById('browserContent');
    browserContent.innerHTML = `
      <div class="browser-message browser-error">${message}</div>
      <div class="browser-note">Example valid URLs: google.com, https://example.com</div>
    `;
  }

  function openCurrentInNewTab() {
    if (currentBrowserUrl) {
      window.open(currentBrowserUrl, '_blank');
    } else {
      alert('Please enter and load a URL first');
    }
  }

  // Clock and Alarm functions
  function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    document.getElementById('timeDisplay').textContent = timeStr;
    document.getElementById('dateDisplay').textContent = dateStr;
    
    // Check alarms
    checkAlarms(now);
    
    setTimeout(updateClock, 1000);
  }

  function setAlarm() {
    const timeInput = document.getElementById('alarmTime').value;
    const labelInput = document.getElementById('alarmLabel').value || 'Alarm';
    
    if (!timeInput) return;
    
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
  }

  function loadAlarms() {
    const alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
    const alarmList = document.getElementById('alarmList');
    
    alarmList.innerHTML = '';
    
    alarms.forEach(alarm => {
      const alarmItem = document.createElement('div');
      alarmItem.className = 'alarm-item';
      alarmItem.innerHTML = `
        <span>${alarm.label} - ${alarm.time}</span>
        <button onclick="deleteAlarm(${alarm.id})">Delete</button>
      `;
      alarmList.appendChild(alarmItem);
    });
  }

  function deleteAlarm(id) {
    let alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
    alarms = alarms.filter(alarm => alarm.id !== id);
    localStorage.setItem('alarms', JSON.stringify(alarms));
    loadAlarms();
  }

  function checkAlarms(now) {
    const alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    
    alarms.forEach(alarm => {
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
        
        // Remove the alarm if it's a one-time alarm
        deleteAlarm(alarm.id);
      }
    });
  }

  // Terminal functions
  function handleTerminalKey(e) {
    if (e.key === 'Enter') {
      executeCommand();
    }
  }

  function executeCommand() {
    const input = document.getElementById('terminalInput');
    const command = input.value.trim();
    input.value = '';
    
    if (!command) return;
    
    const output = document.getElementById('terminalOutput');
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
          output.innerHTML += 'Usage: open [app]<br>Available apps: notepad, camera, location, explorer, clipboard, calculator, browser, clock, terminal<br><br>';
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

  // Lock screen functions
  function lockScreen() {
    document.getElementById('lockScreen').style.display = 'flex';
    // Disable all apps
    apps.forEach(app => {
      document.getElementById(app).style.display = 'none';
    });
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

  // Theme functions
  function toggleTheme() {
    const html = document.documentElement;
    const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    
    // Save preference to localStorage
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.error('Error saving theme preference:', e);
    }
  }

  // Initialize theme from localStorage
  function initTheme() {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch (e) {
      console.error('Error loading theme preference:', e);
    }
  }

  // Initialize the app
  initTheme();
  updateClock();
  
  // Request notification permission
  if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
