import React, { useEffect, useRef } from 'react';

/**
 * InteractiveGradientBackground
 *
 * Premium, reactive abstract gradient background for CivicResolve:
 * - Base canvas: #071426 (deep midnight navy)
 * - Midnight blue: #10243B
 * - Ocean / royal blue: #164E70 & #1D4ED8
 * - Deep cyan: #087F8C & #06B6D4
 * - Teal: #13B8A6 & #2DD4BF
 *
 * Features:
 * 1. Multiple overlapping softly blurred radial gradients with visible depth and rich saturation.
 * 2. Multi-plane parallax: Deep blue background plumes and mid-ground cyan/teal luminous clouds shift at different depth factors.
 * 3. Continuous gentle organic drift (18s harmonic cycle) ensuring the canvas feels alive even when idle.
 * 4. Pointer-reactive luminescent spotlight: smoothly follows cursor on desktop and tracks finger on touch devices with smooth LERP inertia.
 * 5. Touch-friendly: soft touch glow at contact point, shifts lighting subtly, smoothly returns to ambient resting position on release.
 * 6. Zero scroll/tap interference: pointer-events: none on all layers, passive window event listeners.
 * 7. Zero React re-renders: GPU-accelerated translate3d on direct DOM refs.
 * 8. Respects prefers-reduced-motion by freezing animations in an elegant, static resting state.
 */
