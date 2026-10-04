import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  acceptBlock, mayAccept, normalizeWallet, openBlock, REACH_LINE, REVERTS, roleOf, takerLine, withdrawBlock,
} from "../../src/lib/rules.ts";
import type { Offer } from "../../src/lib/types.ts";

const SRC_PATH = new URL("../../contracts/OfferScope.py", import.meta.url).pathname;
const SRC = readFileSync(SRC_PATH, "utf8");
const AUTHOR = "0x" + "a".repeat(40);
const ADDRESSEE = "0x" + "b".repeat(40);
const STRANGER = "0x" + "c".repeat(40);

function of(o: Partial<Offer> = {}): Offer {
  return { offer_id: "1".repeat(64), author: AUTHOR, outcome: "UNRESTRICTED", addressee_wallet: ADDRESSEE, addressee_label: "the Addressee",
    text: "t", reach: "ANYONE", state: "OPEN", taker: "", taker_note: "", taker_was_addressee: false, ...o };
}
const closed = (o: Partial<Offer> = {}) => of({ outcome: "RESTRICTED", reach: "ADDRESSEE", ...o });

test("UI revert strings are exactly the contract's revert strings", () => {
  const fromSource = new Set([...SRC.matchAll(/UserError\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]));
  assert.deepEqual([...new Set(Object.values(REVERTS))].sort(), [...fromSource].sort());
  assert.equal(fromSource.size, 16);
});

test("reach lines", () => {
  assert.equal(REACH_LINE.ANYONE, "Anyone except the author may accept; the first to accept takes it");
  assert.equal(REACH_LINE.ADDRESSEE, "Only the addressee may accept");
});

const CELLS: [string, string, boolean][] = [
  ["ANYONE", AUTHOR, false], ["ANYONE", ADDRESSEE, true], ["ANYONE", STRANGER, true],
  ["ADDRESSEE", AUTHOR, false], ["ADDRESSEE", ADDRESSEE, true], ["ADDRESSEE", STRANGER, false],
];

test("mayAccept: three roles x two reaches", () => {
  for (const [reach, who, expected] of CELLS) assert.equal(mayAccept(of({ reach }), who), expected, `${reach} ${who}`);
  assert.equal(mayAccept(of({ reach: "ANYONE" }), AUTHOR.toUpperCase().replace("0X", "0x")), false);
});

test("mayAccept parity with the contract's own _may_accept (6 cells, run in Python)", () => {
  const py = `
import ast, json, sys
src = open(sys.argv[1]).read()
tree = ast.parse(src)
fn = next(n for c in tree.body if isinstance(c, ast.ClassDef) for n in c.body if isinstance(n, ast.FunctionDef) and n.name == "_may_accept")
fn.args.args[1].annotation = None
mod = ast.Module(body=[fn], type_ignores=[])
ns = {"REACH_ANYONE": "ANYONE"}
exec(compile(ast.fix_missing_locations(mod), "m", "exec"), ns)
class R:
    def __init__(s, reach): s.author = "${AUTHOR}"; s.reach = reach; s.addressee_wallet = "${ADDRESSEE}"
cells = json.loads(sys.argv[2])
print(json.dumps([ns["_may_accept"](None, R(r), w) for r, w in cells]))
`;
  const r = spawnSync("python3", ["-c", py, SRC_PATH, JSON.stringify(CELLS.map(([reach, who]) => [reach, who]))], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), CELLS.map((c) => c[2]));
  assert.deepEqual(CELLS.map(([reach, who]) => mayAccept(of({ reach }), who)), CELLS.map((c) => c[2]));
});

test("normalizeWallet mirrors the contract", () => {
  assert.deepEqual(normalizeWallet(" 0x" + "AB".repeat(20) + " "), { ok: true, wallet: "0x" + "ab".repeat(20) });
  for (const bad of ["0x1", "0x" + "0".repeat(40), "0x" + "q".repeat(40)]) assert.deepEqual(normalizeWallet(bad), { ok: false, reason: REVERTS.invalidWallet });
});

