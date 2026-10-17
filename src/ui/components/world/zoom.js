export function zoomMap(canvas, steps, point) {
  const direction = Math.sign(steps);
  for (let index = 0; index < Math.min(8, Math.abs(steps)); index++) {
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -direction,
        clientX: point.x,
        clientY: point.y,
      }),
    );
  }
}
