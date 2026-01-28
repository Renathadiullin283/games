// main.js
import { initPlayer, player, playerReady } from './game.js';
import { savePlayer, loadPlayer, debugSaveSystem } from './telegramSave.js';
import { startBattle } from './battle.js';
import { LOCATIONS } from './data.js';
import { 
  InventorySystem, 
  ITEMS_DB, 
  generateRandomItem,
  ITEM_RARITY
} from './inventory.js';
import { 
  ShopSystem, 
  SHOP_CATEGORIES
} from './shop.js';
import { createSkillSystem, getClassIcon, getClassColor } from './skills.js';

class SceneManager {
  constructor() {
    this.currentScene = 'menu';
    this.scenes = {};
    this.inventorySystem = null;
    this.shopSystem = null;
    this.initializeNotifications();
    this.initializeDailyRewards();
    this.initializeMobileMenu();
    this.init();
  }

  async init() {
    console.log('🚀 Инициализация игры...');
    
    // Сначала скрываем прелоадер
    this.hidePreloader();
    
    // Инициализируем все сцены
    this.scenes = {
      menu: document.getElementById('scene-menu'),
      battle: document.getElementById('scene-battle'),
      inventory: document.getElementById('scene-inventory'),
      shop: document.getElementById('scene-shop'),
      skills: document.getElementById('scene-skills'),
      options: document.getElementById('scene-options'),
      achievements: document.getElementById('scene-achievements'),
      leaderboard: document.getElementById('scene-leaderboard')
    };

    // Ждём загрузку игрока
    try {
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
      this.testShop();
      
    } catch (error) {
      console.error('❌ Ошибка инициализации игры:', error);
      this.showError('Ошибка загрузки игры. Пожалуйста, обновите страницу.');
    }
  }

  hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.style.opacity = '0';
      setTimeout(() => {
        preloader.style.display = 'none';
      }, 500);
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(231, 76, 60, 0.95);
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 9999;
      text-align: center;
      max-width: 80%;
    `;
    errorDiv.innerHTML = `
      <h3>❌ Ошибка</h3>
      <p>${message}</p>
      <button onclick="location.reload()" style="
        background: white;
        color: #e74c3c;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        margin-top: 10px;
        cursor: pointer;
      ">Обновить страницу</button>
    `;
    document.body.appendChild(errorDiv);
  }

addTestItems() {
  console.log('📦 Добавляем тестовые предметы...');
  
  // Экипировка
  this.inventorySystem.addItem(ITEMS_DB.sword_beginner);
  this.inventorySystem.addItem(ITEMS_DB.leather_armor);
  this.inventorySystem.addItem(ITEMS_DB.iron_helmet);
  this.inventorySystem.addItem(ITEMS_DB.leather_boots);
  this.inventorySystem.addItem(ITEMS_DB.leather_gloves);
  this.inventorySystem.addItem(ITEMS_DB.chainmail_chest);
  this.inventorySystem.addItem(ITEMS_DB.silver_ring);
  this.inventorySystem.addItem(ITEMS_DB.health_amulet);
  
  // Расходники
  this.inventorySystem.addItem(ITEMS_DB.health_potion_small);
  this.inventorySystem.addItem(ITEMS_DB.health_potion_medium);
  this.inventorySystem.addItem(ITEMS_DB.strength_potion);
  
  // Материалы
  this.inventorySystem.addItem(ITEMS_DB.iron_ore);
  this.inventorySystem.addItem(ITEMS_DB.gold_ore);
  
  console.log('✅ Тестовые предметы добавлены');
}

updateInventory() {
  if (!player || !this.inventorySystem) return;
  
  // Обновляем информацию о персонаже
  this.updateCharacterInfo();
  
  // Обновляем ячейки экипировки
  this.updateEquipmentSlots();
  
  // Обновляем список предметов
  this.renderInventoryItems();
}
// Обновление информации о персонаже
updateCharacterInfo() {
  const levelEl = document.getElementById('inventory-level');
  const hpEl = document.getElementById('inventory-hp');
  const atkEl = document.getElementById('inventory-atk');
  const defEl = document.getElementById('inventory-def');
  const charIcon = document.getElementById('inventory-character-icon');
  
  if (levelEl) levelEl.textContent = player.level;
  if (hpEl) hpEl.textContent = `${player.currentHp}/${player.maxHp}`;
  if (atkEl) atkEl.textContent = player.stats.atk;
  if (defEl) defEl.textContent = player.stats.def;
  
  // Устанавливаем иконку класса
  if (charIcon) {
    const classIcons = {
      warrior: '⚔️',
      assassin: '🗡️',
      mage: '🔮',
      archer: '🏹'
    };
    charIcon.textContent = classIcons[player.classId] || '👤';
  }
}

// Обновление ячеек экипировки
updateEquipmentSlots() {
  if (!this.inventorySystem) return;
  
  const slotTypes = ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet', 'gloves', 'chest'];
  
  slotTypes.forEach(slotType => {
    const slotElement = document.querySelector(`.equipment-slot[data-slot="${slotType}"]`);
    const slotItemElement = document.getElementById(`slot-${slotType}`);
    
    if (!slotElement || !slotItemElement) {
      console.warn(`Не найден элемент для слота: ${slotType}`);
      return;
    }
    
    const equippedItem = this.inventorySystem.equipment[slotType];
    
    // Устанавливаем название слота для подсказки
    slotElement.setAttribute('data-slot-name', this.inventorySystem.getSlotName(slotType));
    
    if (equippedItem) {
      // Если в слоте есть предмет
      slotElement.classList.add('equipped');
      slotItemElement.innerHTML = equippedItem.icon;
      slotItemElement.title = equippedItem.name;
      
      // Добавляем цвет редкости
      const rarity = ITEM_RARITY[equippedItem.rarity] || ITEM_RARITY.common;
      slotItemElement.style.color = rarity.color;
    } else {
      // Пустой слот
      slotElement.classList.remove('equipped');
      slotItemElement.innerHTML = '';
      slotItemElement.title = '';
      slotItemElement.style.color = '';
    }
    
    // Удаляем старый обработчик и добавляем новый
    slotElement.onclick = null;
    slotElement.onclick = (e) => {
      e.stopPropagation();
      console.log(`Клик по слоту: ${slotType}`);
      this.openEquipmentModal(slotType);
    };
  });
}

// Открытие модального окна для выбора предмета
openEquipmentModal(slotType) {
  const modal = document.getElementById('equipment-select-modal');
  const modalTitle = document.getElementById('modal-slot-name');
  const slotInfo = document.getElementById('selected-slot-info');
  const itemsList = document.getElementById('available-items-list');
  
  if (!modal || !modalTitle || !slotInfo || !itemsList) return;
  
  // Устанавливаем заголовок
  const slotName = this.inventorySystem.getSlotName(slotType);
  const slotIcon = this.inventorySystem.getSlotIcon(slotType);
  modalTitle.innerHTML = `${slotIcon} ${slotName}`;
  
  // Отображаем текущий предмет в слоте
  const currentItem = this.inventorySystem.equipment[slotType];
  if (currentItem) {
    const rarity = ITEM_RARITY[currentItem.rarity] || ITEM_RARITY.common;
    slotInfo.innerHTML = `
      <h4>Текущий предмет:</h4>
      <div class="current-item">
        <div class="current-item-icon" style="color: ${rarity.color}">
          ${currentItem.icon}
        </div>
        <div class="current-item-info">
          <div class="current-item-name" style="color: ${rarity.color}">
            ${currentItem.name}
          </div>
          <div class="current-item-stats">
            ${this.formatItemStats(currentItem.stats)}
          </div>
        </div>
      </div>
    `;
  } else {
    slotInfo.innerHTML = `
      <h4>Слот пуст</h4>
      <div class="empty-slot">
        <div class="empty-icon">📭</div>
        <div class="empty-text">В этом слоте нет предмета</div>
      </div>
    `;
  }
  
  // Отображаем доступные предметы для этого слота
  const availableItems = this.inventorySystem.getItemsForSlot(slotType);
  itemsList.innerHTML = '';
  
  if (availableItems.length === 0) {
    itemsList.innerHTML = `
      <div class="no-items">
        <div class="no-items-icon">📦</div>
        <div class="no-items-text">Нет доступных предметов для этого слота</div>
      </div>
    `;
  } else {
    availableItems.forEach(item => {
      const itemElement = this.createModalItemElement(item, slotType);
      itemsList.appendChild(itemElement);
    });
  }
  
  // Настраиваем кнопки
  const unequipBtn = document.getElementById('btn-unequip');
  const closeBtn = document.getElementById('btn-close-modal');
  
  if (unequipBtn) {
    unequipBtn.style.display = currentItem ? 'block' : 'none';
    unequipBtn.onclick = () => {
      if (currentItem) {
        this.inventorySystem.unequipItem(currentItem.id);
        this.updateInventory();
        this.updateAllDisplays();
        this.showNotification('✅ Успех', `Предмет "${currentItem.name}" снят`, 'success');
      }
      this.closeEquipmentModal();
    };
  }
  
  if (closeBtn) {
    closeBtn.onclick = () => this.closeEquipmentModal();
  }
  
  // Показываем модальное окно
  modal.classList.add('active');
  
  // Закрытие по клику вне окна
  modal.onclick = (e) => {
    if (e.target === modal) {
      this.closeEquipmentModal();
    }
  };
  
  const closeBtnElement = modal.querySelector('.modal-close');
  if (closeBtnElement) {
    closeBtnElement.onclick = () => this.closeEquipmentModal();
  }
}

// Создание элемента предмета для модального окна
createModalItemElement(item, slotType) {
  const rarity = ITEM_RARITY[item.rarity] || ITEM_RARITY.common;
  const canEquip = this.inventorySystem.canEquipItem(item.id);
  
  const itemElement = document.createElement('div');
  itemElement.className = `modal-item ${canEquip ? '' : 'disabled'}`;
  itemElement.innerHTML = `
    <div class="item-header">
      <div class="item-icon" style="color: ${rarity.color}">${item.icon}</div>
      <div class="item-name" style="color: ${rarity.color}">${item.name}</div>
      <div class="item-rarity" style="background: ${rarity.color}20">${rarity.name}</div>
    </div>
    <div class="item-description">${item.description || 'Нет описания'}</div>
    <div class="item-stats">
      ${item.stats ? this.formatItemStats(item.stats) : ''}
    </div>
    ${item.levelRequirement ? `
      <div class="item-level ${player.level >= item.levelRequirement ? 'level-met' : 'level-locked'}">
        📊 Ур. ${item.levelRequirement}
      </div>
    ` : ''}
    <div class="item-footer">
      <div class="item-value">💰 ${item.value}</div>
      <button class="btn-equip-modal ${canEquip ? '' : 'disabled'}">
        ${canEquip ? 'Экипировать' : 'Недоступно'}
      </button>
    </div>
  `;
  
  if (canEquip) {
    const equipBtn = itemElement.querySelector('.btn-equip-modal');
    equipBtn.onclick = (e) => {
      e.stopPropagation();
      this.inventorySystem.equipItem(item.id);
      this.updateInventory();
      this.updateAllDisplays();
      this.showNotification('✅ Успех', `Предмет "${item.name}" экипирован`, 'success');
      this.closeEquipmentModal();
    };
  }
  
  return itemElement;
}

// Закрытие модального окна
closeEquipmentModal() {
  const modal = document.getElementById('equipment-select-modal');
  if (modal) modal.classList.remove('active');
}

// Обновленный метод renderInventoryItems
renderInventoryItems() {
  const itemsContainer = document.getElementById('inventory-items');
  const itemCount = document.getElementById('item-count');
  const maxSlots = document.getElementById('max-slots');
  
  if (!itemsContainer || !this.inventorySystem) return;
  
  itemsContainer.innerHTML = '';
  
  if (this.inventorySystem.items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-inventory">
        <div class="empty-icon">📦</div>
        <div class="empty-text">Инвентарь пуст</div>
        <div class="empty-hint">Посетите магазин или победите врагов для получения предметов</div>
      </div>
    `;
    return;
  }
  
  // Сортируем предметы
  const sortedItems = [...this.inventorySystem.items].sort((a, b) => {
    // Сначала экипированные
    if (a.equipped && !b.equipped) return -1;
    if (!a.equipped && b.equipped) return 1;
    
    // Затем по редкости
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });
  
  sortedItems.forEach((item, index) => {
    const itemElement = this.createInventoryItemElement(item);
    itemElement.style.animationDelay = `${index * 0.05}s`;
    itemsContainer.appendChild(itemElement);
  });
  
  if (itemCount) itemCount.textContent = this.inventorySystem.items.length;
  if (maxSlots) maxSlots.textContent = this.inventorySystem.maxSlots;
}

