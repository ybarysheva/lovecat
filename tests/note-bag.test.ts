import assert from "node:assert/strict";
import { test } from "node:test";
import { createNoteBag } from "../components/cat/bubble.ts";

test("every note is shown once before any repeats", () => {
  const notes = ["a", "b", "c", "d", "e"];
  const next = createNoteBag(() => notes);
  for (let round = 0; round < 20; round++) {
    const seen = new Set(Array.from({ length: notes.length }, next));
    assert.equal(seen.size, notes.length);
  }
});

test("the last note of one round never opens the next", () => {
  const next = createNoteBag(() => ["a", "b", "c"]);
  let last = "";
  for (let i = 0; i < 300; i++) {
    const note = next();
    if (i % 3 === 0 && i > 0) assert.notEqual(note, last);
    last = note;
  }
});

test("notes removed while showing are dropped from the current round", () => {
  let notes = ["a", "b", "c", "d"];
  const next = createNoteBag(() => notes);
  next();
  notes = ["a"];
  assert.equal(next(), "a");
});
