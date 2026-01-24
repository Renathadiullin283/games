import { player, resetPlayerHp } from "./game.js";
import { LOCATIONS } from "./data.js";
import { clear, drawStickman, drawHpBar, spawnDamageText, updateDamageTexts, screenShake } from "./render.js";
import { savePlayer } from "./telegramSave.js"; // Импорт должен быть в начале файла

const logEl = document.getElementById("log");

let enemy = null;
let enemyMaxHp = 0;
let attackPhase = 0;
let animationId = null; // Добавляем переменную для контроля анимации

// Обновление HUD
function updateHUD() {
  document.getElementById("hp").textContent = `HP: ${player.currentHp}`;
  document.getElementById("gold").textContent = `Gold: ${player.gold}`;
  document.getElementById("level").textContent = `Lvl: ${player.level}`;
}

export function startRun(locationId) {
  logEl.textContent = "";
  const location = LOCATIONS[locationId];
  resetPlayerHp();

  let enemyIndex = 0;
  spawnEnemy(enemyIndex, location);

  // Останавливаем предыдущую анимацию, если есть
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  const interval = setInterval(() => {
    if (player.currentHp <= 0) {
      log("❌ Персонаж погиб");
      clearInterval(interval);
      stopAnimation(); // Останавливаем анимацию
      savePlayer(player); // Сохраняем прогресс
      return;
    }

    if (enemyIndex >= location.enemies) {
      log("✅ Локация зачищена");
      clearInterval(interval);
      stopAnimation(); // Останавливаем анимацию
      
      // Награда за прохождение локации
      player.gold += 50;
      player.level += 1;
      savePlayer(player); // Сохраняем прогресс
      
      return;
    }

    // Атака игрока
    const crit = Math.random() < player.stats.crit;
    const damage = crit ? player.stats.atk * 2 : player.stats.atk;

    enemy.hp -= damage;
    spawnDamageText(280, 90, `-${damage}`, crit);

    if (crit) screenShake(8);

    attackPhase = 10;

    if (enemy.hp <= 0) {
      // Награда за убитого врага
      player.gold += 10; // Маленькая награда за каждого врага
      log(`💰 Получено 10 золота за убийство врага`);
      
      enemyIndex++;
      if (enemyIndex >= location.enemies) {
        log("🏆 Все враги побеждены");
        clearInterval(interval);
        stopAnimation(); // Останавливаем анимацию
        
        // Финальная награда
        player.gold += 50;
        player.level += 1;
        savePlayer(player);
        
        return;
      }
      spawnEnemy(enemyIndex, location);
      return;
    }

    // Атака врага
    const incoming = Math.max(enemy.atk - player.stats.def, 1);
    player.currentHp -= incoming;
    spawnDamageText(120, 90, `-${incoming}`);

    updateHUD();
  }, 1000);

  animate(); // Запускаем анимацию
}

function spawnEnemy(index, location) {
  enemyMaxHp = Math.floor(location.enemyHp * Math.pow(location.hpGrowth, index));
  enemy = {
    hp: enemyMaxHp,
    atk: Math.floor(location.enemyAtk * Math.pow(location.atkGrowth, index)),
  };
}

function animate() {
  clear();

  // Анимация удара
  const playerOffset = attackPhase > 0 ? (attackPhase > 5 ? 5 : -5) : 0;
  if (attackPhase > 0) attackPhase--;

  // Игрок
  drawStickman(100 + playerOffset, 120, "#000");
  drawHpBar(70, 20, 60, 6, player.currentHp, player.maxHp);

  // Враг
  drawStickman(300, 120, "#b00");
  drawHpBar(270, 20, 60, 6, enemy.hp, enemyMaxHp);

  updateDamageTexts();

  // Сохраняем ID анимации для возможности остановки
  animationId = requestAnimationFrame(animate);
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function log(text) {
  logEl.textContent += text + "\n";
}
