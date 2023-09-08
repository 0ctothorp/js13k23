import { checkAxisAlignedRectanglesCollision } from "./collisions.js";
import { ATTACK_ANIM_DURATION, ATTACK_OFFSET_FROM_ENTITY, PLAYER_SPEED } from "./consts.js";
import {
  Collider,
  Vec2,
  angleBetweenVectors,
  changeColliderAnchorToTopLeft,
  moveAlongDirection,
  vecSub,
} from "./utils.js";

/**
 * @param {import("./gameState").GameState} gameState
 */
function movement(gameState) {
  const { input, entities, time } = gameState;
  const { positions, sprites, directions } = entities;
  const { currentlyPressed: keyboard } = input;
  let xaxis = keyboard.has("KeyA") ? -1 : keyboard.has("KeyD") ? 1 : 0;
  let yaxis = keyboard.has("KeyW") ? 1 : keyboard.has("KeyS") ? -1 : 0;

  if (!xaxis && !yaxis) return;

  let x = xaxis * PLAYER_SPEED * time.delta,
    y = yaxis * PLAYER_SPEED * time.delta;

  if (x && y) {
    x /= 1.41;
    y /= 1.41;
  }

  const pdir = directions.get("player");
  pdir.x = xaxis;
  pdir.y = yaxis;
  directions.set("player", pdir.normalize());

  const posCenter = positions.get("player");

  const tmpx = posCenter.x + x;
  const tmpy = posCenter.y + y;

  let isCollidingx = false;
  let isCollidingy = false;

  const wallSpriteSize = sprites.get("wall_").size;
  /** @type {Vec2} */
  const playerSpriteSize = sprites.get("player").size;
  const psizeHalf = playerSpriteSize.x / 2;

  // check collisions with walls only
  // TODO: create a collider together with a wall, so we're not allocating new memory for colliders every time a player
  // moves and there are walls on the map
  const colliders = [...positions.entries()]
    .filter(([k]) => k.startsWith("wall_"))
    .map(([, v]) => new Collider(v.x, v.y, wallSpriteSize.x, wallSpriteSize.y));
  colliders.push(gameState.colliders["tower-down"]);

  const pcollider = new Collider(tmpx - psizeHalf, posCenter.y + psizeHalf, playerSpriteSize.x, playerSpriteSize.y);
  for (const collider of colliders) {
    isCollidingx ||= checkAxisAlignedRectanglesCollision(collider, pcollider);

    pcollider.pos.x = posCenter.x - psizeHalf;
    pcollider.pos.y = tmpy + psizeHalf;
    isCollidingy ||= checkAxisAlignedRectanglesCollision(collider, pcollider);

    if (isCollidingx && isCollidingy) break;
  }

  if (!isCollidingx) posCenter.x += x;
  if (!isCollidingy) posCenter.y += y;
}

/**
 * @param {import("./gameState").GameState} gameState
 */
function attack(gameState) {
  const {
    input: { mouse, mousedown },
    entities: { positions, performingAttack },
    time: { currentFrameTime },
    rendering: { camera },
  } = gameState;

  const pos = positions.get("player");
  const isPerformingAttack = performingAttack.get("player");

  if (isPerformingAttack) {
    if (currentFrameTime - isPerformingAttack.startedAt < ATTACK_ANIM_DURATION) {
      return;
    }
    performingAttack.delete("player");
  }

  if (mousedown.button !== 0) return;

  const wmouse = camera.screenToWorld(mouse);
  const direction = new Vec2(wmouse.x, wmouse.y).sub(pos).normalize();

  performingAttack.set("player", {
    startedAt: currentFrameTime,
    direction,
    position: pos.clone(),
  });
}

/**
 * @param {import("./gameState").GameState} gameState
 */
function drawAttack(gameState) {
  const {
    entities: { performingAttack, sprites },
    rendering: { ctx, camera },
    time: { currentFrameTime },
  } = gameState;

  const playerAttack = performingAttack.get("player");
  if (!playerAttack) return;

  const slashPos = playerAttack.position.clone();
  slashPos.x -= 8 * playerAttack.direction.x;
  slashPos.y -= 8 * playerAttack.direction.y;

  const sprite = sprites.get("slash");

  ctx.save();
  let angleRad = angleBetweenVectors(new Vec2(1, 0), playerAttack.direction);
  if (playerAttack.direction.y > 0) {
    angleRad = 2 * Math.PI - angleRad;
  }
  const spp = camera.worldToScreen(playerAttack.position);
  ctx.translate(spp.x, spp.y);
  ctx.rotate(angleRad);
  ctx.translate((sprite.size.x * camera.zoom) / 2, (-sprite.size.y * camera.zoom) / 2);
  ctx.globalAlpha = 1 - (currentFrameTime - playerAttack.startedAt) / ATTACK_ANIM_DURATION;
  ctx.drawImage(sprite.data, 0, 0, sprite.size.x * camera.zoom, sprite.size.y * camera.zoom);
  ctx.restore();
}

/**
 * @param {import("./gameState").GameState} gameState
 */
function update(gameState) {
  movement(gameState);
  attack(gameState);
}

function draw(gameState) {
  drawAttack(gameState);
}

export default {
  update,
  draw,
};
