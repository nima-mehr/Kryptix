import { useEffect, useMemo, useRef, useState } from "react";

const GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=?αβγδΩΣπμλθξζφψχ".split("");

const COLORS = [
  "#00f0ff",
  "#4da3ff",
  "#a78bfa",
  "#67e8f9",
  "#c084fc",
  "#22d3ee",
];

type Particle = {
  id: number;
  char: string;
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
};

type Props = {
  /** Diameter of the logo in CSS pixels */
  size?: number;
};

/**
 * Compact always-rotating 3D glyph sphere – matches the mobile KryptixSphereLogo.
 */
export default function KryptixSphereLogo({ size = 36 }: Props) {
  const radius = size * 0.42;
  const center = size / 2;
  const [angles, setAngles] = useState({ yaw: 0, pitch: 0 });
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const particles = useMemo(() => {
    const count = 36;
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      // Fibonacci sphere – even distribution
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      list.push({
        id: i,
        char: GLYPHS[i % GLYPHS.length],
        x: x * radius,
        y: y * radius,
        z: z * radius,
        size: Math.max(6, size * 0.2),
        color: COLORS[i % COLORS.length],
      });
    }
    return list;
  }, [radius, size]);

  useEffect(() => {
    const yawPeriod = 12000; // ms for full 360°
    const pitchPeriod = 18000;

    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const elapsed = t - startRef.current;
      setAngles({
        yaw: ((elapsed / yawPeriod) * 360) % 360,
        pitch: ((elapsed / pitchPeriod) * 360) % 360,
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const yaw = (angles.yaw * Math.PI) / 180;
  const pitch = (angles.pitch * Math.PI) / 180;
  const perspective = radius * 2.8;

  const projected = particles.map((p) => {
    // Rotate around Y (yaw)
    let x = p.x * Math.cos(yaw) - p.z * Math.sin(yaw);
    let z = p.x * Math.sin(yaw) + p.z * Math.cos(yaw);
    let y = p.y;

    // Then slight rotate around X (pitch)
    const y2 = y * Math.cos(pitch) - z * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z * Math.cos(pitch);
    y = y2;
    z = z2;

    const scale3d = perspective / (perspective + z);
    const px = x * scale3d;
    const py = y * scale3d;
    const depth = (z + radius) / (radius * 2); // 0 = back, 1 = front
    const opacity = 0.35 + 0.65 * (1 - depth * 0.85);

    return {
      ...p,
      left: center + px - p.size / 2,
      top: center + py - p.size / 2,
      opacity,
      scale: scale3d,
      zIndex: Math.round((1 - depth) * 200),
    };
  });

  return (
    <div
      className="glyph-sphere"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {projected.map((p) => (
        <span
          key={p.id}
          className="glyph-shard"
          style={{
            left: p.left,
            top: p.top,
            opacity: p.opacity,
            zIndex: p.zIndex,
            fontSize: p.size,
            color: p.color,
            textShadow: `0 0 4px ${p.color}`,
            transform: `scale(${p.scale})`,
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
