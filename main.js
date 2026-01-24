// main.js
import { initPlayer, player, playerReady } from './game.js';
import { savePlayer, loadPlayer, debugSaveSystem } from './telegramSave.js';
import { startBattle } from './battle.js';
import { LOCATIONS } from './data.js';
import { 
  InventorySystem, 
  ITEMS_DB, 
  generateRandomItem,
  ITEM_RARITY  // Убедитесь, что импортируется
} from './inventory.js';
import { 
    ShopSystem, 
    SHOP_CATEGORIES, 
    initializeShopUI, 
    initializeShopTabs, 
    updateRefreshInfo 
  } from './shop.js';

class SceneManager {
  constructor() {
    this.currentScene = 'menu';
    this.scenes = {};
    this.inventorySystem = null;
    this.shopSystem = null;
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
    
    // Инициализируем систему инвентаря
    this.inventorySystem = new InventorySystem(player);
    // Инициализируем систему магазина
    this.shopSystem = new ShopSystem(player, this.inventorySystem);
    this.initEventListeners();
    this.updateAllDisplays();
    this.showScene('menu');
    
    // Для отладки: добавляем несколько тестовых предметов
    if (this.inventorySystem.items.length === 0) {
      this.addTestItems();
    }
    
    console.log('🎮 Игра готова!');
  }

  // Добавляем тестовые предметы (для демонстрации)
  addTestItems() {
    console.log('📦 Добавляем тестовые предметы...');
    
    this.inventorySystem.addItem(ITEMS_DB.sword_beginner);
    this.inventorySystem.addItem(ITEMS_DB.leather_armor);
    this.inventorySystem.addItem(ITEMS_DB.health_potion_small);
    this.inventorySystem.addItem(ITEMS_DB.iron_ore);
    this.inventorySystem.addItem(generateRandomItem(1, 3));
    
    console.log('✅ Тестовые предметы добавлены');
  }

  // Обновлённый метод updateInventory:
  updateInventory() {
    if (!player || !this.inventorySystem) return;
    
    // Обновляем характеристики
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
    
    // Обновляем список предметов
    this.renderInventoryItems();
    
    // Обновляем экипировку
    this.renderEquipment();
  }

