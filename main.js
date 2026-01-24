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
    
    const menuLevel = document.getElementById('menu-level');
    const menuGold = document.getElementById('menu-gold');
    const menuClass = document.getElementById('menu-class');
    const menuHp = document.getElementById('menu-hp');
    const menuHpBar = document.getElementById('menu-hp-bar');
    
    if (menuLevel) menuLevel.textContent = player.level;
    if (menuGold) menuGold.textContent = player.gold;
    if (menuClass) menuClass.textContent = player.classId === 'warrior' ? 'Воин' : 'Ассасин';
    if (menuHp) menuHp.textContent = `${player.currentHp}/${player.maxHp}`;
    
    if (menuHpBar) {
      const hpPercent = (player.currentHp / player.maxHp) * 100;
      menuHpBar.style.width = `${hpPercent}%`;
    }
  }

  updateBattle() {
    if (!player) return;
    
    // Обновляем HUD элементы только если они существуют
    const battleLevel = document.getElementById('battle-level');
    const battleGold = document.getElementById('battle-gold');
    const battleHp = document.getElementById('battle-hp');
    const battleAtk = document.getElementById('battle-atk');
    const battleDef = document.getElementById('battle-def');
    const battleProgress = document.getElementById('battle-progress');
    const battleEnemies = document.getElementById('battle-enemies');
    
    if (battleLevel) battleLevel.textContent = player.level;
    if (battleGold) battleGold.textContent = player.gold;
    if (battleHp) battleHp.textContent = `${player.currentHp}/${player.maxHp}`;
    if (battleAtk) battleAtk.textContent = player.stats.atk;
    if (battleDef) battleDef.textContent = player.stats.def;
    
    // Обновляем информацию о классе в HUD битвы
    this.updateBattleClassInfo();
    
    // Обновляем список локаций, только если сцена битвы активна
    if (this.currentScene === 'battle') {
      this.updateLocationList();
    }
  }

  updateBattleClassInfo() {
    const battleHUD = document.querySelector('.battle-hud');
    if (battleHUD && player) {
      // Удаляем старую информацию
      const existingClassInfo = battleHUD.querySelector('.player-class-info');
      if (existingClassInfo) {
        existingClassInfo.remove();
      }
      
      // Добавляем новую информацию
      const classInfo = document.createElement('div');
      classInfo.className = 'player-class-info';
      classInfo.innerHTML = `Класс: ${player.classId === 'warrior' ? '⚔️ Воин' : '🗡️ Ассасин'}`;
      classInfo.style.cssText = `
        grid-column: span 3;
        background: rgba(255, 255, 255, 0.05);
        padding: 5px 10px;
        border-radius: 5px;
        margin-top: 5px;
        font-size: 0.9em;
        text-align: center;
        color: ${player.classId === 'warrior' ? '#4cd137' : '#9b59b6'};
      `;
      battleHUD.appendChild(classInfo);
    }
  }

  updateLocationList() {
    const locationList = document.getElementById('location-list');
    if (!locationList) return;
    
    locationList.innerHTML = '';
    
    // Сортируем локации по уровню
    const sortedLocations = Object.entries(LOCATIONS).sort(([, a], [, b]) => a.level - b.level);
    
    for (const [locId, loc] of sortedLocations) {
      const btn = document.createElement('div');
      btn.className = 'location-btn';
      
      // Проверяем доступность локации
      const isAvailable = player.level >= loc.level;
      const isLocked = !isAvailable;
      
      if (isLocked) {
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        btn.style.filter = 'grayscale(0.5)';
      }
      
      // Определяем иконку локации
      let icon = '📍';
      if (loc.name.includes('Завод')) icon = '🏭';
      if (loc.name.includes('Лес')) icon = '🌲';
      if (loc.name.includes('Подземелье')) icon = '🏰';
      
      btn.innerHTML = `
        <div class="location-icon">${icon}</div>
        <div class="location-details">
          <strong>${loc.name}</strong>
          <div class="location-stats">
            <span>📊 Ур. ${loc.level}</span>
            <span>👾 Врагов: ${loc.enemies}</span>
            <span>❤️ HP: ${loc.enemyHp}</span>
            <span>⚔️ ATK: ${loc.enemyAtk}</span>
          </div>
          ${isLocked ? '<div class="location-lock">🔒 Требуется уровень ' + loc.level + '</div>' : ''}
        </div>
      `;
      
      if (isAvailable) {
        btn.onclick = () => {
          console.log(`🎮 Выбрана локация: ${loc.name}`);
          // Переключаемся на игровой интерфейс
          const locationSelection = document.getElementById('location-selection');
          const battleGame = document.getElementById('battle-game');
          
          if (locationSelection) locationSelection.style.display = 'none';
          if (battleGame) battleGame.style.display = 'block';
          
          // Запускаем битву
          startBattle(locId);
        };
      }
      
      locationList.appendChild(btn);
    }
  }

  updateInventory() {
    if (!player) return;
    
    const statHp = document.getElementById('stat-hp');
    const statAtk = document.getElementById('stat-atk');
    const statDef = document.getElementById('stat-def');
    const statCrit = document.getElementById('stat-crit');
    
    if (statHp) statHp.textContent = player.stats.hp;
    if (statAtk) statAtk.textContent = player.stats.atk;
    if (statDef) statDef.textContent = player.stats.def;
    if (statCrit) {
      const critPercent = (player.stats.crit || 0) * 100;
      statCrit.textContent = `${critPercent.toFixed(1)}%`;
    }
  }

  updateShop() {
    const shopGold = document.getElementById('shop-gold');
    if (shopGold && player) {
      shopGold.textContent = player.gold;
    }
  }

  updateSkills() {
    // TODO: Добавить логику навыков
  }

  updateOptions() {
    // TODO: Добавить логику настроек
  }

  initEventListeners() {
    console.log('🎮 Инициализация обработчиков событий...');
    
    // Кнопки перехода по сценам (обработчик делегирования)
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Обработка кнопок с data-scene
      if (target.closest('[data-scene]')) {
        e.preventDefault();
        const targetScene = target.closest('[data-scene]').getAttribute('data-scene');
        this.showScene(targetScene);
      }
      
      // Обработка кнопок меню
      if (target.closest('.menu-btn')) {
        e.preventDefault();
        const targetScene = target.closest('.menu-btn').getAttribute('data-scene');
        this.showScene(targetScene);
      }
    });

    // Кнопка отладки (проверяем существование)
    const debugBtn = document.getElementById('btn-debug');
    if (debugBtn) {
      debugBtn.addEventListener('click', () => {
        debugSaveSystem();
        console.log('Игрок:', player);
      });
    }

    // Настройки звука (проверяем существование)
    const musicVolume = document.getElementById('music-volume');
    const sfxVolume = document.getElementById('sfx-volume');
    
    if (musicVolume) {
      musicVolume.addEventListener('input', (e) => {
        console.log('Громкость музыки:', e.target.value);
      });
    }
    
    if (sfxVolume) {
      sfxVolume.addEventListener('input', (e) => {
        console.log('Громкость эффектов:', e.target.value);
      });
    }

    // Очистка сохранений (проверяем существование)
    const clearSaveBtn = document.getElementById('btn-clear-save');
    if (clearSaveBtn) {
      clearSaveBtn.addEventListener('click', () => {
        if (confirm('Вы уверены? Все данные будут удалены!')) {
          localStorage.clear();
          if (window.Telegram?.WebApp?.CloudStorage) {
            // TODO: Очистка CloudStorage
          }
          alert('Сохранения очищены! Перезагрузите страницу.');
        }
      });
    }

    // Вкладки магазина (делегирование)
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.closest('.shop-tab')) {
        const tab = target.closest('.shop-tab');
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
        const category = document.getElementById(`shop-${tabId}`);
        if (category) {
          category.classList.add('active');
        }
      }
    });

    // Экспорт/импорт сохранений
    const exportBtn = document.getElementById('btn-export-save');
    const importBtn = document.getElementById('btn-import-save');
    
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = JSON.stringify(player, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stickman_rpg_save.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
    
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const savedData = JSON.parse(e.target.result);
                Object.assign(player, savedData);
                savePlayer(player);
                this.updateAllDisplays();
                alert('Сохранение загружено!');
              } catch (err) {
                alert('Ошибка загрузки сохранения: ' + err.message);
              }
            };
            reader.readAsText(file);
          }
        };
        input.click();
      });
    }

    // Автосохранение при закрытии
    window.addEventListener('beforeunload', () => {
      if (player) {
        savePlayer(player);
      }
    });

    console.log('✅ Обработчики событий инициализированы');
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
    if (Telegram.WebApp.BackButton) {
      Telegram.WebApp.BackButton.onClick(() => {
        window.history.back();
      });
      Telegram.WebApp.BackButton.show();
    }
    
    console.log('👤 Пользователь:', Telegram.WebApp.initDataUnsafe?.user);
  } else {
    console.log('🌐 Запущено вне Telegram');
  }
}

// Запуск игры
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM загружен');
  initTelegram();
  
  // Запускаем SceneManager
  window.sceneManager = new SceneManager();
  
  // Для отладки - доступ из консоли
  window.game = {
    player,
    scenes: window.sceneManager,
    save: () => savePlayer(player),
    load: () => loadPlayer(),
    startBattle: (locId) => startBattle(locId)
  };
  
  console.log('🎮 Игра запущена!');
});
