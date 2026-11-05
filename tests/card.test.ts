import assert from "node:assert/strict";
import { test } from "node:test";
import { clean, LIMITS, validateCard } from "../lib/card.ts";

test("clean collapses whitespace and trims", () => {
  assert.equal(clean("  hi \n  there  "), "hi there");
});

test("a valid cat is tidied: names trimmed, blank and duplicate notes dropped", () => {
  const result = validateCard({ to: "  Alex ", from: " Sam", notes: ["I love you", "  I love you ", "", "Rest"] });
  assert.deepEqual(result, { ok: true, card: { to: "Alex", from: "Sam", notes: ["I love you", "Rest"] } });
});

test("the sender is optional; a blank one becomes null", () => {
  const result = validateCard({ to: "Alex", from: "   ", notes: ["hi"] });
  assert.ok(result.ok);
  assert.equal(result.card.from, null);
});

test("every field's problem is reported at once", () => {
  const result = validateCard({ to: "", notes: [] });
  assert.ok(!result.ok);
  assert.equal(result.errors.to, "Add who the cat is for.");
  assert.equal(result.errors.notes, "Add at least one message.");
  assert.equal(result.error, result.errors.to); // the first problem, for simple callers
});

test("limits are enforced", () => {
  const long = "x".repeat(LIMITS.name + 1);
  assert.ok(!validateCard({ to: long, notes: ["hi"] }).ok);
  assert.ok(!validateCard({ to: "Alex", notes: ["x".repeat(LIMITS.note + 1)] }).ok);
  const tooMany = Array.from({ length: LIMITS.maxNotes + 1 }, (_, i) => `note ${i}`);
  assert.ok(!validateCard({ to: "Alex", notes: tooMany }).ok);
});

test("junk input is rejected, not thrown", () => {
  for (const junk of [null, "cat", 42, { to: 5, notes: "hi" }, { to: "Alex", notes: [1, 2] }]) {
    assert.equal(validateCard(junk).ok, false);
  }
});