  // Рендер предметов в инвентаре
  renderInventoryItems() {
    const itemsList = document.getElementById('inventory-list');
    if (!itemsList || !this.inventorySystem) return;
    
    itemsList.innerHTML = '';
    
    if (this.inventorySystem.items.length === 0) {
      itemsList.innerHTML = '<div class="empty-inventory">Инвентарь пуст</div>';
      return;
    }
    
    // Сортируем предметы: сначала экипированные, потом по редкости
    const sortedItems = [...this.inventorySystem.items].sort((a, b) => {
      if (a.equipped && !b.equipped) return -1;
      if (!a.equipped && b.equipped) return 1;
      
      const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
    
    sortedItems.forEach(item => {
      const itemEl = this.createInventoryItemElement(item);
      itemsList.appendChild(itemEl);
    });
    
    // Обновляем счетчик предметов
    const itemCount = document.getElementById('item-count');
    if (itemCount) {
      itemCount.textContent = `${this.inventorySystem.items.length}/${this.inventorySystem.maxSlots}`;
    }
  }

  // Создание элемента предмета
  createInventoryItemElement(item) {
    // Используем импортированную ITEM_RARITY
    const rarity = ITEM_RARITY[item.rarity] || ITEM_RARITY.common;
    
    const itemEl = document.createElement('div');
    itemEl.className = `inventory-item ${item.equipped ? 'equipped' : ''}`;
    itemEl.dataset.itemId = item.id;
    itemEl.style.borderLeft = `4px solid ${rarity.color}`;
    
    itemEl.innerHTML = `
      <div class="item-icon">${item.icon}</div>
      <div class="item-info">
        <div class="item-name" style="color: ${rarity.color}">
          ${item.name} ${item.equipped ? '✅' : ''}
        </div>
        <div class="item-description">${item.description}</div>
        <div class="item-stats">
          ${item.stats ? this.formatItemStats(item.stats) : ''}
          ${item.effect ? `<div class="item-effect">Эффект: ${this.formatItemEffect(item.effect)}</div>` : ''}
        </div>
        <div class="item-value">💰 ${item.value}</div>
        ${item.stackable && item.quantity > 1 ? `<div class="item-quantity">x${item.quantity}</div>` : ''}
      </div>
      <div class="item-actions">
        ${!item.equipped ? `<button class="btn-equip" data-action="equip">Экипировать</button>` : ''}
        ${item.equipped ? `<button class="btn-unequip" data-action="unequip">Снять</button>` : ''}
        ${item.type === 'potion' ? `<button class="btn-use" data-action="use">Использовать</button>` : ''}
        <button class="btn-sell" data-action="sell">Продать</button>
      </div>
    `;
    
    // Добавляем обработчики событий
    const buttons = itemEl.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        this.handleItemAction(item.id, action);
      });
    });
    
    return itemEl;
  }

  // Форматирование статов предмета
  formatItemStats(stats) {
    let html = '';
    if (stats.hp) html += `<span>❤️ +${stats.hp} HP</span>`;
    if (stats.atk) html += `<span>⚔️ +${stats.atk} ATK</span>`;
    if (stats.def) html += `<span>🛡️ +${stats.def} DEF</span>`;
    if (stats.crit) html += `<span>🎯 +${(stats.crit * 100).toFixed(1)}% крит</span>`;
    return html;
  }

  // Форматирование эффекта предмета
  formatItemEffect(effect) {
    switch (effect.type) {
      case 'heal': return `Восстанавливает ${effect.value} HP`;
      case 'buff': return `+${effect.value} к ${effect.stat}`;
      default: return effect.type;
    }
  }

  // Обработка действий с предметами
  handleItemAction(itemId, action) {
    if (!this.inventorySystem) return;
    
    switch (action) {
      case 'equip':
        if (this.inventorySystem.equipItem(itemId)) {
          this.showMessage('✅ Предмет экипирован');
          this.updateInventory();
          this.updateAllDisplays(); // Обновляем все сцены
        }
        break;
        
      case 'unequip':
        if (this.inventorySystem.unequipItem(itemId)) {
          this.showMessage('📦 Предмет снят');
          this.updateInventory();
          this.updateAllDisplays();
        }
        break;
        
      case 'use':
        if (this.inventorySystem.useItem(itemId)) {
          this.showMessage('✨ Предмет использован');
          this.updateInventory();
          this.updateAllDisplays();
        }
        break;
        
      case 'sell':
        const item = this.inventorySystem.getItem(itemId);
        if (item && confirm(`Продать "${item.name}" за ${Math.floor(item.value * 0.5)} золота?`)) {
          if (this.inventorySystem.sellItem(itemId)) {
            this.showMessage(`💰 Продано за ${Math.floor(item.value * 0.5)} золота`);
            this.updateInventory();
            this.updateAllDisplays();
          }
        }
        break;
    }
  }

  // Рендер экипировки
  renderEquipment() {
    if (!this.inventorySystem) return;
    
    const slots = {
      weapon: document.querySelector('.slot[data-slot="weapon"]'),
      armor: document.querySelector('.slot[data-slot="armor"]'),
      helmet: document.querySelector('.slot[data-slot="helmet"]'),
      boots: document.querySelector('.slot[data-slot="boots"]'),
      ring: document.querySelector('.slot[data-slot="ring"]'),
      amulet: document.querySelector('.slot[data-slot="amulet"]')
    };
    
    Object.entries(slots).forEach(([slotType, slotElement]) => {
      if (slotElement) {
        const equippedItem = this.inventorySystem.equipment[slotType];
        
        if (equippedItem) {
          const rarity = ITEM_RARITY[equippedItem.rarity] || ITEM_RARITY.common;
          slotElement.innerHTML = `
            <div class="equipped-item" style="border-color: ${rarity.color}">
              <div class="equipped-icon">${equippedItem.icon}</div>
              <div class="equipped-name">${equippedItem.name}</div>
              <button class="btn-unequip-slot" data-slot="${slotType}">Снять</button>
            </div>
          `;
          
          // Обработчик кнопки снятия
          const unequipBtn = slotElement.querySelector('.btn-unequip-slot');
          if (unequipBtn) {
            unequipBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.handleItemAction(equippedItem.id, 'unequip');
            });
          }
        } else {
          slotElement.innerHTML = `
            <div class="slot-empty">
              ${this.getSlotIcon(slotType)} ${this.getSlotName(slotType)}
            </div>
          `;
        }
      }
    });
  }

  // Вспомогательные функции для слотов
  getSlotIcon(slotType) {
    const icons = {
      weapon: '🗡️',
      armor: '🛡️',
      helmet: '⛑️',
      boots: '👢',
      ring: '💍',
      amulet: '📿'
    };
    return icons[slotType] || '📦';
  }

  getSlotName(slotType) {
    const names = {
      weapon: 'Оружие',
      armor: 'Броня',
      helmet: 'Шлем',
      boots: 'Ботинки',
      ring: 'Кольцо',
      amulet: 'Амулет'
    };
    return names[slotType] || 'Слот';
  }

  // Сообщение для пользователя
  showMessage(text) {
    const messageEl = document.createElement('div');
    messageEl.className = 'game-message';
    messageEl.textContent = text;
    messageEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      z-index: 1000;
      animation: fadeInOut 2s ease-in-out;
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.remove();
    }, 2000);
  }

  // Обновлённый метод showScene
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

 updateShop() {
    if (!player || !this.shopSystem) return;
    
    // Обновляем баланс
    const shopGold = document.getElementById('shop-gold');
    if (shopGold) {
      shopGold.textContent = player.gold;
    }
    
    // Обновляем кристаллы (если будут)
    const shopGems = document.getElementById('shop-gems');
    if (shopGems) {
      shopGems.textContent = player.gems || 0;
    }
    
    // Инициализируем вкладки магазина
    initializeShopTabs(this.shopSystem, player);
    
    // Инициализируем товары
    initializeShopUI(this.shopSystem, player);
    
    // Обновляем информацию об обновлении
    updateRefreshInfo(this.shopSystem, player);
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
