// game.js - исправленная версия
import { DEBUG_PLAYER } from "./debug.js";
import { loadPlayer, savePlayer } from "./telegramSave.js";
// УДАЛИТЬ: import { awardSkillPoints } from './main.js'; // <-- ЭТУ СТРОКУ УДАЛИТЬ

export let player = null;

export async function initPlayer() {
  console.log("🎮 Инициализация игрока...");
  
  const savedPlayer = await loadPlayer();
  
  if (savedPlayer) {
    player = savedPlayer;
    // Убедимся, что есть очки навыков
    if (player.skillPoints === undefined) {
      player.skillPoints = 0;
    }
    console.log("✅ Игрок загружен из сохранения:", player);
  } else {
    // Создаем нового игрока
    player = {
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      gold: 100,
      gems: 0,
      skillPoints: 1, // Начальные очки навыков
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
  let levelsGained = 0; // Считаем сколько уровней получено
  
  // Проверка повышения уровня
  while (player.exp >= player.expToNextLevel) {
    player.exp -= player.expToNextLevel;
    player.level += 1;
    levelsGained++;
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
    // Начисляем очки навыков за уровни
    addSkillPointsForLevels(levelsGained);
    
    // Обновляем UI
    if (window.sceneManager) {
      window.sceneManager.updateAllDisplays();
    }
    
    savePlayer(player);
  }
  
  return leveledUp;
}

// Функция для начисления очков навыков при повышении уровня
function addSkillPointsForLevels(levelsGained) {
  if (!player) return;
  
  // Инициализируем очки навыков, если их нет
  if (player.skillPoints === undefined) {
    player.skillPoints = 0;
  }
  
  // Начисляем очки за каждый уровень
  let pointsGained = 0;
  for (let i = 0; i < levelsGained; i++) {
    // Базовая формула: 1 очко за уровень, +1 за каждые 5 уровней
    const basePoints = 1;
    const bonusPoints = Math.floor(player.level / 5);
    pointsGained += basePoints + bonusPoints;
  }
  
  player.skillPoints += pointsGained;
  
  console.log(`✨ Начислено ${pointsGained} очков навыков за ${levelsGained} уровень(ей). Всего: ${player.skillPoints}`);
  
  // Показываем уведомление
  if (window.sceneManager && window.sceneManager.showNotification) {
    window.sceneManager.showNotification('✨ Очки навыков', `Получено ${pointsGained} очков навыков!`, 'success');
  }
}

// Функция для начисления очков навыков за достижения
export function awardSkillPoints(amount, reason = '') {
  if (!player) return 0;
  
  if (player.skillPoints === undefined) {
    player.skillPoints = 0;
  }
  
  player.skillPoints += amount;
  
  console.log(`✨ Награда: ${amount} очков навыков за ${reason}. Всего: ${player.skillPoints}`);
  
  // Показываем уведомление
  if (window.sceneManager && window.sceneManager.showNotification) {
    window.sceneManager.showNotification('✨ Награда за достижение', 
      `Получено ${amount} очков навыков! ${reason}`, 'success');
    window.sceneManager.updateAllDisplays();
  }
  
  savePlayer(player);
  
  return player.skillPoints;
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
