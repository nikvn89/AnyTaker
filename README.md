AnyTaker does not judge whether someone deserves the offer, and it does not choose between two known wallets. It asks whether a text addressed to one person can be taken up by a stranger — and it turns that answer into whether an address the contract has never seen can accept.

<p><img src="logo.png" alt="AnyTaker logo" width="96"></p>

# AnyTaker

A GenLayer dApp on StudioNet (chain 61999) built on the Intelligent Contract `OfferScope`
(`contracts/OfferScope.py`, py-genlayer v0.2, `# v0.2.16`).

**The contract holds and pays no money.** The offers mention fees; the contract only records who accepted.

| | |
|---|---|
| Live app | https://any-taker.vercel.app |
| Project contract | [`0x61FCCA87768B60698ed714BCD77F4273e1001dEb`](https://explorer-studio.genlayer.com/address/0x61FCCA87768B60698ed714BCD77F4273e1001dEb) |
| Intelligent Contract (separate submission) | `0x8d79F5754C049D129d4fc59291AA1e3CA00e95fF` |
| Source SHA-256 | `94db20972d07ecc12b502e96f7635ccd99c1c73fb329220d80a4fc701320973d` (`SOURCE_SHA256.txt`) |
| Evidence | `RUNTIME_EVIDENCE.md` · `TESTING.md` |

## What it does

An author opens an offer to a named addressee. GenLayer validators read it **once**:

- **open to anyone** (`UNRESTRICTED` → `ANYONE`): every wallet except the author may accept — including one this
  contract has never seen;
- **addressed** (`RESTRICTED` → `ADDRESSEE`): only the addressee may accept.

The first acceptance closes the offer for everyone and records the taker's full address permanently. The author may
withdraw an offer nobody has accepted yet. Unclear output fails safe to *addressed*, so nobody can take the offer away
from the addressee.

## What the app shows

- **A reach line** under the offer text: *Anyone except the author may accept; the first to accept takes it* or
  *Only the addressee may accept*.
- **The connected wallet's role** on each offer: `author`, `addressee` or `not named in this offer`.
- **Accept** follows the contract's exact check order — note, withdrawn, already accepted, author, permission — and
  when disabled shows the contract's own sentence for the step that blocked it, e.g. *"This was made to the addressee
  alone"*.
- After acceptance: the taker's full address and *accepted by the addressee* or *accepted by someone not named in this
  offer*.
- **Side by side**: two offers for the same job seen by the same wallet — one Accept enabled, one disabled.
- The id of a new offer is computed locally and shown before sending; the app checks the accepted state first and
  never sends a duplicate. Success is reported only after the leader receipt says SUCCESS and the reloaded state
  shows the change. A live meter blocks calldata over 255 bytes.

## How to try it

You need **three wallets of your own** on GenLayer StudioNet. Use your **own third wallet as the stranger** — this
is the only way to see the tooth.

1. Connect your **first wallet** (author). On *Open an offer*, enter your **second wallet** as addressee, label
   `the Addressee`, and `Whoever finishes the translation first will be paid for it.` Open it, then open
   `If you finish the translation first, you will be paid for it.` Copy both ids.
2. Switch MetaMask to your **third wallet** — it is named nowhere in either offer. Open *Side by side* with both ids:
   both cards say *Connected wallet: not named in this offer*. Type a note on both: Accept is enabled on the first
   and disabled on the second with *"This was made to the addressee alone"*.
3. Accept the first: your third wallet's full address appears as taker, *accepted by someone not named in this offer*.
4. Switch to your second wallet and accept the second: *accepted by the addressee*. On the first, Accept is now
   disabled with *"This has already been accepted"*.

## Methods

| Write | Who | Notes |
|---|---|---|
| `open_offer(addressee_wallet, addressee_label, text)` | author | the only model call |
| `accept_offer(offer_id_hex, note)` | per `reach`; never the author | note → withdrawn → accepted → author → permission |
| `withdraw_offer(offer_id_hex)` | author | only while OPEN |

Views: `get_offer` (every field, including `outcome` and `reach`), `get_rubric`, `get_limits`. Unknown id → `"{}"`.
No preview or dry-run view. Full rules: `LOCKED_SPEC.md`.

## Run locally

```
npm ci
npm run dev          # http://localhost:5173, proxied to StudioNet
npm test             # frontend logic tests
npm run build
python3 -m pytest tests/contract -q    # contract tests in GenLayer Direct Mode
```

`VITE_CONTRACT_ADDRESS` overrides the Project address in `src/lib/config.ts`.

## Honest limitation

1. **The contract holds and pays no money.** It records who accepted the offer.
2. **The contract does not check whether the taker can do the work.** On an open offer any wallet — a bot included —
   can accept first. This is the largest limitation.
3. **A wrong `UNRESTRICTED` is the main risk** — a stranger takes the addressee's offer, permanently.
4. **A wrong `RESTRICTED` keeps strangers out**, but nobody loses anything for good; the author can reopen with a
   clearer sentence.
5. **The author declares the addressee's wallet.** The contract does not prove whose wallet it is.
6. **There is no deadline on chain.** An offer stays open until someone accepts or the author withdraws. "By Friday"
   in a test sentence is wording, not a condition the contract checks.

The contract accepts 600 characters, but `open_offer` at the caps measures 760 bytes of calldata; only offers up to
about 165 characters fit the 255-byte limit. Longer ones would be refused by the RPC, and the app blocks them.

License: MIT.
