# RUNTIME_EVIDENCE

Network: GenLayer StudioNet, chain 61999. Source SHA-256: `94db20972d07ecc12b502e96f7635ccd99c1c73fb329220d80a4fc701320973d`.
Every row: wallet, method, exact input, expected, tx hash, execution result, post-state from a view.
"EP" is the equivalence-principle output (the label the validators agreed on). A screenshot or a FINALIZED status alone is not evidence of execution.

## Project — AnyTaker (through the app)

Project contract: [`0x61FCCA87768B60698ed714BCD77F4273e1001dEb`](https://explorer-studio.genlayer.com/address/0x61FCCA87768B60698ed714BCD77F4273e1001dEb) — the same frozen source deployed again at its own address (not the Intelligent
Contract address). Deploy tx `0x8fa21afa4c2dd511a18a294e36c59f8ce86fd879c1b5a3b234cd0def3f21d964` (SUCCESS).

Run date 2026-10-04, through the live app with MetaMask. Every success below was reported by the app only after the
leader receipt said SUCCESS and the reloaded accepted state showed the change.

Wallets: author `0x6276095FAEA15108740445ff277fdA8c304657F4` · addressee `0x037f58E33c1Ec8fdA272361E0aAC1e31054a1CDE` ·
stranger `0x146e44881d35814bA582D265AF5b97ef2695ec8e` (entered in no field).

| # | Wallet | Action in the app | Expected | Tx hash | Result | Status |
|---|---|---|---|---|---|---|
| 1 | author | Open Y1 (`Whoever finishes the translation first will be paid for it.`) | `UNRESTRICTED`, `ANYONE`, OPEN | `0xb831a255701d0208a6a02f9c546fac9a25be4a2869af49a4fed38c04d5c1de9a` | SUCCESS; card *Open to anyone*, reading UNRESTRICTED | PASS |
| 4 | author | Open N1 (`If you finish the translation first, you will be paid for it.`) | `RESTRICTED`, `ADDRESSEE`, OPEN | `0x2172b51db4c99f4858fcc6572ffb1ad0370a10a22c37d33c8024ddd477b94d11` | SUCCESS; card *Addressed*, reading RESTRICTED | PASS |
| 2 | stranger | Accept Y1, note `On it` | taker = stranger | `0x315fb8282329b10698ee67e0fd66eab7a3689050e44b9a41a9e505532e174a3c` | SUCCESS; *accepted by someone not named in this offer*, taker `0x146e44881d35814ba582d265af5b97ef2695ec8e` | PASS |
| 6 | addressee | Accept N1, note `Accepted` | taker = addressee | `0xf0801989272aac250f626f13d4ec6eafca3896ee7e11bc17ae9707f078db2e63` | SUCCESS; *accepted by the addressee*, taker `0x037f58e33c1ec8fda272361e0aac1e31054a1cde` | PASS |

Offer ids (author `0x6276…57f4`): Y1 `026945bf4cad49e9fd0227adc3f25d30613f45a43ec0bca057b887d686ef21d0` ·
N1 `02d6afb04636202e839c634de7d7ca94da37d8cc518bf4ff1f9ec2834330eae0`.

### Screenshots

| # | File | What it shows |
|---|---|---|
| 1 | `docs/evidence/1-stranger-side-by-side.png` | stranger connected, both offers OPEN, both cards *not named in this offer*, note typed on both: Accept **enabled** on Y1, **disabled** on N1 with *"This was made to the addressee alone"* |
| 2 | `docs/evidence/2-after-acceptance.png` | after both acceptances: Y1 *accepted by someone not named in this offer* with the stranger's full address; N1 *accepted by the addressee* |
| 3 | `docs/evidence/3-addressee-already-accepted.png` | addressee connected, note typed on Y1: Accept disabled with *"This has already been accepted"* |
| — | `docs/evidence/4-stranger-took-y1.png` | the stranger's view right after its acceptance, with the app's success line and tx hash |

Calls the app already knows will revert are not sent: the button is disabled with the contract's sentence, and the
proof is a screenshot, not a hash.

## Intelligent Contract — the pair that carries the concept: #2 vs #5


The same stranger wallet `0xA2D2E7baD15e7b8A9031d88353530a794e56Db28` — named nowhere in either offer — makes the same call on two offers
for the same job.

| | on Y1 (`ANYONE`) | on N1 (`ADDRESSEE`) |
|---|---|---|
| `accept_offer(<id>, "On it")` by the stranger | **#2 succeeds** — the stranger becomes `taker` · `0xc0a766b4929e5c2e25736e85ab001105a003cb31a2915fbb925e7bd9c8c7bc75` | **#5 reverts** *This was made to the addressee alone* · `0x0afb6ebcc3ab7f937ac8724c5d2881d136845c0ea5f2706f941d362e60f3f3cf` |

## Intelligent Contract — 9 rows, 10 transactions

