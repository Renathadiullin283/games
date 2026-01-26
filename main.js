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
    
    this.inventorySystem.addItem(ITEMS_DB.sword_beginner);
    this.inventorySystem.addItem(ITEMS_DB.leather_armor);
    this.inventorySystem.addItem(ITEMS_DB.health_potion_small);
    this.inventorySystem.addItem(ITEMS_DB.iron_ore);
    this.inventorySystem.addItem(generateRandomItem(1, 3));
    
    console.log('✅ Тестовые предметы добавлены');
  }

  updateInventory() {
    if (!player || !this.inventorySystem) return;
    
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
    
    this.renderInventoryItems();
    this.renderEquipment();
  }

  renderInventoryItems() {
    const itemsList = document.getElementById('inventory-list');
    if (!itemsList || !this.inventorySystem) return;
    
    itemsList.innerHTML = '';
    
    if (this.inventorySystem.items.length === 0) {
      itemsList.innerHTML = '<div class="empty-inventory">Инвентарь пуст</div>';
      return;
    }
    
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
    
    const itemCount = document.getElementById('item-count');
    if (itemCount) {
      itemCount.textContent = `${this.inventorySystem.items.length}/${this.inventorySystem.maxSlots}`;
    }
  }

  createInventoryItemElement(item) {
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

  formatItemStats(stats) {
    let html = '';
    if (stats.hp) html += `<span>❤️ +${stats.hp} HP</span>`;
    if (stats.atk) html += `<span>⚔️ +${stats.atk} ATK</span>`;
    if (stats.def) html += `<span>🛡️ +${stats.def} DEF</span>`;
    if (stats.crit) html += `<span>🎯 +${(stats.crit * 100).toFixed(1)}% крит</span>`;
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
    
    if (menuLevel) menuLevel.textContent = player.level;
    if (menuGold) menuGold.textContent = player.gold;
    if (menuClass) menuClass.textContent = player.classId === 'warrior' ? 'Воин' : 'Ассасин';
    if (menuHp) menuHp.textContent = `${player.currentHp}/${player.maxHp}`;
    
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
    
    if (battleLevel) battleLevel.textContent = player.level;
    if (battleGold) battleGold.textContent = player.gold;
    if (battleHp) battleHp.textContent = `${player.currentHp}/${player.maxHp}`;
    if (battleAtk) battleAtk.textContent = player.stats.atk;
    if (battleDef) battleDef.textContent = player.stats.def;
    
    if (this.currentScene === 'battle') {
      this.updateLocationList();
    }
  }

  updateLocationList() {
    const locationList = document.getElementById('location-list');
    if (!locationList) return;
    
    locationList.innerHTML = '';
    
    const sortedLocations = Object.entries(LOCATIONS).sort(([, a], [, b]) => a.level - b.level);
    
    for (const [locId, loc] of sortedLocations) {
      const btn = document.createElement('div');
      btn.className = 'location-btn';
      
      const isAvailable = player.level >= loc.level;
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

  updateSkills() {
    // TODO: Реализовать логику навыков
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
    startBattle: (locId) => startBattle(locId)
  };
  
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
