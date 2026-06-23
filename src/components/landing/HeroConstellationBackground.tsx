"use client";

/**
 * Hero background visual — a drifting "neural constellation" of gold nodes on
 * black, linked by faint lines that brighten and reach toward the cursor. Reads
 * as AI / automation. Rendered on a single 2D canvas (no WebGL, no deps) behind
 * the z-10 hero text in ImmersiveHero (desktop-only).
 *
 * Perf: node count scales with area and is capped; the loop pauses when the tab
 * is hidden. Under prefers-reduced-motion it paints one static frame and never
 * animates or tracks the pointer. A radial mask fades the field at the edges.
 */
import { useEffect, useRef } from "react";

const GOLD = "212, 175, 55"; // brand gold #D4AF37, matches the prior aurora
const LINK_DIST = 140; // px — draw a line when two nodes are closer than this
const MOUSE_DIST = 180; // px — node↔cursor link + glow radius

export function HeroConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let raf = 0;
    let nodes: { x: number; y: number; vx: number; vy: number }[] = [];
    const mouse = { x: -9999, y: -9999, active: false };

    const seed = () => {
      const count = Math.min(
        90,
        Math.max(28, Math.round((width * height) / 11000))
      );
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    };

    const render = () => {
      c.clearRect(0, 0, width, height);

      // node-to-node links
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DIST) {
            c.strokeStyle = `rgba(${GOLD}, ${(1 - dist / LINK_DIST) * 0.18})`;
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.stroke();
          }
        }
      }

      // nodes + cursor links/glow
      for (const n of nodes) {
        let r = 1.6;
        let opacity = 0.55;
        if (mouse.active) {
          const dist = Math.hypot(n.x - mouse.x, n.y - mouse.y);
          if (dist < MOUSE_DIST) {
            const t = 1 - dist / MOUSE_DIST;
            c.strokeStyle = `rgba(${GOLD}, ${t * 0.5})`;
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(n.x, n.y);
            c.lineTo(mouse.x, mouse.y);
            c.stroke();
            r += t * 1.6;
            opacity += t * 0.4;
          }
        }
        c.fillStyle = `rgba(${GOLD}, ${Math.min(opacity, 1)})`;
        c.beginPath();
        c.arc(n.x, n.y, r, 0, Math.PI * 2);
        c.fill();
      }
    };

    const tick = () => {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }
      render();
      raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      const rect = cv.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(width * dpr);
      cv.height = Math.round(height * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) render(); // repaint the single static frame on resize
    };

    const onMove = (e: MouseEvent) => {
      const rect = cv.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active =
        mouse.x >= 0 && mouse.x <= width && mouse.y >= 0 && mouse.y <= height;
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduced) {
      render();
    } else {
      window.addEventListener("mousemove", onMove);
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      style={{
        WebkitMaskImage:
          "radial-gradient(ellipse at center, #000 55%, transparent 100%)",
        maskImage:
          "radial-gradient(ellipse at center, #000 55%, transparent 100%)",
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
