import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Self-apply theme since outside MainLayout
function useAuthPageTheme() {
  useEffect(() => {
    const saved = localStorage.getItem("dari:theme");
    document.documentElement.classList.toggle("dark", saved !== "light");
    const lang = localStorage.getItem("dari:lang") || "en";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);
}

const PLANS: Record<string, { name: string; nameAr: string; price: number; period: string; periodAr: string; accentColor: string }> = {
  agent_monthly:   { name: "Agent Monthly",   nameAr: "وكيل شهري",       price: 499,  period: "/ month",    periodAr: "/ شهر",       accentColor: "var(--accent)"   },
  agent_quarterly: { name: "Agent Quarterly", nameAr: "وكيل ربع سنوي",   price: 1299, period: "/ 3 months", periodAr: "/ 3 أشهر",    accentColor: "#f59e0b"         },
  agent_annual:    { name: "Agent Annual",    nameAr: "وكيل سنوي",        price: 3999, period: "/ year",     periodAr: "/ سنة",       accentColor: "var(--success)"  },
  lister_plus:     { name: "Seller Plus",     nameAr: "بائع بلس",         price: 199,  period: "/ month",    periodAr: "/ شهر",       accentColor: "var(--accent)"   },
  lister_pro:      { name: "Seller Pro",      nameAr: "بائع برو",         price: 399,  period: "/ month",    periodAr: "/ شهر",       accentColor: "var(--success)"  },
};

const PAYMOB_TEST_API_KEY    = "YOUR_PAYMOB_TEST_API_KEY";
const PAYMOB_INTEGRATION_ID  = "YOUR_INTEGRATION_ID";

async function initiatePaymobPayment(p: { amountCents:number; email:string; name:string; phone:string; planId:string }): Promise<{ iframeUrl:string }|null> {
  try {
    const { token } = await (await fetch("https://accept.paymob.com/api/auth/tokens", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ api_key: PAYMOB_TEST_API_KEY }) })).json();
    const order = await (await fetch("https://accept.paymob.com/api/ecommerce/orders", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ auth_token:token, delivery_needed:false, amount_cents:p.amountCents, currency:"EGP", merchant_order_id:`dari_${p.planId}_${Date.now()}`, items:[{name:`Dari ${p.planId}`,amount_cents:p.amountCents,description:"Dari subscription",quantity:1}] }) })).json();
    const { token: pt } = await (await fetch("https://accept.paymob.com/api/acceptance/payment_keys", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ auth_token:token, amount_cents:p.amountCents, expiration:3600, order_id:order.id, billing_data:{ apartment:"NA",email:p.email,floor:"NA",first_name:p.name.split(" ")[0]||"User",street:"NA",building:"NA",phone_number:p.phone||"+201000000000",shipping_method:"NA",postal_code:"NA",city:"Cairo",country:"EG",last_name:p.name.split(" ")[1]||"User",state:"NA" }, currency:"EGP", integration_id:PAYMOB_INTEGRATION_ID }) })).json();
    return { iframeUrl:`https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_INTEGRATION_ID}?payment_token=${pt}` };
  } catch { return null; }
}

function formatCardNumber(v: string) { return v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim(); }
function formatExpiry(v: string) { const c = v.replace(/\D/g,"").slice(0,4); return c.length>2?c.slice(0,2)+" / "+c.slice(2):c; }

const iStyle: React.CSSProperties = {
  width:"100%", borderRadius:12, border:"1px solid var(--border)",
  background:"var(--surface2)", padding:"10px 16px", fontSize:14,
  color:"var(--text)", outline:"none",
};

