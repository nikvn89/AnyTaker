# TESTING

```
COMPILE PASS ≠ RUNTIME PASS
SUBMITTED ≠ ACCEPTED ≠ FINALIZED ≠ EXECUTION SUCCESS ≠ POSTCONDITION PASS
```

## Run automatically (offline, also in CI)

| Gate | Command | Result |
|---|---|---|
| kill-set + rubric overlap | `python3 OFFERSCOPE_KILLSET_CHECK.py contracts/OfferScope.py` | NO LEAK + PASS, rc 0 |
| genvm-linter (AST, offline) | `python3 -m genvm_linter.cli lint contracts/OfferScope.py` | passed (3 checks), rc 0 |
| genvm-linter schema / typecheck | `python3 -m genvm_linter.cli schema` / `typecheck` | 6 methods (3 write, 3 view); no type errors (run once, not in CI) |
| contract tests, Direct Mode | `python3 -m pytest tests/contract -q` | 44 passed |
| frontend logic tests | `npm test` | 42 passed |
| build | `npm run build` (`tsc -b && vite build`) | rc 0 |
| source hash | `npm run verify:source` | PASS |
| calldata table | `node tools/calldata-bytes.mjs` | every hard-block row ≤ 255 bytes |

`lint` is used, not `check`: `check` calls the network and exits 1 in CI.

Eleven deliberate faults were injected into the contract one at a time (the author allowed to accept, the permission
rule inverted for each reach, the permission check skipped, the check order reversed, `taker_was_addressee`
hard-coded, the reach fixed, the fail-safe flipped, the withdraw owner check removed, an answer token removed from the
fence, the note check removed); each was caught by a contract test.

### Calldata size (offline, encoded exactly as genlayer-js 1.1.8 `writeContract`)

| Row | Bytes |
|---|---|
| open_offer Y1 / Y2 / Y3 / Y4 / Y5 | 149 / 128 / 152 / 146 / 150 |
| open_offer N1 / N2 / N3 / N4 / N5 | 151 / 149 / 147 / 132 / 141 |
| accept_offer (id + 60-char note) | 160 |
| withdraw_offer (id) | 100 |
| open_offer at the caps (label 80 + text 600) — measure only | 760, over the limit |

Longest ASCII offer that fits with label `the Addressee`: **165 characters**. The app shows a live meter and blocks
sending above 255 bytes.

### Calldata on the real RPC

`node tools/probe-calldata.mjs <address>` sends each row as a `gen_call` write simulation (no wallet, no
transaction, no model call): `open_offer` is sent from the addressee wallet and stops at *The addressee cannot be the
author*; the id methods use an unknown id and stop at *Unknown offer id*. StudioNet's `gen_call` answers these with a
generic "execution failed" rather than the sentence, so a row counts as decoded when the node reports execution (or
returns the sentence) and fails only on a network error or no answer. CI runs it for the addresses in
`deployments.json` (job `probe`). The `gen_call` path does not reproduce the 255-byte cliff of the transaction path;
that limit is enforced by the offline table above and by the app's meter.

## Run by hand on StudioNet

Only what needs a real wallet, a real signature or a human eye. Results and hashes: `RUNTIME_EVIDENCE.md`.

- Intelligent Contract: deploy, then 9 rows / 10 transactions with three wallets. The three must-verify checks
  (Y1/N1 labels, the same stranger taking one offer and blocked on the other, Y5/N5 labels) are rows of that table.
  All passed.
- Project: the same frozen source deployed again at its own address, then 4 transactions through the app and
  3 screenshots.

A call the app already knows will revert is **not** sent — the button is disabled with the contract's sentence — so
its proof in the Project run is a screenshot, not a hash.

## Consensus behaviour

A leader/validator disagreement that does not reach quorum fails `open_offer`: no offer is stored with a label the
validators did not agree on (fail-closed by design).

## What this run does NOT prove

- The Direct Mode tests use **mocked** model answers. They prove the deterministic code paths, not what the model
  returns. Only RUNTIME_EVIDENCE proves labels.
- Four of the ten semantic cases were labelled on-chain, one run each; label stability across repeated runs or
  validator sets is not measured.
- Offers longer than about 165 characters (the contract allows 600) are not proven on StudioNet.
- Prompt-injection resistance rests on the fence and the reserved-token check; no adversarial model run was done.
- The app screens were also rendered against a local mock of the RPC; the real wallet flow is covered by the Project
  transactions.