createInventoryItemElement(item) {
  const rarity = ITEM_RARITY[item.rarity] || ITEM_RARITY.common;
  const slotType = this.inventorySystem.getSlotByItemType(item.type);
  
  const itemElement = document.createElement('div');
  itemElement.className = `inventory-item ${item.equipped ? 'equipped' : ''}`;
  itemElement.dataset.itemId = item.id;
  itemElement.style.borderLeftColor = rarity.color;
  itemElement.style.animation = 'newItem 0.5s ease-out';
  
  itemElement.innerHTML = `
    <div class="item-header">
      <div class="item-icon">${item.icon}</div>
      <div class="item-name" style="color: ${rarity.color}">
        ${item.name}
      </div>
      <div class="item-rarity" style="color: ${rarity.color}">${rarity.name}</div>
    </div>
    <div class="item-description">${item.description || 'Нет описания'}</div>
    <div class="item-stats">
      ${item.stats ? this.formatItemStats(item.stats) : ''}
    </div>
    ${item.effect ? `
      <div class="item-effect">
        <span class="effect-icon">✨</span>
        <span class="effect-text">${this.formatItemEffect(item.effect)}</span>
      </div>
    ` : ''}
    <div class="item-footer">
      <div class="item-value">💰 ${item.value}</div>
      ${item.quantity > 1 ? `<div class="item-quantity">x${item.quantity}</div>` : ''}
      ${slotType ? `<div class="item-slot">${this.inventorySystem.getSlotIcon(slotType)}</div>` : ''}
    </div>
  `;
  
  // Добавляем обработчик клика для быстрого экипировки/использования
  itemElement.onclick = (e) => {
    e.stopPropagation();
    this.handleItemClick(item);
  };
  
  return itemElement;
}
// Обработка клика на предмет в инвентаре
handleItemClick(item) {
  if (item.type === 'potion' || item.type === 'scroll') {
    // Использование расходника
    this.inventorySystem.useItem(item.id);
    this.updateInventory();
    this.updateAllDisplays();
    this.showNotification('✅ Успех', `Предмет "${item.name}" использован`, 'success');
  } else {
    // Для экипировки показываем модальное окно с выбором слота
    const slotType = this.inventorySystem.getSlotByItemType(item.type);
    if (slotType) {
      this.openEquipmentModal(slotType);
    } else {
      // Если предмет нельзя экипировать (материалы и т.д.)
      this.showItemInfoModal(item);
    }
  }
}

// Показ информации о предмете
showItemInfoModal(item) {
  const rarity = ITEM_RARITY[item.rarity] || ITEM_RARITY.common;
  
  const modalHTML = `
    <div class="item-info-modal">
      <div class="modal-header">
        <div class="item-icon-large" style="color: ${rarity.color}">${item.icon}</div>
        <h3 style="color: ${rarity.color}">${item.name}</h3>
        <div class="item-rarity-large" style="background: ${rarity.color}20">${rarity.name}</div>
      </div>
      <div class="modal-body">
        <div class="item-description">${item.description || 'Нет описания'}</div>
        ${item.stats ? `
          <div class="item-stats-detailed">
            <h4>Характеристики:</h4>
            ${this.formatItemStatsDetailed(item.stats)}
          </div>
        ` : ''}
        ${item.effect ? `
          <div class="item-effect-detailed">
            <h4>Эффект:</h4>
            <div class="effect-detail">${this.formatItemEffect(item.effect)}</div>
          </div>
        ` : ''}
        <div class="item-value-large">💰 Цена: ${item.value} золота</div>
      </div>
      <div class="modal-actions">
        <button class="btn-sell">Продать (${Math.floor(item.value * 0.5)} золота)</button>
        <button class="btn-close">Закрыть</button>
      </div>
    </div>
  `;
  
  // Создаем и показываем модальное окно
  // (реализацию модального окна можно добавить отдельно)
}

formatItemStats(stats) {
  let html = '';
  if (stats.hp) html += `<span class="stat-badge">❤️ +${stats.hp} HP</span>`;
  if (stats.atk) html += `<span class="stat-badge">⚔️ +${stats.atk} ATK</span>`;
  if (stats.def) html += `<span class="stat-badge">🛡️ +${stats.def} DEF</span>`;
  if (stats.crit) html += `<span class="stat-badge">🎯 +${(stats.crit * 100).toFixed(1)}%</span>`;
  if (stats.dodge) html += `<span class="stat-badge">🌀 +${(stats.dodge * 100).toFixed(1)}%</span>`;
  if (stats.speed) html += `<span class="stat-badge">⚡ +${stats.speed}</span>`;
  return html;
}

