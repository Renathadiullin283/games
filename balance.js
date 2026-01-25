// balance.js
export const BALANCE = {
  // Формула опыта для уровня
  calculateLevelExp(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  },
  
  // Формула статов врагов
  calculateEnemyStats(baseStats, playerLevel) {
    const multiplier = 1 + (playerLevel * 0.1);
    return {
      hp: Math.floor(baseStats.hp * multiplier),
      atk: Math.floor(baseStats.atk * multiplier),
      def: Math.floor(baseStats.def * multiplier),
      gold: Math.floor(baseStats.gold * multiplier),
      exp: Math.floor(baseStats.exp * multiplier)
    };
  },
  
  // Формула цены предмета в магазине
  calculateItemPrice(basePrice, itemRarity, playerLevel) {
    const rarityMultipliers = {
      common: 1.0,
      uncommon: 1.5,
      rare: 2.5,
      epic: 4.0,
      legendary: 7.0
    };
    
    const levelMultiplier = 1 + (playerLevel * 0.05);
    return Math.floor(basePrice * rarityMultipliers[itemRarity] * levelMultiplier);
  },
  
  // Формула награды за врага
  calculateEnemyReward(enemyLevel, enemyRarity = 'normal') {
    const baseGold = 10 + (enemyLevel * 5);
    const rarityMultiplier = {
      normal: 1.0,
      elite: 2.5,
      boss: 5.0
    };
    return Math.floor(baseGold * rarityMultiplier[enemyRarity]);
  },
  
  // Формула HP восстановления зелья
  calculatePotionHeal(potionLevel, potionType = 'health') {
    const baseHeal = {
      health: 50,
      mana: 30,
      stamina: 40
    };
    return Math.floor(baseHeal[potionType] * (1 + potionLevel * 0.3));
  }
};

// Экспортируем как отдельные функции для удобства
export function calculateLevelExp(level) {
  return BALANCE.calculateLevelExp(level);
}

export function calculateEnemyStats(baseStats, playerLevel) {
  return BALANCE.calculateEnemyStats(baseStats, playerLevel);
}