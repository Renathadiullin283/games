// inventory.js
import { savePlayer } from './telegramSave.js';

// Система предметов и инвентаря
export class InventorySystem {
  constructor(player) {
    this.player = player;
    this.items = this.loadInventory() || [];
    this.equipment = this.loadEquipment() || {
      weapon: null,
      armor: null,
      helmet: null,
      boots: null,
      ring: null,
      amulet: null
    };
    this.maxSlots = 20; // Максимальное количество слотов
  }

  // Загрузка инвентаря
  loadInventory() {
    try {
      const saved = localStorage.getItem('inventory_data');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Ошибка загрузки инвентаря:', e);
      return [];
    }
  }

  // Загрузка экипировки
  loadEquipment() {
    try {
      const saved = localStorage.getItem('equipment_data');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Ошибка загрузки экипировки:', e);
      return {};
    }
  }

  // Сохранение инвентаря
  saveInventory() {
    try {
      localStorage.setItem('inventory_data', JSON.stringify(this.items));
    } catch (e) {
      console.error('Ошибка сохранения инвентаря:', e);
    }
  }

  // Сохранение экипировки
  saveEquipment() {
    try {
      localStorage.setItem('equipment_data', JSON.stringify(this.equipment));
    } catch (e) {
      console.error('Ошибка сохранения экипировки:', e);
    }
  }

  // Получение предмета по ID
  getItem(itemId) {
    return this.items.find(item => item.id === itemId);
  }

  // Добавление предмета в инвентарь
  addItem(itemData) {
    if (this.items.length >= this.maxSlots) {
      console.warn('Инвентарь переполнен!');
      return false;
    }

    // Проверяем, есть ли такой предмет уже
    const existingItem = this.items.find(item => 
      item.id === itemData.id && 
      item.type === itemData.type
    );

    if (existingItem && itemData.stackable) {
      existingItem.quantity = (existingItem.quantity || 1) + (itemData.quantity || 1);
    } else {
      const newItem = {
        id: itemData.id,
        name: itemData.name,
        type: itemData.type,
        rarity: itemData.rarity || 'common',
        stats: itemData.stats || {},
        description: itemData.description || '',
        icon: itemData.icon || '📦',
        value: itemData.value || 0,
        stackable: itemData.stackable || false,
        quantity: itemData.quantity || 1,
        equipped: false
      };
      this.items.push(newItem);
    }

    this.saveInventory();
    return true;
  }

  // Удаление предмета
  removeItem(itemId, quantity = 1) {
    const itemIndex = this.items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) return false;
    
    const item = this.items[itemIndex];
    
    if (item.stackable && item.quantity > quantity) {
      item.quantity -= quantity;
    } else {
      // Если предмет экипирован, снимаем его
      if (item.equipped) {
        this.unequipItem(itemId);
      }
      this.items.splice(itemIndex, 1);
    }
    
