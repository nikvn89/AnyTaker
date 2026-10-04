// Mirrors every revert of contracts/OfferScope.py that can be predicted from
// state already read, in the SAME order the contract checks them. A disabled
// button shows the contract's exact sentence. Only the model's label is
// unpredictable, so only open_offer with all checks passing is ever sent.

import { pyContainsToken, pyLen, pyStrip } from "./pytext.ts";
import type { Offer } from "./types.ts";

export const MAX_TEXT_LENGTH = 600;
export const MAX_LABEL_LENGTH = 80;
export const MAX_NOTE_LENGTH = 60;

export const RESERVED_TOKENS = [
  "<UNTRUSTED_OFFER_TEXT>",
  "</UNTRUSTED_OFFER_TEXT>",
  "<UNTRUSTED_ADDRESSEE_LABEL>",
  "</UNTRUSTED_ADDRESSEE_LABEL>",
  "UNRESTRICTED",
  "RESTRICTED",
] as const;

export const REVERTS = {
  invalidWallet: "Invalid wallet address",
  labelEmpty: "Label is empty",
  labelTooLong: "Label is too long",
  textEmpty: "Text is empty",
  textTooLong: "Text is too long",
  noteEmpty: "Note is empty",
  noteTooLong: "Note is too long",
  reserved: "Text or label contains a reserved token",
  unknownOffer: "Unknown offer id",
  addresseeIsAuthor: "The addressee cannot be the author",
  duplicate: "This offer already exists",
  withdrawn: "This has been withdrawn",
  accepted: "This has already been accepted",
  authorSelf: "The author cannot accept its own offer",
  addresseeAlone: "This was made to the addressee alone",
  notAuthorWithdraw: "Only the author may withdraw this offer",
} as const;

export const REACH_LINE: Record<string, string> = {
  ANYONE: "Anyone except the author may accept; the first to accept takes it",
  ADDRESSEE: "Only the addressee may accept",
};

const ZERO = "0x0000000000000000000000000000000000000000";

export type WalletCheck = { ok: true; wallet: string } | { ok: false; reason: string };

/** The contract's _normalize_wallet. */
export function normalizeWallet(value: string): WalletCheck {
  const wallet = pyStrip(value).toLowerCase();
  if (wallet.length !== 42 || !wallet.startsWith("0x") || !/^[0-9a-f]{40}$/.test(wallet.slice(2)) || wallet === ZERO) {
    return { ok: false, reason: REVERTS.invalidWallet };
  }
  return { ok: true, wallet };
}

/** The contract's _may_accept, line for line. It does not read state. */
export function mayAccept(o: Pick<Offer, "author" | "reach" | "addressee_wallet">, caller: string): boolean {
  const c = caller.toLowerCase();
  if (c === o.author.toLowerCase()) return false;
  if (o.reach === "ANYONE") return true;
  return c === o.addressee_wallet.toLowerCase();
}

export type Role = "author" | "addressee" | "not named in this offer";

export function roleOf(o: Offer, me: string): Role {
  const m = me.toLowerCase();
  if (m === o.author.toLowerCase()) return "author";
  if (m === o.addressee_wallet.toLowerCase()) return "addressee";
  return "not named in this offer";
}

export function takerLine(o: Offer): string {
  if (o.state !== "ACCEPTED") return "";
  return o.taker_was_addressee ? "accepted by the addressee" : "accepted by someone not named in this offer";
}

export type OpenInput = { me: string; addresseeWallet: string; label: string; text: string; exists: boolean };

/** open_offer order: wallet -> label -> text -> reserved -> addressee != author -> duplicate. */
export function openBlock(i: OpenInput): string | null {
  const w = normalizeWallet(i.addresseeWallet);
  if (!w.ok) return w.reason;
  const label = pyStrip(i.label);
  if (pyLen(label) === 0) return REVERTS.labelEmpty;
  if (pyLen(label) > MAX_LABEL_LENGTH) return REVERTS.labelTooLong;
  const text = pyStrip(i.text);
  if (pyLen(text) === 0) return REVERTS.textEmpty;
  if (pyLen(text) > MAX_TEXT_LENGTH) return REVERTS.textTooLong;
  if (pyContainsToken(label, RESERVED_TOKENS) || pyContainsToken(text, RESERVED_TOKENS)) return REVERTS.reserved;
  if (w.wallet === i.me.toLowerCase()) return REVERTS.addresseeIsAuthor;
  if (i.exists) return REVERTS.duplicate;
  return null;
}

/** accept_offer order: note -> WITHDRAWN -> ACCEPTED -> author -> _may_accept. */
export function acceptBlock(o: Offer, me: string, note: string): string | null {
  const n = pyStrip(note);
  if (pyLen(n) === 0) return REVERTS.noteEmpty;
  if (pyLen(n) > MAX_NOTE_LENGTH) return REVERTS.noteTooLong;
  if (o.state === "WITHDRAWN") return REVERTS.withdrawn;
  if (o.state === "ACCEPTED") return REVERTS.accepted;
  if (me.toLowerCase() === o.author.toLowerCase()) return REVERTS.authorSelf;
  if (!mayAccept(o, me)) return REVERTS.addresseeAlone;
  return null;
}

/** withdraw_offer order: author -> ACCEPTED -> WITHDRAWN. */
export function withdrawBlock(o: Offer, me: string): string | null {
  if (me.toLowerCase() !== o.author.toLowerCase()) return REVERTS.notAuthorWithdraw;
  if (o.state === "ACCEPTED") return REVERTS.accepted;
  if (o.state === "WITHDRAWN") return REVERTS.withdrawn;
  return null;
}
