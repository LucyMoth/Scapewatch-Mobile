export function createRouteStroke(context, { isOriginalUi, viewportWidth }) {
  const stroke = context.stroke.bind(context);
  return (...args) => {
    if (isOriginalUi() || context.lineCap !== 'round' || context.lineJoin !== 'round')
      return stroke(...args);
    const dash = context.getLineDash();
    // Native movement and queue routes use rounded 12:8 dashes.
    if (dash.length !== 2 || !(dash[1] > 0) || Math.abs(dash[0] / dash[1] - 1.5) > 0.001)
      return stroke(...args);

    const transform = context.getTransform();
    const scale = Math.hypot(transform.a, transform.b);
    // Desktop world units otherwise shrink routes below one phone pixel.
    const minimum = (1.5 * context.canvas.width) / viewportWidth() / scale;
    const lineWidth = context.lineWidth;
    if (!Number.isFinite(minimum) || minimum <= lineWidth) return stroke(...args);
    context.lineWidth = minimum;
    try {
      return stroke(...args);
    } finally {
      context.lineWidth = lineWidth;
    }
  };
}
