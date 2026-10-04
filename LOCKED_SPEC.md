# LOCKED_SPEC — OfferScope (contract) / AnyTaker (Project)

Frozen source: `contracts/OfferScope.py`, SHA-256 in `SOURCE_SHA256.txt`. Header: `# v0.2.16` and the py-genlayer
v0.2 Depends line. Network: StudioNet 61999.

## The question

> An offer is sent to one person. Can a stranger step in and accept it, or only that person?

This is an offer to the world against an offer to a named person. "Whoever finishes the translation first will be
paid for it" and "If you finish the translation first, you will be paid for it" describe the same job and the same
payment — one lets **anyone** close the deal, the other only **one person**.

## Relation

- **author** — opens the offer and names the addressee (wallet + label);
- **addressee** — the wallet the offer is directed to;
- **stranger** — any other wallet, including one the contract has never seen.

## Enums and state

| Outcome (model) | `reach` (immutable) |
|---|---|
| `UNRESTRICTED` | `ANYONE` |
| `RESTRICTED` | `ADDRESSEE` |

`state`: `OPEN` → `ACCEPTED`, **or** `OPEN` → `WITHDRAWN`. Two exits, mutually exclusive, permanent. Both `outcome`
and `reach` are stored and returned by `get_offer`.

Limits: text 600, label 80, note 60 (a calldata ceiling: id 64 + note 60). No page size — there is no paged view.

## The novelty: the set of wallets allowed to accept

| | `ANYONE` | `ADDRESSEE` |
|---|---|---|
| Who may `accept_offer` | every wallet except the author — including one never seen before | the addressee only |
| A stranger calls `accept_offer` | **succeeds**; the stranger becomes `taker` | **reverts** |
| The addressee calls `accept_offer` | succeeds if nobody accepted first | succeeds |
| After the first acceptance | closed for every wallet | closed |

The verdict does not choose between two declared wallets. It decides whether the set of wallets allowed to call one
method is unbounded or a single element.

**The permission rule lives in one function:**

```python
def _may_accept(self, record, caller):
    if caller == str(record.author).lower():
        return False
    if record.reach == REACH_ANYONE:
        return True
    return caller == record.addressee_wallet
```

It does not read `state`. The app uses a line-for-line TypeScript copy, tested against this Python function.

## Three write methods

1. `open_offer(addressee_wallet, addressee_label, text)` — wallet → label → text → reserved token →
   addressee ≠ sender → id → duplicate → **then** one model call. Stores `outcome`, sets `reach`, state OPEN.
2. `accept_offer(offer_id_hex, note)` — id → note (1–60) → not WITHDRAWN (*This has been withdrawn*) → not ACCEPTED
   (*This has already been accepted*) → caller ≠ author (*The author cannot accept its own offer*) →
   `_may_accept` (*This was made to the addressee alone*) → record `taker`, `taker_note`, `taker_was_addressee`,
   state ACCEPTED.
3. `withdraw_offer(offer_id_hex)` — id → author only → state OPEN (ACCEPTED → *This has already been accepted*,
   WITHDRAWN → *This has been withdrawn*) → WITHDRAWN.

Only `open_offer` calls the model, and the prompt sees no wallet.

The order in `accept_offer` puts what cannot be fixed (withdrawn, accepted) before what belongs to the caller
(author, permission): a stranger who calls into an offer already taken is told it is taken, not that it was
addressed to someone else.

## The tooth, and why it needs three wallets

```
offer ANYONE      accept_offer by a stranger -> OK, taker = stranger
offer ADDRESSEE   accept_offer by a stranger -> REVERT "This was made to the addressee alone"
```

The same stranger wallet, the same call. The stranger must appear nowhere in the offer — neither author nor
addressee — which is why the run uses three wallets.

## Fail-safe: `RESTRICTED`

Both errors hurt someone who did not write the text, so the test is which one cannot be undone.

- Wrongly `UNRESTRICTED`: a stranger accepts first and **closes the offer for good**; the addressee loses it and no
  method gives it back.
- Wrongly `RESTRICTED`: strangers cannot accept. But the addressee **still can**, and the author can open a clearer
  offer. **Nothing is lost permanently.**

## Two objections answered

**"Which branch does the author want, and why not polish the wording?"** Neither obviously helps the author:
`UNRESTRICTED` reaches more people but binds the author to a stranger it cannot vet; `RESTRICTED` is safe on identity
but only one person can accept. The text is part of the id, so the same sentence cannot be reopened.

**"Where is the real risk?"** On an `ANYONE` offer any wallet — a bot included — can accept first, and the contract
does not check whether the taker can do the work. Nets: the fail-safe above, `withdraw_offer` while nobody has
accepted, and `taker` recorded permanently as a full address.

There is no preview, classify or dry-run view.

## Nearest neighbours

| Neighbour | It asks | Difference |
|---|---|---|
| holder-choice contracts | which of two declared wallets holds a right | both wallets are known there; here `ANYONE` opens a method to wallets nobody declared |
| eligibility contracts | whether someone meets a criterion | there is no criterion to grade; the question is whether identity is limited at all |
| exclusivity contracts | whether the author may grant a second time | here every offer closes after the first acceptance; what differs is who may accept |
