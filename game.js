// game.js - исправленная версия
import { DEBUG_PLAYER } from "./debug.js";
import { loadPlayer, savePlayer } from "./telegramSave.js";

export let player = null;

export async function initPlayer() {
  console.log("🎮 Инициализация игрока...");
  
  // Загружаем сохранение
  const savedPlayer = await loadPlayer();
  
  if (savedPlayer) {
    player = savedPlayer;
    console.log("✅ Игрок загружен из сохранения:", player);
  } else {
    // Создаем нового игрока
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
      maxHp: 100,
      currentHp: 100,
      baseStats: { hp: 100, atk: 10, def: 5, crit: 0.05 }
    };
    console.log("✅ Новый игрок создан");
    await savePlayer(player);
  }
  
  return player;
}

export function resetPlayerHp() {
  if (player) {
    player.currentHp = player.maxHp;
  }
}

export const playerReady = initPlayer();
