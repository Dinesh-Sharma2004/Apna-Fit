import { useEffect, useRef } from "react";

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      speed: number;
      color: string;
    }[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      const isMobile = window.innerWidth < 768;
      const count = isMobile ? 35 : 110;
      particles = [];
      for (let i = 0; i < count; i++) {
        const isGold = Math.random() > 0.45;
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -(Math.random() * 0.4 + 0.1), // Gentle floating upwards
          size: Math.random() * 1.8 + 0.2,
          alpha: Math.random() * 0.45 + 0.1,
          speed: Math.random() * 0.5 + 0.2,
          color: isGold ? "138, 90, 36" : "212, 212, 216"
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        p.y += p.vy * p.speed;
        p.x += p.vx * p.speed;

        // Bounce side edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;

        // Reset if floats off the top
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-40 z-0"
    />
  );
}
