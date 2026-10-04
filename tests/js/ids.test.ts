import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { offerId } from "../../src/lib/ids.ts";
import { pyLen, pyNormalize, pyStrip } from "../../src/lib/pytext.ts";

const v = JSON.parse(readFileSync(new URL("./id-vectors.json", import.meta.url), "utf8"));

test("offer ids match the contract, including whitespace edge cases", () => {
  assert.ok(v.offers.length >= 7);
  for (const row of v.offers) {
    assert.equal(pyNormalize(pyStrip(row.text)), row.normalized);
    assert.equal(pyLen(row.normalized), row.py_len);
    assert.equal(offerId(v.author, row.text), row.offer_id, JSON.stringify(row.text));
    assert.equal(offerId(v.author.toUpperCase().replace("0X", "0x"), row.text), row.offer_id);
  }
});