export const InteractiveGradientBackground: React.FC = () => {
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const layer3Ref = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect motion preferences
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isReducedMotion = motionQuery.matches;

    // Viewport coordinates
    const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const height = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Target positions (normalized -1 to 1 for parallax, pixel coordinates for spotlight)
    const target = {
      normX: 0,
      normY: 0,
      pixelX: width / 2,
      pixelY: height * 0.35,
      active: false,
    };

    // Current interpolated positions
    const current = {
      normX: 0,
      normY: 0,
      pixelX: target.pixelX,
      pixelY: target.pixelY,
      opacity: 0.45,
    };

    let animFrameId: number | null = null;
    let time = 0;

    // Linear interpolation
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

    const render = () => {
      if (isReducedMotion) {
        // Reduced motion: position once at resting center and exit
        if (layer1Ref.current) layer1Ref.current.style.transform = 'translate3d(0, 0, 0)';
        if (layer2Ref.current) layer2Ref.current.style.transform = 'translate3d(0, 0, 0)';
        if (layer3Ref.current) layer3Ref.current.style.transform = 'translate3d(0, 0, 0)';
        if (spotlightRef.current) {
          spotlightRef.current.style.transform = `translate3d(${target.pixelX - 275}px, ${target.pixelY - 275}px, 0)`;
          spotlightRef.current.style.opacity = '0.4';
        }
        return;
      }

      // Organic ambient floating drift (~18s cycle)
      time += 0.0055;
      const ambX1 = Math.sin(time * 0.6) * 36;
      const ambY1 = Math.cos(time * 0.4) * 28;

      const ambX2 = Math.cos(time * 0.5) * 50;
      const ambY2 = Math.sin(time * 0.7) * 38;

      const ambX3 = Math.sin(time * 0.8) * 25;
      const ambY3 = Math.cos(time * 0.6) * 20;

      // Smooth lag / interpolation towards target
      current.normX = lerp(current.normX, target.normX, 0.045);
      current.normY = lerp(current.normY, target.normY, 0.045);
      current.pixelX = lerp(current.pixelX, target.pixelX, 0.065);
      current.pixelY = lerp(current.pixelY, target.pixelY, 0.065);

      const targetOpacity = target.active ? 0.85 : 0.45;
      current.opacity = lerp(current.opacity, targetOpacity, 0.05);

      // Layer 1: Deep Ocean & Cobalt Blue clouds (Deep Parallax ~24px)
      if (layer1Ref.current) {
        const x1 = ambX1 + current.normX * 24;
        const y1 = ambY1 + current.normY * 20;
        layer1Ref.current.style.transform = `translate3d(${x1.toFixed(2)}px, ${y1.toFixed(2)}px, 0)`;
      }

      // Layer 2: Vivid Teal & Cyan Luminous Plumes (Counter-Parallax ~-42px)
      if (layer2Ref.current) {
        const x2 = ambX2 - current.normX * 42;
        const y2 = ambY2 - current.normY * 34;
        layer2Ref.current.style.transform = `translate3d(${x2.toFixed(2)}px, ${y2.toFixed(2)}px, 0)`;
      }

      // Layer 3: Secondary Accent Lagoons (Foreground Parallax ~30px)
      if (layer3Ref.current) {
        const x3 = ambX3 + current.normX * 30;
        const y3 = ambY3 + current.normY * 25;
        layer3Ref.current.style.transform = `translate3d(${x3.toFixed(2)}px, ${y3.toFixed(2)}px, 0)`;
      }

      // Layer 4: Interactive Pointer & Touch Spotlight (Smooth Inertia)
      if (spotlightRef.current) {
        const sx = current.pixelX - 275;
        const sy = current.pixelY - 275;
        spotlightRef.current.style.transform = `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0)`;
        spotlightRef.current.style.opacity = current.opacity.toFixed(3);
      }

      animFrameId = requestAnimationFrame(render);
    };

    // Pointer move listener (handles desktop mouse and touch drag)
    const onPointerMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      target.normX = (e.clientX / w) * 2 - 1;
      target.normY = (e.clientY / h) * 2 - 1;
      target.pixelX = e.clientX;
      target.pixelY = e.clientY;
      target.active = true;
    };

    // Pointer down: boost glow at contact point
    const onPointerDown = (e: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      target.normX = (e.clientX / w) * 2 - 1;
      target.normY = (e.clientY / h) * 2 - 1;
      target.pixelX = e.clientX;
      target.pixelY = e.clientY;
      target.active = true;
    };

    // Pointer up: smoothly return target to ambient center
    const onPointerUp = () => {
      target.active = false;
      target.normX = 0;
      target.normY = 0;
      target.pixelX = (window.innerWidth || 1280) / 2;
      target.pixelY = (window.innerHeight || 800) * 0.35;
    };

    // Pointer leave: return parallax to center
    const onPointerLeave = () => {
      target.normX = 0;
      target.normY = 0;
      target.active = false;
      target.pixelX = (window.innerWidth || 1280) / 2;
      target.pixelY = (window.innerHeight || 800) * 0.35;
    };

    // Resize handler
    const onResize = () => {
      if (!target.active && typeof window !== 'undefined') {
        target.pixelX = window.innerWidth / 2;
        target.pixelY = window.innerHeight * 0.35;
      }
    };

    // Motion preference changes
    const onMotionPreferenceChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
      if (isReducedMotion) {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        render();
      } else {
        animFrameId = requestAnimationFrame(render);
      }
    };

    // Passive window listeners
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave, { passive: true });
    motionQuery.addEventListener('change', onMotionPreferenceChange);

    // Start loop
    animFrameId = requestAnimationFrame(render);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mouseleave', onPointerLeave);
      motionQuery.removeEventListener('change', onMotionPreferenceChange);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#071426] select-none"
      aria-hidden="true"
    >
      {/* 
        LAYER 1: DEEP OCEAN, COBALT & MIDNIGHT BLUE FOUNDATION
        Rich blue waves (#1D4ED8, #164E70, #10243B) providing dark dimensional depth
      */}
      <div
        ref={layer1Ref}
        className="absolute inset-0 w-full h-full will-change-transform"
      >
        {/* Upper-right rich royal/cobalt blue plume */}
        <div
          className="absolute -top-[15%] right-[5%] w-[850px] h-[850px] rounded-full blur-[85px] opacity-75"
          style={{
            background:
              'radial-gradient(circle at 45% 45%, #1D4ED8 0%, #164E70 50%, #10243B 75%, transparent 90%)',
          }}
        />

        {/* Center-left ocean swell */}
        <div
          className="absolute top-[20%] -left-[12%] w-[900px] h-[850px] rounded-full blur-[90px] opacity-70"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #164E70 0%, #10243B 55%, transparent 85%)',
          }}
        />

        {/* Lower-center deep indigo base */}
        <div
          className="absolute -bottom-[20%] left-[25%] w-[1000px] h-[750px] rounded-full blur-[95px] opacity-65"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #1E40AF 0%, #164E70 45%, #071426 80%, transparent 90%)',
          }}
        />
      </div>

      {/* 
        LAYER 2: VIVID TEAL & CYAN LUMINOUS PLUMES
        Luminous highlights (#13B8A6, #087F8C, #06B6D4) creating vibrant atmospheric contrast
      */}
      <div
        ref={layer2Ref}
        className="absolute inset-0 w-full h-full will-change-transform"
      >
        {/* Top-left to hero headline teal/cyan glow */}
        <div
          className="absolute -top-[8%] left-[10%] w-[750px] h-[700px] rounded-full blur-[80px] opacity-65"
          style={{
            background:
              'radial-gradient(circle at 45% 45%, #13B8A6 0%, #087F8C 45%, #164E70 70%, transparent 85%)',
          }}
        />

        {/* Mid-right hero cards bright cyan bloom */}
        <div
          className="absolute top-[18%] right-[8%] w-[650px] h-[650px] rounded-full blur-[75px] opacity-55"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #06B6D4 0%, #087F8C 45%, #164E70 70%, transparent 85%)',
          }}
        />

        {/* Bottom-right teal/cyan accent swell */}
        <div
          className="absolute bottom-[2%] right-[15%] w-[700px] h-[650px] rounded-full blur-[80px] opacity-55"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #13B8A6 0%, #087F8C 50%, #164E70 75%, transparent 90%)',
          }}
        />
      </div>

      {/* 
        LAYER 3: SECONDARY CYAN & INDIGO ACCENT LAGOONS
        Adds layered multi-tonal fluidity across the vertical viewport
      */}
      <div
        ref={layer3Ref}
        className="absolute inset-0 w-full h-full will-change-transform"
      >
        {/* Mid-page cyan highlight */}
        <div
          className="absolute top-[48%] left-[5%] w-[600px] h-[550px] rounded-full blur-[80px] opacity-45"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #087F8C 0%, #13B8A6 40%, transparent 80%)',
          }}
        />

        {/* Bottom-left cobalt pool */}
        <div
          className="absolute -bottom-[10%] -left-[5%] w-[750px] h-[650px] rounded-full blur-[85px] opacity-60"
          style={{
            background:
              'radial-gradient(circle at 45% 45%, #1D4ED8 0%, #164E70 50%, transparent 80%)',
          }}
        />
      </div>

      {/* 
        LAYER 4: INTERACTIVE POINTER & TOUCH SPOTLIGHT
        Fluid, lerped light source that follows mouse movement or touch contact
      */}
      <div
        ref={spotlightRef}
        className="absolute top-0 left-0 w-[550px] h-[550px] rounded-full blur-[70px] will-change-transform pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(45, 212, 191, 0.45) 0%, rgba(6, 182, 212, 0.28) 35%, rgba(22, 78, 112, 0.12) 65%, transparent 85%)',
        }}
      />
    </div>
  );
};
