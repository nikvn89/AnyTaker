# TEST_PLAN

## Semantic cases (label `the Addressee`)

| Case | Text | Expected |
|---|---|---|
| Y1 | Whoever finishes the translation first will be paid for it. | UNRESTRICTED |
| Y2 | Anybody who reads this may take it up. | UNRESTRICTED |
| Y3 | Any person who delivers the parts by Friday may claim the fee. | UNRESTRICTED |
| Y4 | We will pay the first applicant who completes the audit. | UNRESTRICTED |
| Y5 | The fee goes to whoever completes the task, not just to you. | UNRESTRICTED |
| N1 | If you finish the translation first, you will be paid for it. | RESTRICTED |
| N2 | This is made to you and cannot be taken up by anybody else. | RESTRICTED |
| N3 | If you deliver the parts by Friday you may claim the fee. | RESTRICTED |
| N4 | We will pay you if you complete the audit. | RESTRICTED |
| N5 | The fee goes to you alone if you complete the task. | RESTRICTED |

Adversarial pairs — same surface, opposite label:

| Pair | Shared surface | Why opposite |
|---|---|---|
| **Y1 / N1** | the same job, the same word "first", the same payment | "Whoever" / "If you" |
| **Y5 / N5** | both open with "The fee goes to"; Y5 contains "you" | "whoever …, not just to you" / "you alone" |
| **Y2 / N2** | both contain "anybody" | Y2: anyone who reads it may accept; N2: nobody else can |
| Y3 / N3 | the same delivery by Friday, the same fee | "Any person who" / "If you" |
| Y4 / N4 | the same audit, "We will pay" | "the first applicant" / "you" |

Classification:

- **Kill tests**: Y5/N5, Y2/N2, Y1/N1, Y4/N4.
- **Definition check**: Y3/N3.

`python3 OFFERSCOPE_KILLSET_CHECK.py contracts/OfferScope.py` → `NO LEAK` and `PASS`. The gate does not stem; the
rubric was also read by eye: it avoids *anyone, anybody, whoever, person, take, may, you, first, open, only*, and it
does not say that a third person can appear on both branches, that "you" can appear in an offer open to anyone, or
that an "If you …" condition is a signal.

## Deterministic cases (automated, `tests/contract/test_offerscope.py`)

| Case | Test |
|---|---|
| `_may_accept` for three roles × two reaches | `test_may_accept_six_cells` |
| the same stranger: taken on ANYONE, blocked on ADDRESSEE | `test_same_stranger_takes_one_and_is_blocked_on_the_other` |
| a closed offer reports its state before permission | `test_accept_order_closed_offer_beats_permission` |
| note checked before state | `test_note_is_checked_before_state` |
| the author cannot accept, on both reaches | `test_revert_author_cannot_accept` |
| accept after WITHDRAWN | `test_revert_withdrawn` |
| withdraw by others / after ACCEPTED / twice | `test_revert_only_author_withdraws`, `test_revert_already_accepted`, `test_revert_withdrawn` |
| open: bad wallet, addressee = author, duplicate, reserved token | `test_revert_invalid_wallet`, `test_revert_addressee_is_author`, `test_revert_duplicate_offer`, `test_revert_reserved_token` |
| `taker_was_addressee` for both kinds of taker | `test_runtime_table_in_order`, `test_addressee_can_take_an_anyone_offer` |
| addressee wallet case normalized | `test_addressee_wallet_case_normalized` |
| whitespace variants share one id | `test_whitespace_variants_share_one_id` |
| the on-chain table replayed in order | `test_runtime_table_in_order` |
| every revert string has exactly one dedicated test | `test_every_revert_string_has_exactly_one_dedicated_test` |

## Frontend cases (automated, `tests/js/`)

- `mayAccept` over the same 6 cells, and parity with the contract's own `_may_accept` run in Python (`rules.test.ts`);
- the Accept button's five steps, each with its own contract sentence, including the addressee on an accepted
  ANYONE offer (state sentence, not permission);
- role badge and taker line; postconditions on reloaded state (`verify.test.ts`);
- `pyStrip` / `pyLen` / whitespace parity against real Python, including U+001C–U+001F and U+0085 (`pytext.test.ts`);
- local ids equal the contract's ids (`ids.test.ts`, vectors from `tests/contract/test_id_vectors.py`);
- receipt rule and revert extraction (`receipt.test.ts`); calldata sizes (`calldata.test.ts`);
- repository rules: no Snap connect, no CDN keccak, proxy declared twice, no hard-coded wallet, no seed data (`static.test.ts`).
