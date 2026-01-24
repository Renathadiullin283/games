// game.js
import { CLASSES } from "./data.js";
import { DEBUG_PLAYER } from "./debug.js";

export const player = {
  ...DEBUG_PLAYER,
  maxHp: DEBUG_PLAYER.stats.hp,
  currentHp: DEBUG_PLAYER.stats.hp,
};

export function resetHP() {
  player.currentHp = player.maxHp;
}

