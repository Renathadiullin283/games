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

function updateHUD() {
  document.getElementById("hp").textContent = `HP: ${player.currentHp}`;
  document.getElementById("gold").textContent = `Gold: ${player.gold}`;
  document.getElementById("level").textContent = `Lvl: ${player.level}`;
}

export function startRun(locationId) {
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
      stopGame();
      savePlayer(player);
      return;
    }

    if (enemyIndex >= location.enemies) {
      log("✅ Локация зачищена");
      log(`🏆 Получено: 50 золота и 1 уровень опыта`);
      player.gold += 50;
      player.level += 1;
      stopGame();
      savePlayer(player);
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
      log(`💀 Враг ${enemyIndex + 1} побежден!`);
      player.gold += 10; // Награда за врага
      enemyIndex++;
      
      if (enemyIndex >= location.enemies) {
        log("🏆 Все враги побеждены!");
        log(`🏆 Получено: 50 золота и 1 уровень опыта`);
        player.gold += 50;
        player.level += 1;
        stopGame();
        savePlayer(player);
        return;
      }
      
      log(`⚔️ Встречен враг ${enemyIndex + 1}/${location.enemies}`);
      spawnEnemy(enemyIndex, location);
      savePlayer(player); // Сохраняем после каждого убитого врага
      return;
    }

    // Атака врага
    const incoming = Math.max(enemy.atk - player.stats.def, 1);
    player.currentHp -= incoming;
    spawnDamageText(120, 90, `-${incoming}`);
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
  }
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function log(text) {
  logEl.textContent += text + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}
