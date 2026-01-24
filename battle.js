import { player, resetPlayerHp } from "./game.js";
import { LOCATIONS } from "./data.js";

const logEl = document.getElementById("log");

function log(text) {
  logEl.textContent += text + "\n";
}

export function startRun(locationId) {
  logEl.textContent = "";

  const location = LOCATIONS[locationId];
  resetPlayerHp();

  let enemyIndex = 0;
  let enemy = spawnEnemy(enemyIndex, location);

  log(`Локация: ${location.name}`);
  log(`HP игрока: ${player.currentHp}`);
  log("----------------------");
  log(`👹 Враг ${enemyIndex + 1} | HP: ${enemy.hp}`);

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
    log(`Игрок наносит ${damage} урона | HP врага: ${Math.max(enemy.hp, 0)}`);

    // === Проверка смерти врага ===
    if (enemy.hp <= 0) {
      enemyIndex++;

      if (enemyIndex >= location.enemies) {
        log("🏆 Все враги побеждены");
        clearInterval(interval);
        return;
      }

      enemy = spawnEnemy(enemyIndex, location);
      log("----------------------");
      log(`👹 Враг ${enemyIndex + 1} | HP: ${enemy.hp}`);
      return;
    }

    // === Враг атакует ===
    const incoming = Math.max(enemy.atk - player.stats.def, 1);
    player.currentHp -= incoming;

    log(`Враг бьёт на ${incoming} | HP игрока: ${player.currentHp}`);
  }, 1000);
}

function spawnEnemy(index, location) {
  return {
    hp: Math.floor(location.enemyHp * Math.pow(location.hpGrowth, index)),
    atk: Math.floor(location.enemyAtk * Math.pow(location.atkGrowth, index)),
  };
}
