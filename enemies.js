// enemies.js
export const ENEMY_TYPES = {
  // Лесные враги
  goblin: {
    name: 'Гоблин',
    baseHp: 50,
    baseAtk: 8,
    baseDef: 2,
    baseGold: 5,
    baseExp: 10,
    sprite: '👹',
    abilities: ['basic_attack'],
    weakAgainst: ['fire'],
    resistantTo: ['poison'],
    lootTable: [
      { item: 'iron_ore', chance: 0.3 },
      { item: 'health_potion_small', chance: 0.1 }
    ]
  },
  
  wolf: {
    name: 'Волк',
    baseHp: 60,
    baseAtk: 10,
    baseDef: 1,
    baseGold: 7,
    baseExp: 12,
    sprite: '🐺',
    abilities: ['bite', 'howl'],
    weakAgainst: [],
    resistantTo: ['bleed'],
    lootTable: [
      { item: 'leather', chance: 0.4 },
      { item: 'wolf_fang', chance: 0.2 }
    ]
  },
  
  // Заводские враги
  robot: {
    name: 'Заводской робот',
    baseHp: 120,
    baseAtk: 15,
    baseDef: 8,
    baseGold: 15,
    baseExp: 20,
    sprite: '🤖',
    abilities: ['laser', 'self_repair'],
    weakAgainst: ['electric'],
    resistantTo: ['poison', 'bleed'],
    lootTable: [
      { item: 'iron_ore', chance: 0.5 },
      { item: 'gear', chance: 0.3 },
      { item: 'energy_core', chance: 0.1 }
    ]
  },
  
  toxic_slime: {
    name: 'Токсичная слизь',
    baseHp: 80,
    baseAtk: 12,
    baseDef: 3,
    baseGold: 10,
    baseExp: 15,
    sprite: '🫠',
    abilities: ['poison_spit', 'split'],
    weakAgainst: ['fire'],
    resistantTo: ['poison'],
    lootTable: [
      { item: 'toxic_gland', chance: 0.4 },
      { item: 'health_potion_small', chance: 0.2 }
    ]
  },
  
  // Подземные враги
  skeleton: {
    name: 'Скелет',
    baseHp: 100,
    baseAtk: 18,
    baseDef: 5,
    baseGold: 20,
    baseExp: 25,
    sprite: '💀',
    abilities: ['bone_throw', 'shield_bash'],
    weakAgainst: ['holy'],
    resistantTo: ['bleed', 'poison'],
    lootTable: [
      { item: 'bone', chance: 0.6 },
      { item: 'rusty_sword', chance: 0.2 },
      { item: 'ancient_coins', chance: 0.1 }
    ]
  },
  
  spider: {
    name: 'Гигантский паук',
    baseHp: 90,
    baseAtk: 16,
    baseDef: 4,
    baseGold: 18,
    baseExp: 22,
    sprite: '🕷️',
    abilities: ['web_shot', 'venom_bite'],
    weakAgainst: ['fire'],
    resistantTo: ['poison'],
    lootTable: [
      { item: 'spider_silk', chance: 0.5 },
      { item: 'spider_fang', chance: 0.3 },
      { item: 'poison_gland', chance: 0.2 }
    ]
  },
  
  // Элитные враги
  ogre: {
    name: 'Огр',
    baseHp: 300,
    baseAtk: 30,
    baseDef: 15,
    baseGold: 50,
    baseExp: 60,
    sprite: '👹',
    abilities: ['smash', 'roar', 'berserk'],
    weakAgainst: ['magic'],
    resistantTo: ['physical'],
    lootTable: [
      { item: 'ogre_tooth', chance: 0.7 },
      { item: 'health_potion_medium', chance: 0.4 },
      { item: 'ogre_club', chance: 0.1 }
    ]
  },
  
  dark_mage: {
    name: 'Темный маг',
    baseHp: 180,
    baseAtk: 35,
    baseDef: 8,
    baseGold: 40,
    baseExp: 50,
    sprite: '🧙‍♂️',
    abilities: ['dark_bolt', 'curse', 'summon_minion'],
    weakAgainst: ['holy', 'light'],
    resistantTo: ['dark', 'magic'],
    lootTable: [
      { item: 'magic_dust', chance: 0.6 },
      { item: 'ancient_scroll', chance: 0.3 },
      { item: 'dark_amulet', chance: 0.1 }
    ]
  },
  
  // Боссы
  dragon_whelp: {
    name: 'Дракончик',
    baseHp: 500,
    baseAtk: 45,
    baseDef: 20,
    baseGold: 100,
    baseExp: 150,
    sprite: '🐉',
    abilities: ['fire_breath', 'tail_swipe', 'fear'],
    weakAgainst: ['ice'],
    resistantTo: ['fire'],
    lootTable: [
      { item: 'dragon_scale', chance: 0.8 },
      { item: 'dragon_fang', chance: 0.5 },
      { item: 'fire_essence', chance: 0.2 }
    ]
  }
};

// Типы абилий врагов
export const ENEMY_ABILITIES = {
  basic_attack: {
    name: 'Базовая атака',
    damage: 1.0,
    effect: null
  },
  
  bite: {
    name: 'Укус',
    damage: 1.2,
    effect: { type: 'bleed', duration: 3, damage: 5 }
  },
  
  poison_spit: {
    name: 'Ядовитый плевок',
    damage: 0.8,
    effect: { type: 'poison', duration: 5, damage: 10 }
  },
  
  fire_breath: {
    name: 'Огненное дыхание',
    damage: 1.8,
    effect: { type: 'burn', duration: 4, damage: 15 }
  },
  
  dark_bolt: {
    name: 'Темная стрела',
    damage: 1.5,
    effect: { type: 'curse', duration: 3, stat: 'def', value: -5 }
  },
  
  self_repair: {
    name: 'Самовосстановление',
    damage: 0,
    effect: { type: 'heal', value: 50 }
  },
  
  summon_minion: {
    name: 'Призыв миньона',
    damage: 0,
    effect: { type: 'summon', enemy: 'skeleton' }
  },
  
  roar: {
    name: 'Рев',
    damage: 0.5,
    effect: { type: 'stun', duration: 1 }
  }
};

// Типы урона для системы сопротивлений
export const DAMAGE_TYPES = {
  physical: 'Физический',
  fire: 'Огненный',
  ice: 'Ледяной',
  poison: 'Ядовитый',
  electric: 'Электрический',
  holy: 'Святой',
  dark: 'Темный',
  magic: 'Магический'
};