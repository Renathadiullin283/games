import { player, resetPlayerHp } from "./game.js";
import { LOCATIONS } from "./data.js";
import { clear, drawStickman, drawHpBar, spawnDamageText, updateDamageTexts, screenShake } from "./render.js";

const logEl = document.getElementById("log");

let enemy = null;
let enemyMaxHp = 0;
let attackPhase = 0;

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

  const interval = setInterval(() => {
    if (player.currentHp <= 0) {
      log("❌ Персонаж погиб");
      clearInterval(interval);
      return;
    }

    if (enemyIndex >= location.enemies) {
      log("✅ Локация зачищена");
      clearInterval(interval);
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
      enemyIndex++;
      if (enemyIndex >= location.enemies) {
        log("🏆 Все враги побеждены");
        clearInterval(interval);
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

  requestAnimationFrame(animate);
}

function log(text) {
  logEl.textContent += text + "\n";
}
// После убийства врага или завершения локации
player.gold += 50; // пример лута
player.level += 1; // пример опыта

// Сохраняем прогресс
import { savePlayer } from "./telegramSave.js";
savePlayer(player);
