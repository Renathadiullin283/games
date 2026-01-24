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

  log(`Локация: ${location.name}`);
  log(`HP игрока: ${player.currentHp}`);
  log("----------------------");

  let enemyIndex = 0;

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

    const enemyHp = location.baseEnemyHp + enemyIndex * 20;
    const enemyAtk = location.baseEnemyAtk + enemyIndex * 5;

    let damage = player.stats.atk;
    if (Math.random() < player.stats.crit) {
      damage *= 2;
      log("🔥 КРИТ!");
    }

    const incoming = Math.max(enemyAtk - player.stats.def, 1);
    player.currentHp -= incoming;

    log(
      `Враг ${enemyIndex + 1} | Урон: ${damage} | Получено: ${incoming} | HP: ${player.currentHp}`
    );

    enemyIndex++;
  }, 1000);
}
