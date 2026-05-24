import { useEffect, useRef, useState } from "react";

export default function Cursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const mouse = { x: -100, y: -100 };
    const current = { x: -100, y: -100 };
    let rafId = 0;

    const tick = () => {
      current.x += (mouse.x - current.x) * 0.22;
      current.y += (mouse.y - current.y) * 0.22;
      cursor.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      rafId = window.requestAnimationFrame(tick);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handlePointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      setHovered(
        target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          !!target.closest("a, button, .clickable, [role='button'], input, textarea, select")
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("pointerover", handlePointerOver);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("pointerover", handlePointerOver);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className={`hidden md:block fixed left-0 top-0 pointer-events-none z-[9999] rounded-full border transition-[width,height,background-color,border-style,opacity] duration-250 ease-out will-change-transform flex items-center justify-center ${
        hovered 
          ? "w-14 h-14 bg-secondary/8 border-dashed border-secondary" 
          : "w-7 h-7 border-tertiary/65 bg-transparent"
      }`}
    >
      <div 
        className={`rounded-full transition-all duration-200 ${
          hovered ? "w-1.5 h-1.5 bg-secondary" : "w-1 h-1 bg-tertiary"
        }`}
      />
    </div>
  );
}
