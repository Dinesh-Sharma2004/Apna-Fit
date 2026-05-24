import React, { useEffect, useRef, useState } from "react";

interface InteractiveCharacterProps {
  onProgress?: (progress: number) => void;
  onLoaded?: () => void;
  showCanvas: boolean;
}

/** Linear interpolation for buttery smooth transitions */
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Clamp a value between min and max */
const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

export default function InteractiveCharacter({
  onProgress,
  onLoaded,
  showCanvas,
}: InteractiveCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Use refs so we never stale-close over old values inside the RAF loop
  const showCanvasRef = useRef(showCanvas);
  useEffect(() => {
    showCanvasRef.current = showCanvas;
  }, [showCanvas]);

  const images = useRef<HTMLImageElement[]>([]);
  const TOTAL_FRAMES = 79;

  /* ── Smooth-state refs (mutated only inside RAF) ── */
  const state = useRef({
    currentFrame: 1,
    targetFrame: 1,
    currentX: 0.2,
    targetX: 0.2,
    currentY: 0.68,
    targetY: 0.68,
    currentOpacity: 0,
    targetOpacity: 0,
    scrollRatio: 0,
    isScrolling: false,
  });

  const animFrameId = useRef<number>(0);
  const scrollTimeout = useRef<number | null>(null);

  /* ─────────────────────────────────────────────────────────────
     PHASE 1: Preload all frames
  ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    let loaded = 0;
    const imgs: HTMLImageElement[] = new Array(TOTAL_FRAMES);

    const onFrameLoaded = () => {
      loaded++;
      const pct = Math.round((loaded / TOTAL_FRAMES) * 100);
      if (onProgress) onProgress(pct);
      if (loaded === TOTAL_FRAMES) {
        console.log("[Character] All frames loaded.");
        setIsLoaded(true);
        if (onLoaded) onLoaded();
      }
    };

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const pad = String(i).padStart(3, "0");

      img.onload = onFrameLoaded;
      img.onerror = () => {
        // Try alternate prefix
        const alt = new Image();
        alt.src = `/final_frame/frame_${pad}.png`;
        alt.onload = () => { imgs[i - 1] = alt; onFrameLoaded(); };
        alt.onerror = () => {
          // Frame missing — still count it so we don't hang
          console.warn(`[Character] Frame ${pad} missing.`);
          onFrameLoaded();
        };
        imgs[i - 1] = alt;
        return;
      };

      img.src = `/final_frame/${pad}.png`;
      imgs[i - 1] = img;
    }

    images.current = imgs;

    /* Track scroll ratio for frame mapping */
    const onScroll = () => {
      const scrollHeight = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      state.current.scrollRatio = clamp(window.scrollY / scrollHeight, 0, 1);
      state.current.isScrolling = true;
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = window.setTimeout(() => {
        state.current.isScrolling = false;
      }, 150);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────
     PHASE 2: Render loop (starts once frames are loaded)
  ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isLoaded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    let ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    /* ── Resize canvas to device pixel ratio ── */
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      // Re-fetch ctx after resize (some browsers invalidate it)
      ctx = canvas.getContext("2d", { alpha: true });
      if (ctx) ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    /* ── RAF render loop ── */
    const render = () => {
      const s = state.current;
      const r = s.scrollRatio;

      /* 1. Map scroll → target frame */
      if (r <= 0.25) {
        s.targetFrame = 1 + (r / 0.25) * 10;
      } else if (r <= 0.40) {
        s.targetFrame = 11 + ((r - 0.25) / 0.15) * 8;
      } else {
        s.targetFrame = 19 + ((r - 0.40) / 0.60) * (TOTAL_FRAMES - 19);
      }
      s.targetFrame = clamp(s.targetFrame, 1, TOTAL_FRAMES);

      /* 2. Map frame → position */
      if (s.currentFrame < 11) {
        s.targetX = 0.18;
      } else if (s.currentFrame <= 19) {
        const t = (s.currentFrame - 11) / 8;
        s.targetX = 0.18 + t * 0.64;
      } else {
        s.targetX = 0.82;
      }
      s.targetY = 0.66;

      /* 3. Visibility gating */
      const visible = showCanvasRef.current && r < 0.55;
      s.targetOpacity = visible ? 1 : 0;

      /* 4. Lerp — fast during active scrolling, slower at rest */
      const frameLerp = s.isScrolling ? 0.12 : 0.22;
      const posLerp   = s.isScrolling ? 0.06 : 0.18;
      const opLerp    = 0.08;

      // Slow down lerp in the action segment 11-19
      const inActionZone = s.currentFrame >= 10 && s.currentFrame <= 20;
      const effectiveFLerp = inActionZone ? frameLerp * 0.35 : frameLerp;
      const effectivePLerp = inActionZone ? posLerp * 0.35 : posLerp;

      s.currentFrame  = lerp(s.currentFrame,  s.targetFrame,  effectiveFLerp);
      s.currentX      = lerp(s.currentX,      s.targetX,      effectivePLerp);
      s.currentY      = lerp(s.currentY,      s.targetY,      effectivePLerp);
      s.currentOpacity = lerp(s.currentOpacity, s.targetOpacity, opLerp);

      /* 5. Draw */
      if (!ctx) { animFrameId.current = requestAnimationFrame(render); return; }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      ctx.clearRect(0, 0, vw, vh);

      const frameIdx = clamp(Math.round(s.currentFrame) - 1, 0, TOTAL_FRAMES - 1);
      const img = images.current[frameIdx];

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(s.currentOpacity, 0, 1);

        /* Responsive scaling: fit character to ~72% viewport height */
        const maxH = vh * 0.72;
        const maxW = vw * 0.42;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let drawH = maxH;
        let drawW = drawH * imgAspect;
        if (drawW > maxW) { drawW = maxW; drawH = drawW / imgAspect; }

        /* Motion blur during the slide gesture */
        if (
          s.isScrolling &&
          s.currentFrame >= 11 &&
          s.currentFrame <= 19
        ) {
          ctx.filter = "blur(1.5px)";
        } else {
          ctx.filter = "none";
        }

        const cx = vw * s.currentX;
        const cy = vh * s.currentY;
        ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
        ctx.restore();

        /* CSS glow fades as we scroll down */
        const glowAlpha = clamp(0.18 - r * 0.36, 0, 0.18);
        canvas.style.filter =
          glowAlpha > 0.01
            ? `drop-shadow(0 0 45px rgba(255,255,255,${glowAlpha.toFixed(3)}))`
            : "none";
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animFrameId.current);
    };
  }, [isLoaded]);

  return (
    <div
      className="pointer-events-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 5,
        overflow: "hidden",
        /* Wrapper opacity is managed by the canvas globalAlpha — keep wrapper fully visible */
        opacity: 1,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          willChange: "filter",
        }}
      />
    </div>
  );
}
