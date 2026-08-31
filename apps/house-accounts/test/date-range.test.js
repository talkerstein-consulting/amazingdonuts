import test from "node:test";
import assert from "node:assert/strict";
import { nextDateRangeSelection } from "../lib/date-range.js";

const date = (day) => new Date(2026, 7, day);

test("repeated earlier dates reset the range before a later date completes it", () => {
  let selection;
  for (const day of [13, 12, 11, 10, 20]) selection = nextDateRangeSelection(selection, date(day));
  assert.equal(selection.from.getDate(), 10);
  assert.equal(selection.to.getDate(), 20);
});

test("clicking the start again keeps the range open", () => {
  let selection = nextDateRangeSelection(undefined, date(18));
  selection = nextDateRangeSelection(selection, date(18));
  assert.equal(selection.from.getDate(), 18);
  assert.equal(selection.to, undefined);
  selection = nextDateRangeSelection(selection, date(22));
  assert.equal(selection.to.getDate(), 22);
});

test("clicking after a completed range begins a fresh range", () => {
  const completed = { from: date(10), to: date(20) };
  const selection = nextDateRangeSelection(completed, date(16));
  assert.equal(selection.from.getDate(), 16);
  assert.equal(selection.to, undefined);
});