// Подробное форматирование статов
formatItemStatsDetailed(stats) {
  let html = '<ul class="stats-list">';
  if (stats.hp) html += `<li><span class="stat-name">Здоровье:</span> <span class="stat-value">+${stats.hp}</span></li>`;
  if (stats.atk) html += `<li><span class="stat-name">Атака:</span> <span class="stat-value">+${stats.atk}</span></li>`;
  if (stats.def) html += `<li><span class="stat-name">Защита:</span> <span class="stat-value">+${stats.def}</span></li>`;
  if (stats.crit) html += `<li><span class="stat-name">Крит. шанс:</span> <span class="stat-value">+${(stats.crit * 100).toFixed(1)}%</span></li>`;
  if (stats.dodge) html += `<li><span class="stat-name">Уклонение:</span> <span class="stat-value">+${(stats.dodge * 100).toFixed(1)}%</span></li>`;
  if (stats.speed) html += `<li><span class="stat-name">Скорость:</span> <span class="stat-value">+${stats.speed}</span></li>`;
  html += '</ul>';
  return html;
}

  formatItemEffect(effect) {
    switch (effect.type) {
      case 'heal': return `Восстанавливает ${effect.value} HP`;
      case 'buff': return `+${effect.value} к ${effect.stat}`;
      default: return effect.type;
    }
  }

  handleItemAction(itemId, action) {
    if (!this.inventorySystem) return;
    
    switch (action) {
      case 'equip':
        if (this.inventorySystem.equipItem(itemId)) {
          this.showNotification('✅ Успех', 'Предмет экипирован', 'success');
          this.updateInventory();
          this.updateAllDisplays();
        }
        break;
        
      case 'unequip':
        if (this.inventorySystem.unequipItem(itemId)) {
          this.showNotification('✅ Успех', 'Предмет снят', 'success');
          this.updateInventory();
          this.updateAllDisplays();
        }
        break;
        
      case 'use':
        if (this.inventorySystem.useItem(itemId)) {
          this.showNotification('✅ Успех', 'Предмет использован', 'success');
          this.updateInventory();
          this.updateAllDisplays();
        }
        break;
        
      case 'sell':
        const item = this.inventorySystem.getItem(itemId);
        if (item && confirm(`Продать "${item.name}" за ${Math.floor(item.value * 0.5)} золота?`)) {
          if (this.inventorySystem.sellItem(itemId)) {
            this.showNotification('✅ Успех', `Продано за ${Math.floor(item.value * 0.5)} золота`, 'success');
            this.updateInventory();
            this.updateAllDisplays();
          }
        }
        break;
    }
  }

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

  showScene(sceneName) {
    Object.values(this.scenes).forEach(scene => {
      scene.classList.remove('active');
    });
    
    if (this.scenes[sceneName]) {
      this.scenes[sceneName].classList.add('active');
      this.currentScene = sceneName;
      
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
      case 'achievements':
        this.updateAchievements();
        break;
      case 'leaderboard':
        this.updateLeaderboard();
        break;
    }
  }

  updateAllDisplays() {
    this.updateMenu();
    this.updateBattle();
    this.updateInventory();
    this.checkForNewSkillPoints(); 
    if (this.currentScene === 'shop') {
      this.updateShop();
    }
  }

  updateMenu() {
    if (!player) return;
    
    const menuLevel = document.getElementById('menu-level');
    const menuGold = document.getElementById('menu-gold');
    const menuClass = document.getElementById('menu-class');
    const menuHp = document.getElementById('menu-hp');
    const menuHpBar = document.getElementById('menu-hp-bar');
    const menuExp = document.getElementById('menu-exp');
    
    if (menuLevel) menuLevel.textContent = player.level;
    if (menuGold) menuGold.textContent = player.gold;
    if (menuClass) menuClass.textContent = player.classId === 'warrior' ? 'Воин' : 'Ассасин';
    if (menuHp) menuHp.textContent = `${player.currentHp}/${player.maxHp}`;
    if (menuExp) menuExp.textContent = `${player.exp}/${player.expToNextLevel}`;
    if (menuHpBar) {
      const hpPercent = (player.currentHp / player.maxHp) * 100;
      menuHpBar.style.width = `${hpPercent}%`;
    }
    
    // Обновляем быструю статистику
    const quickAtk = document.getElementById('menu-atk');
    const quickDef = document.getElementById('menu-def');
    const quickCrit = document.getElementById('menu-crit');
    const quickExp = document.getElementById('menu-exp');
    
    if (quickAtk) quickAtk.textContent = player.stats.atk;
    if (quickDef) quickDef.textContent = player.stats.def;
    if (quickCrit) {
      const critPercent = (player.stats.crit || 0) * 100;
      quickCrit.textContent = `${critPercent.toFixed(0)}%`;
    }
    if (quickExp) quickExp.textContent = `0/100`;
  }

  updateBattle() {
    if (!player) return;
    
    const battleLevel = document.getElementById('battle-level');
    const battleGold = document.getElementById('battle-gold');
    const battleHp = document.getElementById('battle-hp');
    const battleAtk = document.getElementById('battle-atk');
    const battleDef = document.getElementById('battle-def');
    const battleExp = document.getElementById('battle-exp');

  
    
    if (battleLevel) battleLevel.textContent = player.level;
    if (battleGold) battleGold.textContent = player.gold;
    if (battleHp) battleHp.textContent = `${player.currentHp}/${player.maxHp}`;
    if (battleAtk) battleAtk.textContent = player.stats.atk;
    if (battleDef) battleDef.textContent = player.stats.def;
    if (battleExp) battleExp.textContent = `${player.exp}/${player.expToNextLevel}`;
    
    if (this.currentScene === 'battle') {
      this.updateLocationList();
    }
  }