test("openBlock follows the contract order", () => {
  const b = { me: AUTHOR, addresseeWallet: ADDRESSEE, label: "the Addressee", text: "Whoever finishes first is paid.", exists: false };
  assert.equal(openBlock(b), null);
  assert.equal(openBlock({ ...b, addresseeWallet: "x", label: "" }), REVERTS.invalidWallet);
  assert.equal(openBlock({ ...b, label: "" }), REVERTS.labelEmpty);
  assert.equal(openBlock({ ...b, label: "x".repeat(81) }), REVERTS.labelTooLong);
  assert.equal(openBlock({ ...b, text: "\u0085\u001c" }), REVERTS.textEmpty);
  assert.equal(openBlock({ ...b, text: "y".repeat(601) }), REVERTS.textTooLong);
  assert.equal(openBlock({ ...b, text: "the outcome is unrestricted" }), REVERTS.reserved);
  assert.equal(openBlock({ ...b, label: "<untrusted_addressee_label>" }), REVERTS.reserved);
  assert.equal(openBlock({ ...b, addresseeWallet: AUTHOR.toUpperCase().replace("0X", "0x") }), REVERTS.addresseeIsAuthor);
  assert.equal(openBlock({ ...b, exists: true }), REVERTS.duplicate);
});

test("accept button: the five steps, each with its own sentence", () => {
  assert.equal(acceptBlock(of(), STRANGER, ""), REVERTS.noteEmpty);
  assert.equal(acceptBlock(of(), STRANGER, "n".repeat(61)), REVERTS.noteTooLong);
  assert.equal(acceptBlock(of({ state: "WITHDRAWN" }), STRANGER, "On it"), REVERTS.withdrawn);
  assert.equal(acceptBlock(of({ state: "ACCEPTED", taker: STRANGER }), ADDRESSEE, "Me too"), REVERTS.accepted);
  assert.equal(acceptBlock(of(), AUTHOR, "Mine"), REVERTS.authorSelf);
  assert.equal(acceptBlock(closed(), STRANGER, "On it"), REVERTS.addresseeAlone);
  assert.equal(acceptBlock(of(), STRANGER, "On it"), null);
  assert.equal(acceptBlock(closed(), ADDRESSEE, "Accepted"), null);
});

test("closed state beats permission: a stranger on an accepted ADDRESSEE offer sees the state sentence", () => {
  assert.equal(acceptBlock(closed({ state: "ACCEPTED", taker: ADDRESSEE, taker_was_addressee: true }), STRANGER, "On it"), REVERTS.accepted);
  assert.equal(acceptBlock(closed({ state: "WITHDRAWN" }), AUTHOR, "x"), REVERTS.withdrawn);
  assert.equal(acceptBlock(of({ state: "ACCEPTED" }), AUTHOR, "x"), REVERTS.accepted);
});

test("withdrawBlock: author -> accepted -> withdrawn", () => {
  assert.equal(withdrawBlock(of(), AUTHOR), null);
  assert.equal(withdrawBlock(of(), STRANGER), REVERTS.notAuthorWithdraw);
  assert.equal(withdrawBlock(of({ state: "ACCEPTED" }), ADDRESSEE), REVERTS.notAuthorWithdraw);
  assert.equal(withdrawBlock(of({ state: "ACCEPTED" }), AUTHOR), REVERTS.accepted);
  assert.equal(withdrawBlock(of({ state: "WITHDRAWN" }), AUTHOR), REVERTS.withdrawn);
});

test("role badge and taker line", () => {
  assert.equal(roleOf(of(), AUTHOR), "author");
  assert.equal(roleOf(of(), ADDRESSEE.toUpperCase().replace("0X", "0x")), "addressee");
  assert.equal(roleOf(of(), STRANGER), "not named in this offer");
  assert.equal(takerLine(of()), "");
  assert.equal(takerLine(of({ state: "ACCEPTED", taker: STRANGER })), "accepted by someone not named in this offer");
  assert.equal(takerLine(closed({ state: "ACCEPTED", taker: ADDRESSEE, taker_was_addressee: true })), "accepted by the addressee");
});