Contract address: [`0x8d79F5754C049D129d4fc59291AA1e3CA00e95fF`](https://explorer-studio.genlayer.com/address/0x8d79F5754C049D129d4fc59291AA1e3CA00e95fF) · deploy tx `0x51cb458a883804df8dfaeb14abc6b2c0da52e269dd3ff4602a78c35398e01d66` (FINALIZED · SUCCESS)

Wallets: author `0x6276095FAEA15108740445ff277fdA8c304657F4` · addressee `0xAD05365aFe0C2450d4FFBcdbE555b6E5fB7Dfa35` ·
stranger `0xA2D2E7baD15e7b8A9031d88353530a794e56Db28` (never entered in any field). Every offer opened with label `the Addressee`.

| # | Wallet | Method and input | Expected | Tx hash | Result | Status |
|---|---|---|---|---|---|---|
| 1 | author | `open_offer(0xAD05…Dfa35, "the Addressee", Y1)` | `UNRESTRICTED`, `reach=ANYONE`, OPEN | `0x3622ef4c108b868b75748a71c04605920a72552111c06b1657f49ed75529a43c` | FINALIZED · SUCCESS · EP `UNRESTRICTED` | PASS |
| 2 | **stranger** | `accept_offer(026945bf…21d0, "On it")` | success, `taker=stranger`, `taker_was_addressee=false` | `0xc0a766b4929e5c2e25736e85ab001105a003cb31a2915fbb925e7bd9c8c7bc75` | ACCEPTED · SUCCESS (4/4 agree) | PASS (read R1) |
| 3 | addressee | `accept_offer(026945bf…21d0, "Me too")` | revert *This has already been accepted* | `0x6260ea47786ea86c2bc6a31f955f6be654248210c42d4781c9941ab589b3aac5` | ERROR · `[rollback] This has already been accepted` (validators agree) | PASS (expected revert) |
| 4 | author | `open_offer(0xAD05…Dfa35, "the Addressee", N1)` | `RESTRICTED`, `reach=ADDRESSEE` | `0x9238cf69d3d3373c14ad3f49f25571ecba4864a1a2c50e6a13fff0457a554410` | FINALIZED · SUCCESS · EP `RESTRICTED` | PASS |
| 5 | **stranger** | `accept_offer(02d6afb0…eae0, "On it")` | revert *This was made to the addressee alone* | `0x0afb6ebcc3ab7f937ac8724c5d2881d136845c0ea5f2706f941d362e60f3f3cf` | ERROR · `[rollback] This was made to the addressee alone` (validators agree) | PASS (expected revert) |
| 6 | addressee | `accept_offer(02d6afb0…eae0, "Accepted")` | success, `taker=addressee`, `taker_was_addressee=true` | `0x50562ba65c5261b684600355c8ee347d63a4bfcd63dec45addd42c0ce4af3642` | ACCEPTED · SUCCESS | PASS (read R2) |
| 7 | author | `open_offer(…, Y5)` then `open_offer(…, N5)` | `UNRESTRICTED`, then `RESTRICTED` | Y5 `0x13e3d533b7bc14ea9b09c76613666cc929e39c44b483d00fde86e0690b68f914` · N5 `0x7e880f261e2597a80e4ee8827d9be6575040bc55a962ad0493ace46cbf8c67fc` | both SUCCESS · EP `UNRESTRICTED` / `RESTRICTED` | PASS |
| 8 | author | `withdraw_offer(d8bb818f…2fb2)` | WITHDRAWN | `0x414a62eab6c671ffca61d406a2d83cef644aa36cf9c94d271926809c56d41b70` | ACCEPTED · SUCCESS (5/5 agree) | PASS |
| 9 | addressee | `accept_offer(d8bb818f…2fb2, "Accepted")` | revert *This has been withdrawn* | `0xe97484dae9e6ee0d2729c07234094a61c885d6599dc069c2bc06a2cb43f2fec8` | ERROR · `[rollback] This has been withdrawn` (validators agree) | PASS (expected revert) |

Y1 = `Whoever finishes the translation first will be paid for it.`
N1 = `If you finish the translation first, you will be paid for it.`
Y5 = `The fee goes to whoever completes the task, not just to you.`
N5 = `The fee goes to you alone if you complete the task.`

Run date 2026-10-04, GenLayer Studio, Normal (Full Consensus). 10 transactions, all as expected.

## Read-back (views, no transaction)

| # | View | Offer | Returned |
|---|---|---|---|
| R1 | `get_offer` | Y1, after #3 | `UNRESTRICTED`, `ANYONE`, **ACCEPTED**, taker **`0xa2d2e7bad15e7b8a9031d88353530a794e56db28`** (the stranger), taker_note "On it", **taker_was_addressee false** |
| R2 | `get_offer` | N1, after #6 | `RESTRICTED`, `ADDRESSEE`, **ACCEPTED**, taker `0xad05365afe0c2450d4ffbcdbe555b6e5fb7dfa35` (the addressee), taker_note "Accepted", **taker_was_addressee true** |

Offer ids (author `0x6276…57f4`):
Y1 `026945bf4cad49e9fd0227adc3f25d30613f45a43ec0bca057b887d686ef21d0` ·
N1 `02d6afb04636202e839c634de7d7ca94da37d8cc518bf4ff1f9ec2834330eae0` ·
Y5 `27c0b7bee14d83c8e347f2d0aeb8e5f17529a23c8b66bca04ff6d45adc0defaa` ·
N5 `d8bb818f444fb037828ffde740a5966bbba975e0a4d12f1425d7024811402fb2`
