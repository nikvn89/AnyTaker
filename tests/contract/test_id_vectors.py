"""
Golden id vectors shared with the frontend (tests/js/ids.test.ts reads the same
file). Ids are computed by the contract code itself on the real SDK Keccak256.

Regenerate:  WRITE_VECTORS=1 python3 -m pytest tests/contract/test_id_vectors.py
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VECTORS = ROOT / "tests" / "js" / "id-vectors.json"
CONTRACT = str(ROOT / "contracts" / "OfferScope.py")

AUTHOR = "0x3065e31b1d993d7c0d59e6786844cba56780b2d3"
TEXTS = [
    "Whoever finishes the translation first will be paid for it.",
    "If you finish the translation first, you will be paid for it.",
    "The fee goes to whoever completes the task, not just to you.",
    "The fee goes to you alone if you complete the task.",
    "  Anybody who reads\tthis\nmay take it up.  ",
    "\u001cWe will pay you if you complete the audit.\u001f",
    "Any\u0085person\u001dwho delivers\u001ethe parts.",
    "﻿The offer stands.",
    "Offre ouverte — à quiconque　termine. \U0001F4E8",
]


def build(contract):
    rows = []
    for t in TEXTS:
        norm = contract._normalize_text(t.strip())
        rows.append({"text": t, "normalized": norm, "py_len": len(norm),
                     "offer_id": contract._offer_id_for(AUTHOR, norm)})
    return {"author": AUTHOR, "offers": rows}


def test_vectors_match_contract(direct_deploy):
    data = build(direct_deploy(CONTRACT))
    if os.environ.get("WRITE_VECTORS") == "1":
        VECTORS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    assert json.loads(VECTORS.read_text(encoding="utf-8")) == data
