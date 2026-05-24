import React, { useState, useEffect, useRef, type FormEvent, type PointerEvent } from "react";
import { 
  ShoppingBag, 
  Menu, 
  X, 
  Heart, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  Eye, 
  Award, 
  CheckCircle,
  ShieldCheck,
  Star,
  ZoomIn,
  ZoomOut,
  Ruler
} from "lucide-react";
import Cursor from "./components/Cursor";
import ParticleCanvas from "./components/ParticleCanvas";
import TShirt3D from "./components/TShirt3D";
import ActiveCartDrawer from "./components/ActiveCartDrawer";
import CheckoutModal from "./components/CheckoutModal";
import InteractiveCharacter from "./components/InteractiveCharacter";
import AdminPanel from "./components/AdminPanel";
import { Product, CartItem } from "./types";

const SIZE_CHART: Record<string, { chestCm: number; lengthCm: number; shoulderCm: number; sleeveCm: number }> = {
  S: { chestCm: 96, lengthCm: 68, shoulderCm: 43, sleeveCm: 22 },
  M: { chestCm: 102, lengthCm: 70, shoulderCm: 45, sleeveCm: 23 },
  L: { chestCm: 108, lengthCm: 72, shoulderCm: 47, sleeveCm: 24 },
  XL: { chestCm: 116, lengthCm: 74, shoulderCm: 49, sleeveCm: 25 },
  XXL: { chestCm: 124, lengthCm: 76, shoulderCm: 51, sleeveCm: 26 }
};

const cmToIn = (cm: number) => (cm / 2.54).toFixed(1);

