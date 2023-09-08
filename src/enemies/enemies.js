import { ENEMY_MOVEMENT_SPEED, ENEMY_SPRITE_SIZE } from "../consts.js";
import { Collider, Vec2, changeColliderAnchorToTopLeft, moveTowards, vecLen, vecSub } from "../utils.js";
import { getSprite, drawSprite } from "../sprites.js";
import { EnemySpawnData } from "./EnemySpawnData.js";
import { checkAxisAlignedRectanglesCollision, isColliding } from "../collisions.js";

/** @typedef {import('../gameState').GameState} GameState */

class EnemiesData {
  /** @type {Array<number>} */
  hps = [];

  /**
   * @param {{positions: Vec2[]; spawns: Vec2[]}} params
   */
  constructor({ positions = [], spawns = [] }) {
    this.positions = positions;
    this.spawns = spawns.map((p) => new EnemySpawnData(p.x, p.y));
    this.hps = this.positions.map((_) => 100);
  }
}

/**
 * @param {GameState} gameState
 * @param {Vec2} position
 * @param {Vec2} oldPos
 */
function isCollidingWithTower(gameState, position, oldPos) {
  const towerCollider = gameState.colliders["tower-down"];
  return isColliding(position, oldPos, towerCollider);
}

/**
 * @param {Vec2} oldPosRef
 * @param {Vec2} newPos
 * @param {Vec2} collision
 */
function updatePositionAfterCollision(oldPosRef, newPos, collision) {
  if (!collision.x) oldPosRef.x = newPos.x;
  if (!collision.y) oldPosRef.y = newPos.y;
}

/**
 * @param {GameState} gameState
 */
function update(gameState) {
  const { positions, hps } = gameState.entities.enemies;
  const { delta } = gameState.time;

  for (const [idx, p] of positions.entries()) {
    if (hps[idx] <= 0) continue;

    let target = { x: 0, y: 0 };
    const playerPos = gameState.entities.positions.get("player");
    const playerDist = vecLen(vecSub(playerPos, p));
    if (playerDist < 50) target = playerPos;
    const newPos = moveTowards(p, target, ENEMY_MOVEMENT_SPEED * delta);

    const colliding = isCollidingWithTower(gameState, newPos, p);
    // updatePositionAfterCollision(positions[idx], newPos, colliding);

    for (const [otherIdx, e] of positions.entries()) {
      if (idx == otherIdx) continue;
      const collider = changeColliderAnchorToTopLeft(new Collider(e.x, e.y, ENEMY_SPRITE_SIZE, ENEMY_SPRITE_SIZE));
      const otherEnemyCollision = isColliding(newPos, p, collider);
      colliding.x = otherEnemyCollision.x || colliding.x;
      colliding.y = otherEnemyCollision.y || colliding.y;
      if (colliding.x && colliding.y) break;
    }
    updatePositionAfterCollision(p, newPos, colliding);
  }
}

/**
 * @param {GameState} gameState
 */
function draw(gameState) {
  const { enemies } = gameState.entities;
  const { hps } = enemies;
  const { camera, ctx } = gameState.rendering;

  const sEnemySize = ENEMY_SPRITE_SIZE * camera.zoom;
  const hpBarHeight = 6;

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
function getAliveItems(gameState) {
  const { enemies } = gameState.entities;
  return {
    positions: enemies.positions.filter((_, idx) => enemies.hps[idx] > 0),
    hps: enemies.hps.filter((hp) => hp > 0),
  };
}

/**
 * @param {GameState} gameState
 * @param {Vec2} position
 */
function createNew(gameState, position) {
  const { enemies } = gameState.entities;
  const idx = enemies.hps.indexOf(0);
  if (idx === -1) {
    enemies.positions.push(position.clone());
    enemies.hps.push(100);
    return;
  }
  enemies.hps[idx] = 100;
  enemies.positions[idx] = position.clone();
}

export default {
  draw,
  getAliveItems,
  createNew,
  update,
};

export { EnemiesData };
