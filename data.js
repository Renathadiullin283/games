// data.js
export const ACHIEVEMENTS = {
  FIRST_BATTLE: {
    id: 'first_battle',
    name: 'Первая кровь',
    description: 'Победить первого врага',
    reward: { gold: 50 },
    condition: (player) => player.enemiesDefeated >= 1
  },
  COLLECTOR: {
    id: 'collector',
    name: 'Коллекционер',
    description: 'Собрать 10 предметов',
    reward: { gold: 100, item: 'special_chest' },
    condition: (player) => player.itemsCollected >= 10
  },
  // ... больше достижений
};

export const SAVE_KEYS = {
  PLAYER: "stickman_rpg_player",
  INVENTORY: "stickman_rpg_inventory",
  PROGRESS: "stickman_rpg_progress",
};

export const CLASSES = {
  warrior: {
    name: "Воин",
    hpMult: 1.5,
    atkMult: 1.0,
    defMult: 1.3,
  },
  assassin: {
    name: "Ассасин",
    hpMult: 1.0,
    atkMult: 1.4,
    critChance: 0.25,
  },
};


export const LOCATIONS = {
  // Лесные локации (уровни 1-5)
  forest: {
    name: "Темный лес",
    description: "Густой лес, кишащий дикими существами",
    enemies: 6,
    baseLevel: 1,
    enemyHp: 50,      // Добавлено
    enemyAtk: 8,      // Добавлено
    enemyTypes: [
      { type: 'goblin', weight: 3 },
      { type: 'wolf', weight: 2 },
      { type: 'spider', weight: 1 }
    ],
    eliteChance: 0.1,
    bossChance: 0,
    rewards: { gold: 50, exp: 100 },
    environment: 'forest',
    background: '#145a32',
    ground: '#784212'
  },
  
  old_road: {
    name: "Старая дорога",
    description: "Заброшенная дорога, охраняемая бандитами",
    enemies: 8,
    baseLevel: 2,
    enemyHp: 60,      // Добавлено
    enemyAtk: 10,     // Добавлено
    enemyTypes: [
      { type: 'goblin', weight: 2 },
      { type: 'wolf', weight: 3 },
      { type: 'skeleton', weight: 1 }
    ],
    eliteChance: 0.15,
    bossChance: 0,
    rewards: { gold: 80, exp: 150 },
    environment: 'road',
    background: '#7d6608',
    ground: '#935116'
  },
  
  // Заводские локации (уровни 3-7)
  factory: {
    name: "Заброшенный завод",
    description: "Старый механический комплекс",
    enemies: 10,
    baseLevel: 3,
    enemyHp: 120,     // Добавлено
    enemyAtk: 15,     // Добавлено
    enemyTypes: [
      { type: 'robot', weight: 3 },
      { type: 'toxic_slime', weight: 2 },
      { type: 'goblin', weight: 1 }
    ],
    eliteChance: 0.2,
    bossChance: 0.05,
    rewards: { gold: 120, exp: 200 },
    environment: 'factory',
    background: '#2c3e50',
    ground: '#7f8c8d'
  },
  
  sewers: {
    name: "Городская канализация",
    description: "Затопленные туннели под городом",
    enemies: 12,
    baseLevel: 4,
    enemyHp: 80,      // Добавлено
    enemyAtk: 12,     // Добавлено
    enemyTypes: [
      { type: 'toxic_slime', weight: 4 },
      { type: 'spider', weight: 2 },
      { type: 'skeleton', weight: 1 }
    ],
    eliteChance: 0.25,
    bossChance: 0,
    rewards: { gold: 150, exp: 250 },
    environment: 'sewer',
    background: '#1a5276',
    ground: '#424949'
  },
  
  // Горные локации (уровни 5-10)
  mountains: {
    name: "Заоблачные горы",
    description: "Высокие горы, где живут опасные существа",
    enemies: 10,
    baseLevel: 5,
    enemyHp: 300,     // Добавлено
    enemyAtk: 30,     // Добавлено
    enemyTypes: [
      { type: 'wolf', weight: 2 },
      { type: 'ogre', weight: 1 },
      { type: 'dark_mage', weight: 1 }
    ],
    eliteChance: 0.3,
    bossChance: 0.1,
    rewards: { gold: 200, exp: 350 },
    environment: 'mountains',
    background: '#616a6b',
    ground: '#7b7d7d'
  },
  
  // Подземные локации (уровни 6-15)
  crypt: {
    name: "Древняя крипта",
    description: "Забытое подземелье с неупокоенными душами",
    enemies: 15,
    baseLevel: 6,
    enemyHp: 100,     // Добавлено
    enemyAtk: 18,     // Добавлено
    enemyTypes: [
      { type: 'skeleton', weight: 4 },
      { type: 'spider', weight: 2 },
      { type: 'dark_mage', weight: 1 }
    ],
    eliteChance: 0.35,
    bossChance: 0.15,
    rewards: { gold: 250, exp: 450 },
    environment: 'crypt',
    background: '#17202a',
    ground: '#424949'
  },
  
  deep_caves: {
    name: "Глубокие пещеры",
    description: "Лабиринт темных пещер с древними существами",
    enemies: 18,
    baseLevel: 8,
    enemyHp: 90,      // Добавлено
    enemyAtk: 16,     // Добавлено
    enemyTypes: [
      { type: 'ogre', weight: 3 },
      { type: 'dark_mage', weight: 2 },
      { type: 'dragon_whelp', weight: 1 }
    ],
    eliteChance: 0.4,
    bossChance: 0.2,
    rewards: { gold: 350, exp: 600 },
    environment: 'cave',
    background: '#1b2631',
    ground: '#34495e'
  },
  
  // Эпические локации (уровни 10+)
  dragon_lair: {
    name: "Логово дракона",
    description: "Огненная пещера великого дракона",
    enemies: 20,
    baseLevel: 10,
    enemyHp: 500,     // Добавлено
    enemyAtk: 45,     // Добавлено
    enemyTypes: [
      { type: 'dragon_whelp', weight: 3 },
      { type: 'dark_mage', weight: 1 },
      { type: 'ogre', weight: 2 }
    ],
    eliteChance: 0.5,
    bossChance: 1.0, // Всегда есть босс в конце
    rewards: { gold: 500, exp: 1000 },
    environment: 'lava',
    background: '#922b21',
    ground: '#641e16'
  },
  
  void_portal: {
    name: "Портал в Пустоту",
    description: "Врата в иные миры, охраняемые демонами",
    enemies: 25,
    baseLevel: 12,
    enemyHp: 180,     // Добавлено
    enemyAtk: 35,     // Добавлено
    enemyTypes: [
      { type: 'dark_mage', weight: 3 },
      { type: 'dragon_whelp', weight: 2 },
      { type: 'ogre', weight: 2 }
    ],
    eliteChance: 0.6,
    bossChance: 1.0,
    rewards: { gold: 800, exp: 1500 },
    environment: 'void',
    background: '#4a235a',
    ground: '#2c3e50'
  }
};
// Материалы для лута врагов
export const MATERIALS = {
  iron_ore: { name: 'Железная руда', value: 5, icon: '⛏️' },
  gold_ore: { name: 'Золотая руда', value: 15, icon: '💰' },
  leather: { name: 'Кожа', value: 8, icon: '🐄' },
  wolf_fang: { name: 'Клык волка', value: 12, icon: '🐺' },
  spider_silk: { name: 'Паутина', value: 10, icon: '🕸️' },
  spider_fang: { name: 'Клык паука', value: 15, icon: '🕷️' },
  bone: { name: 'Кость', value: 3, icon: '💀' },
  ancient_coins: { name: 'Древние монеты', value: 25, icon: '🪙' },
  toxic_gland: { name: 'Ядовитая железа', value: 20, icon: '☠️' },
  gear: { name: 'Шестеренка', value: 8, icon: '⚙️' },
  energy_core: { name: 'Энергетическое ядро', value: 50, icon: '🔋' },
  ogre_tooth: { name: 'Клык огра', value: 40, icon: '👹' },
  ogre_club: { name: 'Дубина огра', value: 60, icon: '🏏' },
  magic_dust: { name: 'Магическая пыль', value: 30, icon: '✨' },
  ancient_scroll: { name: 'Древний свиток', value: 80, icon: '📜' },
  dark_amulet: { name: 'Темный амулет', value: 120, icon: '📿' },
  dragon_scale: { name: 'Чешуя дракона', value: 150, icon: '🐉' },
  dragon_fang: { name: 'Клык дракона', value: 200, icon: '🔥' },
  fire_essence: { name: 'Сущность огня', value: 300, icon: '🔥' }
};
