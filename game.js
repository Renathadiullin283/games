import { DEBUG_PLAYER } from "./debug.js";

export const player = {
  level: DEBUG_PLAYER.level,
  gold: DEBUG_PLAYER.gold,
  stats: { ...DEBUG_PLAYER.stats },
  maxHp: DEBUG_PLAYER.stats.hp,
  currentHp: DEBUG_PLAYER.stats.hp,
};

export function resetPlayerHp() {
  player.currentHp = player.maxHp;
}
