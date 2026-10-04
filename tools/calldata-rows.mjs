// Shared rows for tools/calldata-bytes.mjs, tools/probe-calldata.mjs and tests.
export const ADDRESSEE = "0x" + "1".repeat(40);
export const LABEL = "the Addressee";
export const ID = "f".repeat(64);
export const NOTE60 = "n".repeat(60);

export const CASES = {
  Y1: "Whoever finishes the translation first will be paid for it.",
  Y2: "Anybody who reads this may take it up.",
  Y3: "Any person who delivers the parts by Friday may claim the fee.",
  Y4: "We will pay the first applicant who completes the audit.",
  Y5: "The fee goes to whoever completes the task, not just to you.",
  N1: "If you finish the translation first, you will be paid for it.",
  N2: "This is made to you and cannot be taken up by anybody else.",
  N3: "If you deliver the parts by Friday you may claim the fee.",
  N4: "We will pay you if you complete the audit.",
  N5: "The fee goes to you alone if you complete the task.",
};

/** HARD BLOCK: any of these over 255 bytes stops the release. */
export function hardBlockRows() {
  const rows = Object.entries(CASES).map(([name, text]) => ({
    name: `open_offer ${name}`, method: "open_offer", args: [ADDRESSEE, LABEL, text],
  }));
  rows.push({ name: "accept_offer (id + 60-char note)", method: "accept_offer", args: [ID, NOTE60] });
  rows.push({ name: "withdraw_offer (id)", method: "withdraw_offer", args: [ID] });
  return rows;
}

/** MEASURE ONLY: the contract caps are wider than the proven path. */
export function measureOnlyRows() {
  return [
    { name: "open_offer at max label 80 + max text 600", method: "open_offer", args: [ADDRESSEE, "l".repeat(80), "t".repeat(600)] },
  ];
}
