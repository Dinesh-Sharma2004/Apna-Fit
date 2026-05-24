import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface TShirt3DProps {
  imageSrc: string;
  name: string;
}

export default function TShirt3D({ imageSrc, name }: TShirt3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);

  // Mouse / Touch rotation state
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  // Smooth springs
  const springX = useSpring(rotateX, { damping: 25, stiffness: 100 });
  const springY = useSpring(rotateY, { damping: 25, stiffness: 100 });

  // Map rotations to translation shifts for an active 3D look
  const shadowX = useTransform(springY, [-30, 30], [20, -20]);
  const shadowY = useTransform(springX, [-30, 30], [20, -20]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Rotation with gesture bounds
    if (isDragging) {
      const sensitivity = 0.3;
      const newX = rotateX.get() - e.movementY * sensitivity;
      const newY = rotateY.get() + e.movementX * sensitivity;

      // Bound rotation to mimic a heavy apparel stand
      rotateX.set(Math.max(-20, Math.min(20, newX)));
      rotateY.set(Math.max(-40, Math.min(40, newY)));
    }

    // Interactive custom dynamic highlight spotlight positions
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setLightPos({ x, y });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    // Smooth magnetic return to base front-facing pose
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        handlePointerUp();
        setIsHovered(false);
      }}
      onPointerEnter={() => setIsHovered(true)}
      className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[480px] md:h-[480px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
    >
      {/* Light spotlight reflection overlay layer */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300 z-10 mixt-overlay"
        style={{
          opacity: isHovered ? 0.35 : 0.15,
          background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, rgba(233, 195, 73, 0.3) 0%, transparent 55%)`,
          mixBlendMode: "color-dodge",
        }}
      />

      {/* Heavy shadow mapping beneath the clothing pedestal */}
      <motion.div
        className="absolute bottom-6 w-4/5 h-8 bg-secondary/25 rounded-full blur-xl pointer-events-none"
        style={{
          x: shadowX,
          y: shadowY,
          scale: isHovered ? 1.05 : 0.95,
        }}
      />

      {/* Pedestal or base backdrop */}
      <div className="absolute inset-0 bg-radial from-secondary/[0.08] to-transparent pointer-events-none rounded-full" />

      {/* Structured Apparel Model Container */}
      <motion.div
        className="relative w-full h-full flex items-center justify-center pointer-events-none"
        style={{
          rotateX: springX,
          rotateY: springY,
          scale: isHovered ? 1.04 : 1,
          transformStyle: "preserve-3d",
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <img
          src={imageSrc}
          alt={name}
          className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)] brightness-110 contrast-110 grayscale-[15%] transition-all duration-300"
          draggable="false"
        />

        {/* Cinematic Golden Wireframe accent representing APNAFIT signature identity drapes overlay */}
        <div 
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 mix-blend-screen opacity-10 flex-col"
          style={{ transform: "translateZ(30px)" }}
        >
          <div className="border border-secondary/30 w-3/4 h-3/4 rounded-full border-dashed animate-spin [animation-duration:90s]" />
        </div>
      </motion.div>

      {/* Guide tags */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-label-caps text-outline/80 tracking-[0.3em] uppercase opacity-60 flex gap-2 items-center">
        <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-ping" />
        Drag or slide to inspect weave structure
      </div>
    </div>
  );
}
