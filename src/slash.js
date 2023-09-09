import { ATTACK_ANIM_DURATION } from "./consts.js";
import { Vec2, angleBetweenVectors } from "./utils.js";

/**
 * @param {import("./gameState").GameState} gameState
 */
function update(gameState) {
  const {
    entities: { performingAttack },
    time: { currentFrameTime },
  } = gameState;

  for (const [entity, attack] of performingAttack.entries()) {
    if (currentFrameTime - attack.startedAt >= ATTACK_ANIM_DURATION) {
      performingAttack.delete(entity);
    }
  }
}

/**
 * @param {import("./gameState").GameState} gameState
 * @param {string} entity
 * @param {Vec2} direction
 */
function slash(gameState, entity, direction) {
  const {
    input: { mouse },
    entities: { positions, performingAttack },
    time: { currentFrameTime },
    rendering: { camera },
  } = gameState;

  const pos = positions.get(entity);
  const attack = performingAttack.get(entity);

  if (attack) return;

  performingAttack.set(entity, {
    startedAt: currentFrameTime,
    direction,
    position: pos.clone(),
  });
}

/**
 * @param {import("./gameState").GameState} gameState
 * @param {string} entity
 */
function draw(gameState, entity) {
  const {
    entities: { performingAttack, sprites },
    rendering: { ctx, camera },
    time: { currentFrameTime },
  } = gameState;

  const entityAttack = performingAttack.get(entity);
  if (!entityAttack) return;

  const slashPos = entityAttack.position.clone();
  slashPos.x -= 8 * entityAttack.direction.x;
  slashPos.y -= 8 * entityAttack.direction.y;

  const sprite = sprites.get("slash");

  ctx.save();
  let angleRad = angleBetweenVectors(new Vec2(1, 0), entityAttack.direction);
  if (entityAttack.direction.y > 0) {
    angleRad = 2 * Math.PI - angleRad;
  }
  const spp = camera.worldToScreen(entityAttack.position);
  ctx.translate(spp.x, spp.y);
  ctx.rotate(angleRad);
  ctx.translate((sprite.size.x * camera.zoom) / 2, (-sprite.size.y * camera.zoom) / 2);
  ctx.globalAlpha = 1 - (currentFrameTime - entityAttack.startedAt) / ATTACK_ANIM_DURATION;
  ctx.drawImage(sprite.data, 0, 0, sprite.size.x * camera.zoom, sprite.size.y * camera.zoom);
  ctx.restore();
}

export default {
  perform: slash,
  draw,
  update,
};
