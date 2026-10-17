(() => {
  const canvas = document.getElementById('game-canvas');
  const context = canvas.getContext('2d');
  const images = new Map();
  window.fixtureTileBitmaps = [];
  const decode = window.createImageBitmap.bind(window);
  window.createImageBitmap = async (...args) => {
    const bitmap = await decode(...args);
    window.fixtureTileBitmaps.push(bitmap);
    if (window.fixtureHoldTileDecode)
      await new Promise((resolve) => (window.fixtureReleaseTileDecode = resolve));
    return bitmap;
  };
  window.fixtureTiles = {
    async load(paths) {
      await Promise.all(
        paths.map(
          (path) =>
            new Promise((resolve, reject) => {
              const image = new Image();
              image.crossOrigin = 'anonymous';
              image.onload = () => {
                images.set(path, image);
                resolve();
              };
              image.onerror = reject;
              image.src = path;
            }),
        ),
      );
    },
    draw(path, { rect = [20, 30, 400, 400], transform = [1, 0, 0, 1, 0, 0], other = false } = {}) {
      const target = other ? document.createElement('canvas') : canvas;
      if (other) document.body.appendChild(target);
      target.width = 600;
      target.height = 900;
      const drawing = target.getContext('2d');
      drawing.save();
      drawing.setTransform(...transform);
      drawing.drawImage(images.get(path), ...rect);
      drawing.restore();
      return {
        pixel: [...drawing.getImageData(100, 100, 1, 1).data],
        transform: [...['a', 'b', 'c', 'd', 'e', 'f'].map((key) => drawing.getTransform()[key])],
        stats: window.__swRendering.stats(),
      };
    },
    drawMany(paths) {
      canvas.width = 600;
      canvas.height = 900;
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      for (const path of paths) context.drawImage(images.get(path), 20, 30, 400, 400);
      context.restore();
    },
  };
})();
