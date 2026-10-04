import { useCallback, useEffect, useState } from "react";
import { CONTRACT_ADDRESS, EXPLORER_BASE } from "./lib/config";
import { calldataBytes, CALLDATA_LIMIT } from "./lib/calldata";
import { errorMessage } from "./lib/errors";
import { connectedWallet, ensureStudioNet, getOffer, requestWallet, sendWrite, waitForVerdict } from "./lib/genlayer";
import { offerId, short } from "./lib/ids";
import { pyLen, pyStrip } from "./lib/pytext";
import {
  acceptBlock,
  MAX_LABEL_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_TEXT_LENGTH,
  openBlock,
  REACH_LINE,
  roleOf,
  takerLine,
  withdrawBlock,
} from "./lib/rules";
import type { Offer, TxStatus } from "./lib/types";
import { acceptVerified, openVerified, withdrawVerified } from "./lib/verify";

type Tab = "overview" | "open" | "inspect" | "compare";

const RECENT_KEY = "anytaker.recent";

function readRecent(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    /* storage unavailable: the recent list is a convenience only */
  }
}

function cleanId(value: string): string {
  return pyStrip(value).toLowerCase().replace(/^0x/, "");
}

const validId = (v: string) => /^[0-9a-f]{64}$/.test(cleanId(v));

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function Meter({ bytes }: { bytes: number }) {
  return (
    <span className={bytes > CALLDATA_LIMIT ? "meter over" : "meter"} title="GenLayer calldata; the RPC rejects more than 255 bytes">
      {bytes}/{CALLDATA_LIMIT} B
    </span>
  );
}

type CardProps = {
  offer: Offer;
  me: string;
  busy: boolean;
  onAccept: (o: Offer, note: string) => Promise<void>;
  onWithdraw: (o: Offer) => Promise<void>;
};

