// game.js
import { DEBUG_PLAYER } from "./debug.js";
import { loadPlayer } from "./telegramSave.js";

// Создаём пустой объект игрока
export let player = null;

// Инициализируем игрока асинхронно
export async function initPlayer() {
  console.log("🎮 Инициализация игрока...");
  
  // Создаём игрока с базовыми значениями
  player = {
    level: 1,
    gold: 100,
    classId: "warrior",
    stats: {
      hp: 100,
      atk: 10,
      def: 5,
      crit: 0.05,
    },
  };
  
  // Добавляем maxHp и currentHp
  player.maxHp = player.stats.hp;
  player.currentHp = player.stats.hp;
  
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
