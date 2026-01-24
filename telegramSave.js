// telegramSave.js
import { SAVE_KEYS } from "./data.js";

export async function savePlayer(player) {
  if (!window.Telegram?.WebApp?.CloudStorage) {
    console.log("Telegram WebApp не доступен, сохранение в localStorage");
    localStorage.setItem(SAVE_KEYS.PLAYER, JSON.stringify(player));
    return;
  }
  
  try {
    // Правильный метод - setItem (не set!)
    await Telegram.WebApp.CloudStorage.setItem(SAVE_KEYS.PLAYER, JSON.stringify(player));
    console.log("Прогресс сохранён в Telegram CloudStorage!");
  } catch (e) {
    console.error("Ошибка сохранения в Telegram:", e);
    // Fallback на localStorage
    localStorage.setItem(SAVE_KEYS.PLAYER, JSON.stringify(player));
  }
}

export async function loadPlayer(defaultPlayer) {
  if (!window.Telegram?.WebApp?.CloudStorage) {
    console.log("Telegram WebApp не доступен, загрузка из localStorage");
    const data = localStorage.getItem(SAVE_KEYS.PLAYER);
    return data ? JSON.parse(data) : defaultPlayer;
  }
  
  try {
    // Правильный метод - getItem (не get!)
    const data = await Telegram.WebApp.CloudStorage.getItem(SAVE_KEYS.PLAYER);
    if (data) {
      console.log("Прогресс загружен из Telegram CloudStorage!");
      return JSON.parse(data);
    }
    return defaultPlayer;
  } catch (e) {
    console.error("Ошибка загрузки из Telegram:", e);
    const data = localStorage.getItem(SAVE_KEYS.PLAYER);
    return data ? JSON.parse(data) : defaultPlayer;
  }
}
