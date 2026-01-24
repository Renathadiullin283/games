import { player, resetPlayerHp } from "./game.js";
import { LOCATIONS } from "./data.js";
import { clear, drawStickman, drawHpBar, spawnDamageText, updateDamageTexts, screenShake } from "./render.js";
import { savePlayer } from "./telegramSave.js";

const logEl = document.getElementById("log");

let enemy = null;
let enemyMaxHp = 0;
let attackPhase = 0;
let animationId = null;
let gameInterval = null;

// Обновление HUD
function updateHUD() {
  document.getElementById("hp").textContent = `HP: ${player.currentHp}`;
  document.getElementById("gold").textContent = `Gold: ${player.gold}`;
  document.getElementById("level").textContent = `Lvl: ${player.level}`;
}

export function startRun(locationId) {
  console.log("⚔️ Начинаем битву в локации:", locationId);
  
  // Останавливаем предыдущую игру
  stopGame();
  
  logEl.textContent = "";
  const location = LOCATIONS[locationId];
  resetPlayerHp();
  updateHUD();

  let enemyIndex = 0;
  spawnEnemy(enemyIndex, location);
  log(`⚔️ Встречен враг ${enemyIndex + 1}/${location.enemies}`);

  gameInterval = setInterval(() => {
    if (player.currentHp <= 0) {
      log("❌ Персонаж погиб");
      log("💀 Вы проиграли!");
      stopGame();
      savePlayer(player);
      return;
    }

    if (enemyIndex >= location.enemies) {
      log("✅ Локация зачищена");
      const goldReward = 50 + location.level * 20;
      log(`🏆 Получено: ${goldReward} золота и 1 уровень опыта`);
      player.gold += goldReward;
      player.level += 1;
      stopGame();
      savePlayer(player);
      updateHUD();
      return;
    }

    // Атака игрока
    const crit = Math.random() < player.stats.crit;
    const damage = crit ? Math.floor(player.stats.atk * 2.5) : player.stats.atk;
    enemy.hp -= damage;
    spawnDamageText(280, 90, `-${damage}`, crit);
    if (crit) {
      screenShake(8);
      log("💥 Критический удар!");
    }

    attackPhase = 10;

    if (enemy.hp <= 0) {
      const goldReward = 10 + Math.floor(enemyIndex / 2);
      log(`💀 Враг ${enemyIndex + 1} побежден!`);
      log(`💰 Получено ${goldReward} золота`);
      player.gold += goldReward;
      enemyIndex++;
      
      if (enemyIndex >= location.enemies) {
        const finalReward = 50 + location.level * 20;
        log("🏆 Все враги побеждены!");
        log(`🏆 Получено: ${finalReward} золота и 1 уровень опыта`);
        player.gold += finalReward;
        player.level += 1;
        stopGame();
        savePlayer(player);
        updateHUD();
        return;
      }
      
      log(`⚔️ Встречен враг ${enemyIndex + 1}/${location.enemies}`);
      spawnEnemy(enemyIndex, location);
      savePlayer(player); // Сохраняем после каждого врага
      updateHUD();
      return;
    }

    // Атака врага
    const incoming = Math.max(enemy.atk - player.stats.def, 1);
    player.currentHp -= incoming;
    spawnDamageText(120, 90, `-${incoming}`);
    
    // Предупреждение о низком HP
    if (player.currentHp < player.maxHp * 0.3 && player.currentHp > 0) {
      log("⚠️ Низкое здоровье!");
    }
    
    updateHUD();
  }, 1000);

  animate();
}

function spawnEnemy(index, location) {
  enemyMaxHp = Math.floor(location.enemyHp * Math.pow(location.hpGrowth, index));
  enemy = {
    hp: enemyMaxHp,
    atk: Math.floor(location.enemyAtk * Math.pow(location.atkGrowth, index)),
  };
  console.log(`👾 Враг ${index + 1}: HP=${enemy.hp}, ATK=${enemy.atk}`);
}

function animate() {
  if (!gameInterval) return; // Не анимируем, если игра не запущена
  
  clear();

  const playerOffset = attackPhase > 0 ? (attackPhase > 5 ? 5 : -5) : 0;
  if (attackPhase > 0) attackPhase--;

  // Игрок
  drawStickman(100 + playerOffset, 120, "#000");
  drawHpBar(70, 20, 60, 6, player.currentHp, player.maxHp);

  // Враг
  if (enemy) {
    drawStickman(300, 120, "#b00");
    drawHpBar(270, 20, 60, 6, enemy.hp, enemyMaxHp);
  }

  updateDamageTexts();

  animationId = requestAnimationFrame(animate);
}

function stopGame() {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
    console.log("⏹️ Игра остановлена");
  }
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function log(text) {
  logEl.textContent += text + "\n";
  logEl.scrollTop = logEl.scrollHeight;
  console.log(text);
}
