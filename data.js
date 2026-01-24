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
  factory: {
    name: "Заброшенный завод",
    enemies: 5,
    enemyHp: 300,
    enemyAtk: 20,
    hpGrowth: 1.2,
    atkGrowth: 1.1,
    level: 1,
  },
  forest: {
    name: "Лес",
    enemies: 7,
    enemyHp: 400,
    enemyAtk: 25,
    hpGrowth: 1.25,
    atkGrowth: 1.15,
    level: 2,
  },
  dungeon: {
    name: "Подземелье",
    enemies: 10,
    enemyHp: 600,
    enemyAtk: 35,
    hpGrowth: 1.3,
    atkGrowth: 1.2,
    level: 3,
  },
};