    this.saveInventory();
    return true;
  }

  // Экипировка предмета
  equipItem(itemId) {
    const item = this.getItem(itemId);
    if (!item) return false;
    
    // Проверяем тип предмета
    const slot = this.getSlotByItemType(item.type);
    if (!slot) return false;
    
    // Снимаем текущий предмет в этом слоте, если есть
    if (this.equipment[slot]) {
      this.unequipItem(this.equipment[slot].id);
    }
    
    // Экипируем новый предмет
    item.equipped = true;
    this.equipment[slot] = item;
    
    // Применяем статы предмета
    this.applyItemStats(item, 'add');
    
    this.saveInventory();
    this.saveEquipment();
    this.updatePlayerStats();
    
    return true;
  }

  // Снятие предмета
  unequipItem(itemId) {
    const item = this.getItem(itemId);
    if (!item || !item.equipped) return false;
    
    // Находим слот, в котором экипирован предмет
    const slot = Object.keys(this.equipment).find(key => 
      this.equipment[key] && this.equipment[key].id === itemId
    );
    
    if (!slot) return false;
    
    // Убираем статы предмета
    this.applyItemStats(item, 'remove');
    
    // Снимаем предмет
    item.equipped = false;
    this.equipment[slot] = null;
    
    this.saveInventory();
    this.saveEquipment();
    this.updatePlayerStats();
    
    return true;
  }

  // Получение слота по типу предмета
  getSlotByItemType(itemType) {
    const typeMap = {
      'weapon': 'weapon',
      'sword': 'weapon',
      'axe': 'weapon',
      'bow': 'weapon',
      'staff': 'weapon',
      'armor': 'armor',
      'chest': 'armor',
      'helmet': 'helmet',
      'boots': 'boots',
      'ring': 'ring',
      'amulet': 'amulet',
      'potion': null,
      'scroll': null,
      'material': null
    };
    
    return typeMap[itemType] || null;
  }

  // Применение статов предмета
  applyItemStats(item, action) {
    if (!item.stats) return;
    
    const multiplier = action === 'add' ? 1 : -1;
    
    if (item.stats.hp) {
      this.player.stats.hp += item.stats.hp * multiplier;
      this.player.maxHp += item.stats.hp * multiplier;
      if (action === 'remove' && this.player.currentHp > this.player.maxHp) {
        this.player.currentHp = this.player.maxHp;
      }
    }
    
    if (item.stats.atk) this.player.stats.atk += item.stats.atk * multiplier;
    if (item.stats.def) this.player.stats.def += item.stats.def * multiplier;
    if (item.stats.crit) this.player.stats.crit += item.stats.crit * multiplier;
  }

  // Обновление статов игрока
  updatePlayerStats() {
    // Сначала сбрасываем базовые статы (без предметов)
    this.player.stats = { ...this.player.baseStats || this.player.stats };
    
    // Применяем статы со всех экипированных предметов
    Object.values(this.equipment).forEach(item => {
      if (item) {
        this.applyItemStats(item, 'add');
      }
    });
    
    // Сохраняем изменения
    savePlayer(this.player);
  }

  // Использование расходуемого предмета
  useItem(itemId) {
    const item = this.getItem(itemId);
    if (!item) return false;
    
    // Проверяем, можно ли использовать предмет
    if (item.type !== 'potion' && item.type !== 'scroll') return false;
    
    // Применяем эффект
    if (item.effect) {
      this.applyItemEffect(item.effect);
    }
    
    // Удаляем предмет (если не бесконечный)
    if (!item.consumable || item.consumable === true) {
      this.removeItem(itemId, 1);
    }
    
    return true;
  }

  // Применение эффекта предмета
  applyItemEffect(effect) {
    switch (effect.type) {
      case 'heal':
        const healAmount = effect.value || 100;
        this.player.currentHp = Math.min(this.player.currentHp + healAmount, this.player.maxHp);
        console.log(`💚 Восстановлено ${healAmount} HP`);
        break;
        
      case 'buff':
        // Временный бафф (можно расширить)
        console.log(`🔮 Активирован бафф: ${effect.stat} +${effect.value}`);
        break;
        
      default:
        console.log(`✨ Активирован эффект: ${effect.type}`);
    }
    
    savePlayer(this.player);
  }

  // Получение общего веса/заполненности инвентаря
  getInventoryWeight() {
    return this.items.length;
  }

  // Очистка инвентаря
  clearInventory() {
    // Сначала снимаем всю экипировку
    Object.keys(this.equipment).forEach(slot => {
      if (this.equipment[slot]) {
        this.unequipItem(this.equipment[slot].id);
      }
    });
    
    this.items = [];
    this.saveInventory();
    console.log('🧹 Инвентарь очищен');
  }

  // Получение экипированных предметов
  getEquippedItems() {
    return Object.entries(this.equipment)
      .filter(([_, item]) => item)
      .map(([slot, item]) => ({ slot, item }));
  }

  // Проверка, экипирован ли предмет
  isItemEquipped(itemId) {
    return Object.values(this.equipment).some(item => 
      item && item.id === itemId
    );
  }

  // Покупка предмета в магазине
  buyItem(itemData, cost) {
    if (this.player.gold < cost) {
      console.log('💰 Недостаточно золота!');
      return false;
    }
    
    if (this.items.length >= this.maxSlots) {
      console.log('🎒 Инвентарь переполнен!');
      return false;
    }
    
    this.player.gold -= cost;
    
    // Добавляем предмет в инвентарь
    const success = this.addItem(itemData);
    
    if (success) {
      console.log(`✅ Куплен предмет: ${itemData.name} за ${cost} золота`);
      savePlayer(this.player);
      return true;
    }
    
    // Если не удалось добавить, возвращаем золото
    this.player.gold += cost;
    return false;
  }

  // Продажа предмета
  sellItem(itemId, priceMultiplier = 0.5) {
    const item = this.getItem(itemId);
    if (!item) return false;
    
    // Проверяем, не экипирован ли предмет
    if (item.equipped) {
      console.log('⚠️ Нельзя продать экипированный предмет!');
      return false;
    }
    
    const sellPrice = Math.floor(item.value * priceMultiplier);
    this.player.gold += sellPrice;
    
    this.removeItem(itemId);
    
    console.log(`💰 Продано: ${item.name} за ${sellPrice} золота`);
    savePlayer(this.player);
    return true;
  }
}

