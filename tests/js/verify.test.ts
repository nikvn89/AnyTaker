import { test } from "node:test";
import assert from "node:assert/strict";
import { acceptVerified, openVerified, withdrawVerified } from "../../src/lib/verify.ts";
import type { Offer } from "../../src/lib/types.ts";

const ME = "0x" + "a".repeat(40);
const ADDRESSEE = "0x" + "b".repeat(40);
const STRANGER = "0x" + "c".repeat(40);
const ID = "1".repeat(64);
const of = (o: Partial<Offer> = {}): Offer => ({ offer_id: ID, author: ME, outcome: "UNRESTRICTED", addressee_wallet: ADDRESSEE,
  addressee_label: "the Addressee", text: "Offer.", reach: "ANYONE", state: "OPEN", taker: "", taker_note: "", taker_was_addressee: false, ...o });
const sub = { me: ME, addresseeWallet: ADDRESSEE, label: " the Addressee ", text: " Offer. ", offerId: ID };

test("open postcondition: either reading, every field must match", () => {
  assert.equal(openVerified(of(), sub), true);
  assert.equal(openVerified(of({ outcome: "RESTRICTED", reach: "ADDRESSEE" }), sub), true);
  assert.equal(openVerified(of({ outcome: "RESTRICTED", reach: "ANYONE" }), sub), false);
  assert.equal(openVerified(of({ text: "Other." }), sub), false);
  assert.equal(openVerified(of({ addressee_wallet: STRANGER }), sub), false);
  assert.equal(openVerified(null, sub), false);
});

test("accept postcondition: taker is me, flag matches", () => {
  assert.equal(acceptVerified(of({ state: "ACCEPTED", taker: STRANGER, taker_note: "On it" }), STRANGER, " On it "), true);
  assert.equal(acceptVerified(of({ state: "ACCEPTED", taker: STRANGER, taker_note: "On it", taker_was_addressee: true }), STRANGER, "On it"), false);
  assert.equal(acceptVerified(of({ state: "ACCEPTED", taker: ADDRESSEE, taker_note: "Accepted", taker_was_addressee: true }), ADDRESSEE, "Accepted"), true);
  assert.equal(acceptVerified(of({ state: "ACCEPTED", taker: ADDRESSEE, taker_note: "x" }), STRANGER, "x"), false);
  assert.equal(acceptVerified(of(), STRANGER, "On it"), false);
});

test("withdraw postcondition", () => {
  assert.equal(withdrawVerified(of({ state: "WITHDRAWN" })), true);
  assert.equal(withdrawVerified(of({ state: "ACCEPTED", taker: STRANGER })), false);
  assert.equal(withdrawVerified(null), false);
});
