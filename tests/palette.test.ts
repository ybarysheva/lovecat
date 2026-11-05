import assert from "node:assert/strict";
import { test } from "node:test";
import { ditherInk, fadedInk, hex, INK, PAPER, seededRandom } from "../lib/palette.ts";

test("faded ink runs from ink to paper", () => {
  assert.deepEqual(fadedInk(0), INK);
  assert.deepEqual(fadedInk(1), PAPER);
  assert.equal(hex(PAPER), "#D4C5A9");
});

test("dithering a tone inks that share of an 8x8 tile", () => {
  for (const tone of [0, 0.25, 0.5, 0.75, 1]) {
    let ink = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (ditherInk(tone, x, y)) ink++;
    assert.equal(ink, Math.round(tone * 64));
  }
});

test("seeded random is repeatable", () => {
  const a = seededRandom(7);
  const b = seededRandom(7);
  for (let i = 0; i < 10; i++) assert.equal(a(), b());
});
