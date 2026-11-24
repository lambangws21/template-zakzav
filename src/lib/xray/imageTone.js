const adjustedSources = new WeakMap();

export function makeImageToneTable(contrast = 100, level = 100, invert = false) {
  return Uint8ClampedArray.from({ length: 256 }, (_, channel) => {
    const contrasted = Math.max(0, Math.min(255, (channel - 127.5) * contrast / 100 + 127.5));
    const brightened = Math.max(0, Math.min(255, contrasted * level / 100));
    return invert ? 255 - brightened : brightened;
  });
}

// Keeps the source rectangle and alpha channel intact for cropped and warped layers.
export function prepareImageTone(context, source, { contrast = 100, level = 100, invert = false } = {}) {
  // Unsupported contexts can still have an expando from a previous filter reset.
  const hasCanvasFilter = typeof context.filter === "string" &&
    !Object.prototype.hasOwnProperty.call(context, "filter");
  if (hasCanvasFilter) {
    context.filter = `contrast(${contrast}%) brightness(${level}%)${invert ? " invert(1)" : ""}`;
    return source;
  }
  if (Number(contrast) === 100 && Number(level) === 100 && !invert) return source;

  const key = `${contrast}:${level}:${invert}`;
  const previous = adjustedSources.get(source);
  if (previous?.key === key) return previous.canvas || source;
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) return source;
  const canvas = previous?.canvas || document.createElement("canvas");
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const target = canvas.getContext("2d", { willReadFrequently: true });
  if (!target) return source;

  try {
    target.clearRect(0, 0, width, height);
    target.drawImage(source, 0, 0, width, height);
    const pixels = target.getImageData(0, 0, width, height);
    const table = makeImageToneTable(contrast, level, invert);
    for (let index = 0; index < pixels.data.length; index += 4) {
      pixels.data[index] = table[pixels.data[index]];
      pixels.data[index + 1] = table[pixels.data[index + 1]];
      pixels.data[index + 2] = table[pixels.data[index + 2]];
    }
    target.putImageData(pixels, 0, 0);
    adjustedSources.set(source, { key, canvas });
    return canvas;
  } catch (error) {
    if (error.name !== "SecurityError") throw error;
    adjustedSources.set(source, { key, canvas: null });
    return source;
  }
}

export function invalidateImageTone(source) {
  adjustedSources.delete(source);
}