updateLocationList() {
    const locationList = document.getElementById('location-list');
    if (!locationList || !player) return;
    
    locationList.innerHTML = '';
    
    const sortedLocations = Object.entries(LOCATIONS).sort(([, a], [, b]) => a.baseLevel - b.baseLevel);
    
    for (const [locId, loc] of sortedLocations) {
      const btn = document.createElement('div');
      btn.className = 'location-btn';
      
      const isAvailable = player.level >= loc.baseLevel;
      const isLocked = !isAvailable;
      
      if (isLocked) {
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        btn.style.filter = 'grayscale(0.5)';
      }
      
      let icon = '📍';
      if (loc.name.includes('Завод')) icon = '🏭';
      if (loc.name.includes('Лес')) icon = '🌲';
      if (loc.name.includes('Подземелье')) icon = '🏰';
      
      btn.innerHTML = `
        <div class="location-icon">${icon}</div>
        <div class="location-details">
          <strong>${loc.name}</strong>
          <div class="location-stats">
            <span>📊 Ур. ${loc.baseLevel}</span>
            <span>👾 Врагов: ${loc.enemies}</span>
            ${loc.enemyHp ? `<span>❤️ HP: ${loc.enemyHp}</span>` : ''}
            ${loc.enemyAtk ? `<span>⚔️ ATK: ${loc.enemyAtk}</span>` : ''}
          </div>
          ${isLocked ? '<div class="location-lock">🔒 Требуется уровень ' + loc.baseLevel + '</div>' : ''}
        </div>
      `;
      
      if (isAvailable) {
        btn.onclick = () => {
          console.log(`🎮 Выбрана локация: ${loc.name}`);
          const locationSelection = document.getElementById('location-selection');
          const battleGame = document.getElementById('battle-game');
          
          if (locationSelection) locationSelection.style.display = 'none';
          if (battleGame) battleGame.style.display = 'block';
          
          startBattle(locId);
        };
      }
      
      locationList.appendChild(btn);
    }
  }

  updateShop() {
    if (!player || !this.shopSystem) {
      console.warn('⚠️ Магазин не готов:', { player: !!player, shopSystem: !!this.shopSystem });
      return;
    }
    
    console.log('🛒 Обновление магазина...');
    
    const shopGold = document.getElementById('shop-gold');
    if (shopGold) {
      shopGold.textContent = player.gold;
    }
    
    const shopGems = document.getElementById('shop-gems');
    if (shopGems) {
      shopGems.textContent = player.gems || 0;
    }
    
    this.initializeShopTabs();
    this.fillShopCategories();
    this.updateShopRefreshInfo();
    
    console.log('🛒 Магазин обновлен');
  }

  initializeShopTabs() {
    if (!this.shopSystem) return;
    
    const tabsContainer = document.querySelector('.shop-tabs');
    if (!tabsContainer) {
      console.error('Контейнер вкладок магазина не найден');
      return;
    }
    
    console.log('Инициализация вкладок магазина...');
    
    tabsContainer.innerHTML = '';
    
    const categories = this.shopSystem.getCategories();
    const categoryInfo = {
      weapons: { name: '⚔️ Оружие', icon: '🗡️' },
      armor: { name: '🛡️ Броня', icon: '🛡️' },
      potions: { name: '🧪 Зелья', icon: '🧪' },
      special: { name: '✨ Особые', icon: '✨' },
      materials: { name: '⛏️ Материалы', icon: '⛏️' }
    };
    
    categories.forEach(category => {
      const info = categoryInfo[category] || { name: category, icon: '📦' };
      const tab = document.createElement('button');
      tab.className = 'shop-tab';
      tab.dataset.category = category;
      tab.innerHTML = `
        <span class="tab-icon">${info.icon}</span>
        <span class="tab-name">${info.name}</span>
      `;
      
      if (category === this.shopSystem.currentCategory) {
        tab.classList.add('active');
      }
      
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchShopCategory(category);
      });
      
      tabsContainer.appendChild(tab);
    });
    
    console.log('Вкладки созданы:', categories);
  }

  switchShopCategory(category) {
    if (!this.shopSystem) return;
    
    console.log('Переключение на категорию:', category);
    
    this.shopSystem.setCurrentCategory(category);
    
    document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.shop-tab[data-category="${category}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
    
    document.querySelectorAll('.shop-category').forEach(cat => {
      cat.classList.remove('active');
    });
    
    const activeCategory = document.getElementById(`shop-${category}`);
    if (activeCategory) {
      activeCategory.classList.add('active');
    }
    
    this.fillShopCategory(category);
  }

  fillShopCategories() {
    if (!this.shopSystem) return;
    
    console.log('Заполнение категорий товарами...');
    
    const categories = this.shopSystem.getCategories();
    
    categories.forEach(category => {
      this.fillShopCategory(category);
    });
    
    this.switchShopCategory(this.shopSystem.currentCategory);
  }

// main.js - обновленный метод fillShopCategory
fillShopCategory(category) {
  const container = document.getElementById('shop-items-container');
  if (!container) {
    console.warn('Контейнер товаров магазина не найден');
    return;
  }
  
  // Очищаем контейнер
  container.innerHTML = '';
  
  // Получаем товары для этой категории
  const items = this.shopSystem.getCategoryItems(category);
  
  console.log(`Категория ${category}: ${items.length} товаров`);
  
  if (items.length === 0) {
    container.innerHTML = `
      <div class="shop-empty">
        <div class="empty-icon">🛒</div>
        <div class="empty-text">Товары в этой категории закончились</div>
        <div class="empty-hint">Обновите магазин или выберите другую категорию</div>
      </div>
    `;
    return;
  }
  
  // Добавляем товары в контейнер
  items.forEach(item => {
    const itemElement = this.createShopItemElement(item, category);
    container.appendChild(itemElement);
  });
}

  createShopItemElement(item, category) {
    const rarity = ITEM_RARITY[item.rarity] || ITEM_RARITY.common;
    const canBuy = player.gold >= item.shopPrice;
    const meetsLevel = !item.levelRequirement || player.level >= item.levelRequirement;
    
    const itemElement = document.createElement('div');
    itemElement.className = `shop-item ${item.isSpecial ? 'special-item' : ''}`;
    itemElement.dataset.itemId = item.id;
    itemElement.style.borderColor = rarity.color;
    
    let statsHTML = '';
    if (item.stats) {
      statsHTML = Object.entries(item.stats)
        .map(([stat, value]) => {
          let icon = '📊';
          if (stat === 'hp') icon = '❤️';
          if (stat === 'atk') icon = '⚔️';
          if (stat === 'def') icon = '🛡️';
          if (stat === 'crit') icon = '🎯';
          return `<span class="stat-item">${icon} ${stat}: ${value}</span>`;
        })
        .join('');
    }
    
    let effectHTML = '';
    if (item.effect) {
      effectHTML = `
        <div class="shop-item-effect">
          <span class="effect-label">Эффект:</span>
          <span class="effect-value">${this.formatItemEffect(item.effect)}</span>
        </div>
      `;
    }
    
    itemElement.innerHTML = `
      <div class="shop-item-header">
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-info">
          <div class="shop-item-name" style="color: ${rarity.color}">
            ${item.name} ${item.isSpecial ? '⭐' : ''}
          </div>
          <div class="shop-item-rarity">${rarity.name}</div>
          ${item.levelRequirement ? 
            `<div class="shop-item-level ${meetsLevel ? 'level-met' : 'level-locked'}">
              📊 Ур. ${item.levelRequirement}
            </div>` : ''
          }
        </div>
        <div class="shop-item-price">
          <div class="price-icon">💰</div>
          <div class="price-value">${item.shopPrice}</div>
        </div>
      </div>
      
      <div class="shop-item-description">
        ${item.description}
      </div>
      
      ${statsHTML ? `<div class="shop-item-stats">${statsHTML}</div>` : ''}
      
      ${effectHTML}
      
      <div class="shop-item-footer">
        <div class="shop-item-stock">
          Осталось: <span class="stock-count">${item.stock}</span> шт.
        </div>
        <button class="btn-buy ${canBuy && meetsLevel ? '' : 'disabled'}" 
                data-item-id="${item.id}" 
                data-category="${category}">
          ${canBuy ? (meetsLevel ? 'Купить' : 'Недоступно') : 'Не хватает золота'}
        </button>
      </div>
    `;
    
    const buyButton = itemElement.querySelector('.btn-buy');
    if (buyButton && canBuy && meetsLevel) {
      buyButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleShopItemPurchase(item.id, category);
      });
    } else if (buyButton) {
      buyButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        let message = 'Нельзя купить';
        if (!canBuy) message = 'Недостаточно золота';
        if (!meetsLevel) message = `Требуется уровень ${item.levelRequirement}`;
        
        this.showNotification('❌ Ошибка', message, 'error');
      });
    }
    
    return itemElement;
  }

  handleShopItemPurchase(itemId, category) {
    if (!this.shopSystem) return;
    
    console.log('Покупка товара:', itemId, category);
    
    const result = this.shopSystem.buyItem(itemId, category);
    
    if (result.success) {
      this.showNotification('✅ Успех', result.message, 'success');
      
      this.updateShop();
      this.updateMenu();
      this.updateBattle();
      this.updateInventory();
    } else {
      this.showNotification('❌ Ошибка', result.message, 'error');
    }
  }

  updateShopRefreshInfo() {
    if (!this.shopSystem) return;
    
    const refreshInfo = this.shopSystem.getRefreshInfo();
    const refreshElement = document.getElementById('shop-refresh-info');
    const refreshButton = document.getElementById('btn-shop-refresh');
    
    if (refreshElement) {
      refreshElement.textContent = refreshInfo.timeInfo.text;
      refreshElement.classList.toggle('refresh-available', refreshInfo.timeInfo.expired);
    }
    
    if (refreshButton) {
      refreshButton.textContent = `🔄 Обновить (${this.shopSystem.refreshCost} золота)`;
      refreshButton.disabled = !refreshInfo.canRefresh;
      refreshButton.classList.toggle('disabled', !refreshInfo.canRefresh);
      
      refreshButton.onclick = null;
      refreshButton.addEventListener('click', (e) => {
        e.preventDefault();
        const result = this.shopSystem.refreshShop();
        if (result.success) {
          this.showNotification('✅ Успех', result.message, 'success');
          this.updateShop();
          this.updateMenu();
          this.updateBattle();
        } else {
          this.showNotification('❌ Ошибка', result.message, 'error');
        }
      });
    }
  }
  // TODO: Реализовать логику навыков
