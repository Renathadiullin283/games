// game.js
import { DEBUG_PLAYER } from "./debug.js";
import { loadPlayer } from "./telegramSave.js";

// Создаём пустой объект игрока
export let player = null;

// Инициализируем игрока асинхронно
export async function initPlayer() {
  console.log("🎮 Инициализация игрока...");
  
  // Загружаем сохранение
  const savedData = await loadPlayer();
  
  // Создаём игрока на основе сохранения
  player = {
    level: savedData.level || DEBUG_PLAYER.level,
    gold: savedData.gold || DEBUG_PLAYER.gold,
    classId: savedData.classId || DEBUG_PLAYER.classId,
    stats: {
      hp: savedData.stats?.hp || DEBUG_PLAYER.stats.hp,
      atk: savedData.stats?.atk || DEBUG_PLAYER.stats.atk,
      def: savedData.stats?.def || DEBUG_PLAYER.stats.def,
      crit: savedData.stats?.crit || DEBUG_PLAYER.stats.crit,
    },
  };
  
  // Добавляем maxHp и currentHp
  player.maxHp = player.stats.hp;
  player.currentHp = savedData.currentHp || player.stats.hp;
  
  console.log("✅ Игрок инициализирован:", player);
  return player;
}

export function resetPlayerHp() {
  if (player) {
    player.currentHp = player.maxHp;
  }
}

// Экспортируем промис для удобства
export const playerReady = initPlayer();
