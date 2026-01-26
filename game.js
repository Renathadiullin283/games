// game.js - обновленная версия с системой опыта
import { DEBUG_PLAYER } from "./debug.js";
import { loadPlayer, savePlayer } from "./telegramSave.js";

export let player = null;

export async function initPlayer() {
  console.log("🎮 Инициализация игрока...");
  
  const savedPlayer = await loadPlayer();
  
  if (savedPlayer) {
    player = savedPlayer;
    console.log("✅ Игрок загружен из сохранения:", player);
  } else {
    // Создаем нового игрока
    player = {
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      gold: 100,
      gems: 0,
      classId: "warrior",
      stats: {
        hp: 100,
        atk: 10,
        def: 5,
        crit: 0.05,
        dodge: 0.02
      },
      maxHp: 100,
      currentHp: 100,
      baseStats: { hp: 100, atk: 10, def: 5, crit: 0.05, dodge: 0.02 },
      // Статистика
      enemiesDefeated: 0,
      dungeonsCompleted: 0,
      totalGoldEarned: 0,
      playTime: 0,
      // Прогресс
      unlockedLocations: ['forest', 'old_road'],
      completedLocations: []
    };
    console.log("✅ Новый игрок создан");
    await savePlayer(player);
  }
  
  return player;
}

// Добавление опыта игроку
export function addExp(amount) {
  if (!player) return false;
  
  player.exp += amount;
  let leveledUp = false;
  
  // Проверка повышения уровня
  while (player.exp >= player.expToNextLevel) {
    player.exp -= player.expToNextLevel;
    player.level += 1;
    leveledUp = true;
    
    // Увеличение статов при повышении уровня
    player.stats.hp += 20;
    player.stats.atk += 5;
    player.stats.def += 2;
    player.stats.crit += 0.01;
    player.stats.dodge += 0.005;
    
    // Обновление максимального HP
    player.maxHp = player.stats.hp;
    player.currentHp = player.maxHp;
    
    // Увеличение необходимого опыта для следующего уровня
    player.expToNextLevel = Math.floor(100 * Math.pow(1.5, player.level - 1));
    
    console.log(`🎉 Уровень повышен! Новый уровень: ${player.level}`);
  }
  
  if (leveledUp) {
    savePlayer(player);
  }
  
  return leveledUp;
}

// Проверка доступности локации
export function isLocationUnlocked(locationId) {
  if (!player || !player.unlockedLocations) return false;
  return player.unlockedLocations.includes(locationId);
}

// Разблокировка новой локации
export function unlockLocation(locationId) {
  if (!player || !player.unlockedLocations) return false;
  
  if (!player.unlockedLocations.includes(locationId)) {
    player.unlockedLocations.push(locationId);
    savePlayer(player);
    return true;
  }
  
  return false;
}

// Завершение локации
export function completeLocation(locationId) {
  if (!player || !player.completedLocations) return false;
  
  if (!player.completedLocations.includes(locationId)) {
    player.completedLocations.push(locationId);
    player.dungeonsCompleted = (player.dungeonsCompleted || 0) + 1;
    savePlayer(player);
    return true;
  }
  
  return false;
}

export function resetPlayerHp() {
  if (player) {
    player.currentHp = player.maxHp;
  }
}

// Экспортируем промис для удобства
export const playerReady = initPlayer();