// main.js - добавление в SceneManager (в раздел updateSkills)

updateSkills() {
  if (!player || !this.skillSystem) {
    this.initializeSkillSystem();
    return;
  }

  this.updateSkillPoints();
  this.renderSkillTree();
  this.updateActiveSkills();
}

// main.js - добавьте эти методы в класс SceneManager

initializeSkillSystem() {
  if (!player) return;
  
  // Инициализируем систему навыков
  this.skillSystem = createSkillSystem(player);
  
  // Загружаем уровни навыков из сохранения
  setTimeout(() => {
    if (this.skillSystem.loadSkillLevels) {
      this.skillSystem.loadSkillLevels();
    }
    console.log('✨ Система навыков инициализирована');
  }, 100);
}

updateSkillPoints() {
  const pointsElement = document.getElementById('skill-points');
  if (pointsElement && this.skillSystem) {
    pointsElement.textContent = this.skillSystem.skillPoints;
    pointsElement.classList.toggle('has-points', this.skillSystem.skillPoints > 0);
  }
}

renderSkillTree() {
  const container = document.getElementById('skills-tree');
  if (!container || !this.skillSystem) return;
  
  container.innerHTML = '';
  
  const skillsByCategory = this.skillSystem.getAllSkillsByCategory();
  
  // Рендерим общие навыки
  if (skillsByCategory.common) {
    this.renderSkillCategory('🌍 Общие навыки', skillsByCategory.common, container);
  }
  
  // Рендерим классовые навыки
  const className = player.classId === 'warrior' ? '⚔️ Воин' : 
                   player.classId === 'assassin' ? '🗡️ Ассасин' :
                   player.classId === 'mage' ? '🔮 Маг' : '🏹 Лучник';
  
  if (skillsByCategory[player.classId]) {
    this.renderSkillCategory(className, skillsByCategory[player.classId], container);
  }
}

renderSkillCategory(title, category, container) {
  const categoryElement = document.createElement('div');
  categoryElement.className = 'skill-category';
  
  categoryElement.innerHTML = `
    <div class="category-header">
      <div class="category-icon">${title.charAt(0)}</div>
      <h3>${title}</h3>
    </div>
  `;
  
  // Рендерим подкатегории
  Object.keys(category).forEach(subcategory => {
    const subcategoryElement = this.renderSkillSubcategory(subcategory, category[subcategory]);
    if (subcategoryElement) {
      categoryElement.appendChild(subcategoryElement);
    }
  });
  
  container.appendChild(categoryElement);
}

renderSkillSubcategory(title, skills) {
  if (!skills || skills.length === 0) return null;
  
  const subcategoryElement = document.createElement('div');
  subcategoryElement.className = 'skill-subcategory';
  
  const subcategoryNames = {
    survival: 'Выживание',
    economy: 'Экономика',
    offense: 'Атака',
    defense: 'Защита',
    combat: 'Боевые навыки',
    stealth: 'Скрытность',
    critical: 'Критический урон',
    poison: 'Яды',
    fire: 'Огонь',
    ice: 'Лёд',
    arcane: 'Магия',
    archery: 'Стрельба',
    traps: 'Ловушки'
  };
  
  const unlockedCount = skills.filter(s => s.currentLevel > 0).length;
  
  subcategoryElement.innerHTML = `
    <div class="subcategory-header">
      <h4>${subcategoryNames[title] || title}</h4>
      <div class="subcategory-progress">
        <span class="progress-text">
          ${unlockedCount}/${skills.length}
        </span>
      </div>
    </div>
    <div class="skill-list" id="skill-list-${title}"></div>
  `;
  
  const skillList = subcategoryElement.querySelector('.skill-list');
  
  // Сортируем навыки по требованиям
  const sortedSkills = [...skills].sort((a, b) => {
    const aAvailable = this.skillSystem.checkRequirements(a.id) && 
                       this.skillSystem.skillPoints >= a.cost;
    const bAvailable = this.skillSystem.checkRequirements(b.id) && 
                       this.skillSystem.skillPoints >= b.cost;
    
    if (aAvailable && !bAvailable) return -1;
    if (!aAvailable && bAvailable) return 1;
    
    return a.cost - b.cost;
  });
  
  // Рендерим навыки
  sortedSkills.forEach(skill => {
    const skillElement = this.createSkillElement(skill);
    if (skillElement) {
      skillList.appendChild(skillElement);
    }
  });
  
  return subcategoryElement;
}

