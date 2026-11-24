const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const codecPath = path.join(__dirname, "../public/codecs/jpeg-xl");

function asArrayBuffer(buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

test("JPEG XL browser codecs encode and decode losslessly", async () => {
  const [{ default: encode, init: initEncoder }, { default: decode, init: initDecoder }] =
    await Promise.all([
      import("@jsquash/jxl/encode.js"),
      import("@jsquash/jxl/decode.js"),
    ]);
  const [encoderWasm, decoderWasm] = await Promise.all([
    fs.readFile(path.join(codecPath, "jxl_enc.wasm")),
    fs.readFile(path.join(codecPath, "jxl_dec.wasm")),
  ]);

  await initEncoder({ wasmBinary: asArrayBuffer(encoderWasm) });
  await initDecoder({ wasmBinary: asArrayBuffer(decoderWasm) });

  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255,
    0, 255, 0, 255,
    0, 0, 255, 255,
    255, 255, 255, 255,
  ]);
  const encoded = await encode(
    { width: 2, height: 2, data: pixels },
    { lossless: true, effort: 2 },
  );
  const decoded = await decode(encoded);

  assert.equal(decoded.width, 2);
  assert.equal(decoded.height, 2);
  assert.deepEqual(decoded.data, pixels);
});