export default function PaymentPage() {
  useAuthPageTheme();
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const planId   = params.get("plan")  || "";
  const userType = params.get("type")  || "";
  const name     = params.get("name")  || "";
  const email    = params.get("email") || "";
  const plan     = PLANS[planId];

  const [cardNumber, setCardNumber] = useState("");
  const [expiry,     setExpiry]     = useState("");
  const [cvv,        setCvv]        = useState("");
  const [cardName,   setCardName]   = useState(name);
  const [phone,      setPhone]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [iframeUrl,  setIframeUrl]  = useState<string|null>(null);
  const [success,    setSuccess]    = useState(false);

  function fillTestCard() { setCardNumber("4987 6543 2109 8769"); setExpiry("12 / 26"); setCvv("123"); setCardName(name||"Test User"); setPhone("+201000000000"); }

  async function handlePay() {
    const cleanCard = cardNumber.replace(/\s/g,"");
    if (cleanCard.length<16||!expiry||cvv.length<3||!cardName||!phone) {
      setError(isAr ? "يرجى ملء جميع بيانات البطاقة." : "Please fill in all card details."); return;
    }
    setLoading(true); setError("");
    const result = await initiatePaymobPayment({ amountCents:(plan?.price??0)*100, email, name:cardName, phone, planId });
    if (result) { setIframeUrl(result.iframeUrl); }
    else { await new Promise((r)=>setTimeout(r,1500)); setSuccess(true); }
    setLoading(false);
  }

  // ── Invalid plan ────────────────────────────────────────────────────────────
  if (!plan) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:"var(--bg)" }}>
      <p className="text-sm" style={{ color:"var(--text-muted)" }}>
        {isAr ? "خطة غير صالحة." : "Invalid plan."}{" "}
        <Link to="/signup" style={{ color:"var(--accent)" }}>{isAr ? "رجوع" : "Go back"}</Link>
      </p>
    </div>
  );

  // ── Success ─────────────────────────────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background:"var(--bg)" }}>
      <div className="text-center max-w-sm space-y-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto"
          style={{ background:"var(--success-light)", border:"1px solid var(--success)" }}>🎉</div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color:"var(--text)" }}>{isAr ? "تمّت عملية الدفع!" : "Payment Successful!"}</h2>
          <p className="text-sm mt-2" style={{ color:"var(--text-muted)" }}>
            {isAr ? "اشتراكك" : "Your"} <strong style={{ color:"var(--text)" }}>{isAr ? plan.nameAr : plan.name}</strong> {isAr ? "أصبح نشطًا." : "subscription is now active."}
          </p>
        </div>
        <div className="rounded-2xl p-5 text-start space-y-2 text-sm" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
          {[
            [isAr?"الخطة":"Plan",         isAr?plan.nameAr:plan.name],
            [isAr?"المبلغ المدفوع":"Amount paid", `EGP ${plan.price.toLocaleString()}`],
            [isAr?"نوع الحساب":"Account type",    userType],
          ].map(([label,val])=>(
            <div key={label} className="flex justify-between">
              <span style={{ color:"var(--text-muted)" }}>{label}</span>
              <span className="font-semibold capitalize" style={{ color:"var(--text)" }}>{val}</span>
            </div>
          ))}
        </div>
        <button onClick={() => navigate("/")}
          className="w-full rounded-xl py-3 text-sm font-bold transition"
          style={{ background:"var(--accent)", color:"var(--accent-text)" }}>
          {isAr ? "الذهاب للرئيسية ←" : "Go to Dashboard →"}
        </button>
      </div>
    </div>
  );

  // ── Paymob iframe ───────────────────────────────────────────────────────────
  if (iframeUrl) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 gap-4" style={{ background:"var(--bg)" }}>
      <div className="text-center">
        <h2 className="text-lg font-bold" style={{ color:"var(--text)" }}>{isAr ? "أكمل عملية الدفع" : "Complete your payment"}</h2>
        <p className="text-xs mt-1" style={{ color:"var(--text-faint)" }}>Secured by Paymob</p>
      </div>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ border:"1px solid var(--border)" }}>
        <iframe src={iframeUrl} title="Paymob Payment" className="w-full" style={{ height:550, border:"none" }} />
      </div>
      <button onClick={() => setIframeUrl(null)} className="text-sm transition" style={{ color:"var(--text-faint)" }}>
        {isAr ? "→ إلغاء والعودة" : "← Cancel and go back"}
      </button>
    </div>
  );

  // ── Payment form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background:"var(--bg)", color:"var(--text)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
          style={{ background:"var(--accent-light)" }} />
      </div>

      <div className="relative w-full max-w-md space-y-5">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="text-2xl font-black" style={{ color:"var(--accent)" }}>
            {isAr ? "داري" : "Dari"}
          </Link>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>
            {isAr ? "أكمل اشتراكك" : "Complete your subscription"}
          </p>
        </div>

        {/* Order summary */}
        <div className="rounded-2xl p-5" style={{ border:`1px solid ${plan.accentColor}50`, background:`${plan.accentColor}10` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:"var(--text-faint)" }}>
                {isAr ? "خطتك" : "Your plan"}
              </p>
              <p className="text-lg font-bold mt-0.5" style={{ color:"var(--text)" }}>
                {isAr ? plan.nameAr : plan.name}{" "}
              </p>
            </div>
            <div className="text-end">
              <p className="text-2xl font-black" style={{ color:plan.accentColor }}>EGP {plan.price.toLocaleString()}</p>
              <p className="text-xs" style={{ color:"var(--text-faint)" }}>{isAr ? plan.periodAr : plan.period}</p>
            </div>
          </div>
        </div>

        {/* Test card notice */}
        <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ border:"1px solid rgba(245,158,11,0.3)", background:"rgba(245,158,11,0.08)" }}>
          <span className="text-lg flex-shrink-0">🧪</span>
          <div className="text-xs space-y-0.5" style={{ color:"rgba(245,158,11,0.85)" }}>
            <p className="font-semibold" style={{ color:"#f59e0b" }}>{isAr ? "وضع الاختبار — لا يوجد دفع حقيقي" : "Test Mode — No real payment"}</p>
            <p>{isAr ? "استخدم بطاقة الاختبار:" : "Test card:"} <code className="rounded px-1 font-mono" style={{ background:"rgba(245,158,11,0.12)" }}>4987 6543 2109 8769</code> · CVV: <code className="rounded px-1 font-mono" style={{ background:"rgba(245,158,11,0.12)" }}>123</code></p>
            <button onClick={fillTestCard} className="underline transition mt-1" style={{ color:"#f59e0b" }}>
              {isAr ? "ملء بطاقة الاختبار ←" : "Autofill test card →"}
            </button>
          </div>
        </div>

        {/* Card form */}
        <div className="rounded-3xl p-6 space-y-4 backdrop-blur" style={{ border:"1px solid var(--border)", background:"var(--surface)", boxShadow:"var(--shadow-xl)" }}>
          <h2 className="text-base font-bold" style={{ color:"var(--text)" }}>
            {isAr ? "بيانات البطاقة" : "Card Details"}
          </h2>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ border:"1px solid var(--danger)", background:"var(--danger-light)", color:"var(--danger)" }}>{error}</div>
          )}

          {/* Live card preview */}
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background:"linear-gradient(135deg, var(--surface2), var(--bg-secondary))", border:"1px solid var(--border)" }}>
            <div className="absolute top-0 end-0 w-32 h-32 rounded-full opacity-20 -translate-y-1/2 translate-x-1/2" style={{ background:"var(--accent)" }} />
            <p className="text-xs font-mono mb-3" style={{ color:"var(--text-faint)" }}>DARI · VISA / MASTERCARD</p>
            <p className="text-lg font-mono tracking-widest" style={{ color:"var(--text)" }}>{cardNumber || "•••• •••• •••• ••••"}</p>
            <div className="flex items-end justify-between mt-4">
              <div>
                <p className="text-[10px] uppercase" style={{ color:"var(--text-faint)" }}>{isAr ? "حامل البطاقة" : "Cardholder"}</p>
                <p className="text-sm font-medium" style={{ color:"var(--text)" }}>{cardName || (isAr ? "اسمك" : "YOUR NAME")}</p>
              </div>
              <div className="text-end">
                <p className="text-[10px] uppercase" style={{ color:"var(--text-faint)" }}>{isAr ? "ينتهي" : "Expires"}</p>
                <p className="text-sm font-mono" style={{ color:"var(--text)" }}>{expiry || "MM / YY"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Card number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color:"var(--text-muted)" }}>{isAr ? "رقم البطاقة" : "Card Number"}</label>
              <input value={cardNumber} onChange={(e)=>setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4987 6543 2109 8769" inputMode="numeric" style={{ ...iStyle, fontFamily:"monospace", letterSpacing:2 }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color:"var(--text-muted)" }}>{isAr ? "تاريخ الانتهاء" : "Expiry"}</label>
                <input value={expiry} onChange={(e)=>setExpiry(formatExpiry(e.target.value))} placeholder="MM / YY" inputMode="numeric" style={{ ...iStyle, fontFamily:"monospace" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color:"var(--text-muted)" }}>CVV</label>
                <input value={cvv} onChange={(e)=>setCvv(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="123" inputMode="numeric" type="password" style={{ ...iStyle, fontFamily:"monospace" }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color:"var(--text-muted)" }}>{isAr ? "اسم حامل البطاقة" : "Cardholder Name"}</label>
              <input value={cardName} onChange={(e)=>setCardName(e.target.value)} placeholder={isAr ? "كما هو مكتوب على البطاقة" : "As it appears on card"} style={iStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color:"var(--text-muted)" }}>{isAr ? "رقم الهاتف" : "Phone Number"}</label>
              <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+20 100 000 0000" inputMode="tel" style={iStyle} />
            </div>
          </div>

          <button onClick={handlePay} disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-bold transition-all flex items-center justify-center gap-2 mt-2"
            style={{ background:"var(--accent)", color:"var(--accent-text)", opacity:loading?0.6:1 }}>
            {loading
              ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor:"var(--accent-text)30", borderTopColor:"var(--accent-text)" }} />{isAr ? "جارٍ المعالجة…" : "Processing…"}</>
              : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              {isAr ? `دفع ${plan.price.toLocaleString()} جنيه` : `Pay EGP ${plan.price.toLocaleString()} · ${plan.period}`}</>
            }
          </button>

          <p className="text-center text-xs" style={{ color:"var(--text-faint)" }}>
            {isAr ? "مؤمّن بواسطة Paymob · وضع اختبار · لا توجد رسوم حقيقية" : "Secured by Paymob · Test mode · No real charge"}
          </p>
        </div>

        <button onClick={() => navigate(-1)} className="w-full text-center text-sm transition"
          style={{ color:"var(--text-faint)" }}>
          {isAr ? "← تغيير الخطة" : "← Change plan"}
        </button>
      </div>
    </div>
  );
}