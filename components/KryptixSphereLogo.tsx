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
  size: number;
  color: string;
};

type Props = {
  /** Diameter of the logo in points */
  size?: number;
};

/**
 * Compact always-rotating glyph sphere – used as the app logo
 * (login settled state + vault header).
 */
export default function KryptixSphereLogo({ size = 36 }: Props) {
  const radius = size * 0.42;
  const spin = useSharedValue(0);

  const particles = useMemo(() => {
    const count = 28;
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      list.push({
        id: i,
        char: GLYPHS[i % GLYPHS.length],
        x: Math.cos(theta) * radiusAtY * radius,
        y: y * radius,
        size: Math.max(6, size * 0.22),
        color: COLORS[i % COLORS.length],
      });
    }
    return list;
  }, [radius, size]);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(360, { duration: 14000, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(spin);
  }, [spin]);

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {particles.map((p) => (
        <Shard key={p.id} particle={p} spin={spin} center={size / 2} />
      ))}
    </View>
  );
}

function Shard({
  particle,
  spin,
  center,
}: {
  particle: Particle;
  spin: Animated.SharedValue<number>;
  center: number;
}) {
  const style = useAnimatedStyle(() => {
    const angle = (spin.value * Math.PI) / 180;
    const cosA = Math.cos(angle);
    const spunX = particle.x * cosA;
    const depth = 0.55 + 0.45 * Math.abs(cosA);

    return {
      position: 'absolute' as const,
      left: center + spunX - particle.size / 2,
      top: center + particle.y - particle.size / 2,
      opacity: 0.65 + 0.35 * depth,
      transform: [{ scale: depth }],
      zIndex: Math.round(depth * 100),
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
