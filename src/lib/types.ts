export type Offer = {
  offer_id: string;
  author: string;
  outcome: "UNRESTRICTED" | "RESTRICTED" | string;
  addressee_wallet: string;
  addressee_label: string;
  text: string;
  reach: "ANYONE" | "ADDRESSEE" | string;
  state: "OPEN" | "ACCEPTED" | "WITHDRAWN" | string;
  taker: string;
  taker_note: string;
  taker_was_addressee: boolean;
};

export type TxPhase = "idle" | "checking" | "signing" | "submitted" | "delayed" | "success" | "error";

export type TxStatus = {
  phase: TxPhase;
  message: string;
  hash?: string;
};
