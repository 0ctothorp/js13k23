import { ENEMY_MOVEMENT_SPEED, ENEMY_SPRITE_SIZE } from "./consts";
import { moveTowards, vecLen, vecSub } from "./utils";
import { getSprite, drawSprite } from "./sprites";

/** @typedef {import('./gameState').GameState} GameState */

export class EnemiesData {
  hps = [];

  constructor({ positions = [], spawns = [] }) {
    this.positions = positions;
    this.spawns = spawns;
    this.hps = this.positions.map((_) => 100);
  }
}

/**
 * @param {GameState} gameState
 */
export function update(gameState) {
  const { positions } = gameState.entities.enemies;
  const { delta } = gameState.time;

  for (const p of positions) {
    let target = { x: 0, y: 0 };
    const playerPos = gameState.entities.positions.get("player");
    const playerDist = vecLen(vecSub(playerPos, p));
    if (playerDist < 50) target = playerPos;

    moveTowards(p, target, ENEMY_MOVEMENT_SPEED * delta);
  }
}

/**
 * @param {GameState} gameState
 */
export function draw(gameState) {
  const { enemies } = gameState.entities;
  const { hps } = enemies;
  const { camera, ctx } = gameState.rendering;

  const sEnemySize = ENEMY_SPRITE_SIZE * camera.zoom;
  const hpBarHeight = 6;

  //   const alive = getAliveItems(gameState);

  for (const [idx, position] of enemies.positions.entries()) {
    if (hps[idx] <= 0) continue;

    const sprite = getSprite("enemy_", gameState);
    drawSprite(sprite, position, gameState);
    const spos = camera.worldToScreen(position);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(spos.x - sEnemySize / 2, spos.y - sEnemySize / 2 - hpBarHeight, sEnemySize, hpBarHeight);

    const hpFrac = hps[idx] / 100;

    ctx.fillStyle = "rgb(0, 255, 0)";
    ctx.fillRect(spos.x - sEnemySize / 2, spos.y - sEnemySize / 2 - hpBarHeight, sEnemySize * hpFrac, hpBarHeight);
  }
}

/**
 * @param {GameState} gameState
 */
export function getAliveItems(gameState) {
  const { enemies } = gameState.entities;
  return {
    positions: enemies.positions.filter((_, idx) => enemies.hps[idx] > 0),
    initSpawns: enemies.initSpawns,
    hps: enemies.hps,
  };
}

/**
 * @param {GameState} gameState
 */
export function createNew(gameState, position) {
  const { enemies } = gameState.entities;
  const idx = enemies.hps.indexOf(0);
  enemies.hps[idx] = 100;
  enemies.positions[idx] = position;
}
