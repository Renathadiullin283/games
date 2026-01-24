import { player, resetPlayerHp } from "./game.js";
import { LOCATIONS } from "./data.js";
import { clear, drawStickman, drawHpBar } from "./render.js";

const logEl = document.getElementById("log");

function log(text) {
  logEl.textContent += text + "\n";
}

let enemy = null;
let enemyMaxHp = 0;

export function startRun(locationId) {
  logEl.textContent = "";

  const location = LOCATIONS[locationId];
  resetPlayerHp();

  let enemyIndex = 0;
  spawnEnemy(enemyIndex, location);

  log(`Локация: ${location.name}`);

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

    // === Игрок атакует ===
    let damage = player.stats.atk;
    if (Math.random() < player.stats.crit) {
      damage *= 2;
      log("🔥 КРИТ!");
    }

    enemy.hp -= damage;

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

    // === Враг атакует ===
    const incoming = Math.max(enemy.atk - player.stats.def, 1);
    player.currentHp -= incoming;

    render();
  }, 1000);

  render();
}

function spawnEnemy(index, location) {
  enemyMaxHp = Math.floor(location.enemyHp * Math.pow(location.hpGrowth, index));
  enemy = {
    hp: enemyMaxHp,
    atk: Math.floor(location.enemyAtk * Math.pow(location.atkGrowth, index)),
  };
  render();
}

function render() {
  clear();

  // player
  drawStickman(100, 120, "#000");
  drawHpBar(70, 20, 60, 6, player.currentHp, player.maxHp);

  // enemy
  drawStickman(300, 120, "#b00");
  drawHpBar(270, 20, 60, 6, enemy.hp, enemyMaxHp);
}
