// shop.js - исправленная версия
import { ITEMS_DB, ITEM_RARITY, generateRandomItem } from './inventory.js';

// Система магазина
export class ShopSystem {
  constructor(player, inventorySystem) {
    this.player = player;
    this.inventorySystem = inventorySystem;
    this.categories = ['weapons', 'armor', 'potions', 'special', 'materials'];
    this.currentCategory = 'weapons';
    
    // СОЗДАЕМ СЧЕТЧИК ДЛЯ ГЕНЕРАЦИИ УНИКАЛЬНЫХ ID
    this.nextItemId = 1000; // Начинаем с 1000
    
    // ЗАГРУЖАЕМ ДАННЫЕ МАГАЗИНА
    const loadedData = this.loadShopData();
    this.shopItems = loadedData.items || this.generateInitialShop();
    this.shopRefreshTime = loadedData.refreshTime || Date.now() + (60 * 60 * 1000);
    this.nextItemId = loadedData.nextItemId || this.nextItemId;
    
    this.refreshCost = 50;
  }

  // ЗАГРУЗКА ВСЕХ ДАННЫХ МАГАЗИНА
  loadShopData() {
    try {
      const saved = localStorage.getItem('shop_data');
      if (saved) {
        const data = JSON.parse(saved);
        // Проверяем не истекло ли время обновления
        if (data.expires > Date.now()) {
          return {
            items: data.items,
            refreshTime: data.expires,
            nextItemId: data.nextItemId || 1000
          };
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки магазина:', e);
    }
    return {};
  }

  // Сохранение товаров магазина
  saveShopItems() {
    try {
      const data = {
        items: this.shopItems,
        expires: this.shopRefreshTime,
        nextItemId: this.nextItemId // СОХРАНЯЕМ СЧЕТЧИК
      };
      localStorage.setItem('shop_data', JSON.stringify(data));
    } catch (e) {
      console.error('Ошибка сохранения магазина:', e);
    }
  }

  // Генерация начальных товаров
  generateInitialShop() {
    const items = {
      weapons: [],
      armor: [],
      potions: [],
      special: [],
      materials: []
    };

    // Добавляем базовые товары
    items.weapons.push(
      { ...ITEMS_DB.sword_beginner, shopPrice: 75, stock: 3 },
      { ...ITEMS_DB.axe_warrior, shopPrice: 180, stock: 2 },
      { ...ITEMS_DB.dagger_assassin, shopPrice: 150, stock: 2 }
    );

    items.armor.push(
      { ...ITEMS_DB.leather_armor, shopPrice: 90, stock: 3 },
      { ...ITEMS_DB.iron_armor, shopPrice: 225, stock: 1 }
    );

    items.potions.push(
      { ...ITEMS_DB.health_potion_small, shopPrice: 30, stock: 10 },
      { ...ITEMS_DB.health_potion_medium, shopPrice: 68, stock: 5 },
      { ...ITEMS_DB.strength_potion, shopPrice: 90, stock: 3 }
    );

    items.materials.push(
      { ...ITEMS_DB.iron_ore, shopPrice: 8, stock: 20 },
      { ...ITEMS_DB.gold_ore, shopPrice: 23, stock: 10 }
    );

    // Генерируем случайные товары для специального раздела
    if (this.player) {
      const playerLevel = this.player.level;
      
      for (let i = 0; i < 4; i++) {
        // Генерируем предмет +/- 2 уровня от игрока
        const minLevel = Math.max(1, playerLevel - 2);
        const maxLevel = playerLevel + 2;
        
        const randomItem = generateRandomItem(minLevel, maxLevel);
        
        // СОЗДАЕМ УНИКАЛЬНЫЙ ID С ИСПОЛЬЗОВАНИЕМ nextItemId
        const uniqueId = `shop_item_${this.nextItemId++}`;
        
        const shopItem = {
          ...randomItem,
          id: uniqueId,  // ИСПОЛЬЗУЕМ УНИКАЛЬНЫЙ ID
          shopPrice: Math.floor(randomItem.value * (1.5 + Math.random() * 0.5)),
          stock: 1,
          isSpecial: true
        };
        
        items.special.push(shopItem);
      }
    } else {
      console.warn('Player not loaded, using default special items');
      for (let i = 0; i < 3; i++) {
        const randomItem = generateRandomItem(1, 5);
        
        // СОЗДАЕМ УНИКАЛЬНЫЙ ID С ИСПОЛЬЗОВАНИЕМ nextItemId
        const uniqueId = `shop_item_${this.nextItemId++}`;
        
        items.special.push({
          ...randomItem,
          id: uniqueId,  // ИСПОЛЬЗУЕМ УНИКАЛЬНЫЙ ID
          shopPrice: Math.floor(randomItem.value * 1.5),
          stock: 1,
          isSpecial: true
        });
      }
    }

    return items;
  }

  // Обновление товаров в магазине
  refreshShop() {
    if (this.player.gold < this.refreshCost) {
      return { success: false, message: 'Недостаточно золота для обновления!' };
    }

    this.player.gold -= this.refreshCost;
    this.shopItems = this.generateShopItems();
    this.shopRefreshTime = Date.now() + (60 * 60 * 1000); // 1 час
    
    this.saveShopItems();
    
    return { 
      success: true, 
      message: `Магазин обновлен! Потрачено ${this.refreshCost} золота.` 
    };
  }

  // Генерация товаров с учетом уровня игрока
  generateShopItems() {
    const items = {
      weapons: [],
      armor: [],
      potions: [],
      special: [],
      materials: []
    };

    const playerLevel = this.player.level || 1;
    const rarityChance = Math.min(0.1 + (playerLevel * 0.01), 0.5);

    // Оружие (3-5 товаров)
    const weaponCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < weaponCount; i++) {
      const weapon = this.generateWeapon(playerLevel, rarityChance);
      items.weapons.push(weapon);
    }

    // Броня (2-4 товара)
    const armorCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < armorCount; i++) {
      const armor = this.generateArmor(playerLevel, rarityChance);
      items.armor.push(armor);
    }

    // Зелья (5-10 товаров)
    const potionCount = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < potionCount; i++) {
      const potion = this.generatePotion(playerLevel);
      items.potions.push(potion);
    }

