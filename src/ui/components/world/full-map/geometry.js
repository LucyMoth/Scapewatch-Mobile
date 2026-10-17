export function fitMapPlane(plane, area) {
  const canvas = plane.querySelector('.map-overlay-canvas');
  const bounds = area.getBoundingClientRect();
  if (!canvas?.width || !canvas.height || !bounds.width || !bounds.height) return;
  const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
  const values = {
    '--sw-map-plane-width': `${canvas.width}px`,
    '--sw-map-plane-height': `${canvas.height}px`,
    '--sw-map-scale': String(scale),
    '--sw-map-x': `${bounds.x + (bounds.width - canvas.width * scale) / 2}px`,
    '--sw-map-y': `${bounds.y + (bounds.height - canvas.height * scale) / 2}px`,
  };
  for (const [name, value] of Object.entries(values)) {
    if (plane.style.getPropertyValue(name) !== value) plane.style.setProperty(name, value);
  }
  return { bottom: bounds.y + (bounds.height + canvas.height * scale) / 2 };
}
