// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  windowManager.init();
  theme.init();
  clock.update();
  
  // Request notification permission
  if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
});