function OfferCard({ offer: o, me, busy, onAccept, onWithdraw }: CardProps) {
  const [note, setNote] = useState("");
  const wallet = me || "0x" + "0".repeat(40);
  const acceptReason = me ? acceptBlock(o, wallet, note) : "Connect a wallet first";
  const withdrawReason = me ? withdrawBlock(o, wallet) : "Connect a wallet first";
  const role = me ? roleOf(o, me) : null;
  const open = o.reach === "ANYONE";
  const bytes = calldataBytes("accept_offer", [o.offer_id, pyStrip(note)]);

  return (
    <article className={`ticket ${open ? "t-anyone" : "t-addressee"}`}>
      <header className="t-band">
        <span className="t-kind">{open ? "Open to anyone" : "Addressed"}</span>
        <span className={`t-state s-${o.state.toLowerCase()}`}>{o.state}</span>
      </header>
      <div className="t-body">
        <blockquote>{o.text}</blockquote>
        <p className="reach-line">{REACH_LINE[o.reach] ?? o.reach}</p>
        <dl className="t-facts">
          <div><dt>Reading</dt><dd><code>{o.outcome}</code></dd></div>
          <div><dt>Reach</dt><dd><code>{o.reach}</code></dd></div>
          <div><dt>Author</dt><dd><code>{short(o.author)}</code></dd></div>
          <div><dt>Addressee</dt><dd><code>{short(o.addressee_wallet)}</code> ({o.addressee_label})</dd></div>
        </dl>
        <p className="t-id">offer id <code>{o.offer_id}</code></p>
        {role && <p className={`you you-${role === "not named in this offer" ? "stranger" : role}`}>Connected wallet: <strong>{role}</strong></p>}
      </div>

      <div className="perf" aria-hidden="true" />

      {o.state === "ACCEPTED" ? (
        <div className="t-taken">
          <p className={o.taker_was_addressee ? "taken-by taken-addressee" : "taken-by taken-stranger"}>{takerLine(o)}</p>
          <p className="taker"><span>taker</span> <code>{o.taker}</code></p>
          <p className="muted small">note: “{o.taker_note}”</p>
        </div>
      ) : o.state === "WITHDRAWN" ? (
        <div className="t-taken"><p className="taken-by taken-withdrawn">withdrawn by the author before anyone accepted</p></div>
      ) : null}

      <div className="t-act">
        <div className="row">
          <input value={note} maxLength={MAX_NOTE_LENGTH * 2} placeholder="Note to accept with" onChange={(e) => setNote(e.target.value)} />
          <button className="accept" disabled={busy || acceptReason !== null || bytes > CALLDATA_LIMIT} onClick={async () => { await onAccept(o, note); setNote(""); }}>Accept</button>
        </div>
        <div className="reasons">
          <small>{pyLen(pyStrip(note))}/{MAX_NOTE_LENGTH} · <Meter bytes={bytes} /></small>
          {acceptReason && <span className="why">Accept: {acceptReason}</span>}
        </div>
        <div className="row withdraw-row">
          <button className="ghost" disabled={busy || withdrawReason !== null} onClick={() => onWithdraw(o)}>Withdraw</button>
          {withdrawReason && <span className="why">{withdrawReason}</span>}
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [me, setMe] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [tx, setTx] = useState<TxStatus>({ phase: "idle", message: "" });
  const [pendingHash, setPendingHash] = useState("");
  const [recent, setRecent] = useState<string[]>(readRecent);

  const [addressee, setAddressee] = useState("");
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [exists, setExists] = useState(false);

  const [idInput, setIdInput] = useState("");
  const [current, setCurrent] = useState<Offer | null>(null);

  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [pair, setPair] = useState<[Offer | null, Offer | null]>([null, null]);

  const busy = ["checking", "signing", "submitted"].includes(tx.phase) || pendingHash !== "";

  useEffect(() => {
    connectedWallet().then(setMe).catch(() => undefined);
    window.ethereum?.on?.("accountsChanged", (a: string[]) => setMe((a?.[0] ?? "").toLowerCase()));
  }, []);

  const remember = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)];
      saveRecent(next);
      return next;
    });
  }, []);

  const localId = me && pyStrip(text) ? offerId(me, text) : "";

  useEffect(() => {
    let cancelled = false;
    setExists(false);
    if (!localId || !CONTRACT_ADDRESS) return;
    const t = setTimeout(() => {
      getOffer(localId).then((o) => !cancelled && setExists(!!o)).catch(() => undefined);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [localId]);

  const openReason = me ? openBlock({ me, addresseeWallet: addressee, label, text, exists }) : "Connect a wallet first";
  const openBytes = calldataBytes("open_offer", [pyStrip(addressee) || "0x" + "0".repeat(40), pyStrip(label), pyStrip(text)]);

  async function connect() {
    try {
      const w = await requestWallet();
      await ensureStudioNet();
      setMe(w);
    } catch (e) {
      setTx({ phase: "error", message: errorMessage(e) });
    }
  }

  /** Reload every card that shows this id; return the fresh copy. */
  async function refresh(id: string): Promise<Offer | null> {
    const next = await getOffer(id);
    setCurrent((c) => (c && c.offer_id === id ? next : c));
    setPair(([a, b]) => [a && a.offer_id === id ? next : a, b && b.offer_id === id ? next : b]);
    return next;
  }

  async function loadById(raw: string) {
    const id = cleanId(raw);
    if (!validId(id)) {
      setTx({ phase: "error", message: "Enter a 64-character offer id." });
      return;
    }
    setTx({ phase: "idle", message: "" });
    setIdInput(id);
    const next = await getOffer(id);
    setCurrent(next);
    setTab("inspect");
    if (!next) setTx({ phase: "error", message: "No offer with this id on this deployment." });
    else remember(id);
  }

  async function loadPair() {
    const a = cleanId(leftId);
    const b = cleanId(rightId);
    setPair([validId(a) ? await getOffer(a) : null, validId(b) ? await getOffer(b) : null]);
  }

  /** Receipt first, then the postcondition on reloaded accepted state. */
  async function runWrite(what: string, send: () => Promise<string>, verified: () => Promise<boolean>) {
    let hash = "";
    try {
      setTx({ phase: "signing", message: `${what}: confirm in your wallet…` });
      hash = await send();
      setPendingHash(hash);
      setTx({ phase: "submitted", message: `${what}: submitted, waiting for the leader receipt…`, hash });
      await finish(what, hash, verified);
    } catch (e) {
      setTx({ phase: "error", message: errorMessage(e), hash: hash || undefined });
      setPendingHash("");
    }
  }

  async function finish(what: string, hash: string, verified: () => Promise<boolean>) {
    const verdict = await waitForVerdict(hash);
    if (verdict.kind === "pending") {
      setTx({ phase: "delayed", message: "Submitted — confirmation delayed. Do not resend; check again in a moment.", hash });
      return;
    }
    if (verdict.kind === "error") {
      setPendingHash("");
      setTx({ phase: "error", message: `${what} reverted: ${verdict.reason}`, hash });
      return;
    }
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await verified()) {
        setPendingHash("");
        setTx({ phase: "success", message: `${what}: executed, and the accepted state shows the change.`, hash });
        return;
      }
      await sleep(3000);
    }
    setPendingHash("");
    setTx({ phase: "error", message: `${what}: the receipt reports success but the accepted state does not show the expected change yet. Reload before acting again.`, hash });
  }

  async function checkAgain() {
    if (!pendingHash) return;
    setTx({ phase: "submitted", message: "Checking the receipt again…", hash: pendingHash });
    await finish("Pending transaction", pendingHash, async () => true);
  }

  async function onOpen() {
    if (!me || !localId) return;
    setTx({ phase: "checking", message: "Checking the accepted state before sending…" });
    const already = !!(await getOffer(localId));
    const reason = openBlock({ me, addresseeWallet: addressee, label, text, exists: already });
    if (reason) {
      setExists(already);
      setTx({ phase: "error", message: reason });
      return;
    }
    if (openBytes > CALLDATA_LIMIT) {
      setTx({ phase: "error", message: `Calldata is ${openBytes} bytes; the RPC rejects more than ${CALLDATA_LIMIT}. Shorten the text.` });
      return;
    }
    const sub = { me, addresseeWallet: pyStrip(addressee).toLowerCase(), label, text, offerId: localId };
    await runWrite(
      "Open offer",
      () => sendWrite(me, "open_offer", [sub.addresseeWallet, pyStrip(label), pyStrip(text)]),
      async () => openVerified(await getOffer(sub.offerId), sub),
    );
    remember(sub.offerId);
    setIdInput(sub.offerId);
    setText("");
    setTab("inspect");
    setCurrent(await getOffer(sub.offerId));
  }

  async function onAccept(o: Offer, note: string) {
    const n = pyStrip(note);
    await runWrite("Accept offer", () => sendWrite(me, "accept_offer", [o.offer_id, n]), async () => acceptVerified(await refresh(o.offer_id), me, n));
    await refresh(o.offer_id);
  }

  async function onWithdraw(o: Offer) {
    await runWrite("Withdraw offer", () => sendWrite(me, "withdraw_offer", [o.offer_id]), async () => withdrawVerified(await refresh(o.offer_id)));
    await refresh(o.offer_id);
  }

  const WORKSPACE: [Tab, string, string][] = [
    ["overview", "⌂", "Overview"],
    ["open", "+", "Open an offer"],
    ["inspect", "◇", "Inspect offer"],
    ["compare", "⇆", "Side by side"],
  ];
  const explorer = CONTRACT_ADDRESS ? `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}` : EXPLORER_BASE;
  const TITLES: Record<Tab, string> = {
    overview: "Who may accept an offer",
    open: "Open an offer",
    inspect: "Inspect an offer",
    compare: "Two offers, one wallet",
  };
  const myRole = current && me ? roleOf(current, me) : null;

  return (
    <div className="layout">
      <aside className="side">
        <div className="brand">
          <img src="/logo-192.png" alt="" width={42} height={42} />
          <div>
            <strong>AnyTaker</strong>
            <span>Intelligent Contract dApp</span>
          </div>
        </div>
        <p className="side-head">Workspace</p>
        <nav>
          {WORKSPACE.map(([t, icon, name]) => (
            <button key={t} className={tab === t ? "side-tab on" : "side-tab"} onClick={() => setTab(t)}>
              <i>{icon}</i>{name}
            </button>
          ))}
        </nav>
        <p className="side-head">Verification</p>
        <nav>
          <a className="side-tab" href={explorer} target="_blank" rel="noreferrer"><i>↗</i>Transaction truth</a>
          <button className="side-tab" onClick={() => { setTab("overview"); setTimeout(() => document.getElementById("reviewer-path")?.scrollIntoView({ behavior: "smooth" }), 50); }}><i>✓</i>Reviewer path</button>
        </nav>
        <div className="side-foot">
          <div className="netbox"><b /><div><strong>StudioNet</strong><span>Project deployment · 61999</span></div></div>
          <a href={explorer} target="_blank" rel="noreferrer">Open in Explorer ↗</a>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">GenLayer StudioNet</p>
            <h2>{TITLES[tab]}</h2>
          </div>
          <div className="top-actions">
            <a className="btn-outline" href={explorer} target="_blank" rel="noreferrer">Explorer ↗</a>
            {me ? <span className="btn-outline wallet"><b />{short(me)}</span> : <button className="btn-outline wallet" onClick={connect}><b />Connect wallet</button>}
          </div>
        </header>

        <main className="main">
          {tab === "overview" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <p className="eyebrow">Builder project · Intelligent contracts</p>
                  <h1>Addressed to one.<br /><em>Open to a stranger?</em></h1>
                  <p className="lead">
                    AnyTaker asks validators one narrow semantic question: can a text addressed to one person be taken up by a
                    stranger? The answer decides whether an address this contract has never seen may accept — and the first
                    acceptance closes the offer for everyone.
                  </p>
                  <div className="row">
                    <button className="btn-accent" onClick={() => setTab("open")}>Open an offer</button>
                    <button className="btn-outline" onClick={() => setTab("inspect")}>Inspect offer</button>
                  </div>
                </div>
                <div className="diagram">
                  <div className="diagram-top"><span className="pill-ok">✓ Accepted state</span><span className="eyebrow">Who may accept</span></div>
                  <div className="nodes">
                    <div className="node"><b>A</b><span>author</span></div>
                    <div className="edge"><span>opens</span></div>
                    <div className="node core"><b>✉</b><span>OFFER</span></div>
                    <div className="fork">
                      <div className="branch"><div className="edge"><span>addressee</span></div><div className="node solid-node"><b>B</b><span>named</span></div></div>
                      <div className="branch"><div className="edge dashed"><span>stranger</span></div><div className="node ghost-node"><b>?</b><span>never seen</span></div></div>
                    </div>
                  </div>
                  <div className="diagram-foot">
                    <span>Semantic verdict</span>
                    <strong>UNRESTRICTED → ANYONE &nbsp;/&nbsp; RESTRICTED → ADDRESSEE</strong>
                  </div>
                </div>
              </section>

              <section className="stats">
                <div className="stat wide"><p className="eyebrow">Live contract</p><strong>{CONTRACT_ADDRESS ? short(CONTRACT_ADDRESS, 8, 6) : "—"}</strong><span>Bound to the Project StudioNet deployment.</span></div>
                <div className="stat"><p className="eyebrow">Current offer</p><strong>{current ? current.state : "—"}</strong><span>{current ? short(current.offer_id, 8, 6) : "Inspect an offer"}</span></div>
                <div className="stat"><p className="eyebrow">Reach</p><strong>{current ? current.reach : "—"}</strong><span>{current ? current.outcome : "Read from the contract"}</span></div>
                <div className="stat"><p className="eyebrow">Wallet role</p><strong className="role-text">{myRole ?? "—"}</strong><span>{me ? short(me) : "Connect wallet"}</span></div>
              </section>

              <section className="path" id="reviewer-path">
                <p className="eyebrow">Reviewer path · three wallets of your own</p>
                <ol>
                  <li><b>1</b><div><strong>Open two offers</strong><span>With your first wallet, name your second wallet as addressee and open “Whoever finishes … first …” and “If you finish … first …”.</span></div></li>
                  <li><b>2</b><div><strong>Switch to a third wallet</strong><span>It is named nowhere. In Side by side, both cards say “not named in this offer”.</span></div></li>
                  <li><b>3</b><div><strong>Compare the Accept buttons</strong><span>Enabled on the open offer; disabled on the addressed one with “This was made to the addressee alone”.</span></div></li>
                  <li><b>4</b><div><strong>Accept the open offer</strong><span>Your third wallet becomes the taker — “accepted by someone not named in this offer”.</span></div></li>
                </ol>
              </section>
            </>
          )}

          {tab === "inspect" && (
            <>
              <section className="panel finder">
                <label>Offer ID
                  <div className="row">
                    <input value={idInput} onChange={(e) => setIdInput(e.target.value)} placeholder="64-character offer id" spellCheck={false} />
                    <button className="btn-accent" onClick={() => loadById(idInput)}>Load</button>
                  </div>
                </label>
                <small className="muted">No wallet is required to inspect accepted state.</small>
                {recent.length > 0 && (
                  <div className="recent">
                    {recent.map((r) => <button key={r} className="link" onClick={() => loadById(r)}>{short(r, 8, 6)}</button>)}
                  </div>
                )}
              </section>
              {current ? (
                <OfferCard offer={current} me={me} busy={busy} onAccept={onAccept} onWithdraw={onWithdraw} />
              ) : (
                <div className="empty">
                  <p>No offer loaded. Paste an offer id, or open one.</p>
                  <button className="link" onClick={() => setTab("open")}>Open an offer →</button>
                </div>
              )}
            </>
          )}

          {tab === "open" && (
            <section className="panel">
              <p className="eyebrow">Author</p>
              <h3>Open an offer</h3>
              <p className="muted">
                Name the addressee and write the offer. The validators decide whether anyone except you may accept it or only
                the addressee. The contract holds and pays no money and does not check whether the taker can do the work.
              </p>
              <div className="grid2">
                <label>Addressee wallet<input value={addressee} onChange={(e) => setAddressee(e.target.value)} placeholder="0x…" spellCheck={false} /></label>
                <label>Addressee label<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="how the offer names them" />
                  <small>{pyLen(pyStrip(label))}/{MAX_LABEL_LENGTH}</small></label>
              </div>
              <label>Offer text<textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
                <small>{pyLen(pyStrip(text))}/{MAX_TEXT_LENGTH} · <Meter bytes={openBytes} /></small></label>
              {localId && <p className="t-id">Offer id if opened: <code>{localId}</code></p>}
              <div className="row">
                <button className="btn-accent" disabled={busy || openReason !== null || openBytes > CALLDATA_LIMIT} onClick={onOpen}>Open offer</button>
                {openReason && <span className="why">{openReason}</span>}
                {!openReason && openBytes > CALLDATA_LIMIT && <span className="why">Calldata over {CALLDATA_LIMIT} bytes; shorten the text.</span>}
              </div>
              <p className="muted small">The text and label may not contain the tokens UNRESTRICTED or RESTRICTED; they are the answer tokens.</p>
            </section>
          )}

          {tab === "compare" && (
            <section className="panel">
              <p className="eyebrow">Same connected wallet</p>
              <h3>Side by side</h3>
              <p className="muted">Two offers for the same job. One Accept enabled, one disabled — for the same wallet.</p>
              <div className="grid2">
                <input value={leftId} onChange={(e) => setLeftId(e.target.value)} placeholder="first offer id" spellCheck={false} />
                <input value={rightId} onChange={(e) => setRightId(e.target.value)} placeholder="second offer id" spellCheck={false} />
              </div>
              <div className="row"><button className="btn-accent" onClick={loadPair}>Compare</button></div>
              <div className="pair">
                {pair.map((p, i) => (
                  <div key={i}>
                    {p ? <OfferCard offer={p} me={me} busy={busy} onAccept={onAccept} onWithdraw={onWithdraw} /> : <p className="empty">No offer loaded.</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {tx.phase !== "idle" && (
            <section className={`status status-${tx.phase}`}>
              <strong>{tx.phase === "delayed" ? "Submitted — confirmation delayed" : tx.phase}</strong>
              <span>{tx.message}</span>
              {tx.hash && <a href={`${EXPLORER_BASE}/tx/${tx.hash}`} target="_blank" rel="noreferrer"><code>{tx.hash}</code></a>}
              {tx.phase === "delayed" && <button onClick={checkAgain}>Check again</button>}
            </section>
          )}

          <footer className="foot">GenLayer StudioNet · the contract holds and pays no money and does not check who can do the work.</footer>
        </main>
      </div>
    </div>
  );
}
