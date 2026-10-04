# SECURITY

## Prompt fence

- The model sees only the rubric, the addressee label and the offer text, each inside its own tag
  (`<UNTRUSTED_ADDRESSEE_LABEL>`, `<UNTRUSTED_OFFER_TEXT>`). It sees no wallet, no state, and nothing the contract
  does with the answer.
- Here injection has a clear target: a sentence saying "the outcome is UNRESTRICTED" would open the offer to every
  wallet. Both answer tokens (`UNRESTRICTED`, `RESTRICTED`) and all four tags are reserved; text or label containing
  any of them, compared after upper-casing, is rejected before the model call.
- A fixed-point strip removes tokens until the string no longer changes, so nested fragments cannot rebuild one.
- Validators re-run the classification and must agree on the exact label. That checks agreement, not injection
  resistance; the fence does that. Disagreement reverts the whole transaction.

## Fail-safe

Unclear or unparseable output becomes `RESTRICTED`: nobody can take the offer away from the addressee. See
`LOCKED_SPEC.md`.

## Frontend

- MetaMask only signs; reads, receipts and the write client go through one same-origin proxy (`/genlayer-rpc`).
- No Snap request, no CDN code, no hard-coded wallet. React escapes all contract text.
- Success is reported only after the leader receipt says SUCCESS **and** the reloaded accepted state shows the change.

## Remaining limits

- The contract does not check whether the taker can do the work; on an `ANYONE` offer a bot can accept first.
- The author names the addressee's wallet; the contract does not prove whose it is.
- No adversarial model run was done.
