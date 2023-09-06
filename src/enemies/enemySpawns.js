import * as enemies from "./enemies";

/** @typedef {import('../gameState').GameState} GameState */

/**
 * @param {GameState} gameState
 */
export function update(gameState) {
  const { spawns } = gameState.entities.enemies;
  const { currentFrameTime } = gameState.time;

  for (const spawn of spawns) {
    if (!spawn.active) continue;

    if (spawn.lastSpawnAt === undefined || currentFrameTime - spawn.lastSpawnAt >= spawn.interval) {
      enemies.createNew(gameState, spawn.position);
      spawn.lastSpawnAt = currentFrameTime;
    }
  }
}
