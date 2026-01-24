// telegramSave.js
import { SAVE_KEYS } from "./data.js";
export async function savePlayer(player) {
  if (!window.Telegram?.WebApp?.CloudStorage) return;
  try {
    await Telegram.WebApp.CloudStorage.set(SAVE_KEYS.PLAYER, JSON.stringify(player));
    console.log("Прогресс сохранён!");
  } catch (e) {
    console.error("Ошибка сохранения:", e);
  }
}

export async function loadPlayer(defaultPlayer) {
  if (!window.Telegram?.WebApp?.CloudStorage) return defaultPlayer;
  try {
    const data = await Telegram.WebApp.CloudStorage.get(SAVE_KEYS.PLAYER);
    if (data) return JSON.parse(data);
    return defaultPlayer;
  } catch (e) {
    console.error("Ошибка загрузки:", e);
    return defaultPlayer;
  }
}
