// battle.js
import { player } from "./game.js";
import { LOCATIONS } from "./data.js";

export function startRun(locationId) {
  const loc = LOCATIONS[locationId];
  let enemyIndex = 0;

  player.currentHp = player.maxHp;

  const interval = setInterval(() => {
    if (player.currentHp <= 0 || enemyIndex >= loc.enemies) {
      clearInterval(interval);
      console.log("Забег окончен");
      return;
    }

    const enemyHp = loc.baseEnemyHp + enemyIndex * 10;
    const enemyAtk = loc.baseEnemyAtk + enemyIndex * 2;

    // игрок бьёт
    let damage = player.stats.atk;
    if (Math.random() < player.stats.crit) {
      damage *= 2;
    }

    // монстр бьёт
    const incoming = Math.max(enemyAtk - player.stats.def, 1);

    player.currentHp -= incoming;

    console.log(
      `Враг ${enemyIndex + 1} | Урон игрока: ${damage} | Получено: ${incoming} | HP: ${player.currentHp}`
    );

    enemyIndex++;
  }, 1000);
}