const ShatterText = ({ text, className }: { text: string; className?: string }) => {
  return (
    <div className={`shatter-text ${className || ''}`}>
      {text.split('').map((char, i) => {
        const dx = (Math.random() - 0.5) * 40;
        const dy = (Math.random() - 0.5) * 40;
        const rot = (Math.random() - 0.5) * 60;
        return (
          <span 
            key={i} 
            style={{ 
              "--dx": `${dx}px`, 
              "--dy": `${dy}px`, 
              "--rot": `${rot}deg` 
            } as React.CSSProperties}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </div>
  );
};

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [active3DProduct, setActive3DProduct] = useState<Product | null>(null);
  
  const [inspectingProduct, setInspectingProduct] = useState<Product | null>(null);
  const [inspectZoom, setInspectZoom] = useState(1);
  const [inspectImageIndex, setInspectImageIndex] = useState(0);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  // Layout Toggle Gates
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Newsletter Subscribe
  const [emailSubscribe, setEmailSubscribe] = useState("");
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");
  const [integrations, setIntegrations] = useState<{
    upi?: { configured: boolean; upiId: string; merchantName: string };
    gmail?: { configured: boolean; from: string | null; to: string | null };
  }>({});

  // Selected sizing guide choice per product (defaults to M)
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  // Pricing total discount mapping
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");

  // CMS copywriting dynamic elements
  const [cms, setCms] = useState({
    heroTitle: "Wear Your Identity",
    heroSubtitle: "Explore Series 01",
    philosophyText: "In an era of disposable fashion, APNAFIT stands for permanent relevance. We craft each garment from bespoke 400GSM cotton, treated with gold-ion finishes."
  });

  // Coordinated Unified Loader States
  const [characterProgress, setCharacterProgress] = useState(0);
  const [isCharacterLoaded, setIsCharacterLoaded] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [isFadeLoader, setIsFadeLoader] = useState(false);
  const [isLoaderRemoved, setIsLoaderRemoved] = useState(false);

  // ── Scroll tracking ──
  const [scrollY, setScrollY]                     = useState(0);
  const [vh, setVh]                               = useState(typeof window !== "undefined" ? window.innerHeight : 900);
  const [horizontalOffset, setHorizontalOffset]   = useState(0);
  const [isFrozen, setIsFrozen]                   = useState(false);
  const archiveSectionRef                          = useRef<HTMLElement | null>(null);

  // ── Horizontal lerp — animate the CSS transform smoothly ──
  const horizTarget   = useRef(0);   // target px
  const horizCurrent  = useRef(0);   // current px (what the DOM sees)
  const horizRAF      = useRef<number>(0);

  // ── Freeze refs (synchronous gate, no async setState delay) ──
  const frozenRef         = useRef(false);
  const frozenScrollYRef  = useRef(0);   // the Y we locked at
  const frozenMaxRef      = useRef(0);   // maxScroll when we locked
  const touchStartY       = useRef(0);
  const lastWheelDeltaRef = useRef(0);

  /** Compute maxScroll for the archive row given current product list */
  const computeMaxScroll = () => {
    const cardWidth        = window.innerWidth < 640 ? 322 : 362;
    const totalRowWidth    = products.length * cardWidth - 32;
    const horizontalPad    = window.innerWidth < 768 ? 48 : 160;
    return Math.max(0, totalRowWidth + horizontalPad - window.innerWidth);
  };

  // ── Lerp RAF for horizontal row ──
  useEffect(() => {
    const tick = () => {
      const delta = horizTarget.current - horizCurrent.current;
      if (Math.abs(delta) > 0.15) {
        horizCurrent.current += delta * 0.12; // lerp factor — premium inertia
        setHorizontalOffset(horizCurrent.current);
      } else if (Math.abs(delta) > 0) {
        horizCurrent.current = horizTarget.current;
        setHorizontalOffset(horizTarget.current);
      }
      horizRAF.current = requestAnimationFrame(tick);
    };
    horizRAF.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(horizRAF.current);
  }, []);

  // ── IntersectionObserver for reveal-on-scroll elements ──
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );
    const els = document.querySelectorAll(".reveal-on-scroll");
    els.forEach((el) => io.observe(el));
    return () => els.forEach((el) => io.unobserve(el));
  }, [products]);

  // ── Main scroll listener ──
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrollY(y);

      // Navbar reveal
      const navbar = document.getElementById("main-navbar");
      if (navbar) {
        const show = y >= window.innerHeight * 0.25;
        navbar.style.opacity        = show ? "1" : "0";
        navbar.style.transform      = show ? "translateY(0)" : "translateY(-100%)";
        navbar.style.pointerEvents  = show ? "auto" : "none";
      }

      // If the freeze-lock is active we forcefully restore scroll position
      if (frozenRef.current) {
        window.scrollTo({ top: frozenScrollYRef.current, behavior: "auto" });
        return;
      }
    };

    const onResize = () => { setVh(window.innerHeight); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [products]);

  // ── Archive section entry / exit detection via IntersectionObserver ──
  useEffect(() => {
    if (!archiveSectionRef.current) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const rect = archiveSectionRef.current!.getBoundingClientRect();

        if (entry.isIntersecting) {
          // Entered archive section
          const maxScroll         = computeMaxScroll();
          frozenMaxRef.current    = maxScroll;
          frozenScrollYRef.current = window.scrollY;
          frozenRef.current       = true;
          setIsFrozen(true);

          // Detect direction: top entering means downward; bottom entering means upward
          if (rect.top >= 0) {
            // Scrolling down into section — start from leftmost
            horizTarget.current  = 0;
          } else {
            // Scrolling up into section — start from rightmost
            horizTarget.current  = maxScroll;
          }
        } else {
          // Left the archive section entirely
          frozenRef.current = false;
          setIsFrozen(false);
          const maxScroll = frozenMaxRef.current;
          // Clamp display offset to proper boundary
          if (rect.top > 0) {
            horizTarget.current = 0;
          } else {
            horizTarget.current = maxScroll;
          }
        }
      },
      { threshold: 0, rootMargin: "0px 0px 0px 0px" }
    );

    io.observe(archiveSectionRef.current);
    return () => io.disconnect();
  }, [products]);

  // ── Wheel intercept while frozen ──
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!frozenRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const maxScroll = frozenMaxRef.current;
      const next = Math.max(0, Math.min(maxScroll, horizTarget.current + e.deltaY * 1.8));
      horizTarget.current = next;

      // Unfreeze when boundary reached
      if (next >= maxScroll) {
        frozenRef.current = false;
        setIsFrozen(false);
        // Nudge page past the section
        const el = archiveSectionRef.current;
        if (el) {
          const sectionBottom = window.scrollY + el.getBoundingClientRect().bottom;
          window.scrollTo({ top: sectionBottom, behavior: "smooth" });
        }
      } else if (next <= 0) {
        frozenRef.current = false;
        setIsFrozen(false);
        // Nudge page above the section
        const el = archiveSectionRef.current;
        if (el) {
          const sectionTop = window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.5;
          window.scrollTo({ top: Math.max(0, sectionTop), behavior: "smooth" });
        }
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, [products]);

  // ── Touch intercept while frozen ──
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!frozenRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const deltaY    = touchStartY.current - e.touches[0].clientY;
      touchStartY.current = e.touches[0].clientY;

      const maxScroll = frozenMaxRef.current;
      const next = Math.max(0, Math.min(maxScroll, horizTarget.current + deltaY * 2));
      horizTarget.current = next;

      if (next >= maxScroll) {
        frozenRef.current = false;
        setIsFrozen(false);
        const el = archiveSectionRef.current;
        if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().bottom, behavior: "smooth" });
      } else if (next <= 0) {
        frozenRef.current = false;
        setIsFrozen(false);
        const el = archiveSectionRef.current;
        if (el) window.scrollTo({ top: Math.max(0, window.scrollY + el.getBoundingClientRect().top - 80), behavior: "smooth" });
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  onTouchMove,  { passive: false, capture: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove, { capture: true });
    };
  }, [products]);

  // ── Keyboard intercept while frozen ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!frozenRef.current) return;
      const stepMap: Record<string, number> = {
        ArrowDown: 120, ArrowRight: 120, ArrowUp: -120, ArrowLeft: -120,
        PageDown: 400,  PageUp: -400,
      };
      const step = stepMap[e.key];
      if (step === undefined) return;
      e.preventDefault();
      const maxScroll = frozenMaxRef.current;
      const next = Math.max(0, Math.min(maxScroll, horizTarget.current + step));
      horizTarget.current = next;
      if (next >= maxScroll || next <= 0) {
        frozenRef.current = false;
        setIsFrozen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [products]);


  useEffect(() => {
    fetchProducts();
    fetchCMS();
    fetchIntegrationStatus();

    // Hydrate Wishlist in localStorage
    const savedWish = localStorage.getItem("apnafit_wishlist");
    if (savedWish) {
      try {
        const parsed = JSON.parse(savedWish);
        if (Array.isArray(parsed)) setWishlist(parsed);
      } catch {
        localStorage.removeItem("apnafit_wishlist");
      }
    }
  }, []);

  // Check when everything is fully calibrated and load completes
  useEffect(() => {
    if (isCharacterLoaded && isPageLoaded) {
      console.log("[Diag:Loader] Both catalog data and 81 frame assets loaded. Fading out loader...");
      const fadeTimer = setTimeout(() => {
        setIsFadeLoader(true);
      }, 800);
      const removeTimer = setTimeout(() => {
        setIsLoaderRemoved(true);
      }, 1800);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [isCharacterLoaded, isPageLoaded]);

  const openProductInspector = (product: Product) => {
    setInspectingProduct(product);
    setInspectImageIndex(0);
    setInspectZoom(1);
    setZoomOrigin({ x: 50, y: 50 });
  };

  const closeProductInspector = () => {
    setInspectingProduct(null);
    setInspectImageIndex(0);
    setInspectZoom(1);
    setZoomOrigin({ x: 50, y: 50 });
  };

  const getProductSizes = (product: Product) => (
    Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : ["S", "M", "L", "XL"]
  );

  const getProductImages = (product: Product) => {
    const candidates = [
      ...(Array.isArray(product.images) ? product.images : []),
      product.image,
      product.hoverImage
    ].filter((src): src is string => Boolean(src));

    return Array.from(new Set(candidates));
  };

  const changeInspectorImage = (direction: "previous" | "next") => {
    if (!inspectingProduct) return;
    const images = getProductImages(inspectingProduct);
    if (images.length <= 1) return;
    setInspectImageIndex((idx) => (
      direction === "next"
        ? (idx + 1) % images.length
        : (idx - 1 + images.length) % images.length
    ));
    setInspectZoom(1);
    setZoomOrigin({ x: 50, y: 50 });
  };

  const handleZoomTarget = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const renderSizeChart = (sizes: string[], compact = false) => (
    <div className="rounded border border-outline-variant/25 bg-background/45 overflow-hidden">
      <div className="sm:hidden divide-y divide-outline-variant/10">
        {sizes.map((size) => {
          const measurement = SIZE_CHART[size] || SIZE_CHART.M;
          return (
            <div key={size} className={compact ? "p-2" : "p-3"}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-secondary font-bold text-xs">{size}</span>
                <span className="text-[9px] font-label-caps uppercase tracking-wider text-outline">cm / inches</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-on-surface-variant">
                <span>Chest: {measurement.chestCm}cm / {cmToIn(measurement.chestCm)}in</span>
                <span>Length: {measurement.lengthCm}cm / {cmToIn(measurement.lengthCm)}in</span>
                <span>Shoulder: {measurement.shoulderCm}cm / {cmToIn(measurement.shoulderCm)}in</span>
                <span>Sleeve: {measurement.sleeveCm}cm / {cmToIn(measurement.sleeveCm)}in</span>
              </div>
            </div>
          );
        })}
      </div>

      <table className="hidden sm:table w-full text-left text-[10px]">
        <thead className="text-outline uppercase font-label-caps tracking-wider border-b border-outline-variant/15">
          <tr>
            <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Size</th>
            <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Chest</th>
            <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Length</th>
            <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Shoulder</th>
            <th className={compact ? "px-2 py-2" : "px-3 py-2"}>Sleeve</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {sizes.map((size) => {
            const measurement = SIZE_CHART[size] || SIZE_CHART.M;
            return (
              <tr key={size} className="text-on-surface-variant">
                <td className={compact ? "px-2 py-2 font-bold text-secondary" : "px-3 py-2 font-bold text-secondary"}>{size}</td>
                <td className={compact ? "px-2 py-2" : "px-3 py-2"}>{measurement.chestCm}cm / {cmToIn(measurement.chestCm)}in</td>
                <td className={compact ? "px-2 py-2" : "px-3 py-2"}>{measurement.lengthCm}cm / {cmToIn(measurement.lengthCm)}in</td>
                <td className={compact ? "px-2 py-2" : "px-3 py-2"}>{measurement.shoulderCm}cm / {cmToIn(measurement.shoulderCm)}in</td>
                <td className={compact ? "px-2 py-2" : "px-3 py-2"}>{measurement.sleeveCm}cm / {cmToIn(measurement.sleeveCm)}in</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const inspectorImages = inspectingProduct ? getProductImages(inspectingProduct) : [];
  const activeInspectorImage = inspectorImages[inspectImageIndex] || inspectingProduct?.image || "";

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        if (data.length > 0) {
          setActive3DProduct(data[0]); // Base pedestal t-shirt
        }
        setIsPageLoaded(true);
      }
    } catch (err) {
      console.error("Failed fetching products catalog list", err);
      // Fallback gate to ensure loading terminates safely
      setIsPageLoaded(true);
    }
  };

  const fetchCMS = async () => {
    try {
      const res = await fetch("/api/cms");
      if (res.ok) {
        const data = await res.json();
        setCms(data);
      }
    } catch (err) {
      console.error("Failed fetching copy guidelines", err);
    }
  };

  const fetchIntegrationStatus = async () => {
    try {
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        setIntegrations(await res.json());
      }
    } catch (err) {
      console.error("Failed fetching integration status", err);
    }
  };

  // Manage Cart bag updates
  const handleAddToCart = (product: Product, size?: string) => {
    if (product.stock <= 0) {
      alert(`${product.name} is currently sold out.`);
      return;
    }

    const productSizes = getProductSizes(product);
    const fallbackSize = productSizes.includes("M") ? "M" : productSizes[0];
    const chosenSize = size && productSizes.includes(size) ? size : selectedSizes[product.id] || fallbackSize;
    if (!chosenSize || !productSizes.includes(chosenSize)) {
      alert(`No valid size is available for ${product.name}.`);
      return;
    }
    
    // Add to raw recently viewed
    setRecentlyViewed((prev) => (
      prev.includes(product.id) ? prev : [product.id, ...prev.slice(0, 3)]
    ));

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) => item.product.id === product.id && item.selectedSize === chosenSize
      );

      if (existingIdx > -1) {
        const updated = [...prevCart];
        if (updated[existingIdx].quantity < product.stock) {
          updated[existingIdx].quantity += 1;
        } else {
          alert(`Respect limits: Only {product.stock} units available in warehouse.`);
        }
        return updated;
      }

      return [...prevCart, { product, quantity: 1, selectedSize: chosenSize }];
    });

    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, size: string, change: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId && item.selectedSize === size) {
            const nextQty = item.quantity + change;
            if (nextQty > item.product.stock) {
              alert(`Warehouse ceiling reached: Only ${item.product.stock} units left`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const handleRemoveItem = (productId: string, size: string) => {
    setCart((prevCart) => 
      prevCart.filter((item) => !(item.product.id === productId && item.selectedSize === size))
    );
  };

  const handleToggleWish = (id: string) => {
    let nextWish = [...wishlist];
    if (wishlist.includes(id)) {
      nextWish = nextWish.filter((item) => item !== id);
    } else {
      nextWish.push(id);
    }
    setWishlist(nextWish);
    localStorage.setItem("apnafit_wishlist", JSON.stringify(nextWish));
  };

  const handleProceedToCheckout = (discount: number, code: string) => {
    setAppliedDiscount(discount);
    setAppliedCoupon(code);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderSuccess = (orderId: string) => {
    setCart([]);
    setAppliedDiscount(0);
    setAppliedCoupon("");
  };

  const handleNewsletterSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailSubscribe.trim()) return;

    setSubscribeError("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailSubscribe.trim() })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Unable to connect Gmail notification.");
      }
      if (data.gmail && !data.gmail.sent) {
        throw new Error(data.gmail.reason || "Gmail notification is not connected yet.");
      }

      setSubscribeSuccess(true);
      fetchIntegrationStatus();
    } catch (error: any) {
      setSubscribeError(error.message || "Unable to connect Gmail notification.");
    }
  };


  return (
    <div className="text-[#111111] min-h-screen selection:bg-secondary selection:text-on-secondary overflow-x-hidden relative font-body-md bg-[#E8DDCF]">
      
      {/* SVG-based Continuous Film Grain overlay texture */}
      <div className="film-grain" />

      {/* COOPERATIVE LUXURY UNIFIED LOADER OVERLAY */}
      {!isLoaderRemoved && (
        <div 
          className={`fixed inset-0 bg-[#050505] z-[10000] flex flex-col items-center justify-center space-y-6 px-6 transition-opacity duration-[1000ms] ease-out ${
            isFadeLoader ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex flex-col items-center max-w-lg text-center">
            <h2 className="font-display-xl text-5xl sm:text-7xl tracking-[0.25em] text-white/95 animate-pulse">
              APNAFIT
            </h2>
            <div className="h-[1px] w-36 bg-white/25 mt-6 relative overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300 ease-out" 
                style={{ width: `${characterProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-label-caps text-white/45 tracking-[0.3em] uppercase mt-4">
              {characterProgress < 100 
                ? `Calibrating heavy constructs... ${characterProgress}%` 
                : "Aesthetic stabilizing complete."
              }
            </p>
            <p className="italic font-body-lg text-white/60 text-xs sm:text-sm mt-12 max-w-sm leading-relaxed">
              "In an era of disposable noise, stand for permanent relevance."
            </p>
          </div>
        </div>
      )}

      {/* Interactive Custom cursor tracker */}
      <Cursor />

      {/* Full-bleed floating background anti-gravity character canvas */}
      <InteractiveCharacter 
        onProgress={(p) => setCharacterProgress(p)}
        onLoaded={() => setIsCharacterLoaded(true)}
        showCanvas={isFadeLoader && scrollY <= vh * 2.2}
      />

      {/* Subtle particle canvas for golden stardust */}
      <ParticleCanvas />

      {/* Premium floating Header navigation menu */}
      <header id="main-navbar" className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 lg:px-24 py-4 sm:py-6 bg-background/55 backdrop-blur-3xl border-b border-[#111111]/8 opacity-0 -translate-y-full transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] pointer-events-none">
        <div className="flex items-center gap-6">
          <button 
            aria-label="Toggle Menu"
            onClick={() => setIsMenuOpen(true)}
            className="text-secondary hover:text-secondary-fixed-dim transition-colors active:scale-90 duration-150 p-2 -ml-2 clickable flex items-center gap-2"
          >
            <Menu className="w-6 h-6 sm:w-7 sm:h-7 text-[#111111]" />
            <span className="hidden sm:inline text-[9px] font-label-caps tracking-[0.2em] text-[#111111] uppercase">Menu</span>
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2">
          <a href="#hero" className="clickable select-none">
            <h1 className="font-display-lg text-lg sm:text-2xl tracking-[0.2em] text-[#111111] uppercase font-semibold">APNAFIT</h1>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdminOpen(true)}
            className="hidden md:flex items-center gap-1.5 text-[9px] text-[#111111] font-label-caps tracking-widest border border-[#111111]/15 rounded px-2.5 py-1 hover:border-[#111111]/60 hover:text-secondary transition-all uppercase focus:outline-none"
          >
            <Lock className="w-3 h-3 text-[#111111]" />
            <span>Ledger Console</span>
          </button>

          <button 
            aria-label="View Active Bag"
            onClick={() => setIsCartOpen(true)}
            className="text-secondary hover:text-secondary-fixed-dim transition-colors relative p-2 -mr-2 clickable active:scale-90 duration-150"
          >
            <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7 text-[#111111]" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-secondary text-on-secondary rounded-full w-4 sm:w-5 h-4 sm:h-5 text-[9px] sm:text-xs font-bold font-mono flex items-center justify-center animate-bounce">
                {cart.reduce((s, c) => s + c.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Left/Right architectural margins */}
      <div className="hidden lg:flex fixed left-0 top-0 h-screen w-16 border-r border-[#111111]/8 flex-col justify-between items-center py-24 select-none pointer-events-none z-30">
        <span className="text-[8px] font-mono tracking-[0.3em] uppercase text-[#111111]/30" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          DROP 001 // APNAFIT STEALTH
        </span>
        <span className="text-[8px] font-mono tracking-[0.3em] uppercase text-[#111111]/30" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          28.532° N 77.216° E
        </span>
      </div>

      <div className="hidden lg:flex fixed right-0 top-0 h-screen w-16 border-l border-[#111111]/8 flex-col justify-between items-center py-24 select-none pointer-events-none z-30">
        <span className="text-[8px] font-mono tracking-[0.3em] uppercase text-[#111111]/30" style={{ writingMode: 'vertical-rl' }}>
          QUIET AUTHORITY
        </span>
        <span className="text-[8px] font-mono tracking-[0.3em] uppercase text-[#111111]/30" style={{ writingMode: 'vertical-rl' }}>
          SERIES 01 // 400GSM
        </span>
      </div>

      {/* Drawer menu system */}
      <div 
        className={`fixed inset-0 z-[60] bg-[#E8DDCF]/98 backdrop-blur-xl transition-all duration-500 ease-in-out ${
          isMenuOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col justify-center items-start px-8 sm:px-20 py-20 w-full h-full relative space-y-8">
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-8 right-8 text-secondary hover:text-on-surface transition-transform hover:rotate-90 active:scale-90 duration-200 p-2"
          >
            <X className="w-8 h-8 sm:w-10 sm:h-10 text-[#111111]" />
          </button>

          <div className="space-y-4 sm:space-y-6">
            <a 
              href="#hero"
              onClick={() => setIsMenuOpen(false)}
              className="block font-display-lg text-4xl sm:text-6xl text-[#111111]/60 hover:text-[#111111] tracking-tight transition-colors uppercase"
            >
              Spotlight Show
            </a>
            <a 
              href="#recent-releases"
              onClick={() => setIsMenuOpen(false)}
              className="block font-display-lg text-4xl sm:text-6xl text-[#111111]/60 hover:text-[#111111] tracking-tight transition-colors uppercase"
            >
              Recent Releases
            </a>
            <a 
              href="#archive-showcase"
              onClick={() => setIsMenuOpen(false)}
              className="block font-display-lg text-4xl sm:text-6xl text-[#111111]/60 hover:text-[#111111] tracking-tight transition-colors uppercase"
            >
              Full Archive
            </a>
            <a 
              href="#philosophy"
              onClick={() => setIsMenuOpen(false)}
              className="block font-display-lg text-4xl sm:text-6xl text-[#111111]/60 hover:text-[#111111] tracking-tight transition-colors uppercase"
            >
              Matters of Weave
            </a>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                setIsAdminOpen(true);
              }}
              className="block text-left font-display-lg text-3xl text-secondary hover:text-[#111111] tracking-tight transition-colors uppercase"
            >
              Ledger Console Gate
            </button>
          </div>

          <div className="pt-12 border-t border-[#111111]/10 w-full max-w-sm flex gap-6 text-[10px] sm:text-xs text-[#111111]/60 tracking-widest font-label-caps uppercase">
            <a href="#" className="hover:text-secondary transition-colors">Instagram</a>
            <a href="#" className="hover:text-secondary transition-colors">Twitter</a>
            <a href="#" className="hover:text-[#111111] transition-colors">Mailing list</a>
          </div>
        </div>
      </div>

      <main className="relative z-10">
        
        {/* SECTION 1: BEIGE HERO SECTION */}
        <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden py-16 sm:py-24 bg-[#E8DDCF] border-b border-[#111111]/6">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45)_0%,transparent_80%)] pointer-events-none" />

          {/* Trademark backplate banner */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden opacity-[0.06] transform translate-y-[-10%]">
            <span className="text-[15vw] font-display-xl font-bold tracking-tighter text-[#111111] uppercase leading-none">
              APNAFIT
            </span>
          </div>

          <div className="relative z-10 text-center px-4 w-full max-w-4xl flex flex-col items-center">
            
            {/* Pedestal 3D drag model */}
            <div className="mb-6 w-full flex justify-center">
              {active3DProduct ? (
                <TShirt3D 
                  imageSrc={active3DProduct.image} 
                  name={active3DProduct.name} 
                />
              ) : (
                <div className="w-72 h-72 sm:w-[480px] sm:h-[480px] bg-background/35 border border-[#111111]/10 animate-pulse rounded-full flex items-center justify-center">
                  <span className="text-xs uppercase tracking-widest text-[#111111]/60">Loading Pedestal...</span>
                </div>
              )}
            </div>

            {/* Dynamic Swatches */}
            <div className="flex gap-3 justify-center items-center mb-8 relative z-20">
              {products.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActive3DProduct(p)}
                  className={`w-12 h-14 bg-background/85 border rounded cursor-pointer overflow-hidden transition-all ${
                    active3DProduct?.id === p.id 
                      ? "border-secondary scale-110 shadow-lg shadow-secondary/15" 
                      : "border-outline-variant/20 hover:border-outline/50 scale-100"
                  }`}
                >
                  <img src={p.image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <h1 className="font-display-xl text-4xl sm:text-6xl md:text-7xl text-[#111111] uppercase tracking-tight mb-4 leading-none">
              {cms.heroTitle}
            </h1>
            <p className="font-body-lg italic text-sm sm:text-base text-on-surface-variant max-w-md mx-auto mb-8">
              Bespoke heavy builds. Tailored silhouettes. Quiet elegance.
            </p>

            <a 
              href="#recent-releases"
              className="w-full sm:w-auto px-10 py-5 bg-[#111111] border border-[#111111] text-white font-label-caps text-xs uppercase tracking-[0.2em] hover:bg-[#111111]/90 active:scale-95 duration-200 transition-all rounded"
            >
              {cms.heroSubtitle}
            </a>

          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#111111]/55 animate-bounce">
            <span className="text-[10px] font-label-caps tracking-wider uppercase block text-center mb-1">Scroll to inspect constructs</span>
            <ArrowRight className="w-5 h-5 mx-auto rotate-90 text-[#111111]/70" />
          </div>
        </section>


        {/* SECTION 2: RECENT RELEASE SHOWCASE (MERGED EXPERIENCE) */}
        <section id="recent-releases" className="relative py-48 sm:py-64 md:py-80 bg-[#E8DDCF] border-b border-[#111111]/6">
          <div className="px-6 md:px-20 mb-24 md:mb-32">
            <span className="font-label-caps text-[10px] text-secondary uppercase tracking-[0.3em] font-semibold block mb-3">Series Showcase</span>
            <h2 className="font-display-lg text-3xl sm:text-5xl text-[#111111] uppercase tracking-tight max-w-2xl leading-none">
              Wear Your Identity
            </h2>
            <p className="text-xs sm:text-sm text-[#111111]/70 mt-4 max-w-lg font-body-md leading-relaxed">
              Observe alternating physical alignment: as the male character drifts in sync with your scroll velocity, these premium drops materialise from opposite directions.
            </p>
          </div>

          {/* Progressive Editorial Rows */}
          <div className="relative space-y-56 sm:space-y-72 md:space-y-96">
            {products.slice(0, 4).map((product, idx) => {
              const sizes = getProductSizes(product);
              const fallbackSize = sizes.includes("M") ? "M" : sizes[0];
              const activeSize = selectedSizes[product.id] || fallbackSize;
              const isOutOfStock = product.stock <= 0;

              // Card asymmetrical positions: Left, Right, Left, Slightly left
              const rowAlignments = [
                "justify-start pl-6 md:pl-24",      // Left aligned
                "justify-end pr-6 md:pr-24",        // Right aligned
                "justify-start pl-6 md:pl-32",      // Left aligned
                "justify-start pl-6 md:pl-16 lg:pl-28" // Slightly left offset
              ];

              const revealRotate = idx % 2 === 0 ? "2.5deg" : "-2.5deg";

              return (
                <div 
                  key={product.id}
                  className={`w-full flex ${rowAlignments[idx]} z-10 relative reveal-on-scroll`}
                  style={{ "--reveal-rot": revealRotate } as React.CSSProperties}
                >
                  <div className="w-[90%] sm:w-[410px] glass-card overflow-hidden rounded flex flex-col justify-between premium-shadow group">
                    <button
                      type="button"
                      onClick={() => openProductInspector(product)}
                      className="aspect-[4/5] relative overflow-hidden bg-background/10 w-full text-left cursor-zoom-in focus:outline-none"
                    >
                      <img 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        src={product.image} 
                        alt={product.name} 
                      />
                      <span className="absolute top-4 right-4 z-20 rounded-full border border-[#111111]/15 bg-[#E8DDCF]/80 px-3 py-1.5 text-[9px] font-label-caps uppercase tracking-widest text-[#111111] backdrop-blur flex items-center gap-1.5">
                        <Eye className="w-3 h-3" />
                        Inspect Details
                      </span>

                      {/* Drop-shadow informational panel hover effect */}
                      <div className="absolute inset-0 bg-[#E8DDCF]/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col p-6 justify-between select-none">
                        <div className="space-y-2">
                          <span className="font-label-caps text-[9px] text-[#111111]/70 uppercase tracking-widest">{product.category}</span>
                          <p className="text-xs text-[#111111]/80 leading-relaxed font-body-md h-24 overflow-y-auto no-scrollbar">
                            {product.longDescription}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-semibold text-[#111111]/50 uppercase font-label-caps">Craft Construct Elements:</p>
                          <ul className="text-[9px] space-y-1 text-[#111111]">
                            {(product.features || []).slice(0, 3).map((feat, i) => (
                              <li key={i} className="flex items-center gap-1.5 uppercase font-semibold">
                                <span className="w-1 h-1 bg-[#111111] rounded-full" />
                                {feat}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </button>

                    <div className="p-6 bg-[#E8DDCF]/25 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-body-lg text-lg text-[#111111] font-semibold uppercase">{product.name}</h3>
                          <span className="font-label-caps text-secondary font-bold text-sm">
                            ₹{product.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <p className="font-body-md text-xs text-[#111111]/60 mb-4">{product.description}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-[9px] font-semibold tracking-wider text-[#111111]/50 uppercase">
                          <span>Apparel Size</span>
                          <span>{product.gsm} GSM weight</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {sizes.map((sz) => (
                            <button
                              key={sz}
                              onClick={() => setSelectedSizes({ ...selectedSizes, [product.id]: sz })}
                              className={`py-1.5 text-xs font-semibold rounded border transition-all ${
                                activeSize === sz
                                  ? "bg-[#111111] text-[#E8DDCF] border-[#111111]"
                                  : "bg-transparent border-[#111111]/15 text-[#111111]/60 hover:border-[#111111]/45"
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>

                        <button 
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(product)}
                          className={`w-full py-4 border border-[#111111] font-label-caps text-[10px] uppercase tracking-[0.2em] font-semibold transition-all rounded shimmer-trigger ${
                            isOutOfStock 
                              ? "border-[#111111]/10 text-[#111111]/30 cursor-not-allowed bg-background/5" 
                              : "text-[#111111] hover:bg-[#111111] hover:text-white active:scale-95 duration-200"
                          }`}
                        >
                          {isOutOfStock ? "Sold Out" : "Add to Active Bag"}
                          <div className="shimmer-layer" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>


        {/* SECTION 3: FULL PRODUCT ARCHIVE (HORIZONTAL FREEZE SCROLL) */}
        <section
          id="archive-showcase"
          ref={archiveSectionRef as React.RefObject<HTMLElement>}
          className="relative h-screen w-full flex flex-col justify-center overflow-hidden bg-[#E8DDCF] border-b border-[#111111]/6"
        >
          {/* Header row */}
          <div className="px-6 md:px-20 mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 flex-shrink-0">
            <div>
              <span className="font-label-caps text-[10px] text-secondary uppercase mb-2 block tracking-[0.25em] font-semibold">The Core Archives</span>
              <h2 className="font-display-lg text-2xl sm:text-4xl text-[#111111] uppercase tracking-tight">
                Full Showcase Catalog
              </h2>
              <p className="text-xs sm:text-sm text-[#111111]/55 mt-1 font-body-md">
                Scroll to traverse the complete drape profiles — the page freezes while you explore.
              </p>
            </div>
            <div className="flex gap-4 text-[10px] font-label-caps text-[#111111]/65 tracking-widest uppercase">
              <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-secondary" /> Tailored Runs</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-secondary" /> Organic Dyes</span>
            </div>
          </div>

          {/* Horizontal translate catalog row */}
          <div className="relative w-full overflow-hidden flex-shrink-0">
            <div
              className="catalog-row flex flex-nowrap px-6 md:px-20 gap-8 py-6"
              style={{
                transform: `translate3d(-${horizontalOffset}px, 0, 0)`,
                willChange: "transform",
                /* No CSS transition — smoothed by lerp RAF loop */
              }}
            >
              {products.length === 0 ? (
                <div className="w-full text-center py-20 text-[#111111]/50">
                  <p>Loading active collections...</p>
                </div>
              ) : (
                products.map((product, idx) => {
                  const sizes        = getProductSizes(product);
                  const isOutOfStock = product.stock <= 0;

                  // Focus effect: active card centered
                  const maxS      = frozenMaxRef.current || 1;
                  const progress  = maxS > 0 ? horizontalOffset / maxS : 0;
                  const active    = progress * (products.length - 1);
                  const diff      = Math.abs(active - idx);

                  const cardScale  = Math.max(0.88, 1.12 - diff * 0.12);
                  const cardBlur   = Math.min(4, diff * 3.5);
                  const cardOpac   = Math.max(0.45, 1 - diff * 0.38);

                  return (
                    <div
                      key={`${product.id}-archive`}
                      className="archive-card flex-shrink-0 w-[290px] sm:w-[330px] bg-[rgba(232,221,207,0.55)] backdrop-blur-2xl border border-[rgba(17,17,17,0.08)] overflow-hidden relative group flex flex-col justify-between rounded shadow-[0_20px_50px_rgba(0,0,0,0.06)]"
                      style={{
                        transform: `scale(${cardScale.toFixed(4)})`,
                        filter: cardBlur > 0.1 ? `blur(${cardBlur.toFixed(2)}px)` : "none",
                        opacity: cardOpac.toFixed(4),
                        transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1), filter 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s cubic-bezier(0.16,1,0.3,1)",
                        willChange: "transform, filter, opacity",
                      }}
                    >
                      <span className="absolute top-4 left-4 bg-[#111111]/85 text-white text-[9px] font-label-caps tracking-widest uppercase px-2 py-1 rounded z-20 backdrop-blur">
                        {idx % 2 === 0 ? "Limited Archive" : "Selective Drop"}
                      </span>

                      <button
                        type="button"
                        onClick={() => openProductInspector(product)}
                        className="aspect-[4/5] relative overflow-hidden bg-background/20 w-full text-left cursor-zoom-in focus:outline-none"
                      >
                        <img
                          className="product-img w-full h-full object-cover"
                          src={product.image}
                          alt={product.name}
                        />
                      </button>

                      <div className="p-5 space-y-4 bg-[#E8DDCF]/15 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-body-lg text-base text-[#111111] font-semibold uppercase">{product.name}</h3>
                            <span className="font-label-caps text-secondary font-semibold text-xs sm:text-sm">
                              ₹{product.price.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className="font-body-md text-[10px] text-[#111111]/60">{product.description}</p>
                        </div>
                        <button
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(product)}
                          className={`w-full py-3 border border-[#111111] font-label-caps text-[9px] uppercase tracking-[0.2em] font-semibold transition-all rounded shimmer-trigger ${
                            isOutOfStock
                              ? "border-[#111111]/10 text-[#111111]/30 cursor-not-allowed"
                              : "text-[#111111] hover:bg-[#111111] hover:text-white active:scale-95 duration-300"
                          }`}
                        >
                          {isOutOfStock ? "Sold Out" : "Bag Product"}
                          <div className="shimmer-layer" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Traversal hint with progress bar */}
          <div className="px-6 md:px-20 mt-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-[#111111]/10 relative overflow-hidden rounded-full">
                <div
                  className="absolute inset-y-0 left-0 bg-[#111111]/35 rounded-full"
                  style={{
                    width: `${frozenMaxRef.current > 0 ? (horizontalOffset / frozenMaxRef.current) * 100 : 0}%`,
                    transition: "width 0.1s linear",
                  }}
                />
              </div>
              <span className="text-[9px] font-label-caps text-[#111111]/40 tracking-widest uppercase whitespace-nowrap">
                {products.length > 0
                  ? `${Math.min(products.length, Math.round((horizontalOffset / Math.max(1, frozenMaxRef.current)) * products.length) + 1)} / ${products.length}`
                  : "—"}
              </span>
            </div>
          </div>
        </section>


        {/* SECTION 4: MINIMAL EDITORIAL PHILOSOPHY */}
        <section id="philosophy" className="relative py-48 sm:py-64 md:py-80 bg-[#E8DDCF] overflow-hidden border-b border-[#111111]/6">
          <div className="absolute inset-y-0 right-0 lg:w-1/2 h-full opacity-10 lg:opacity-20 pointer-events-none select-none">
            <img 
              className="w-full h-full object-cover grayscale" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBhl4PXhoOfeDZ3423phdzXa3_7DMEQvJYgRoZJf840E57LjubsIcfQfu347Np8Zye2oH9Y0P-c2irQojoyvPc5JK_rndy-Bpfr7PaxtNfaT86NYmElFlBoQjimFqDoKf1Gk6ZKFwX8z8MmZaprG2rekYuEVksV8HwIPX-Ss5xMt3VXmVg2hnwPmQ5_LnEJ7IFhmy3Guf7t_wvnAEASJapS6d0_TyreEFV7G3AuypaUENR5bPDcAb2aT0i7w1ZGQxxPvlvxF-2ur0" 
              alt="APNAFIT philosophy model portrait" 
            />
          </div>

          <div className="relative z-10 px-6 md:px-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-8 reveal-on-scroll">
              <span className="font-label-caps text-[10px] text-secondary uppercase tracking-[0.3em] font-semibold">Our Philosophy</span>
              <h2 className="font-display-lg text-4xl sm:text-6xl lg:text-7xl text-[#111111] leading-none italic uppercase block tracking-tight">
                Materials matter more than noise.
              </h2>
              <p className="font-body-lg text-base sm:text-lg text-[#111111]/75 max-w-xl leading-relaxed select-text font-body-md">
                {cms.philosophyText}
              </p>
              
              <div className="pt-4 flex flex-wrap gap-6 items-center">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-secondary font-label-caps tracking-widest uppercase">
                  <Star className="w-4 h-4 text-secondary fill-secondary" /> Command Respect
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-secondary font-label-caps tracking-widest uppercase">
                  <Star className="w-4 h-4 text-secondary fill-secondary" /> Retain shape eternally
                </span>
              </div>
            </div>
          </div>
        </section>


        {/* SECTION 5: LOOKBOOK MASONRY GALLERY */}
        <section id="journal" className="py-40 sm:py-56 md:py-64 px-6 md:px-20 bg-[#E8DDCF] border-b border-[#111111]/6">
          <div className="mb-16">
            <span className="font-label-caps text-[10px] text-secondary uppercase mb-2 block tracking-[0.2em] font-semibold">Campaign Editorial</span>
            <h2 className="font-display-lg text-3xl sm:text-5xl text-[#111111] uppercase tracking-tight">Lookbook 01</h2>
            <div className="h-[1px] w-full bg-[#111111]/10 mt-6" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              "https://lh3.googleusercontent.com/aida-public/AB6AXuA-Evnd4oyFSHMVTTeKka1-3PUPfd0_dp5_txY5tplMcivgu2HJVBdF4_uQi7sto_z9RZQB7SBzUWS9pz6Zxv3s4YBNBJ0CapsBHGyl9lpixik0FMrKlpuumUJQe0Rn0iykMYpC7EOglorfyLMnKUhs8-ghweKnX2uGOEU-75tkodoWlv5S5fNm5XxRafRXnDmVrO3nnfPoakdqMHjhsj9-DEdd1E960mTJHKnrKHUPuJYWZFZVezj6Hew-fm0QVjSCFAdt-dLuPkw",
              "https://lh3.googleusercontent.com/aida-public/AB6AXuDcbqECRWm80A9EJ3ywBsQd5oj9tYFpEI6l2GOU9AJylr4OjX7BETLHeU6oIUXi0X9_bCrIltSAF4aGC4l0-9DMn8lQUEp-GJS4jB0AhjhmsZW_VM6uQKiIQPSBURXidFjWTrdqq2eVWOpfkte5u0twW9HGwo8DBtdlyASiBJ7yLIRNc6-cLUiZMAraMdfkkUG6fLCJtVpaBEBcaFa28CwoK4TA-jT4Bye8VcuodPRTAZxkbZZBkZa_Qw8oiqV0H9GdBCuErzm0zv8",
              "https://lh3.googleusercontent.com/aida-public/AB6AXuBSO9U9uyIMy42hG6uSsaICEGnsq1WL6qFQCZJuFiUd3nzJYXCHWn5ehFfqS7AdGDCAqzy1vjxc_uEJA-wxQFQeN1MX5j_Vy0cgk-2jObsFyIYp0ARtMQhlmnEz5fONOPcy5qTIqK5JjCrCaaLMOcAO1zkj_QVeVj6Cox4QI1w_1h7y3-yCjeCRWhtZO71rjHV6Szfn2cFP2dPPUwvecD8DVCV5lb8r6QXiXDEqif_Ierl4LIQsc36Kt5Zro4x6l6Ybe2oDdWSiQ88",
              "https://lh3.googleusercontent.com/aida-public/AB6AXuDBAtX-sgt85LVz8QmmcndKJ76QoLtyo4KVRPG4ja7VUv8qaVVfKDSBhemA_QlKlTnHM0_cjcY61MQA7BX62NkvLPQKhJL-QCGQch5LiyUhLpRKRv_325RsZpM_dmmmMuLdRx05sKm79a38ndrMONGlEjOmekl_sL-Tb3b56k0WMl7EVVgdSgYB6Bvt0isqKoeQMx-tRSSSDxgurAPkYHtGQWP2cg5nCsf6Os5Wf_YzO5pVdi-eOCYp2O9B6xhR8K8GwzrAQl2H1aY"
            ].map((img, idx) => (
              <div 
                key={idx} 
                className={`group relative overflow-hidden h-[390px] sm:h-[460px] rounded border border-[#111111]/8 hover:border-[#111111]/30 transition-all duration-500 bg-background/30 cursor-pointer reveal-on-scroll ${
                  idx % 2 === 1 ? "md:translate-y-12" : ""
                }`}
                style={{ "--reveal-rot": idx % 2 === 0 ? "1.5deg" : "-1.5deg" } as React.CSSProperties}
              >
                <img 
                  src={img} 
                  alt={`Lookbook photo ${idx + 1}`} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 filter brightness-95 group-hover:brightness-105 contrast-105 transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none select-none group-hover:scale-[1.03]" 
                />
                <span className="absolute bottom-4 left-4 text-[9px] font-mono text-[#111111]/60 uppercase bg-[#E8DDCF]/80 px-2 py-1 rounded tracking-wide border border-[#111111]/10">
                  APNA_01_#{idx + 13}
                </span>
              </div>
            ))}
          </div>
        </section>


        {/* SECTION 6: JOIN THE QUIET AUTHORITY MEMBERSHIP */}
        <section className="py-40 sm:py-56 md:py-64 px-6 md:px-20 bg-[#E8DDCF] flex justify-center items-center">
          <div className="max-w-4xl w-full glass-card p-10 sm:p-20 text-center space-y-8 rounded relative overflow-hidden shimmer-trigger premium-shadow reveal-on-scroll">
            <span className="font-label-caps text-[10px] text-secondary uppercase tracking-[0.4em] font-semibold">The Archive Gate</span>
            <h2 className="font-display-lg text-3xl sm:text-5xl text-[#111111] uppercase tracking-tight leading-none">
              Join the Quiet Authority
            </h2>
            <p className="text-sm text-[#111111]/65 max-w-sm mx-auto font-body-md leading-relaxed">
              Early access registry for selective series releases, selective heavyweight drops, and physical catalog items.
            </p>

            {subscribeSuccess ? (
              <div className="flex flex-col items-center gap-2 p-6 bg-secondary/5 rounded border border-secondary/20 max-w-sm mx-auto animate-[fadeIn_0.5s_ease-out]">
                <CheckCircle className="w-8 h-8 text-secondary" />
                <p className="text-sm font-semibold text-secondary uppercase tracking-widest font-label-caps">Authority Joined</p>
                <p className="text-xs text-[#111111]/60">Your access credentials are cataloged in our primary ledger.</p>
              </div>
            ) : (
              <form 
                onSubmit={handleNewsletterSubscribe}
                className="flex flex-col sm:flex-row gap-4 items-center max-w-md mx-auto w-full pt-4 relative z-20"
              >
                <input 
                  type="email"
                  required
                  placeholder="ENTER ACCESS EMAIL ADDRESS"
                  value={emailSubscribe}
                  onChange={(e) => setEmailSubscribe(e.target.value)}
                  className="w-full bg-[#E8DDCF]/40 border border-[#111111]/15 focus:border-[#111111] py-4 text-[10px] tracking-wider font-label-caps focus:outline-none placeholder:text-[#111111]/40 transition-all text-center rounded text-[#111111]"
                />
                <button 
                  type="submit"
                  className="w-full sm:w-auto px-10 py-4.5 bg-[#111111] text-white font-label-caps text-xs uppercase tracking-widest font-semibold hover:bg-black transition-all shadow-lg active:scale-95 duration-200 rounded-sm border border-black hover:shadow-xl hover:scale-[1.02]"
                >
                  Join Us
                </button>
              </form>
            )}
            {subscribeError && (
              <p className="text-xs text-error max-w-sm mx-auto">{subscribeError}</p>
            )}

            <div className="shimmer-layer" />
          </div>
        </section>

      </main>


      {/* Footer System */}
      <footer className="relative z-10 w-full py-16 px-6 md:px-20 flex flex-col md:flex-row justify-between items-center md:items-end bg-[#E8DDCF] border-t border-[#111111]/10 gap-10 text-center md:text-left">
        <div className="flex flex-col gap-6 w-full md:w-auto items-center md:items-start">
          <div className="font-display-lg text-3xl sm:text-4xl text-[#111111] uppercase tracking-tighter transition-colors">
            APNAFIT
          </div>
          
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <a className="text-xs text-[#111111]/60 uppercase font-semibold tracking-wider hover:text-secondary transition-colors" href="#">Terms</a>
            <a className="text-xs text-[#111111]/60 uppercase font-semibold tracking-wider hover:text-secondary transition-colors" href="#">Privacy</a>
            <a className="text-xs text-[#111111]/60 uppercase font-semibold tracking-wider hover:text-secondary transition-colors" href="#">Ethics</a>
            <a className="text-xs text-[#111111]/60 uppercase font-semibold tracking-wider hover:text-secondary transition-colors" href="#">Shipping</a>
          </nav>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 justify-center md:justify-end text-[9px] font-label-caps uppercase tracking-widest">
            <span className="border border-[#111111]/15 rounded px-2 py-1 text-[#111111]/50">
              UPI {integrations.upi?.configured ? "connected" : "missing"}: {integrations.upi?.upiId || "not set"}
            </span>
            <span className="border border-[#111111]/15 rounded px-2 py-1 text-[#111111]/50">
              Gmail {integrations.gmail?.configured ? "connected" : "needs token"}
            </span>
          </div>
          <p className="text-[10px] text-[#111111]/50 uppercase tracking-widest">
            © 2026 APNAFIT. All drapes and fabric construct reserved.
          </p>
          <p className="text-[9px] text-[#111111]/40 uppercase tracking-widest font-mono">
            Crafted for Quiet Authority. Secure ledger encryption authenticated.
          </p>
        </div>
      </footer>


      {/* Dynamic Product Detail Viewer */}
      {inspectingProduct && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#E8DDCF]/95 backdrop-blur-xl p-4 sm:p-8 font-body-md">
          <div className="min-h-full flex items-center justify-center">
            <div className="relative w-full max-w-6xl bg-[#E8DDCF] border border-[#111111]/10 rounded shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 premium-shadow">
              <button
                type="button"
                aria-label="Close product viewer"
                onClick={closeProductInspector}
                className="absolute right-4 top-4 z-30 w-10 h-10 rounded-full border border-[#111111]/10 bg-[#E8DDCF]/80 text-[#111111] hover:bg-[#E8DDCF] active:scale-95 transition-all flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="lg:col-span-7 bg-[#E8DDCF]/55 min-h-[420px] sm:min-h-[560px] flex flex-col border-r border-[#111111]/6">
                <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b border-[#111111]/6">
                  <div>
                    <p className="text-[9px] font-label-caps uppercase tracking-[0.25em] text-[#111111]/50">Product inspector</p>
                    <h3 className="text-base sm:text-xl font-display-lg uppercase text-secondary tracking-tight">
                      {inspectingProduct.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 pr-12">
                    <button
                      type="button"
                      aria-label="Zoom out"
                      onClick={() => setInspectZoom((zoom) => Math.max(1, Number((zoom - 0.2).toFixed(1))))}
                      disabled={inspectZoom <= 1}
                      className="w-9 h-9 rounded border border-[#111111]/15 text-[#111111] disabled:text-[#111111]/30 disabled:cursor-not-allowed hover:bg-[#111111]/5 flex items-center justify-center transition-colors"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center text-[10px] font-mono text-[#111111]/60">{Math.round(inspectZoom * 100)}%</span>
                    <button
                      type="button"
                      aria-label="Zoom in"
                      onClick={() => setInspectZoom((zoom) => Math.min(2.4, Number((zoom + 0.2).toFixed(1))))}
                      disabled={inspectZoom >= 2.4}
                      className="w-9 h-9 rounded border border-[#111111]/15 text-[#111111] disabled:text-[#111111]/30 disabled:cursor-not-allowed hover:bg-[#111111]/5 flex items-center justify-center transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  onPointerMove={handleZoomTarget}
                  onPointerDown={handleZoomTarget}
                  className={`relative flex-1 overflow-hidden flex items-center justify-center p-6 sm:p-10 ${inspectZoom > 1 ? "cursor-crosshair" : "cursor-zoom-in"}`}
                >
                  {inspectorImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous product image"
                        onClick={() => changeInspectorImage("previous")}
                        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-[#111111]/10 bg-[#E8DDCF]/80 text-[#111111] shadow flex items-center justify-center active:scale-95 transition-all"
                      >
                        <ArrowRight className="w-5 h-5 rotate-180" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next product image"
                        onClick={() => changeInspectorImage("next")}
                        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-[#111111]/10 bg-[#E8DDCF]/80 text-[#111111] shadow flex items-center justify-center active:scale-95 transition-all"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  <img
                    src={activeInspectorImage}
                    alt={inspectingProduct.name}
                    draggable="false"
                    className="max-w-full max-h-[70vh] object-contain transition-transform duration-300 ease-out drop-shadow-[0_18px_35px_rgba(17,17,17,0.12)]"
                    style={{
                      transform: `scale(${inspectZoom})`,
                      transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
                    }}
                  />
                </div>

                {inspectorImages.length > 1 && (
                  <div className="px-5 sm:px-7 py-4 border-t border-[#111111]/6 bg-[#E8DDCF]/35">
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                      {inspectorImages.map((src, idx) => (
                        <button
                          key={`${src}-${idx}`}
                          type="button"
                          aria-label={`View product image ${idx + 1}`}
                          onClick={() => {
                            setInspectImageIndex(idx);
                            setInspectZoom(1);
                            setZoomOrigin({ x: 50, y: 50 });
                          }}
                          className={`w-14 h-16 rounded border overflow-hidden flex-shrink-0 bg-background transition-all ${
                            inspectImageIndex === idx
                              ? "border-secondary scale-105"
                              : "border-[#111111]/15 hover:border-secondary/60"
                          }`}
                        >
                          <img src={src} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[9px] font-label-caps uppercase tracking-widest text-[#111111]/50">
                      Image {inspectImageIndex + 1} of {inspectorImages.length}. Hover and zoom freely.
                    </p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 space-y-6 bg-[#E8DDCF]/15">
                <div className="space-y-2">
                  <span className="text-[10px] font-label-caps uppercase tracking-[0.25em] text-secondary">
                    {inspectingProduct.category}
                  </span>
                  <h2 className="font-display-lg text-2xl sm:text-3xl uppercase text-[#111111] tracking-tight">
                    {inspectingProduct.name}
                  </h2>
                  <p className="text-sm text-[#111111]/70 leading-relaxed font-body-md">
                    {inspectingProduct.longDescription || inspectingProduct.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {getProductSizes(inspectingProduct).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSizes({ ...selectedSizes, [inspectingProduct.id]: size })}
                      className={`min-w-12 px-3 py-2 rounded border text-xs font-semibold ${
                        (selectedSizes[inspectingProduct.id] || (getProductSizes(inspectingProduct).includes("M") ? "M" : getProductSizes(inspectingProduct)[0])) === size
                          ? "bg-[#111111] text-[#E8DDCF] border-[#111111]"
                          : "border-[#111111]/15 text-[#111111]/60 hover:border-[#111111]/60"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-label-caps uppercase tracking-widest text-[#111111]/50 font-semibold">
                    <Ruler className="w-4 h-4 text-secondary" />
                    Measurements in cm and inches
                  </div>
                  {renderSizeChart(getProductSizes(inspectingProduct))}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded border border-[#111111]/10 bg-[#E8DDCF]/25 p-3">
                    <p className="text-[9px] font-label-caps uppercase tracking-wider text-[#111111]/50">Fabric Weight</p>
                    <p className="text-secondary font-semibold">{inspectingProduct.gsm}GSM Heavy</p>
                  </div>
                  <div className="rounded border border-[#111111]/10 bg-[#E8DDCF]/25 p-3">
                    <p className="text-[9px] font-label-caps uppercase tracking-wider text-[#111111]/50">Listed Price</p>
                    <p className="text-secondary font-semibold">₹{inspectingProduct.price.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={inspectingProduct.stock <= 0}
                  onClick={() => {
                    handleAddToCart(inspectingProduct);
                    closeProductInspector();
                  }}
                  className="w-full py-4 bg-[#111111] text-[#E8DDCF] font-label-caps uppercase tracking-widest text-xs font-bold rounded hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inspectingProduct.stock <= 0 ? "Sold Out" : "Add selected size to bag"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Shopping active bag drawer */}
      <ActiveCartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* Checkout details dynamic wizard */}
      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cart}
        discountPercent={appliedDiscount}
        couponCode={appliedCoupon}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Ledger Console Catalog Manager */}
      {isAdminOpen && (
        <AdminPanel 
          products={products}
          onRefreshProducts={fetchProducts}
          onClose={() => {
            setIsAdminOpen(false);
            fetchCMS(); // Hydrate landed copywriting values
          }}
        />
      )}
    </div>
  );
}
