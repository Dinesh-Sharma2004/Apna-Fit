import React, { useState, useEffect } from "react";
import { X, ShieldAlert, CheckCircle, RefreshCw, Smartphone, QrCode, Clipboard, Clock } from "lucide-react";
import { CartItem } from "../types";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  discountPercent: number;
  couponCode: string;
  onOrderSuccess: (orderId: string) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  discountPercent,
  couponCode,
  onOrderSuccess
}: CheckoutModalProps) {
  // Shipping form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Payment UI flow state
  const [step, setStep] = useState<"BILLING" | "PAYMENT" | "VERIFYING" | "SUCCESS" | "FAILED">("BILLING");
  const [paymentOption, setPaymentOption] = useState<"QR" | "INTENT">("QR");
  const [selectedIntentApp, setSelectedIntentApp] = useState<string>("GPay");

  const [txnDetails, setTxnDetails] = useState<{
    transactionId: string;
    upiUrl: string;
    qrCodeMockUrl: string;
    upiId: string;
    amount: number;
    expiresInSeconds: number;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorRecoveryMsg, setErrorRecoveryMsg] = useState("");

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const finalAmount = subtotal - discountAmount;

  // Countdown timer for scanner expiration
  useEffect(() => {
    if (step !== "PAYMENT" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Generate UPI QR code from server
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !addressLine1 || !city || !postalCode) {
      alert("Please enter all required shipping details.");
      return;
    }

    try {
      const res = await fetch("/api/payment/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalAmount, phone, name: fullName })
      });
      if (res.ok) {
        const data = await res.json();
        setTxnDetails(data);
        setStep("PAYMENT");
        setTimeLeft(300); // Start countdown
      } else {
        alert("Failed to generate dynamic payment code");
      }
    } catch {
      alert("Network failure configuring payment system. Please try again.");
    }
  };

  const handleCopyUPI = () => {
    if (txnDetails?.upiId) {
      navigator.clipboard?.writeText(txnDetails.upiId);
      alert("UPI ID copied to clipboard!");
    }
  };

  const handleOpenUpiIntent = () => {
    if (!txnDetails?.upiUrl) return;
    window.location.href = txnDetails.upiUrl;
  };

  // Simulate payment verification status via API
  const handleVerifyPayment = async () => {
    if (isVerifying || !txnDetails) return;
    if (timeLeft <= 0) {
      setErrorRecoveryMsg("This UPI payment session expired. Please return to checkout and generate a new QR code.");
      setStep("FAILED");
      return;
    }

    setIsVerifying(true);
    setStep("VERIFYING");

    // Realistic banking network response verification delay
    setTimeout(async () => {
      try {
        const orderPayload = {
          shippingAddress: {
            fullName,
            email,
            phone,
            addressLine1,
            city,
            state: state || "Delhi",
            postalCode
          },
          items: cartItems.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            size: item.selectedSize
          })),
          totalAmount: finalAmount,
          paymentMethod: paymentOption === "QR" ? "UPI_QR" : "UPI_INTENT",
          transactionId: txnDetails?.transactionId || `TXN-${Date.now()}`,
          upiId: txnDetails?.upiId,
          couponCode
        };

        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload)
        });

        const data = await response.json();
        setIsVerifying(false);

        if (response.ok) {
          setStep("SUCCESS");
          onOrderSuccess(data.order.id);
        } else {
          // Failure State and Error recovery logs
          setErrorRecoveryMsg(data.error || "Simulated Bank network handshake timeout.");
          setStep("FAILED");
        }
      } catch (err) {
        setIsVerifying(false);
        setErrorRecoveryMsg("Remote gateway did not approve the transaction payload.");
        setStep("FAILED");
      }
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 md:p-10 font-body-md">
      {/* Absolute Backdrop blur */}
      <div className="fixed inset-0 bg-background/90 backdrop-blur" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-surface-container border border-outline-variant/30 text-on-surface rounded shadow-2xl overflow-hidden z-10 grid grid-cols-1 md:grid-cols-12">
        
        {/* Left pane: Checkout details or action layouts */}
        <div className="md:col-span-7 p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-outline-variant/10">
            <h2 className="font-headline-lg-mobile text-lg text-secondary tracking-widest uppercase font-medium">
              Secure Checkout
            </h2>
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-white/5 rounded-full transition-colors text-outline hover:text-on-surface"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {step === "BILLING" && (
            <form onSubmit={handleProceedToPayment} className="space-y-4">
              <h3 className="text-sm font-label-caps tracking-wider text-outline uppercase font-semibold">
                Shipping & Contact details
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline tracking-wider uppercase">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-background border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                    placeholder="e.g. Aarav Sharma"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline tracking-wider uppercase">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                    placeholder="e.g. aarav@gmail.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline tracking-wider uppercase">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-background border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline tracking-wider uppercase">ZIP / Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full bg-background border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                    placeholder="e.g. 110001"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-label-caps text-outline tracking-wider uppercase">Shipping Address *</label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full bg-background border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                  placeholder="e.g. Flat 104, Block B, Gold Luxury Apartments"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline tracking-wider uppercase">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-background border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                    placeholder="New Delhi"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline tracking-wider uppercase">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-background border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                    placeholder="Delhi"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-4 bg-secondary text-on-secondary font-label-caps uppercase tracking-widest text-[10px] font-bold active:scale-95 duration-200 hover:bg-secondary/95 transition-all rounded tracking-[0.2em] shimmer-trigger"
              >
                Proceed to Payment (₹{finalAmount.toLocaleString("en-IN")})
                <div className="shimmer-layer" />
              </button>
            </form>
          )}

          {step === "PAYMENT" && txnDetails && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-label-caps tracking-wider text-outline uppercase font-semibold">
                  Complete payments via UPI
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-secondary font-mono border border-secondary/20 px-2 py-1 rounded bg-secondary/5">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>Expires: {formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Toggle QR vs Intent */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentOption("QR")}
                  className={`py-3 rounded border flex flex-col items-center gap-2 transition-all ${
                    paymentOption === "QR"
                      ? "border-secondary bg-secondary/5 text-secondary"
                      : "border-outline-variant/30 hover:border-outline text-outline"
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-[10px] font-label-caps tracking-widest uppercase">UPI QR Code</span>
                </button>
                <button
                  onClick={() => setPaymentOption("INTENT")}
                  className={`py-3 rounded border flex flex-col items-center gap-2 transition-all ${
                    paymentOption === "INTENT"
                      ? "border-secondary bg-secondary/5 text-secondary"
                      : "border-outline-variant/30 hover:border-outline text-outline"
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-[10px] font-label-caps tracking-widest uppercase">UPI Instant Apps</span>
                </button>
              </div>

              {paymentOption === "QR" ? (
                <div className="flex flex-col items-center space-y-4 p-4 rounded bg-background/50 border border-outline-variant/10 text-center">
                  <div className="bg-white p-3 rounded shadow-md border-2 border-secondary overflow-hidden">
                    <img
                      src={txnDetails.qrCodeMockUrl}
                      alt="UPI PAYMENT SCANNER"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Scan QR to pay ₹{finalAmount.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-outline mt-1 uppercase max-w-xs mx-auto">
                      Authorized by BHIM UPI protocol. Works with GPay, PhonePe, Paytm, or BHIM.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 border border-outline-variant/20 rounded px-3 py-1.5 bg-background">
                    <span className="text-[10px] font-mono text-outline">VPA: {txnDetails.upiId}</span>
                    <button onClick={handleCopyUPI} className="text-secondary hover:text-secondary-fixed transition-colors">
                      <Clipboard className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-4 rounded bg-background/50 border border-outline-variant/10">
                  <p className="text-xs text-outline text-center uppercase tracking-widest">
                    Choose preferred mobile payment application
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                      <button
                        key={app}
                        onClick={() => setSelectedIntentApp(app)}
                        className={`p-3 rounded border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                          selectedIntentApp === app
                            ? "bg-secondary/10 border-secondary text-secondary"
                            : "bg-background border-outline-variant/20 hover:border-outline text-outline-variant hover:text-on-surface"
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>{app}</span>
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-center text-outline uppercase max-w-sm mx-auto leading-relaxed pt-2">
                    Open the UPI intent first, complete payment in {selectedIntentApp}, then return here to verify the order ledger.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenUpiIntent}
                    className="w-full py-3 border border-secondary/50 text-secondary hover:bg-secondary hover:text-on-secondary text-[10px] font-label-caps uppercase tracking-widest rounded transition-all"
                  >
                    Open UPI payment app
                  </button>
                </div>
              )}

              <button
                onClick={handleVerifyPayment}
                disabled={isVerifying || timeLeft <= 0}
                className="w-full py-4 mt-2 bg-secondary text-on-secondary font-label-caps uppercase tracking-widest text-[10px] font-bold active:scale-95 duration-200 hover:bg-secondary/95 transition-all rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {timeLeft <= 0 ? "Payment session expired" : "Verify payment status"}
              </button>
            </div>
          )}

          {step === "VERIFYING" && (
            <div className="text-center py-16 space-y-6">
              <RefreshCw className="w-12 h-12 text-secondary animate-spin mx-auto" />
              <div className="space-y-2">
                <h3 className="text-base text-on-surface font-semibold uppercase tracking-wider">
                  Contacting Interlock Banking Gateways
                </h3>
                <p className="text-sm text-outline max-w-xs mx-auto">
                  Resolving ledger transaction {txnDetails?.transactionId || "handshake"} and verifying signature logs.
                </p>
              </div>
            </div>
          )}

          {step === "FAILED" && (
            <div className="text-center py-12 space-y-6">
              <ShieldAlert className="w-16 h-16 text-error mx-auto" />
              <div className="space-y-2">
                <h3 className="text-base text-error font-semibold uppercase tracking-wider">
                  Payment Verification Unsuccessful
                </h3>
                <p className="text-sm text-outline max-w-xs mx-auto">
                  {errorRecoveryMsg || "Simulated transaction lookup declined."}
                </p>
              </div>
              
              <div className="p-4 bg-background border border-outline-variant/20 rounded text-left space-y-3">
                <h4 className="text-xs font-label-caps text-secondary font-bold uppercase">Handshake Recovery Options:</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  1. Double-check scanning the barcode or completing app drapes.<br />
                  2. If funds left your wallet, email <strong>support@apnafit.com</strong> quoting TXN ID: <strong>{txnDetails?.transactionId}</strong> to verify ledger databases manually.<br />
                  3. Dynamic failsafes could experience network bottlenecks. Simply re-trigger verification below.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep("PAYMENT")}
                  className="flex-1 py-3 border border-outline-variant hover:border-outline text-outline hover:text-on-surface text-xs font-label-caps uppercase rounded"
                >
                  Return to QR
                </button>
                <button
                  onClick={handleVerifyPayment}
                  disabled={isVerifying}
                  className="flex-1 py-3 bg-secondary text-on-secondary text-xs font-label-caps uppercase rounded disabled:opacity-50"
                >
                  Retry handshake
                </button>
              </div>
            </div>
          )}

          {step === "SUCCESS" && (
            <div className="text-center py-16 space-y-6">
              <CheckCircle className="w-16 h-16 text-secondary mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg text-secondary font-semibold uppercase tracking-wider">
                  Transaction Authorized
                </h3>
                <p className="text-sm text-outline max-w-xs mx-auto">
                  Your purchase signature has been recorded securely in the APNAFIT Order Ledger.
                </p>
              </div>
              
              <div className="p-5 bg-background border border-secondary/15 rounded text-left space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between text-xs text-outline font-mono">
                  <span>Txn Ident:</span>
                  <span>{txnDetails?.transactionId}</span>
                </div>
                <div className="flex justify-between text-xs text-outline font-mono">
                  <span>Customer:</span>
                  <span className="text-on-surface font-semibold">{fullName}</span>
                </div>
                <div className="flex justify-between text-xs text-outline font-mono">
                  <span>Receipt Total:</span>
                  <span className="text-secondary font-semibold">₹{finalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-8 py-3 bg-secondary text-on-secondary text-xs font-label-caps uppercase rounded hover:bg-secondary/90 transition-colors"
              >
                Explore More Series 01
              </button>
            </div>
          )}

        </div>

        {/* Right pane: Checkout Summary */}
        <div className="md:col-span-5 bg-surface-container-low p-6 sm:p-8 border-t md:border-t-0 md:border-l border-outline-variant/30 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-label-caps tracking-widest text-secondary uppercase font-semibold">
              Order Details
            </h3>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex gap-3 justify-between items-center text-xs">
                  <div className="flex gap-2 items-center">
                    <div className="w-10 h-12 bg-background/50 rounded flex-shrink-0 overflow-hidden">
                      <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-on-surface font-medium">{item.product.name}</p>
                      <p className="text-[10px] text-outline">Size: {item.selectedSize} | Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-mono text-outline">
                    ₹{(item.product.price * item.quantity).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-[1px] bg-outline-variant/20 my-4" />

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-outline">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-secondary">
                  <span>Promo discount ({discountPercent}%)</span>
                  <span>- ₹{discountAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-outline">
                <span>Direct Delivery</span>
                <span>FREE</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-outline-variant/20 mt-6">
            <div className="flex justify-between items-end">
              <span className="text-xs uppercase tracking-widest font-label-caps text-outline">Amount Due</span>
              <span className="text-lg font-bold text-secondary">₹{finalAmount.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-[9px] text-outline text-right uppercase tracking-wider mt-1">all taxes included</p>
          </div>

        </div>

      </div>
    </div>
  );
}