    // Материалы (10-20 товаров)
    const materialCount = 10 + Math.floor(Math.random() * 11);
    for (let i = 0; i < materialCount; i++) {
      const material = this.generateMaterial(playerLevel);
      items.materials.push(material);
    }

    // Специальные товары (1-3 товара)
    const specialCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < specialCount; i++) {
      const special = this.generateSpecialItem(playerLevel);
      items.special.push(special);
    }

    return items;
  }

  // Генерация оружия - ИСПРАВЛЕННАЯ ВЕРСИЯ
  generateWeapon(level, rarityChance) {
    const weaponTypes = ['sword', 'axe', 'dagger', 'bow', 'staff'];
    const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    
    const isRare = Math.random() < rarityChance;
    const rarity = isRare ? (Math.random() < 0.3 ? 'rare' : 'uncommon') : 'common';
    const rarityInfo = ITEM_RARITY[rarity];
    
    const baseStats = {
      sword: { atk: 5, def: 1 },
      axe: { atk: 7, hp: 10 },
      dagger: { atk: 4, crit: 0.05 },
      bow: { atk: 6 },
      staff: { atk: 4 }
    };
    
    const stats = { ...baseStats[weaponType] };
    
    const levelMultiplier = 1 + (level / 10);
    const rarityMultiplier = rarityInfo.multiplier;
    
    Object.keys(stats).forEach(stat => {
      if (stat !== 'crit') {
        stats[stat] = Math.floor(stats[stat] * levelMultiplier * rarityMultiplier);
      }
    });
    
    const weaponNames = {
      sword: ['Меч', 'Клинок', 'Паляш'],
      axe: ['Топор', 'Секира', 'Бронебой'],
      dagger: ['Кинжал', 'Стилет', 'Коготь'],
      bow: ['Лук', 'Арбалет', 'Духолат'],
      staff: ['Посох', 'Жезл', 'Скипетр']
    };
    
    const prefixes = {
      common: ['Обычный', 'Простой', 'Начальный'],
      uncommon: ['Закаленный', 'Усиленный', 'Надежный'],
      rare: ['Редкий', 'Магический', 'Легендарный']
    };
    
    const namePrefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    const name = `${namePrefix} ${weaponNames[weaponType][0]}`;
    
    const icons = {
      sword: '🗡️',
      axe: '🪓',
      dagger: '🔪',
      bow: '🏹',
      staff: '🪄'
    };
    
    // СОЗДАЕМ УНИКАЛЬНЫЙ ID С ИСПОЛЬЗОВАНИЕМ nextItemId
    const uniqueId = `weapon_${this.nextItemId++}`;
    
    return {
      id: uniqueId,  // ИСПОЛЬЗУЕМ УНИКАЛЬНЫЙ ID
      name: name,
      type: 'weapon',
      weaponType: weaponType,
      rarity: rarity,
      stats: stats,
      description: `Мощное оружие для уровня ${level}`,
      icon: icons[weaponType],
      value: Math.floor(50 * levelMultiplier * rarityMultiplier),
      shopPrice: Math.floor(75 * levelMultiplier * rarityMultiplier),
      stock: 1 + Math.floor(Math.random() * 3),
      levelRequirement: level
    };
  }

  // Генерация брони - ИСПРАВЛЕННАЯ ВЕРСИЯ
  generateArmor(level, rarityChance) {
    const armorTypes = ['chest', 'helmet', 'boots', 'gloves'];
    const armorType = armorTypes[Math.floor(Math.random() * armorTypes.length)];
      
    const isRare = Math.random() < rarityChance;
    const rarity = isRare ? (Math.random() < 0.3 ? 'rare' : 'uncommon') : 'common';
    const rarityInfo = ITEM_RARITY[rarity];
    
    const baseStats = {
      chest: { def: 5, hp: 20 },
      helmet: { def: 2, hp: 10 },
      boots: { def: 1 },
      gloves: { def: 1, atk: 1 }
    };
    
    const stats = { ...baseStats[armorType] };
    
    const levelMultiplier = 1 + (level / 10);
    const rarityMultiplier = rarityInfo.multiplier;
    
    Object.keys(stats).forEach(stat => {
      stats[stat] = Math.floor(stats[stat] * levelMultiplier * rarityMultiplier);
    });
    
    const armorNames = {
      chest: ['Броня', 'Нагрудник', 'Кираса'],
      helmet: ['Шлем', 'Каска', 'Наголовье'],
      boots: ['Ботинки', 'Сапоги', 'Ботфорты'],
      gloves: ['Перчатки', 'Рукавицы', 'Наручи']
    };
    
    const prefixes = {
      common: ['Кожаная', 'Тканевая', 'Простая'],
      uncommon: ['Кольчужная', 'Чешуйчатая', 'Усиленная'],
      rare: ['Латная', 'Магическая', 'Драконья']
    };
    
    const namePrefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    const name = `${namePrefix} ${armorNames[armorType][0]}`;
    
    const icons = {
      chest: '🛡️',
      helmet: '⛑️',
      boots: '👢',
      gloves: '🧤'
    };
    
    const typeMap = {
      chest: 'armor',
      helmet: 'helmet',
      boots: 'boots',
      gloves: 'gloves'
    };
    
    // СОЗДАЕМ УНИКАЛЬНЫЙ ID С ИСПОЛЬЗОВАНИЕМ nextItemId
    const uniqueId = `armor_${this.nextItemId++}`;
    
    return {
      id: uniqueId,  // ИСПОЛЬЗУЕМ УНИКАЛЬНЫЙ ID
      name: name,
      type: typeMap[armorType],
      rarity: rarity,
      stats: stats,
      description: `Защитная экипировка для уровня ${level}`,
      icon: icons[armorType],
      value: Math.floor(40 * levelMultiplier * rarityMultiplier),
      shopPrice: Math.floor(60 * levelMultiplier * rarityMultiplier),
      stock: 1 + Math.floor(Math.random() * 2),
      levelRequirement: Math.max(1, level - 3)
    };
  }

  // Генерация зелий - ИСПРАВЛЕННАЯ ВЕРСИЯ
  generatePotion(level) {
    const potionTypes = ['health', 'strength', 'defense', 'speed'];
    const potionType = potionTypes[Math.floor(Math.random() * potionTypes.length)];
    
    const levelMultiplier = 1 + (level / 20);
    
    const potionData = {
      health: {
        name: 'Зелье здоровья',
        effect: { type: 'heal', value: Math.floor(100 * levelMultiplier) },
        icon: '🧪',
        value: 20
      },
      strength: {
        name: 'Зелье силы',
        effect: { type: 'buff', stat: 'atk', value: Math.floor(10 * levelMultiplier), duration: 300 },
        icon: '⚗️',
        value: 30
      },
      defense: {
        name: 'Зелье защиты',
        effect: { type: 'buff', stat: 'def', value: Math.floor(5 * levelMultiplier), duration: 300 },
        icon: '🛡️',
        value: 25
      },
      speed: {
        name: 'Зелье скорости',
        effect: { type: 'buff', stat: 'speed', value: 2, duration: 300 },
        icon: '⚡',
        value: 40
      }
    };
    
    const data = potionData[potionType];
    
    // СОЗДАЕМ УНИКАЛЬНЫЙ ID С ИСПОЛЬЗОВАНИЕМ nextItemId
    const uniqueId = `potion_${this.nextItemId++}`;
    
    return {
      id: uniqueId,  // ИСПОЛЬЗУЕМ УНИКАЛЬНЫЙ ID
      name: data.name,
      type: 'potion',
      rarity: 'common',
      effect: data.effect,
      description: `Временное усиление (${data.effect.duration || 0} сек)`,
      icon: data.icon,
      value: Math.floor(data.value * levelMultiplier),
      shopPrice: Math.floor(data.value * 1.5 * levelMultiplier),
      stock: 3 + Math.floor(Math.random() * 7),
      stackable: true,
      consumable: true
    };
  }

  // Генерация материалов - ИСПРАВЛЕННАЯ ВЕРСИЯ
  generateMaterial(level) {
    const materials = [
      { name: 'Железная руда', icon: '⛏️', value: 5 },
      { name: 'Золотая руда', icon: '💰', value: 15 },
      { name: 'Мифриловая руда', icon: '💎', value: 30 },
      { name: 'Драконий камень', icon: '🔮', value: 50 },
      { name: 'Древесина', icon: '🪵', value: 3 },
      { name: 'Кожа', icon: '🐄', value: 8 },
      { name: 'Магическая пыль', icon: '✨', value: 12 },
      { name: 'Эссенция души', icon: '👻', value: 25 }
    ];
    
    const material = materials[Math.floor(Math.random() * materials.length)];
    const levelMultiplier = 1 + (level / 30);
    
    // СОЗДАЕМ УНИКАЛЬНЫЙ ID С ИСПОЛЬЗОВАНИЕМ nextItemId
    const uniqueId = `material_${this.nextItemId++}`;
    
    return {
      id: uniqueId,  // ИСПОЛЬЗУЕМ УНИКАЛЬНЫЙ ID
      name: material.name,
      type: 'material',
      rarity: 'common',
      description: 'Материал для крафта или продажи',
      icon: material.icon,
      value: Math.floor(material.value * levelMultiplier),
      shopPrice: Math.floor(material.value * 1.2 * levelMultiplier),
      stock: 5 + Math.floor(Math.random() * 15),
      stackable: true
    };
  }

  // Генерация специального товара - ИСПРАВЛЕННАЯ ВЕРСИЯ
  generateSpecialItem(level) {
    const rand = Math.random();
    let rarity = 'uncommon';
    if (rand < 0.05) {
      rarity = 'epic';
    } else if (rand < 0.3) {
      rarity = 'rare';
    }
    
    const rarityInfo = ITEM_RARITY[rarity];
    const levelMultiplier = 1 + (level / 5);
    
    const itemTypes = ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet'];
    const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    
    const stats = {};
    const possibleStats = ['hp', 'atk', 'def', 'crit'];
    
    const statCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < statCount; i++) {
      const stat = possibleStats[Math.floor(Math.random() * possibleStats.length)];
      if (!stats[stat]) {
        let value;
        switch(stat) {
          case 'hp': value = 20 + Math.floor(Math.random() * 50); break;
          case 'atk': value = 5 + Math.floor(Math.random() * 15); break;
          case 'def': value = 3 + Math.floor(Math.random() * 10); break;
          case 'crit': value = 0.02 + (Math.random() * 0.08); break;
        }
        stats[stat] = Math.floor(value * levelMultiplier * rarityInfo.multiplier);
      }
    }
    
    const prefixes = {
      uncommon: ['Загадочный', 'Необычный', 'Странный'],
      rare: ['Редкий', 'Древний', 'Забытый'],
      epic: ['Эпический', 'Легендарный', 'Мифический']
    };
    
    const typeNames = {
      weapon: 'Артефакт',
      armor: 'Доспех',
      helmet: 'Венец',
      boots: 'Ступени',
      ring: 'Кольцо',
      amulet: 'Амулет'
    };
    
    const namePrefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    const name = `${namePrefix} ${typeNames[itemType]}`;
    
    const icons = {
      weapon: '⚔️',
      armor: '🛡️',
      helmet: '👑',
      boots: '👣',
      ring: '💍',
      amulet: '📿'
    };
    
    // СОЗДАЕМ УНИКАЛЬНЫЙ ID С ИСПОЛЬЗОВАНИЕМ nextItemId
    const uniqueId = `special_${this.nextItemId++}`;
    
    return {
      id: uniqueId,  // ИСПОЛЬЗУЕМ УНИКАЛЬНЫЙ ID
      name: name,
      type: itemType,
      rarity: rarity,
      stats: stats,
      description: `Уникальный предмет ${rarity} редкости`,
      icon: icons[itemType],
      value: Math.floor(100 * levelMultiplier * rarityInfo.multiplier),
      shopPrice: Math.floor(150 * levelMultiplier * rarityInfo.multiplier),
      stock: 1,
      levelRequirement: level,
      isSpecial: true
    };
  }

  // Покупка предмета
  buyItem(itemId, category) {
    const categoryItems = this.shopItems[category];
    if (!categoryItems) {
      return { success: false, message: 'Товар не найден!' };
    }
    
    const itemIndex = categoryItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return { success: false, message: 'Товар не найден!' };
    }
    
    const item = categoryItems[itemIndex];
    
    // Проверяем уровень
    if (item.levelRequirement && this.player.level < item.levelRequirement) {
      return { 
        success: false, 
        message: `Требуется уровень ${item.levelRequirement}!` 
      };
    }
    
    // Проверяем наличие
    if (item.stock <= 0) {
      return { success: false, message: 'Товар закончился!' };
    }
    
    // Проверяем деньги
    if (this.player.gold < item.shopPrice) {
      return { success: false, message: 'Недостаточно золота!' };
    }
    
    // Проверяем место в инвентаре
    if (this.inventorySystem && this.inventorySystem.items.length >= this.inventorySystem.maxSlots) {
      return { success: false, message: 'Инвентарь переполнен!' };
    }
    
    // Покупаем
    this.player.gold -= item.shopPrice;
    item.stock--;
    
    // Создаем копию предмета без shopPrice и stock для инвентаря
    const itemForInventory = { ...item };
    delete itemForInventory.shopPrice;
    delete itemForInventory.stock;
    delete itemForInventory.isSpecial;
    
    // Добавляем в инвентарь
    const added = this.inventorySystem.addItem(itemForInventory);
    
    if (!added) {
      // Если не удалось добавить, возвращаем деньги
      this.player.gold += item.shopPrice;
      item.stock++;
      return { success: false, message: 'Не удалось добавить предмет в инвентарь!' };
    }
    
    // Удаляем предмет если закончился
    if (item.stock <= 0) {
      categoryItems.splice(itemIndex, 1);
    }
    
    // Сохраняем изменения
    this.saveShopItems();
    
    return { 
      success: true, 
      message: `Вы купили "${item.name}" за ${item.shopPrice} золота!` 
    };
  }

  // Получение времени до обновления
  getTimeUntilRefresh() {
    const now = Date.now();
    const diff = this.shopRefreshTime - now;
    
    if (diff <= 0) {
      return { expired: true, text: 'Магазин можно обновить!' };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return {
      expired: false,
      hours,
      minutes,
      seconds,
      text: `До обновления: ${hours}ч ${minutes}м ${seconds}с`
    };
  }

  // Принудительное обновление (для отладки)
  forceRefresh() {
    this.shopItems = this.generateShopItems();
    this.shopRefreshTime = Date.now() + (60 * 60 * 1000);
    this.saveShopItems();
    return 'Магазин обновлен!';
  }

  // Получение всех товаров в категории
  getCategoryItems(category) {
    return this.shopItems[category] || [];
  }

  // Установка текущей категории
  setCurrentCategory(category) {
    if (this.categories.includes(category)) {
      this.currentCategory = category;
      return true;
    }
    return false;
  }

  // Получение текущей категории
  getCurrentCategory() {
    return this.currentCategory;
  }

  // Получение всех категории
  getCategories() {
    return this.categories;
  }

  // Получение информации об обновлении
  getRefreshInfo() {
    const timeInfo = this.getTimeUntilRefresh();
    return {
      cost: this.refreshCost,
      canRefresh: timeInfo.expired || this.player.gold >= this.refreshCost,
      timeInfo: timeInfo
    };
  }
}

