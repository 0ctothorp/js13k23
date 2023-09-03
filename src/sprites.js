export function getSprite(name, gameState) {
  const { sprites } = gameState.entities;
  let sprite = sprites.get(name);
  if (!sprite) {
    const prefix = name.substring(0, name.indexOf("_") + 1);
    sprite = sprites.get(prefix);
  }
  return sprite;
}

export function drawSprite(sprite, position, gameState) {
  const { rendering } = gameState;
  const { camera, ctx } = rendering;

  const { x, y } = camera.worldToScreen({
    x: position.x - sprite.size.x / 2,
    y: position.y + sprite.size.y / 2,
  });
  const unit = camera.zoom;

  ctx.drawImage(
    sprite.data,
    0,
    0,
    sprite.data.naturalWidth,
    sprite.data.naturalHeight,
    x,
    y,
    sprite.size.x * unit,
    sprite.size.y * unit
  );
}

export function drawSprites(gameState) {
  const { positions } = gameState.entities;

  for (const [key, position] of positions) {
    const sprite = getSprite(key, gameState);
    if (!sprite) continue;
    drawSprite(sprite, position, gameState);
  }
}
