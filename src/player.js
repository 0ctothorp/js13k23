import { checkAxisAlignedRectanglesCollision } from "./collisions.js";
import { PLAYER_SPEED } from "./consts.js";
import slash from "./slash.js";
import { drawSprite } from "./sprites.js";
import { Collider, Vec2 } from "./utils.js";

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
function update(gameState) {
  const {
    input: { mousedown, mouse },
    rendering: { camera },
    entities: { positions },
  } = gameState;

  movement(gameState);

  const playerPos = positions.get("player");
  if (mousedown.button == 0) {
    const wmouse = camera.screenToWorld(mouse);
    const direction = new Vec2(wmouse.x, wmouse.y).sub(playerPos).normalize();
    slash.perform(gameState, "player", direction);
  }
}

/**
 * @param {import("./gameState").GameState} gameState
 */
function draw(gameState) {
  const {
    entities: { sprites, positions },
    input: { mouse },
    rendering: { ctx, camera },
  } = gameState;

  const unit = camera.zoom;

  const sprite = sprites.get("player");
  const wmouse = camera.screenToWorld(mouse);
  const playerPos = positions.get("player");
  const splayerPos = camera.worldToScreen(playerPos);
  const dir = playerPos.direction(wmouse);
  ctx.save();
  ctx.translate(splayerPos.x, splayerPos.y);
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
  slash.draw(gameState, "player");
}

export default {
  update,
  draw,
};
