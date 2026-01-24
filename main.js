// main.js
import { initPlayer, player, playerReady } from './game.js';
import { savePlayer, loadPlayer, debugSaveSystem } from './telegramSave.js';
import { startBattle } from './battle.js';
import { LOCATIONS } from './data.js';

class SceneManager {
  constructor() {
    this.currentScene = 'menu';
    this.scenes = {};
    this.init();
  }

  async init() {
    console.log('🚀 Инициализация игры...');
    
    // Инициализируем все сцены
    this.scenes = {
      menu: document.getElementById('scene-menu'),
      battle: document.getElementById('scene-battle'),
      inventory: document.getElementById('scene-inventory'),
      shop: document.getElementById('scene-shop'),
      skills: document.getElementById('scene-skills'),
      options: document.getElementById('scene-options')
    };

    // Ждём загрузку игрока
    await playerReady;
    console.log('✅ Игрок загружен:', player);
    
    this.initEventListeners();
    this.updateAllDisplays();
    this.showScene('menu');
    
    console.log('🎮 Игра готова!');
  }

showScene(sceneName) {
  // Скрываем все сцены
  Object.values(this.scenes).forEach(scene => {
    scene.classList.remove('active');
  });
  
  // Показываем выбранную сцену
  if (this.scenes[sceneName]) {
    this.scenes[sceneName].classList.add('active');
    this.currentScene = sceneName;
    
    // Обновляем данные на сцене
    this.updateScene(sceneName);
    
    // Особенная логика для сцены битвы
    if (sceneName === 'battle') {
      // Если битва не активна, показываем выбор локаций
      if (window.battleSystem && !window.battleSystem.isBattleActive) {
        window.battleSystem.showLocationSelection();
      }
    }
    
    console.log(`🔄 Переключились на сцену: ${sceneName}`);
  }
}
  updateScene(sceneName) {
    switch (sceneName) {
      case 'menu':
        this.updateMenu();
        break;
      case 'battle':
        this.updateBattle();
        break;
      case 'inventory':
        this.updateInventory();
        break;
      case 'shop':
        this.updateShop();
        break;
      case 'skills':
        this.updateSkills();
        break;
      case 'options':
        this.updateOptions();
        break;
    }
  }

  updateAllDisplays() {
    this.updateMenu();
    this.updateBattle();
    this.updateInventory();
    this.updateShop();
  }

  updateMenu() {
    if (!player) return;
    
    document.getElementById('menu-level').textContent = player.level;
    document.getElementById('menu-gold').textContent = player.gold;
    document.getElementById('menu-class').textContent = player.classId === 'warrior' ? 'Воин' : 'Ассасин';
    document.getElementById('menu-hp').textContent = `${player.currentHp}/${player.maxHp}`;
    
    const hpPercent = (player.currentHp / player.maxHp) * 100;
    document.getElementById('menu-hp-bar').style.width = `${hpPercent}%`;
  }

updateBattle() {
  if (!player) return;
  
  // Обновляем информацию о локациях при показе сцены
  if (window.battleSystem && !window.battleSystem.isBattleActive) {
    window.battleSystem.showLocationSelection();
  }
  
  // Обновляем HUD элементы
  const elements = {
    level: document.getElementById('battle-level'),
    gold: document.getElementById('battle-gold'),
    hp: document.getElementById('battle-hp'),
    atk: document.getElementById('battle-atk'),
    def: document.getElementById('battle-def'),
    progress: document.getElementById('battle-progress'),
    enemies: document.getElementById('battle-enemies')
  };
  
  if (elements.level) elements.level.textContent = player.level;
  if (elements.gold) elements.gold.textContent = player.gold;
  if (elements.hp) elements.hp.textContent = `${player.currentHp}/${player.maxHp}`;
  if (elements.atk) elements.atk.textContent = player.stats.atk;
  if (elements.def) elements.def.textContent = player.stats.def;
  
  // Обновляем информацию о классе
  this.updateClassInfo();
}
updateClassInfo() {
  const battleHUD = document.querySelector('.battle-hud');
  if (battleHUD && player) {
    // Удаляем старую информацию
    const existingClassInfo = battleHUD.querySelector('.player-class-info');
    if (existingClassInfo) existingClassInfo.remove();
    
    // Добавляем новую
    const classInfo = document.createElement('div');
    classInfo.className = 'player-class-info';
    classInfo.innerHTML = `Класс: ${player.classId === 'warrior' ? '⚔️ Воин' : '🗡️ Ассасин'}`;
    battleHUD.appendChild(classInfo);
  }
}
// Обновлённый updateLocationList
updateLocationList() {
  const locationList = document.getElementById('location-list');
  if (!locationList) return;
  
  locationList.innerHTML = '';
  
  // Сортируем локации по уровню
  const sortedLocations = Object.entries(LOCATIONS)
    .sort(([, a], [, b]) => a.level - b.level);
  
  for (const [locId, loc] of sortedLocations) {
    const btn = document.createElement('div');
    btn.className = 'location-btn';
    
    // Проверяем доступность локации (уровень игрока >= уровня локации)
    const isAvailable = player.level >= loc.level;
    const isLocked = !isAvailable;
    
    if (isLocked) {
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';
      btn.style.filter = 'grayscale(0.5)';
    }
    
    btn.innerHTML = `
      <strong>${loc.name}</strong><br>
      <small>Уровень: ${loc.level}</small><br>
      <small>Врагов: ${loc.enemies}</small>
      ${isLocked ? '<br><small style="color:#e74c3c;">🔒 Недоступно</small>' : ''}
    `;
    
    if (isAvailable) {
      btn.onclick = () => {
        console.log(`🎮 Выбрана локация: ${loc.name}`);
        locationList.style.display = 'none';
        const logEl = document.getElementById('battle-log');
        if (logEl) logEl.textContent = `Вы выбрали: ${loc.name}\n`;
        
        // Запускаем битву с небольшой задержкой для анимации
        setTimeout(() => {
          if (window.battleSystem) {
            window.battleSystem.startBattle(locId);
          } else {
            console.error('Battle system не инициализирован');
          }
        }, 300);
      };
    }
    
    locationList.appendChild(btn);
  }
  
  console.log('📍 Список локаций обновлен');
}

// Также добавьте этот метод для полного обновления HUD
updateAllDisplays() {
  this.updateMenu();
  this.updateBattle();
  this.updateInventory();
  this.updateShop();
  console.log('🔄 Все дисплеи обновлены');
}

