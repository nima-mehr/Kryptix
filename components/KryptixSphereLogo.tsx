import React, { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

const GLYPHS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=?αβγδΩΣπμλθξζφψχ'.split('');

const COLORS = ['#00f0ff', '#4da3ff', '#a78bfa', '#67e8f9', '#c084fc', '#22d3ee'];

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
  /** Diameter of the logo in points */
  size?: number;
};

/**
 * Compact always-rotating 3D glyph sphere – app logo
 * (login settled state + vault header).
 */
export default function KryptixSphereLogo({ size = 36 }: Props) {
  const radius = size * 0.42;
  const spinY = useSharedValue(0);
  const spinX = useSharedValue(0);

  const particles = useMemo(() => {
    const count = 36;
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      // Fibonacci sphere – even distribution on a real sphere
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
    // Primary yaw rotation
    spinY.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
    // Subtle pitch so it never looks like a flat disk
    spinX.value = withRepeat(
      withTiming(360, { duration: 18000, easing: Easing.linear }),
      -1,
      false
    );
    return () => {
      cancelAnimation(spinY);
      cancelAnimation(spinX);
    };
  }, [spinY, spinX]);

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {particles.map((p) => (
        <Shard
          key={p.id}
          particle={p}
          spinY={spinY}
          spinX={spinX}
          center={size / 2}
          radius={radius}
        />
      ))}
    </View>
  );
}

function Shard({
  particle,
  spinY,
  spinX,
  center,
  radius,
}: {
  particle: Particle;
  spinY: Animated.SharedValue<number>;
  spinX: Animated.SharedValue<number>;
  center: number;
  radius: number;
}) {
  const style = useAnimatedStyle(() => {
    const yaw = (spinY.value * Math.PI) / 180;
    const pitch = (spinX.value * Math.PI) / 180;

    // Rotate around Y (yaw)
    let x = particle.x * Math.cos(yaw) - particle.z * Math.sin(yaw);
    let z = particle.x * Math.sin(yaw) + particle.z * Math.cos(yaw);
    let y = particle.y;

    // Then slight rotate around X (pitch)
    const y2 = y * Math.cos(pitch) - z * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z * Math.cos(pitch);
    y = y2;
    z = z2;

    // Perspective projection – points farther away shrink more
    const perspective = radius * 2.8;
    const scale3d = perspective / (perspective + z);
    const px = x * scale3d;
    const py = y * scale3d;

    // Depth cue for opacity / layering (z toward camera is negative after rot)
    const depth = (z + radius) / (radius * 2); // 0 = back, 1 = front
    const opacity = 0.35 + 0.65 * (1 - depth * 0.85);

    return {
      position: 'absolute' as const,
      left: center + px - particle.size / 2,
      top: center + py - particle.size / 2,
      opacity,
      transform: [{ scale: scale3d }],
      zIndex: Math.round((1 - depth) * 200),
    };
  });

  return (
    <Animated.View style={style}>
      <Text
        style={{
          fontSize: particle.size,
          color: particle.color,
          fontWeight: '600',
          textShadowColor: particle.color,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 4,
          includeFontPadding: false,
        }}
      >
        {particle.char}
      </Text>
    </Animated.View>
  );
}
