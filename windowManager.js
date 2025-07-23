const windowManager = {
  apps: [
    'notepad', 'camera', 'location', 'explorer', 'clipboard',
    'calculator', 'browser', 'clock', 'terminal'
  ],
  
  init: function() {
    this.apps.forEach(app => {
      this.makeDraggable(app);
      
      // Add event listeners for window controls
      document.getElementById(`minimize-${app}`).addEventListener('click', () => this.minimizeApp(app));
      document.getElementById(`maximize-${app}`).addEventListener('click', () => this.maximizeApp(app));
      document.getElementById(`close-${app}`).addEventListener('click', () => this.closeApp(app));
      
      // Add touch event listeners for mobile
      document.getElementById(`minimize-${app}`).addEventListener('touchend', (e) => {
        e.preventDefault();
        this.minimizeApp(app);
      });
      document.getElementById(`maximize-${app}`).addEventListener('touchend', (e) => {
        e.preventDefault();
        this.maximizeApp(app);
      });
      document.getElementById(`close-${app}`).addEventListener('touchend', (e) => {
        e.preventDefault();
        this.closeApp(app);
      });
    });
  },
  
  openApp: function(id) {
    const el = document.getElementById(id);
    el.style.display = 'block';
    el.classList.remove('minimized');
    el.style.zIndex = Date.now();
    
    // Bring to front when clicked
    el.addEventListener('click', function() {
      this.style.zIndex = Date.now();
    });
    
    // App-specific initialization
    switch(id) {
      case 'camera':
        camera.start();
        break;
      case 'location':
        locationApp.getLocation();
        break;
    }
  },
  
  closeApp: function(id) {
    const el = document.getElementById(id);
    el.style.display = 'none';
    el.classList.remove('maximized');
    el.classList.remove('minimized');
    
    // Stop camera when closing
    if (id === 'camera') {
      const video = document.getElementById('video');
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
    }
  },
  
  minimizeApp: function(id) {
    const el = document.getElementById(id);
    el.classList.add('minimized');
  },
  
  maximizeApp: function(id) {
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
  },
  
  makeDraggable: function(id) {
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
  },
  
  lockScreen: function() {
    document.getElementById('lockScreen').style.display = 'flex';
    // Disable all apps
    this.apps.forEach(app => {
      document.getElementById(app).style.display = 'none';
    });
  },
  
  unlockScreen: function() {
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
};
