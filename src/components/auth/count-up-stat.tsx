"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUpStat({
  value,
  duration = 900,
  reducedMotion,
  className,
}: {
  value: number;
  duration?: number;
  reducedMotion: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(reducedMotion ? value : 0);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    let start: number | null = null;
    let frame = 0;

    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(easeOutCubic(progress) * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reducedMotion]);

  return <span className={className}>{display}</span>;
}

export function InfinityStat({
  reducedMotion,
  className,
}: {
  reducedMotion: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <span
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transition: reducedMotion ? "none" : "opacity 0.9s ease-out",
      }}
    >
      ∞
    </span>
  );
}
