const JXL_CODEC_BASE = "/codecs/jpeg-xl/";

let decoderReady;
let encoderReady;

export function isJpegXlFile(file) {
  return Boolean(
    file &&
      (file.type === "image/jxl" || /\.jxl$/i.test(file.name || "")),
  );
}

async function getJxlDecoder() {
  const codec = await import("@jsquash/jxl/decode");
  if (!decoderReady) {
    decoderReady = fetch(`${JXL_CODEC_BASE}jxl_dec.wasm`, {
      cache: "force-cache",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Codec decoder tidak termuat (${response.status}).`);
        }
        return response.arrayBuffer();
      })
      .then((wasmBinary) =>
        codec.init({
          wasmBinary,
          locateFile: (filename) => `${JXL_CODEC_BASE}${filename}`,
        }),
      )
      .catch((error) => {
        decoderReady = null;
        throw error;
      });
  }
  await decoderReady;
  return codec.default;
}

async function getJxlEncoder() {
  const codec = await import("@jsquash/jxl/encode");
  if (!encoderReady) {
    encoderReady = codec.init({
      locateFile: (filename) => `${JXL_CODEC_BASE}${filename}`,
    }).catch((error) => {
      encoderReady = null;
      throw error;
    });
  }
  await encoderReady;
  return codec.default;
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`Gagal membuat gambar ${type}.`));
    }, type);
  });
}

export async function prepareImageFileForBrowser(file) {
  if (!isJpegXlFile(file)) return file;

  let codecError;
  try {
    const decode = await getJxlDecoder();
    const pixels = await decode(await file.arrayBuffer());
    const canvas = document.createElement("canvas");
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Browser tidak dapat menyiapkan canvas JXL.");
    context.putImageData(pixels, 0, 0);
    return await canvasToBlob(canvas, "image/png");
  } catch (error) {
    codecError = error;
  }

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Browser tidak dapat menyiapkan canvas JXL.");
      context.drawImage(bitmap, 0, 0);
      return await canvasToBlob(canvas, "image/png");
    } finally {
      bitmap.close?.();
    }
  } catch (nativeError) {
    const detail = nativeError?.message || codecError?.message || "format tidak didukung";
    throw new Error(`JXL tidak dapat didekode: ${detail}`, { cause: codecError });
  }
}

export async function encodeCanvasAsJxl(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas export tidak dapat dibaca.");
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const encode = await getJxlEncoder();
  const encoded = await encode(pixels, { lossless: true, effort: 4 });
  return new Blob([encoded], { type: "image/jxl" });
}