// Стандартные товары для продажи в магазине
export const SHOP_CATEGORIES = {
  weapons: {
    name: '⚔️ Оружие',
    description: 'Различные виды оружия для увеличения урона',
    icon: '🗡️'
  },
  armor: {
    name: '🛡️ Броня',
    description: 'Защитная экипировка для увеличения HP и защиты',
    icon: '🛡️'
  },
  potions: {
    name: '🧪 Зелья',
    description: 'Расходуемые предметы с временными эффектами',
    icon: '🧪'
  },
  special: {
    name: '✨ Особые товары',
    description: 'Уникальные и редкие предметы',
    icon: '✨'
  },
  materials: {
    name: '⛏️ Материалы',
    description: 'Ресурсы для крафта и продажи',
    icon: '⛏️'
  }
};

// Функция для инициализации магазина в сцене
export function initializeShopUI(shopSystem, player) {
  const container = document.getElementById('shop-items');
  if (!container) return;
  
  const category = shopSystem.getCurrentCategory();
  const items = shopSystem.getCategoryItems(category);
  
  container.innerHTML = '';
  
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
  
  items.forEach(item => {
    const itemElement = createShopItemElement(item, shopSystem, player);
    container.appendChild(itemElement);
  });
}

// Создание элемента товара для магазина
function createShopItemElement(item, shopSystem, player) {
  const rarity = ITEM_RARITY[item.rarity] || ITEM_RARITY.common;
  const canBuy = player.gold >= item.shopPrice;
  const meetsLevel = !item.levelRequirement || player.level >= item.levelRequirement;
  
  const itemElement = document.createElement('div');
  itemElement.className = `shop-item ${item.isSpecial ? 'special-item' : ''}`;
  itemElement.dataset.itemId = item.id;
  itemElement.style.borderColor = rarity.color;
  
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
    
    ${item.stats ? `
      <div class="shop-item-stats">
        ${Object.entries(item.stats).map(([stat, value]) => {
          let icon = '📊';
          if (stat === 'hp') icon = '❤️';
          if (stat === 'atk') icon = '⚔️';
          if (stat === 'def') icon = '🛡️';
          if (stat === 'crit') icon = '🎯';
          return `<span class="stat-item">${icon} ${stat}: ${value}</span>`;
        }).join('')}
      </div>
    ` : ''}
    
    ${item.effect ? `
      <div class="shop-item-effect">
        <span class="effect-label">Эффект:</span>
        <span class="effect-value">${formatEffect(item.effect)}</span>
      </div>
    ` : ''}
    
    <div class="shop-item-footer">
      <div class="shop-item-stock">
        Осталось: <span class="stock-count">${item.stock}</span> шт.
      </div>
      <button class="btn-buy ${canBuy && meetsLevel ? '' : 'disabled'}" 
              data-item-id="${item.id}" 
              data-category="${shopSystem.getCurrentCategory()}">
        ${canBuy ? (meetsLevel ? 'Купить' : 'Недоступно') : 'Не хватает золота'}
      </button>
    </div>
  `;
  
  // Добавляем обработчик покупки
  const buyButton = itemElement.querySelector('.btn-buy');
  if (buyButton && canBuy && meetsLevel) {
    buyButton.addEventListener('click', () => {
      const result = shopSystem.buyItem(item.id, shopSystem.getCurrentCategory());
      if (result.success) {
        // Обновляем UI
        initializeShopUI(shopSystem, player);
        // Показываем сообщение
        showShopMessage(result.message, 'success');
        // Обновляем баланс
        updateShopBalance(player.gold);
      } else {
        showShopMessage(result.message, 'error');
      }
    });
  }
  
  return itemElement;
}

// Форматирование эффекта предмета
function formatEffect(effect) {
  switch (effect.type) {
    case 'heal':
      return `Восстанавливает ${effect.value} HP`;
    case 'buff':
      return `+${effect.value} к ${effect.stat} (${Math.floor(effect.duration / 60)} мин)`;
    default:
      return effect.type;
  }
}

// Показать сообщение в магазине
function showShopMessage(text, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `shop-message shop-message-${type}`;
  messageDiv.textContent = text;
  
  const shopContainer = document.querySelector('.shop-content');
  if (shopContainer) {
    // Удаляем предыдущие сообщения
    const oldMessages = shopContainer.querySelectorAll('.shop-message');
    oldMessages.forEach(msg => msg.remove());
    
    shopContainer.appendChild(messageDiv);
    
    // Автоматическое скрытие
    setTimeout(() => {
      messageDiv.classList.add('fade-out');
      setTimeout(() => messageDiv.remove(), 500);
    }, 3000);
  }
}

// Обновление баланса в магазине
function updateShopBalance(gold) {
  const goldElement = document.getElementById('shop-gold');
  if (goldElement) {
    goldElement.textContent = gold;
  }
}

// Инициализация вкладок магазина
export function initializeShopTabs(shopSystem, player) {
  const tabsContainer = document.querySelector('.shop-tabs');
  if (!tabsContainer) return;
  
  tabsContainer.innerHTML = '';
  
  const categories = shopSystem.getCategories();
  categories.forEach(category => {
    const tabInfo = SHOP_CATEGORIES[category];
    if (!tabInfo) return;
    
    const tab = document.createElement('button');
    tab.className = 'shop-tab';
    tab.dataset.tab = category;
    tab.innerHTML = `
      <span class="tab-icon">${tabInfo.icon}</span>
      <span class="tab-name">${tabInfo.name}</span>
    `;
    
    if (category === shopSystem.getCurrentCategory()) {
      tab.classList.add('active');
    }
    
    tab.addEventListener('click', () => {
      // Обновляем активную вкладку
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Устанавливаем категорию и обновляем товары
      shopSystem.setCurrentCategory(category);
      initializeShopUI(shopSystem, player);
    });
    
    tabsContainer.appendChild(tab);
  });
}

// Обновление информации об обновлении магазина
export function updateRefreshInfo(shopSystem, player) {
  const refreshInfo = shopSystem.getRefreshInfo();
  const refreshElement = document.getElementById('shop-refresh-info');
  const refreshButton = document.getElementById('btn-shop-refresh');
  
  if (refreshElement) {
    refreshElement.textContent = refreshInfo.timeInfo.text;
    
    if (refreshInfo.timeInfo.expired) {
      refreshElement.classList.add('refresh-available');
      refreshElement.textContent = 'Магазин можно обновить!';
    } else {
      refreshElement.classList.remove('refresh-available');
    }
  }
  
  if (refreshButton) {
    refreshButton.textContent = `🔄 Обновить (${shopSystem.refreshCost} золота)`;
    refreshButton.disabled = !refreshInfo.canRefresh;
    
    if (refreshButton.disabled) {
      refreshButton.classList.add('disabled');
    } else {
      refreshButton.classList.remove('disabled');
    }
    
    // Обновляем обработчик
    refreshButton.onclick = () => {
      const result = shopSystem.refreshShop();
      if (result.success) {
        showShopMessage(result.message, 'success');
        initializeShopUI(shopSystem, player);
        updateRefreshInfo(shopSystem, player);
        updateShopBalance(player.gold);
      } else {
        showShopMessage(result.message, 'error');
      }
    };
  }
}