createSkillElement(skill) {
  if (!skill) return null;
  
  const isMaxed = skill.currentLevel >= skill.maxLevel;
  const canUpgrade = !isMaxed && 
                     this.skillSystem.skillPoints >= skill.cost &&
                     this.skillSystem.checkRequirements(skill.id);
  const meetsRequirements = this.skillSystem.checkRequirements(skill.id);
  
  const skillElement = document.createElement('div');
  skillElement.className = `skill ${canUpgrade ? 'can-upgrade' : ''} 
                           ${isMaxed ? 'maxed' : ''} 
                           ${!meetsRequirements ? 'locked' : ''}`;
  skillElement.dataset.skillId = skill.id;
  skillElement.style.setProperty('--skill-color', skill.color || '#3498db');
  
  // Прогресс бар
  const progressPercent = (skill.currentLevel / skill.maxLevel) * 100;
  
  // Форматирование требований
  let requirementsHTML = '';
  if (skill.requirements && skill.requirements.length > 0) {
    requirementsHTML = `
      <div class="skill-requirements">
        <div class="req-label">Требования:</div>
        ${skill.requirements.map(([reqId, reqLevel]) => {
          const reqSkill = this.skillSystem.getSkillById(reqId);
          const reqMet = reqSkill && reqSkill.currentLevel >= reqLevel;
          return `
            <div class="requirement ${reqMet ? 'met' : 'not-met'}">
              ${reqSkill ? reqSkill.name : reqId} (ур. ${reqLevel})
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  skillElement.innerHTML = `
    <div class="skill-header">
      <div class="skill-icon" style="color: ${skill.color || '#3498db'}">${skill.icon || '✨'}</div>
      <div class="skill-info">
        <div class="skill-name">${skill.name || 'Неизвестный навык'}</div>
        <div class="skill-level">
          Уровень: <span class="level-current">${skill.currentLevel || 0}</span>/
          <span class="level-max">${skill.maxLevel || 1}</span>
        </div>
      </div>
      <div class="skill-cost">
        <div class="cost-icon">✨</div>
        <div class="cost-value">${skill.cost || 1}</div>
      </div>
    </div>
    
    <div class="skill-description">
      ${skill.description || 'Описание отсутствует'}
    </div>
    
    ${requirementsHTML}
    
    <div class="skill-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
      </div>
      ${skill.type === 'active' ? '<div class="skill-type">Активный навык</div>' : ''}
    </div>
    
    <div class="skill-actions">
      ${isMaxed ? 
        '<div class="skill-maxed">Максимальный уровень</div>' : 
        `<button class="btn-upgrade ${canUpgrade ? '' : 'disabled'}" 
                 data-skill-id="${skill.id}">
           ${canUpgrade ? 'Изучить' : 'Недоступно'}
         </button>`
      }
    </div>
  `;
  
  // Добавляем обработчик прокачки
  if (canUpgrade) {
    const upgradeBtn = skillElement.querySelector('.btn-upgrade');
    upgradeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.upgradeSkill(skill.id);
    });
  }
  
  return skillElement;
}

upgradeSkill(skillId) {
  if (!this.skillSystem) return;
  
  const result = this.skillSystem.upgradeSkill(skillId);
  
  if (result.success) {
    this.showNotification('✨ Навык прокачан', result.message, 'success');
    
    // Обновляем UI
    this.updateSkillPoints();
    this.renderSkillTree();
    this.updateActiveSkills();
    this.updateSkillStats();
    
    // Обновляем характеристики игрока
    this.updateAllDisplays();
  } else {
    this.showNotification('❌ Ошибка', result.message, 'error');
  }
}

