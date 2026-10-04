// Postconditions checked AFTER the receipt says SUCCESS, against reloaded
// accepted state. Every written field must match the submission.

import { pyStrip } from "./pytext.ts";
import type { Offer } from "./types.ts";

export type OpenSubmission = { me: string; addresseeWallet: string; label: string; text: string; offerId: string };

export function openVerified(o: Offer | null, s: OpenSubmission): boolean {
  if (!o) return false;
  const pairOk = (o.outcome === "UNRESTRICTED" && o.reach === "ANYONE") || (o.outcome === "RESTRICTED" && o.reach === "ADDRESSEE");
  return (
    pairOk &&
    o.offer_id === s.offerId &&
    o.author.toLowerCase() === s.me.toLowerCase() &&
    o.addressee_wallet === s.addresseeWallet &&
    o.addressee_label === pyStrip(s.label) &&
    o.text === pyStrip(s.text) &&
    o.state === "OPEN" &&
    o.taker === "" &&
    o.taker_was_addressee === false
  );
}

export function acceptVerified(after: Offer | null, me: string, note: string): boolean {
  if (!after) return false;
  const m = me.toLowerCase();
  return (
    after.state === "ACCEPTED" &&
    after.taker === m &&
    after.taker_note === pyStrip(note) &&
    after.taker_was_addressee === (m === after.addressee_wallet)
  );
}

export function withdrawVerified(after: Offer | null): boolean {
  return !!after && after.state === "WITHDRAWN" && after.taker === "";
}
