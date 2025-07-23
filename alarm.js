const alarm = {
  setAlarm: function() {
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
    this.loadAlarms();
    
    // Clear inputs
    document.getElementById('alarmTime').value = '';
    document.getElementById('alarmLabel').value = '';
  },
  
  loadAlarms: function() {
    const alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
    const alarmList = document.getElementById('alarmList');
    
    alarmList.innerHTML = '';
    
    alarms.forEach(alarm => {
      const alarmItem = document.createElement('div');
      alarmItem.className = 'alarm-item';
      alarmItem.innerHTML = `
        <span>${alarm.label} - ${alarm.time}</span>
        <button onclick="alarm.deleteAlarm(${alarm.id})">Delete</button>
      `;
      alarmList.appendChild(alarmItem);
    });
  },
  
  deleteAlarm: function(id) {
    let alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
    alarms = alarms.filter(alarm => alarm.id !== id);
    localStorage.setItem('alarms', JSON.stringify(alarms));
    this.loadAlarms();
  },
  
  checkAlarms: function(now) {
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
        this.deleteAlarm(alarm.id);
      }
    });
  }
};