// База данных предметов
export const ITEMS_DB = {
  // Оружие
  'sword_beginner': {
    id: 'sword_beginner',
    name: 'Начальный меч',
    type: 'weapon',
    rarity: 'common',
    stats: { atk: 5 },
    description: 'Простой меч для начинающих воинов',
    icon: '🗡️',
    value: 50,
    stackable: false
  },
  
  'axe_warrior': {
    id: 'axe_warrior',
    name: 'Топор воина',
    type: 'weapon',
    rarity: 'uncommon',
    stats: { atk: 8, hp: 10 },
    description: 'Тяжелый топор, увеличивающий здоровье',
    icon: '🪓',
    value: 120,
    stackable: false
  },
  
  'dagger_assassin': {
    id: 'dagger_assassin',
    name: 'Кинжал ассасина',
    type: 'weapon',
    rarity: 'uncommon',
    stats: { atk: 6, crit: 0.05 },
    description: 'Острый кинжал с шансом критического удара',
    icon: '🗡️',
    value: 100,
    stackable: false
  },
  
  // Броня
  'leather_armor': {
    id: 'leather_armor',
    name: 'Кожаная броня',
    type: 'armor',
    rarity: 'common',
    stats: { def: 3, hp: 20 },
    description: 'Легкая кожаная броня',
    icon: '🛡️',
    value: 60,
    stackable: false
  },
  
  'iron_armor': {
    id: 'iron_armor',
    name: 'Железная броня',
    type: 'armor',
    rarity: 'uncommon',
    stats: { def: 6, hp: 40 },
    description: 'Надежная железная броня',
    icon: '🛡️',
    value: 150,
    stackable: false
  },
  
  // Шлемы
  'leather_helmet': {
    id: 'leather_helmet',
    name: 'Кожаный шлем',
    type: 'helmet',
    rarity: 'common',
    stats: { def: 1, hp: 10 },
    description: 'Простой кожаный шлем',
    icon: '⛑️',
    value: 30,
    stackable: false
  },
  
  // Ботинки
  'leather_boots': {
    id: 'leather_boots',
    name: 'Кожаные ботинки',
    type: 'boots',
    rarity: 'common',
    stats: { def: 1 },
    description: 'Удобные кожаные ботинки',
    icon: '👢',
    value: 25,
    stackable: false
  },
  
  // Зелья
  'health_potion_small': {
    id: 'health_potion_small',
    name: 'Малое зелье здоровья',
    type: 'potion',
    rarity: 'common',
    effect: { type: 'heal', value: 100 },
    description: 'Восстанавливает 100 HP',
    icon: '🧪',
    value: 20,
    stackable: true,
    consumable: true
  },
  
  'health_potion_medium': {
    id: 'health_potion_medium',
    name: 'Среднее зелье здоровья',
    type: 'potion',
    rarity: 'uncommon',
    effect: { type: 'heal', value: 250 },
    description: 'Восстанавливает 250 HP',
    icon: '🧪',
    value: 45,
    stackable: true,
    consumable: true
  },
  
  'strength_potion': {
    id: 'strength_potion',
    name: 'Зелье силы',
    type: 'potion',
    rarity: 'uncommon',
    effect: { type: 'buff', stat: 'atk', value: 10, duration: 300 },
    description: 'Увеличивает атаку на 10 на 5 минут',
    icon: '⚗️',
    value: 60,
    stackable: true,
    consumable: true
  },
  
  // Материалы
  'iron_ore': {
    id: 'iron_ore',
    name: 'Железная руда',
    type: 'material',
    rarity: 'common',
    description: 'Можно продать или использовать в крафте',
    icon: '⛏️',
    value: 5,
    stackable: true
  },
  
  'gold_ore': {
    id: 'gold_ore',
    name: 'Золотая руда',
    type: 'material',
    rarity: 'uncommon',
    description: 'Ценный материал для крафта',
    icon: '💰',
    value: 15,
    stackable: true
  }
};

