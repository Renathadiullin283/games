// telegramSave.js
import { SAVE_KEYS } from "./data.js";
import { DEBUG_PLAYER } from "./debug.js"; // Импортируем для дефолтных значений

export async function savePlayer(player) {
  console.log("🔄 Сохраняем игрока:", player);
  
  if (!window.Telegram?.WebApp?.CloudStorage) {
    console.log("📱 Telegram WebApp не доступен, сохраняем в localStorage");
    localStorage.setItem(SAVE_KEYS.PLAYER, JSON.stringify(player));
    return true;
  }
  
  try {
    // CloudStorage в Telegram работает через методы setItem, getItem, removeItem
    // Но в некоторых версиях используется просто set/get
    await Telegram.WebApp.CloudStorage.setItem(SAVE_KEYS.PLAYER, JSON.stringify(player));
    console.log("✅ Прогресс сохранён в Telegram CloudStorage");
    return true;
  } catch (e) {
    console.error("❌ Ошибка сохранения в Telegram:", e);
    // Fallback на localStorage
    localStorage.setItem(SAVE_KEYS.PLAYER, JSON.stringify(player));
    return false;
  }
}

export async function loadPlayer() {
  console.log("🔄 Пытаемся загрузить сохранение...");
  
  // Сначала проверяем localStorage (для разработки)
  const localData = localStorage.getItem(SAVE_KEYS.PLAYER);
  if (localData) {
    console.log("📂 Загружаем из localStorage");
    try {
      const parsed = JSON.parse(localData);
      console.log("✅ Загруженный игрок:", parsed);
      return parsed;
    } catch (e) {
      console.error("❌ Ошибка парсинга localStorage:", e);
    }
  }
  
  // Пробуем Telegram CloudStorage
  if (window.Telegram?.WebApp?.CloudStorage) {
    console.log("📱 Telegram CloudStorage доступен");
    try {
      // Пробуем разные методы API
      let cloudData = null;
      
      // Метод 1: getItem (современный)
      if (typeof Telegram.WebApp.CloudStorage.getItem === 'function') {
        cloudData = await Telegram.WebApp.CloudStorage.getItem(SAVE_KEYS.PLAYER);
      }
      // Метод 2: get (старый)
      else if (typeof Telegram.WebApp.CloudStorage.get === 'function') {
        const allData = await Telegram.WebApp.CloudStorage.get([SAVE_KEYS.PLAYER]);
        cloudData = allData && allData[SAVE_KEYS.PLAYER];
      }
      // Метод 3: direct access
      else if (Telegram.WebApp.CloudStorage[SAVE_KEYS.PLAYER]) {
        cloudData = Telegram.WebApp.CloudStorage[SAVE_KEYS.PLAYER];
      }
      
      console.log("📦 Данные из CloudStorage:", cloudData);
      
      if (cloudData) {
        const parsed = JSON.parse(cloudData);
        console.log("✅ Загружено из Telegram CloudStorage:", parsed);
        
        // Сохраняем в localStorage для резервной копии
        localStorage.setItem(SAVE_KEYS.PLAYER, cloudData);
        
        return parsed;
      }
    } catch (e) {
      console.error("❌ Ошибка загрузки из Telegram:", e);
    }
  }
  
  // Если ничего не загрузилось, возвращаем дефолтные значения
  console.log("⚠️ Ничего не загружено, используем DEBUG_PLAYER");
  const defaultPlayer = {
    level: DEBUG_PLAYER.level,
    gold: DEBUG_PLAYER.gold,
    stats: { ...DEBUG_PLAYER.stats },
    maxHp: DEBUG_PLAYER.stats.hp,
    currentHp: DEBUG_PLAYER.stats.hp,
  };
  
  // Сохраняем дефолтные значения для будущих сессий
  localStorage.setItem(SAVE_KEYS.PLAYER, JSON.stringify(defaultPlayer));
  
  return defaultPlayer;
}

// Вспомогательная функция для очистки сохранений
export function clearSave() {
  localStorage.removeItem(SAVE_KEYS.PLAYER);
  if (window.Telegram?.WebApp?.CloudStorage) {
    Telegram.WebApp.CloudStorage.removeItem(SAVE_KEYS.PLAYER);
  }
  console.log("🧹 Все сохранения очищены");
}

// Вспомогательная функция для отладки
export function debugSaveSystem() {
  console.log("🔍 Отладка системы сохранения:");
  console.log("Telegram доступен:", !!window.Telegram?.WebApp);
  console.log("CloudStorage доступен:", !!window.Telegram?.WebApp?.CloudStorage);
  console.log("localStorage данные:", localStorage.getItem(SAVE_KEYS.PLAYER));
  
  if (window.Telegram?.WebApp?.CloudStorage) {
    console.log("CloudStorage методы:", Object.keys(Telegram.WebApp.CloudStorage));
  }
}
