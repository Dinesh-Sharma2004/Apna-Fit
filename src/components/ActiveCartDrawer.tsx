import React, { useState } from "react";
import { X, ShoppingBag, Plus, Minus, Trash, Tag, ShieldCheck } from "lucide-react";
import { CartItem } from "../types";

interface ActiveCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, size: string, change: number) => void;
  onRemoveItem: (productId: string, size: string) => void;
  onProceedToCheckout: (discountPercent: number, couponCode: string) => void;
}

export default function ActiveCartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout
}: ActiveCartDrawerProps) {
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = Math.round(subtotal * (discount / 100));
  const finalTotal = subtotal - discountAmount;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupon.trim()) return;

    setCouponError("");
    setCouponSuccess("");

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon.trim() })
      });
      
      const data = await res.json();
      if (res.ok) {
        setDiscount(data.discountPercent);
        setCouponSuccess(`Coupon approved! Added ${data.discountPercent}% discount`);
      } else {
        setCouponError(data.error || "Failed to validate coupon");
        setDiscount(0);
      }
    } catch (err) {
      setCouponError("Could not reach servers to check coupon code");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-body-md">
      {/* Dimmed static backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
        onClick={onClose} 
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface-container border-l border-outline-variant/30 text-on-surface flex flex-col h-full shadow-2xl">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-outline-variant/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-secondary w-5 h-5" />
              <h2 className="font-headline-lg-mobile text-lg text-on-surface font-medium uppercase tracking-wider">
                Active Bag
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-outline hover:text-on-surface"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Contents list */}
          <div className="flex-1 overflow-y-auto py-5 px-6 no-scrollbar space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-4">
                <ShoppingBag className="w-16 h-16 text-outline/30 stroke-[1]" />
                <div>
                  <p className="text-on-surface font-medium">Your shopping bag is empty</p>
                  <p className="text-sm text-on-surface-variant">Choose premium streetwear from Series 01</p>
                </div>
              </div>
            ) : (
              cartItems.map((item, idx) => (
                <div 
                  key={`${item.product.id}-${item.selectedSize}-${idx}`}
                  className="flex gap-4 p-4 rounded bg-surface-container-low border border-outline-variant/10 relative group"
                >
                  <div className="w-20 h-24 bg-background/50 rounded flex-shrink-0 overflow-hidden">
                    <img 
                      src={item.product.image} 
                      alt={item.product.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-on-surface font-medium text-sm sm:text-base">
                          {item.product.name}
                        </h4>
                        <span className="text-secondary font-label-caps text-sm">
                          ₹{item.product.price.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-xs text-outline tracking-wider uppercase mt-1">
                        Size: <span className="text-on-surface font-semibold">{item.selectedSize}</span> | {item.product.gsm}GSM
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-outline-variant/20 rounded h-8 overflow-hidden bg-background/40">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, -1)}
                          className="px-2 h-full hover:bg-white/5 flex items-center justify-center text-outline hover:text-on-surface transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-sm text-on-surface font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, 1)}
                          className="px-2 h-full hover:bg-white/5 flex items-center justify-center text-outline hover:text-on-surface transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.product.id, item.selectedSize)}
                        className="text-error/70 hover:text-error p-1.5 hover:bg-error/5 rounded transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer controls & dynamic summary */}
          {cartItems.length > 0 && (
            <div className="px-6 py-6 border-t border-outline-variant/20 bg-surface-container-low/80 space-y-6">
              
              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input
                    type="text"
                    placeholder="ENTER COUPON (APNAFIT20)"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    className="w-full bg-background border border-outline-variant/30 rounded pl-9 pr-3 py-2 text-xs font-label-caps focus:outline-none focus:border-secondary uppercase text-left tracking-widest text-on-surface"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 border border-secondary hover:bg-secondary hover:text-on-secondary text-secondary text-xs uppercase font-label-caps transition-colors rounded"
                >
                  Apply
                </button>
              </form>
              
              {couponError && <p className="text-xs text-error">{couponError}</p>}
              {couponSuccess && <p className="text-xs text-secondary">{couponSuccess}</p>}

              {/* Price list */}
              <div className="space-y-2 text-sm text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Bag Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span>Discount Included ({discount}%)</span>
                    <span>- ₹{discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="h-[1px] bg-outline-variant/20 my-2" />
                <div className="flex justify-between text-on-surface font-semibold text-base sm:text-lg">
                  <span>Order Total</span>
                  <span className="text-secondary">₹{finalTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Secure terms indicator */}
              <div className="flex items-center gap-2 text-[10px] text-outline text-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                Dynamic UPI Secure Gateway encryption verified.
              </div>

              {/* Pay trigger */}
              <button
                onClick={() => onProceedToCheckout(discount, coupon)}
                className="w-full py-4 bg-secondary text-on-secondary font-label-caps uppercase tracking-widest text-center text-xs font-semibold hover:bg-secondary/95 active:scale-95 duration-200 transition-all rounded shimmer-trigger shadow-[0_0_20px_rgba(255,255,255,0.08)] hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]"
              >
                Proceed to Secure Checkout
                <div className="shimmer-layer" />
              </button>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
