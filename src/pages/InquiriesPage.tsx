import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { inquiryApi, extractErrorMessage, type Inquiry } from "../lib/api";

// ── helpers ──────────────────────────────────────────────────────────────────
type InqStatus = "all" | "pending" | "closed";

// InquiryStatus enum: 0=Pending, 1=Responded, 2=Closed
const isClosed = (s: number) => s === 2;
const statusLabel = (s: number) => s === 0 ? "pending" : s === 1 ? "responded" : "closed";

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000), h = Math.floor(m / 60), dy = Math.floor(h / 24);
  return dy > 0 ? `${dy}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : "just now";
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

// ── MessageThread ─────────────────────────────────────────────────────────────
function MessageThread({
  inq,
  myId,
  onClose,
  onMessageSent,
}: {
  inq: Inquiry;
  myId: string;
  onClose: (id: string) => void;
  onMessageSent: (inquiryId: string, newInq: Inquiry) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!isClosed(inq.status));
  const [reply, setReply]       = useState("");
  const [sending, setSending]   = useState(false);
  const [closing, setClosing]   = useState(false);
  const [err, setErr]           = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const closed     = isClosed(inq.status);
  const otherName  = myId === inq.customerId ? inq.listerName : inq.customerName;
  const lastMsg    = inq.messages[inq.messages.length - 1];

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true); setErr("");
    try {
      await inquiryApi.sendMessage(inq.id, reply.trim());
      // Reload this inquiry to get fresh messages
      const fresh = await inquiryApi.getById(inq.id);
      onMessageSent(inq.id, fresh.data);
      setReply("");
    } catch (e) {
      setErr(extractErrorMessage(e, "Failed to send message."));
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    if (!confirm("Close this inquiry? No more messages can be sent after closing.")) return;
    setClosing(true); setErr("");
    try {
      await inquiryApi.close(inq.id);
      onClose(inq.id);
    } catch (e) {
      setErr(extractErrorMessage(e, "Failed to close inquiry."));
      setClosing(false);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        border: `1px solid ${!closed ? "rgba(245,158,11,0.25)" : "var(--border)"}`,
        background: !closed ? "var(--surface)" : "var(--bg-secondary, var(--surface))",
      }}>
      {/* Header row */}
      <button onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-4 p-4 text-left transition"
        style={{ background: "transparent" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hover))" }}>
          {initials(otherName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{otherName}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
              style={!closed
                ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }
                : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              {statusLabel(inq.status)}
            </span>
            <span className="text-xs ms-auto" style={{ color: "var(--text-faint)" }}>{timeAgo(inq.createdAt)}</span>
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--accent)" }}>
            {t("inquiries.re")} {inq.listingTitle}
          </p>
          {lastMsg && (
            <p className="text-xs mt-1 truncate" style={{ color: "var(--text-muted)" }}>{lastMsg.text}</p>
          )}
        </div>
        <svg className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-faint)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-4" style={{ borderTop: "1px solid var(--border)" }}>
          {/* Listing summary */}
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ border: "1px solid var(--border)", background: "var(--surface2)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{inq.listingTitle}</p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                {inq.listingCity} · EGP {inq.listingPrice.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {inq.messages.map((msg) => {
              const mine = msg.senderId === myId;
              return (
                <div key={msg.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={mine
                      ? { background: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--text)" }
                      : { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-secondary, var(--text))" }}>
                    <p>{msg.text}</p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>{timeAgo(msg.sentAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {err && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>{err}</p>
          )}

          {/* Reply + close */}
          {!closed && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input ref={inputRef} type="text" value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !sending && handleSend()}
                  placeholder={t("inquiries.reply")}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)" }} />
                <button onClick={handleSend} disabled={!reply.trim() || sending}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold transition flex-shrink-0 flex items-center gap-1.5"
                  style={{
                    background: reply.trim() ? "var(--accent)" : "var(--surface2)",
                    color: reply.trim() ? "var(--accent-text)" : "var(--text-faint)",
                    opacity: sending ? 0.6 : 1,
                  }}>
                  {sending
                    ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : t("inquiries.send")}
                </button>
              </div>
              <button onClick={handleClose} disabled={closing}
                className="text-xs transition"
                style={{ color: "var(--text-faint)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}>
                {closing ? "Closing…" : "Close inquiry"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── InquiriesPage ─────────────────────────────────────────────────────────────
export default function InquiriesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isLister = user?.user_type === "lister" || user?.user_type === "agent";

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [tab, setTab]             = useState<InqStatus>("pending");

  useEffect(() => {
    setLoading(true); setError("");
    const fetch = isLister ? inquiryApi.getReceived : inquiryApi.getMy;
    fetch()
      .then((r) => setInquiries(r.data))
      .catch((e) => setError(extractErrorMessage(e, "Failed to load inquiries.")))
      .finally(() => setLoading(false));
  }, [isLister]);

  const filtered = inquiries.filter((i) =>
    tab === "all" ? true : tab === "closed" ? isClosed(i.status) : !isClosed(i.status)
  );
  const counts = {
    all: inquiries.length,
    pending: inquiries.filter((i) => !isClosed(i.status)).length,
    closed:  inquiries.filter((i) => isClosed(i.status)).length,
  };

  function handleClose(id: string) {
    setInquiries((prev) =>
      prev.map((i) => i.id === id ? { ...i, status: 2 as const } : i)
    );
  }

  function handleMessageSent(inquiryId: string, updated: Inquiry) {
    setInquiries((prev) => prev.map((i) => i.id === inquiryId ? updated : i));
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {isLister ? "Received Inquiries" : t("inquiries.title")}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {counts.pending} {t("inquiries.pending")} · {counts.closed} {t("inquiries.closed")}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl p-1 mb-6 w-fit" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {(["pending", "all", "closed"] as InqStatus[]).map((t_) => (
            <button key={t_} onClick={() => setTab(t_)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 capitalize"
              style={{ background: tab === t_ ? "var(--surface2)" : "transparent", color: tab === t_ ? "var(--text)" : "var(--text-faint)" }}>
              {t_}
              {t_ === "pending" && counts.pending > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: "#f59e0b", color: "#1A1612" }}>
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="w-8 h-8 border-2 border-current/20 border-t-current rounded-full animate-spin"
              style={{ color: "var(--accent)" }} />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p style={{ color: "var(--danger)" }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>💬</div>
            <p className="font-semibold" style={{ color: "var(--text-secondary, var(--text))" }}>
              {t("inquiries.noInquiries")}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-faint)" }}>
              {isLister ? "When buyers contact you they will appear here." : t("inquiries.buyersWillAppear")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((inq) => (
              <MessageThread
                key={inq.id}
                inq={inq}
                myId={user?.id ?? ""}
                onClose={handleClose}
                onMessageSent={handleMessageSent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