// Редкость предметов
export const ITEM_RARITY = {
  common: { name: 'Обычный', color: '#bdc3c7', multiplier: 1.0 },
  uncommon: { name: 'Необычный', color: '#2ecc71', multiplier: 1.5 },
  rare: { name: 'Редкий', color: '#3498db', multiplier: 2.0 },
  epic: { name: 'Эпический', color: '#9b59b6', multiplier: 3.0 },
  legendary: { name: 'Легендарный', color: '#f1c40f', multiplier: 5.0 }
};

// Генерация случайного предмета
export function generateRandomItem(minLevel = 1, maxLevel = 10) {
  const itemTypes = ['weapon', 'armor', 'helmet', 'boots', 'potion', 'material'];
  const rarities = ['common', 'uncommon', 'rare'];
  
  const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
  const rarity = rarities[Math.floor(Math.random() * rarities.length)];
  const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
  
  let item = {
    id: `random_${type}_${Date.now()}`,
    name: `Случайный ${getItemTypeName(type)} ${rarity}`,
    type: type,
    rarity: rarity,
    level: level,
    icon: getRandomIcon(type),
    value: Math.floor(Math.random() * 50 * level) + 10,
    stackable: type === 'potion' || type === 'material'
  };
  
  // Добавляем статы в зависимости от типа
  switch (type) {
    case 'weapon':
      item.stats = { atk: Math.floor(Math.random() * 5 * level) + 1 };
      if (Math.random() > 0.7) item.stats.crit = 0.01 * level;
      break;
      
    case 'armor':
      item.stats = { def: Math.floor(Math.random() * 3 * level) + 1, hp: Math.floor(Math.random() * 10 * level) };
      break;
      
    case 'helmet':
      item.stats = { def: Math.floor(Math.random() * 2 * level) + 1, hp: Math.floor(Math.random() * 5 * level) };
      break;
      
    case 'boots':
      item.stats = { def: Math.floor(Math.random() * 1 * level) + 1 };
      break;
      
    case 'potion':
      item.effect = { 
        type: 'heal', 
        value: Math.floor(Math.random() * 100 * level) + 50 
      };
      item.consumable = true;
      break;
  }
  
  return item;
}

// Вспомогательные функции
function getItemTypeName(type) {
  const typeNames = {
    weapon: 'Оружие',
    armor: 'Броня',
    helmet: 'Шлем',
    boots: 'Ботинки',
    potion: 'Зелье',
    material: 'Материал'
  };
  return typeNames[type] || 'Предмет';
}

function getRandomIcon(type) {
  const icons = {
    weapon: ['🗡️', '🪓', '🏹', '🔨'],
    armor: ['🛡️', '🥋', '👕'],
    helmet: ['⛑️', '👑', '🎩'],
    boots: ['👢', '👞', '🥾'],
    potion: ['🧪', '⚗️', '💊'],
    material: ['⛏️', '💰', '💎', '🔮']
  };
  
  const typeIcons = icons[type] || ['📦'];
  return typeIcons[Math.floor(Math.random() * typeIcons.length)];
}