updateActiveSkills() {
  const container = document.getElementById('active-skills');
  if (!container || !this.skillSystem) return;
  
  const combatSkills = this.skillSystem.getCombatSkills();
  
  if (combatSkills.length === 0) {
    container.innerHTML = `
      <div class="no-active-skills">
        <div class="no-skills-icon">🎯</div>
        <div class="no-skills-text">Нет активных навыков</div>
        <div class="no-skills-hint">Прокачайте активные навыки для использования в бою</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <h4>🎯 Активные навыки</h4>
    <div class="active-skills-list"></div>
  `;
  
  const list = container.querySelector('.active-skills-list');
  
  combatSkills.forEach(skill => {
    if (!skill) return;
    
    const skillElement = document.createElement('div');
    skillElement.className = 'active-skill';
    skillElement.dataset.skillId = skill.id;
    
    const cooldownPercent = skill.currentCooldown > 0 ? 
      (skill.currentCooldown / skill.cooldown) * 100 : 0;
    
    skillElement.innerHTML = `
      <div class="active-skill-icon" style="color: ${getClassColor(player.classId)}">
        ${skill.icon || '✨'}
      </div>
      <div class="active-skill-info">
        <div class="active-skill-name">${skill.name || 'Навык'}</div>
        <div class="active-skill-cooldown">
          ${skill.currentCooldown > 0 ? 
            `Перезарядка: ${Math.ceil(skill.currentCooldown)}с` : 
            'Готов к использованию'}
        </div>
      </div>
      <div class="active-skill-cooldown-bar">
        <div class="cooldown-fill" style="width: ${cooldownPercent}%"></div>
      </div>
    `;
    
    // Добавляем обработчик использования навыка
    if (skill.currentCooldown <= 0) {
      skillElement.addEventListener('click', () => {
        this.showNotification('🎯 Навык', 'Активные навыки используются автоматически в бою', 'info');
      });
    }
    
    list.appendChild(skillElement);
  });
}

updateSkillStats() {
  if (!this.skillSystem) return;
  
  const stats = this.skillSystem.getSkillStats();
  const totalLearned = document.getElementById('total-skills-learned');
  const totalSpent = document.getElementById('total-points-spent');
  
  if (totalLearned) {
    totalLearned.textContent = stats.totalSkills;
  }
  if (totalSpent) {
    totalSpent.textContent = stats.totalPointsSpent;
  }
}

// Обновление сцены навыков
updateSkills() {
  console.log('Обновление сцены навыков...');
  
  if (!player) {
    console.warn('Игрок не загружен');
    return;
  }
  
  if (!this.skillSystem) {
    this.initializeSkillSystem();
  }
  
  this.updateSkillPoints();
  this.renderSkillTree();
  this.updateActiveSkills();
  this.updateSkillStats();
  
  // Добавляем обработчик сброса навыков
  const resetBtn = document.getElementById('btn-reset-skills');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (this.skillSystem) {
        const result = this.skillSystem.resetSkills();
        if (result.success) {
          this.showNotification('🔄 Навыки сброшены', result.message, 'success');
          this.updateSkills();
          this.updateAllDisplays();
        } else {
          this.showNotification('❌ Ошибка', result.message, 'error');
        }
      }
    };
  }
}

  updateOptions() {
    // TODO: Реализовать логику настроек
  }

  updateAchievements() {
    // TODO: Реализовать логику достижений
  }

  updateLeaderboard() {
    // TODO: Реализовать логику таблицы лидеров
  }

  testShop() {
    console.log('🧪 Тестирование магазина...');
    
    if (this.shopSystem) {
      console.log('✅ Магазин загружен');
      console.log('📊 Категории:', this.shopSystem.getCategories());
      console.log('💰 Баланс игрока:', player.gold);
      
      const weapons = this.shopSystem.getCategoryItems('weapons');
      console.log(`⚔️ Товаров в оружии: ${weapons.length}`);
      
      weapons.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} - ${item.shopPrice} золота`);
      });
    } else {
      console.error('❌ Магазин не инициализирован');
    }
  }

  initEventListeners() {
    console.log('🎮 Инициализация обработчиков событий...');
    
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.closest('[data-scene]')) {
        e.preventDefault();
        const targetScene = target.closest('[data-scene]').getAttribute('data-scene');
        this.showScene(targetScene);
      }
      
      if (target.closest('.menu-btn')) {
        e.preventDefault();
        const targetScene = target.closest('.menu-btn').getAttribute('data-scene');
        if (targetScene) {
          this.showScene(targetScene);
        }
      }
    });

    const debugBtn = document.getElementById('btn-debug');
    if (debugBtn) {
      debugBtn.addEventListener('click', () => {
        debugSaveSystem();
        console.log('Игрок:', player);
      });
    }

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

    document.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.closest('.shop-tab')) {
        const tab = target.closest('.shop-tab');
        const tabId = tab.getAttribute('data-tab');
        
        document.querySelectorAll('.shop-tab').forEach(t => {
          t.classList.remove('active');
        });
        
        document.querySelectorAll('.shop-category').forEach(cat => {
          cat.classList.remove('active');
        });
        
        tab.classList.add('active');
        const category = document.getElementById(`shop-${tabId}`);
        if (category) {
          category.classList.add('active');
        }
      }
    });

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

    window.addEventListener('beforeunload', () => {
      if (player) {
        savePlayer(player);
      }
    });

    // Кнопка быстрого путешествия
    const quickBattleBtn = document.getElementById('btn-quick-battle');
    if (quickBattleBtn) {
      quickBattleBtn.addEventListener('click', () => {
        console.log('⚡ Быстрое путешествие');
        this.showScene('battle');
      });
    }

    // Кнопка ежедневных наград
    const dailyRewardsBtn = document.getElementById('btn-daily-rewards');
    if (dailyRewardsBtn) {
      dailyRewardsBtn.addEventListener('click', () => {
        console.log('🎁 Ежедневные награды');
        this.showDailyRewardsModal();
      });
    }

    console.log('✅ Обработчики событий инициализированы');
  }

showDailyRewardsModal() {
  const modal = document.getElementById('daily-rewards');
  if (modal) {
    modal.classList.add('active');
    
    // Добавляем награды
    const rewardsList = modal.querySelector('#rewards-list');
    if (rewardsList) {
      rewardsList.innerHTML = `
        <div class="reward-day active">
          <div class="day-number">День 1</div>
          <div class="reward-content">💰 100 золота</div>
          <div class="reward-status">✅ Получено</div>
        </div>
        <div class="reward-day today">
          <div class="day-number">День 2</div>
          <div class="reward-content">✨ 1 очко навыков</div>
          <div class="reward-status">🎁 Забрать</div>
        </div>
        <div class="reward-day">
          <div class="day-number">День 3</div>
          <div class="reward-content">🧪 Зелье здоровья</div>
          <div class="reward-status">🔒 Завтра</div>
        </div>
      `;
    }
    
    const claimBtn = modal.querySelector('#btn-claim-daily');
    if (claimBtn) {
      claimBtn.onclick = () => {
        if (player) {
          player.gold += 100;
          player.skillPoints = (player.skillPoints || 0) + 1;
          savePlayer(player);
          this.showNotification('🎁 Ежедневная награда', 'Получено 100 золота и 1 очко навыков!', 'success');
          modal.classList.remove('active');
          this.updateAllDisplays();
        }
      };
    }
    
    // Закрытие модального окна
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.remove('active');
      };
    }
    
    document.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
}
  checkForNewSkillPoints() {
  if (!player || !this.skillSystem) return;
  
  // Проверяем, есть ли непотраченные очки навыков
  if (player.skillPoints > 0) {
    const skillsButton = document.querySelector('[data-scene="skills"]');
    if (skillsButton) {
      skillsButton.classList.add('has-skill-points');
      skillsButton.innerHTML = `✨ Навыки (${player.skillPoints})`;
      
      // Добавляем всплывающую подсказку
      skillsButton.title = `У вас есть ${player.skillPoints} непотраченных очков навыков!`;
    }
  }
}
  

  initializeNotifications() {
    window.showNotification = (title, message, type = 'info', duration = 5000) => {
      const container = document.getElementById('notifications');
      if (!container) return;
      
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `
        <div class="notification-icon">${this.getNotificationIcon(type)}</div>
        <div class="notification-content">
          <div class="notification-title">${title}</div>
          <div class="notification-message">${message}</div>
        </div>
      `;
      
      container.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }, duration);
    };
  }

  showNotification(title, message, type = 'info') {
    console.log(`${type}: ${title} - ${message}`);
    
    if (window.showNotification) {
      window.showNotification(title, message, type);
    } else {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `
        <div class="notification-icon">${
          type === 'success' ? '✅' : 
          type === 'error' ? '❌' : 
          type === 'warning' ? '⚠️' : 'ℹ️'
        }</div>
        <div class="notification-content">
          <div class="notification-title">${title}</div>
          <div class="notification-message">${message}</div>
        </div>
      `;
      
      const container = document.getElementById('notifications');
      if (container) {
        container.appendChild(notification);
        
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transform = 'translateX(100%)';
          setTimeout(() => notification.remove(), 300);
        }, 5000);
      }
    }
  }

  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }

  initializeDailyRewards() {
    // TODO: Реализовать ежедневные награды
  }

  initializeMobileMenu() {
    // TODO: Реализовать мобильное меню
  }
}

function initTelegram() {
  if (window.Telegram?.WebApp) {
    console.log('📱 Telegram WebApp доступен');
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    
    Telegram.WebApp.setHeaderColor('#2d4059');
    Telegram.WebApp.setBackgroundColor('#1a1a2e');
    
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

document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM загружен');
  initTelegram();
  
  window.sceneManager = new SceneManager();
  
  window.game = {
    player,
    scenes: window.sceneManager,
    save: () => savePlayer(player),
    load: () => loadPlayer(),
    startBattle: (locId) => startBattle(locId),
    awardSkillPoints: awardSkillPoints
  };
    window.awardSkillPoints = awardSkillPoints;
  
  console.log('🎮 Игра запущена!');
});

window.testShop = () => {
  if (window.sceneManager && window.sceneManager.shopSystem) {
    console.log('Магазин работает!');
    console.log('Товары в оружии:', 
      window.sceneManager.shopSystem.getCategoryItems('weapons'));
    console.log('Баланс игрока:', player.gold);
  }
};
