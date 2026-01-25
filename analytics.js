// analytics.js
export class Analytics {
  constructor() {
    this.events = [];
  }
  
  track(event, data = {}) {
    const eventData = {
      event,
      timestamp: Date.now(),
      playerLevel: player?.level,
      ...data
    };
    
    this.events.push(eventData);
    
    // Сохранять в localStorage для последующего анализа
    if (this.events.length > 100) {
      this.saveEvents();
    }
  }
  
  saveEvents() {
    localStorage.setItem('game_analytics', JSON.stringify(this.events));
  }
}