  updateLocationList() {
    const locationList = document.getElementById('location-list');
    locationList.innerHTML = '';
    
    for (const [locId, loc] of Object.entries(LOCATIONS)) {
      const btn = document.createElement('div');
      btn.className = 'location-btn';
      btn.innerHTML = `
        <strong>${loc.name}</strong><br>
        <small>Уровень: ${loc.level}</small><br>
        <small>Врагов: ${loc.enemies}</small>
      `;
      btn.onclick = () => {
        startBattle(locId);
        // Можно добавить плавный переход к анимации битвы
      };
      locationList.appendChild(btn);
    }
  }

  updateInventory() {
    if (!player) return;
    
    document.getElementById('stat-hp').textContent = player.stats.hp;
    document.getElementById('stat-atk').textContent = player.stats.atk;
    document.getElementById('stat-def').textContent = player.stats.def;
    document.getElementById('stat-crit').textContent = `${(player.stats.crit * 100).toFixed(1)}%`;
  }

  updateShop() {
    document.getElementById('shop-gold').textContent = player.gold;
    // TODO: Добавить логику магазина
  }

  updateSkills() {
    // TODO: Добавить логику навыков
  }

  updateOptions() {
    // TODO: Добавить логику настроек
  }

  initEventListeners() {
    // Кнопки перехода по сценам
    document.querySelectorAll('[data-scene]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetScene = btn.getAttribute('data-scene');
        this.showScene(targetScene);
      });
    });

    // Кнопки меню
    document.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetScene = btn.getAttribute('data-scene');
        this.showScene(targetScene);
      });
    });

    // Кнопка отладки
    document.getElementById('btn-debug').addEventListener('click', () => {
      debugSaveSystem();
      console.log('Игрок:', player);
    });

    // Боевые кнопки
    document.getElementById('btn-attack').addEventListener('click', () => {
      // TODO: Реализовать атаку
      console.log('⚔️ Атака!');
    });

    // Настройки звука
    document.getElementById('music-volume').addEventListener('input', (e) => {
      console.log('Громкость музыки:', e.target.value);
    });

    document.getElementById('sfx-volume').addEventListener('input', (e) => {
      console.log('Громкость эффектов:', e.target.value);
    });

    // Очистка сохранений
    document.getElementById('btn-clear-save').addEventListener('click', () => {
      if (confirm('Вы уверены? Все данные будут удалены!')) {
        localStorage.clear();
        if (window.Telegram?.WebApp?.CloudStorage) {
          // TODO: Очистка CloudStorage
        }
        alert('Сохранения очищены! Перезагрузите страницу.');
      }
    });

    // Вкладки магазина
    document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = tab.getAttribute('data-tab');
        
        // Деактивируем все вкладки
        document.querySelectorAll('.shop-tab').forEach(t => {
          t.classList.remove('active');
        });
        
        // Скрываем все категории
        document.querySelectorAll('.shop-category').forEach(cat => {
          cat.classList.remove('active');
        });
        
        // Активируем выбранную
        tab.classList.add('active');
        document.getElementById(`shop-${tabId}`).classList.add('active');
      });
    });

    // Сохранение при закрытии
    window.addEventListener('beforeunload', () => {
      savePlayer(player);
    });
  }
}

// Инициализация Telegram
function initTelegram() {
  if (window.Telegram?.WebApp) {
    console.log('📱 Telegram WebApp доступен');
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    
    // Настройка интерфейса
    Telegram.WebApp.setHeaderColor('#2d4059');
    Telegram.WebApp.setBackgroundColor('#1a1a2e');
    
    // Включаем кнопку назад в Telegram
    Telegram.WebApp.BackButton.onClick(() => {
      window.history.back();
    });
    
    Telegram.WebApp.BackButton.show();
  }
}

// Запуск игры
document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  window.sceneManager = new SceneManager();
  
  // Для отладки - доступ из консоли
  window.game = {
    player,
    scenes: window.sceneManager,
    save: () => savePlayer(player),
    load: () => loadPlayer()
  };
});
