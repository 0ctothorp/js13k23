import { Collider, changeColliderAnchorToTopLeft, set } from "./utils.js";
import Enemies from "./enemies/enemies.js";
import { ENEMY_SPRITE_SIZE } from "./consts.js";
import { checkAxisAlignedRectanglesCollision } from "./collisions.js";

/**
 * @param {import("./gameState").GameState} gameState
 */
function towerTriggerCollisions(gameState) {
  const { triggers, entities } = gameState;
  const trigger = triggers["upper-tower"];
  const playerSpriteSize = entities.sprites.get("player").size;
  const posCenter = entities.positions.get("player");
  const colSize = playerSpriteSize.x / gameState.rendering.camera.zoom;
  const playerCol = changeColliderAnchorToTopLeft(new Collider(posCenter.x, posCenter.y, colSize, colSize));

  const enemyColliders = Enemies.getAliveItems(gameState).positions.map((p) =>
    changeColliderAnchorToTopLeft(new Collider(p.x, p.y, ENEMY_SPRITE_SIZE, ENEMY_SPRITE_SIZE))
  );

  for (const c of [...enemyColliders, playerCol]) {
    if (checkAxisAlignedRectanglesCollision(trigger.collider, c)) {
      set(gameState.entities, "tower-up.isTransparent", true);
      break;
    } else {
      set(gameState.entities, "tower-up.isTransparent", false);
    }
  }
}

export default {
  towerTriggerCollisions,
};
