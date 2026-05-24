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
import AdminPanel from "./components/AdminPanel";
import { Product, CartItem } from "./types";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

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

  // ── Global initial load orchestrator ──
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [isFadeLoader, setIsFadeLoader] = useState(false);
  const [isLoaderRemoved, setIsLoaderRemoved] = useState(false);

  // ── Scroll tracking ──
  const [scrollY, setScrollY] = useState(0);
  const [vh, setVh] = useState(typeof window !== "undefined" ? window.innerHeight : 900);
  const archiveSectionRef = useRef<HTMLElement | null>(null);
  const catalogRowRef = useRef<HTMLDivElement | null>(null);

  // ── GSAP Horizontal Scroll Pinning & Blur ──
  useEffect(() => {
    if (!archiveSectionRef.current || !catalogRowRef.current || products.length === 0) return;

    const cards = catalogRowRef.current.querySelectorAll('.archive-card');

    const ctx = gsap.context(() => {
      const rowWidth = catalogRowRef.current!.scrollWidth;
      const viewportWidth = window.innerWidth;
      // We want to translate far enough so the last item reaches the center
      const maxScroll = Math.max(0, rowWidth - viewportWidth);

      gsap.to(catalogRowRef.current, {
        x: -maxScroll,
        ease: "none",
        scrollTrigger: {
          trigger: archiveSectionRef.current,
          pin: true,
          scrub: 1, // 1 second of smoothing
          start: "center center",
          end: () => `+=${maxScroll * 1.5}`, // Make it slower/longer
          invalidateOnRefresh: true,
          onUpdate: () => {
            const center = window.innerWidth / 2;
            cards.forEach((card) => {
              const rect = card.getBoundingClientRect();
              const cardCenter = rect.left + rect.width / 2;
              const dist = Math.abs(center - cardCenter);

              // Normalize distance based on viewport half width
              const normalizedDist = Math.min(dist / (window.innerWidth / 2), 1);

              // Scale: 1 at center, down to 0.85 at edges
              const scaleVal = 1 - (normalizedDist * 0.15);
              // Opacity: 1 at center, down to 0.3 at edges
              const opacityVal = 1 - (normalizedDist * 0.7);

              gsap.set(card, {
                scale: scaleVal,
                opacity: opacityVal
              });
            });
          }
        }
      });
    }, archiveSectionRef);

    return () => ctx.revert();
  }, [products]);

  // ── GSAP Generic Parallax ──
  useEffect(() => {
    // Initialize Generic Parallax Elements globally
    const parallaxCtx = gsap.context(() => {
      const parallaxElements = document.querySelectorAll("[data-speed]");
      parallaxElements.forEach((el) => {
        const speed = parseFloat(el.getAttribute("data-speed") || "0");
        gsap.to(el, {
          y: () => (ScrollTrigger.maxScroll(window) ? speed * 150 : 0),
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true
          }
        });
      });
    });

    return () => parallaxCtx.revert(); // Cleanup on unmount/re-render
  }, []);

  // ── Main scroll listener ──
  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
    };

    const onResize = () => { setVh(window.innerHeight); ScrollTrigger.refresh(); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // ── Scroll Reveal Intersection Observer ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
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
    if (isPageLoaded) {
      console.log("[Diag:Loader] Catalog data loaded. Fading out loader...");
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
  }, [isPageLoaded]);

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
          alert(`Respect limits: Only ${product.stock} units available in warehouse.`);
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
          className={`fixed inset-0 bg-[#050505] z-[10000] flex flex-col items-center justify-center space-y-6 px-6 transition-opacity duration-[1000ms] ease-out ${isFadeLoader ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
        >
          <div className="flex flex-col items-center max-w-lg text-center">
            <div className="flex flex-col items-center gap-4 animate-pulse"><img src="/apnafit.jpg" alt="ApnaFit" className="h-24 sm:h-32 w-auto object-contain" /><h2 className="font-display-xl text-5xl sm:text-7xl tracking-[0.25em] text-[#111111]">APNAFIT</h2></div>
            <div className="h-[1px] w-36 bg-white/25 mt-6 relative overflow-hidden">
              <div
                className="h-full bg-secondary transition-all duration-300 ease-out"
                style={{ width: `${isPageLoaded ? 100 : 30}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-white/45 uppercase tracking-widest mt-3">
              <span>{isPageLoaded ? "Fully Calibrated" : "Calibrating heavy constructs..."}</span>
              <span>v1.0.4</span>
            </div>
            <p className="italic font-body-lg text-white/60 text-xs sm:text-sm mt-12 max-w-sm leading-relaxed">
              "In an era of disposable noise, stand for permanent relevance."
            </p>
          </div>
        </div>
      )}

      {/* Interactive Custom cursor tracker */}
      <Cursor />

      {/* Subtle particle canvas for golden stardust */}
      <ParticleCanvas />

      {/* Premium floating Header navigation menu */}
      <header id="main-navbar" className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 lg:px-24 py-4 sm:py-6 bg-background/80 backdrop-blur-3xl border-b border-[#111111]/8 transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]">
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
            <div className="flex items-center gap-3"><img src="/apnafit.jpg" alt="ApnaFit" className="h-10 sm:h-12 w-auto object-contain" /><h1 className="font-display-lg text-lg sm:text-2xl tracking-[0.2em] text-[#111111] uppercase font-semibold">APNAFIT</h1></div>
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
        className={`fixed inset-0 z-[60] bg-[#E8DDCF]/98 backdrop-blur-xl transition-all duration-500 ease-in-out ${isMenuOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
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
            <span data-speed="0.8" className="text-[15vw] font-display-xl font-bold tracking-tighter text-[#111111] uppercase leading-none opacity-[0.04]">APNAFIT</span>
          </div>

          <div className="relative z-10 text-center px-4 w-full max-w-4xl flex flex-col items-center">

            {/* Pedestal 3D drag model */}
            <div data-speed="0.2" className="mb-6 w-full flex justify-center">
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
            <div data-speed="-0.15" className="flex gap-3 justify-center items-center mb-8 relative z-20">
              {products.slice(0, 4).map((p) => (
                <motion.button
                  key={p.id}
                  onClick={() => setActive3DProduct(p)}
                  whileHover={{ scale: 1.15, filter: "brightness(1.1)" }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-12 h-14 bg-background/85 border rounded cursor-pointer overflow-hidden transition-all ${active3DProduct?.id === p.id
                      ? "border-secondary scale-110 shadow-lg shadow-secondary/15"
                      : "border-outline-variant/20 scale-100"
                    }`}
                >
                  <img src={p.image} alt="" className="w-full h-full object-cover" />
                </motion.button>
              ))}
            </div>

            <h1 data-speed="-0.3" className="font-display-xl text-4xl sm:text-6xl md:text-7xl text-[#111111] uppercase tracking-tight mb-4 leading-none">
              {cms.heroTitle}
            </h1>
            <p data-speed="-0.4" className="font-body-lg italic text-sm sm:text-base text-on-surface-variant max-w-md mx-auto mb-8">
              Bespoke heavy builds. Tailored silhouettes. Quiet elegance.
            </p>

            <motion.a
              href="#recent-releases"
              data-speed="-0.5"
              whileHover={{ scale: 1.05, backgroundColor: "#000000" }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto px-10 py-5 bg-[#111111] border border-[#111111] text-white font-label-caps text-xs uppercase tracking-[0.2em] transition-all rounded block"
            >
              {cms.heroSubtitle}
            </motion.a>

          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#111111]/55 animate-bounce">
            <span className="text-[10px] font-label-caps tracking-wider uppercase block text-center mb-1">Scroll to inspect constructs</span>
            <ArrowRight className="w-5 h-5 mx-auto rotate-90 text-[#111111]/70" />
          </div>
        </section>


        {/* Removed Section 2: Wear Your Identity per user request */}
        {/* SECTION 3: FULL PRODUCT ARCHIVE (HORIZONTAL FREEZE SCROLL) */}
        <section
          id="archive-showcase"
          ref={archiveSectionRef as React.RefObject<HTMLElement>}
          className="relative h-screen w-full flex flex-col justify-center overflow-hidden bg-[#E8DDCF] border-b border-[#111111]/6"
        >
          {/* Header row */}
          <div className="px-6 md:px-20 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 absolute top-24 left-0 right-0 z-20">
            <div>
              <span className="font-label-caps text-[10px] text-secondary uppercase mb-2 block tracking-[0.25em] font-semibold">The Core Archives</span>
              <h2 className="font-display-lg text-2xl sm:text-4xl text-[#111111] uppercase tracking-tight">
                Full Showcase Catalog
              </h2>
              <p className="text-xs sm:text-sm text-[#111111]/55 mt-1 font-body-md">
                Scroll to traverse the complete drape profiles — center remains in focus.
              </p>
            </div>
          </div>

          {/* Horizontal translate catalog row */}
          <div className="relative w-full flex items-center h-full pt-32">
            <div
              ref={catalogRowRef}
              className="flex flex-nowrap items-center h-full px-[50vw] gap-12 will-change-transform"
            >
              {products.length === 0 ? (
                <div className="w-full text-center py-20 text-[#111111]/50">
                  <p>Loading active collections...</p>
                </div>
              ) : (
                products.map((product, idx) => {
                  const isOutOfStock = product.stock <= 0;

                  return (
                    <div
                      key={`${product.id}-archive`}
                      className="archive-card flex-shrink-0 w-[280px] sm:w-[360px] h-[65vh] max-h-[600px] bg-[rgba(232,221,207,0.55)] backdrop-blur-2xl border border-[rgba(17,17,17,0.08)] overflow-hidden relative flex flex-col justify-between rounded shadow-[0_20px_50px_rgba(0,0,0,0.06)] will-change-transform origin-center"
                      style={{ transform: "translate3d(0,0,0)" }}
                    >
                      <button
                        type="button"
                        onClick={() => openProductInspector(product)}
                        className="flex-1 relative overflow-hidden bg-background/20 w-full text-left cursor-zoom-in focus:outline-none"
                      >
                        <img
                          className="product-img w-full h-full object-cover"
                          src={product.image}
                          alt={product.name}
                        />
                      </button>

                      <div className="p-5 h-[160px] bg-[#E8DDCF]/15 flex flex-col justify-between flex-shrink-0 border-t border-[#111111]/5">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-body-lg text-base text-[#111111] font-semibold uppercase truncate pr-2">{product.name}</h3>
                            <span className="font-label-caps text-secondary font-semibold text-xs flex-shrink-0">
                              ₹{product.price.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className="font-body-md text-[10px] text-[#111111]/60 line-clamp-2">{product.description}</p>
                        </div>
                        <button
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(product)}
                          className={`w-full py-3 border border-[#111111] font-label-caps text-[9px] uppercase tracking-[0.2em] font-semibold transition-all rounded shimmer-trigger mt-2 ${isOutOfStock
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
              "/lookbook_one.png",
              "/lookbook_two.png",
              "/lookbook_three.png",
              "/lookbook_four.png"
            ].map((img, idx) => (
              <motion.div
                key={idx}
                data-speed={idx % 2 === 0 ? "0.3" : "-0.3"}
                whileHover={{ scale: 1.03, rotate: idx % 2 === 0 ? 1 : -1 }}
                className={`group relative overflow-hidden h-[390px] sm:h-[460px] rounded border border-[#111111]/8 transition-all duration-500 bg-background/30 cursor-pointer reveal-on-scroll ${idx % 2 === 1 ? "md:translate-y-12" : ""
                  }`}
                style={{ "--reveal-rot": idx % 2 === 0 ? "1.5deg" : "-1.5deg" } as React.CSSProperties}
              >
                <img
                  src={img}
                  alt={`Lookbook photo ${idx + 1}`}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 filter brightness-95 group-hover:brightness-105 contrast-105 transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none select-none"
                />
                <span className="absolute bottom-4 left-4 text-[9px] font-mono text-[#111111]/60 uppercase bg-[#E8DDCF]/80 px-2 py-1 rounded tracking-wide border border-[#111111]/10">
                  APNA_01_#{idx + 13}
                </span>
              </motion.div>
            ))}
          </div>
        </section>


        {/* SECTION 6: JOIN THE QUIET AUTHORITY MEMBERSHIP */}
        <section className="py-40 sm:py-56 md:py-64 px-6 md:px-20 bg-[#E8DDCF] flex justify-center items-center">
          <div className="max-w-4xl w-full glass-card p-10 sm:p-20 text-center space-y-8 rounded relative overflow-hidden premium-shadow reveal-on-scroll">
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
          </div>
        </section>

      </main>


      {/* Footer System */}
      <footer className="relative z-10 w-full py-16 px-6 md:px-20 flex flex-col md:flex-row justify-between items-center md:items-end bg-[#E8DDCF] border-t border-[#111111]/10 gap-10 text-center md:text-left">
        <div className="flex flex-col gap-6 w-full md:w-auto items-center md:items-start">
          <div className="flex items-center gap-4"><img src="/apnafit.jpg" alt="ApnaFit" className="h-12 sm:h-16 w-auto object-contain" /><div className="font-display-lg text-3xl sm:text-4xl text-[#111111] uppercase tracking-tighter transition-colors">APNAFIT</div></div>

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
                          className={`w-14 h-16 rounded border overflow-hidden flex-shrink-0 bg-background transition-all ${inspectImageIndex === idx
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
                      className={`min-w-12 px-3 py-2 rounded border text-xs font-semibold ${(selectedSizes[inspectingProduct.id] || (getProductSizes(inspectingProduct).includes("M") ? "M" : getProductSizes(inspectingProduct)[0])) === size
                          ? "bg-[#111111] text-white border-[#111111]"
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
                  className="w-full py-4 bg-[#111111] text-white font-label-caps uppercase tracking-widest text-xs font-bold rounded hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
