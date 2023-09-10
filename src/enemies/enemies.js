import { ENEMY_MOVEMENT_SPEED, ENEMY_SPRITE_SIZE } from "../consts.js";
import { Collider, Vec2, changeColliderAnchorToTopLeft, moveTowards, set, vecLen, vecSub } from "../utils.js";
import { getSprite, drawSprite } from "../sprites.js";
import { EnemySpawnData } from "./EnemySpawnData.js";
import { checkAxisAlignedRectanglesCollision, isColliding } from "../collisions.js";
import slash from "../slash.js";

/** @typedef {import('../gameState').GameState} GameState */

class EnemiesData {
  /** @type {Map<string,number>} */
  hps = new Map();
  poolSize = 0;

  /**
   * @param {{ spawns: Vec2[]}} params
   */
  constructor({ spawns = [] }) {
    this.spawns = spawns.map((p) => new EnemySpawnData(p.x, p.y));
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
 * @param {Vec2} position
 */
function getChosenTarget(gameState, position) {
  const {
    entities: { positions },
  } = gameState;

  let target = new Vec2(0, 0);
  const playerPos = positions.get("player");
  const playerDist = vecLen(vecSub(playerPos, position));

  if (playerDist < 20) return null;
  if (playerDist < 50) target = playerPos;
  return target;
}

/**
 * @param {GameState} gameState
 * @param {number | string} enemyIdx
 */
function attackThePlayer(gameState, enemyIdx) {
  const {
    entities: { positions },
  } = gameState;

  const playerPos = positions.get("player");
  const enemyKey = `enemy_${enemyIdx}`;
  const enemyPos = positions.get(enemyKey);
  const direction = playerPos.direction(enemyPos);
  slash.perform(gameState, enemyKey, direction);
}

/**
 * @param {GameState} gameState
 */
function update(gameState) {
  const {
    entities: {
      enemies: { hps: enemiesHps, poolSize },
      positions,
      performingAttack,
      sprites,
    },
    time: { delta, currentFrameTime },
  } = gameState;

  // Iterating through all enemies instead of alive ones, because I need to know the indices.
  // I mght store the indices in the getAliveItems returned object.
  for (let i = 0; i < poolSize; i++) {
    const key = `enemy_${i}`;
    const enemyPos = positions.get(key);
    const hp = enemiesHps.get(key);
    if (hp <= 0) continue;

    const target = getChosenTarget(gameState, enemyPos);
    let newPos = enemyPos.clone();
    if (target) {
      moveTowards(newPos, target, ENEMY_MOVEMENT_SPEED * delta);
    } else {
      attackThePlayer(gameState, i);
    }
    set(gameState.entities, `${key}.target`, target);

    // collision with player's slash
    const slashSprite = sprites.get("slash");
    const enemySprite = sprites.get("enemy_");
    const playerSlash = performingAttack.get("player");
    if (playerSlash && playerSlash.startedAt >= currentFrameTime - delta && !playerSlash.dmgProcessed) {
      const slashPos = playerSlash.position;
      const slashSize = slashSprite.size;
      if (
        checkAxisAlignedRectanglesCollision(
          changeColliderAnchorToTopLeft(new Collider(slashPos.x, slashPos.y, slashSize.x, slashSize.y)),
          changeColliderAnchorToTopLeft(new Collider(enemyPos.x, enemyPos.y, enemySprite.size.x, enemySprite.size.y))
        )
      ) {
        playerSlash.dmgProcessed = true;
        const newhp = hp - 20;
        enemiesHps.set(key, newhp);
        if (newhp <= 0) continue;
      }
    }

    const colliding = isCollidingWithTower(gameState, newPos, enemyPos);

    // check collisiions with other enemies
    for (let j = 0; j < poolSize; j++) {
      if (i == j) continue;
      const otherEnemyPos = positions.get(`enemy_${j}`);
      const collider = changeColliderAnchorToTopLeft(
        new Collider(otherEnemyPos.x, otherEnemyPos.y, ENEMY_SPRITE_SIZE, ENEMY_SPRITE_SIZE)
      );
      const otherEnemyCollision = isColliding(newPos, enemyPos, collider);
      colliding.x = otherEnemyCollision.x || colliding.x;
      colliding.y = otherEnemyCollision.y || colliding.y;
      if (colliding.x && colliding.y) break;
    }

    updatePositionAfterCollision(enemyPos, newPos, colliding);
  }
}

/**
 * @param {GameState} gameState
 */
function draw(gameState) {
  const { enemies, positions } = gameState.entities;
  const { hps, poolSize } = enemies;
  const { camera, ctx } = gameState.rendering;

  const sEnemySize = ENEMY_SPRITE_SIZE * camera.zoom;
  const hpBarHeight = 5;
  const unit = camera.zoom;

  for (let i = 0; i < poolSize; i++) {
    const key = `enemy_${i}`;
    const hp = hps.get(key);
    if (hp <= 0) continue;
    const position = positions.get(key);
    const sposition = camera.worldToScreen(position);

    const sprite = getSprite("enemy_", gameState);
    const dir = position.direction(gameState.entities[key]?.target || new Vec2(0, 0));
    ctx.save();
    ctx.translate(sposition.x, sposition.y);
    ctx.scale(Math.sign(dir.x), 1);
    ctx.drawImage(
      sprite.data,
      0,
      0,
      sprite.data.naturalWidth,
      sprite.data.naturalHeight,
      (-sprite.size.x * unit) / 2,
      (-sprite.size.y * unit) / 2,
      sprite.size.x * unit,
      sprite.size.y * unit
    );
    ctx.restore();
    // drawSprite(sprite, position, gameState);

    const spos = camera.worldToScreen(position);

    // debug
    {
      ctx.fillStyle = "white";
      ctx.fillText(`enemy_${i}`, spos.x, spos.y - sEnemySize / 2 - hpBarHeight - 1);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(spos.x - (sEnemySize * 0.9) / 2, spos.y - sEnemySize / 2 - hpBarHeight, sEnemySize * 0.9, hpBarHeight);

    const hpFrac = hp / 100;

    ctx.fillStyle = "rgb(0, 255, 0)";
    ctx.fillRect(
      spos.x - (sEnemySize * 0.9) / 2,
      spos.y - sEnemySize / 2 - hpBarHeight,
      sEnemySize * 0.9 * hpFrac,
      hpBarHeight
    );

    slash.draw(gameState, `enemy_${i}`);
  }
}

/**
 * @param {GameState} gameState
 */
function getAliveItems(gameState) {
  const {
    enemies: { hps, poolSize },
    positions,
  } = gameState.entities;

  let result = {
    positions: [],
    hps: [],
  };

  for (let i = 0; i < poolSize; i++) {
    const key = `enemy_${i}`;
    const hp = hps.get(key);
    if (hp <= 0) continue;

    result.positions.push(positions.get(key));
    result.hps.push(hp);
  }

  return result;
}

/**
 * @param {GameState} gameState
 * @param {Vec2} position
 */
function createNew(gameState, position) {
  const { enemies, positions } = gameState.entities;

  let foundKey = -1;
  for (const [k, hp] of enemies.hps) {
    if (hp <= 0) {
      foundKey = k;
      break;
    }
  }

  if (foundKey === -1) {
    enemies.poolSize += 1;
    const key = `enemy_${enemies.poolSize - 1}`;
    positions.set(key, position.clone());
    enemies.hps.set(key, 100);
    return;
  }

  positions.set(foundKey, position.clone());
  enemies.hps.set(foundKey, 100);
}

/**
 * @param {GameState} gameState
 */
function getPositions(gameState) {
  const {
    entities: { positions },
  } = gameState;

  return [...positions.entries()].filter(([k]) => k.startsWith("enemy_")).map(([, v]) => v);
}

export default {
  draw,
  getAliveItems,
  createNew,
  update,
  getPositions,
};

export { EnemiesData };
