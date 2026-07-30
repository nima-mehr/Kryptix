import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  Text,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CENTER_X = SCREEN_W / 2;
const CENTER_Y = SCREEN_H / 2 - 20; // slight upward bias so it sits nicely above login

// Character pool – cryptographic / abstract look
const GLYPHS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=?αβγδΩΣπμλθξζφψχΣΔ∇∞≠≈≤≥±√∫∑∏∂'.split(
    ''
  );

type Particle = {
  id: number;
  char: string;
  // final position on sphere (relative to center)
  targetX: number;
  targetY: number;
  // start position (off-screen-ish)
  startX: number;
  startY: number;
  size: number;
  color: string;
  delay: number;
  rotate: number;
};

const PARTICLE_COUNT = 62;
const SPHERE_RADIUS = Math.min(SCREEN_W, SCREEN_H) * 0.28;
const ANIM_DURATION = 1150; // ms – core flight
const SETTLE_EXTRA = 280; // soft settle + glow

function createParticles(): Particle[] {
  const particles: Particle[] = [];
  const colors = ['#00f0ff', '#4da3ff', '#a78bfa', '#67e8f9', '#c084fc', '#22d3ee'];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Fibonacci sphere distribution for more even coverage
    const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2; // -1 → 1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = Math.PI * (3 - Math.sqrt(5)) * i; // golden angle

    const targetX = Math.cos(theta) * radiusAtY * SPHERE_RADIUS;
    const targetY = y * SPHERE_RADIUS;

    // Start far outside, random direction
    const angle = Math.random() * Math.PI * 2;
    const dist = SPHERE_RADIUS * 2.8 + Math.random() * 180;
    const startX = Math.cos(angle) * dist;
    const startY = Math.sin(angle) * dist * 0.85; // slightly flatter vertical

    particles.push({
      id: i,
      char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      targetX,
      targetY,
      startX,
      startY,
      size: 11 + Math.floor(Math.random() * 9),
      color: colors[i % colors.length],
      delay: Math.floor(Math.random() * 220), // staggered entrance
      rotate: (Math.random() - 0.5) * 40,
    });
  }
  return particles;
}

type ShardProps = {
  particle: Particle;
  progress: Animated.SharedValue<number>;
};

function Shard({ particle, progress }: ShardProps) {
  const style = useAnimatedStyle(() => {
    const p = progress.value; // 0 → 1

    // Position: fly from start → target
    const x = interpolate(p, [0, 1], [particle.startX, particle.targetX]);
    const y = interpolate(p, [0, 1], [particle.startY, particle.targetY]);

    // Opacity: fade in early, stay visible
    const opacity = interpolate(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0.92]);

    // Scale: start a bit larger / smaller, settle
    const scale = interpolate(p, [0, 0.6, 1], [0.35, 1.12, 1]);

    // Subtle rotation while flying
    const rot = interpolate(p, [0, 1], [particle.rotate * 2.5, particle.rotate * 0.3]);

    return {
      position: 'absolute' as const,
      left: CENTER_X + x - particle.size / 2,
      top: CENTER_Y + y - particle.size / 2,
      opacity,
      transform: [{ scale }, { rotate: `${rot}deg` }],
    };
  });

  return (
    <Animated.View style={style} pointerEvents="none">
      <Text
        style={{
          fontSize: particle.size,
          color: particle.color,
          fontWeight: '600',
          fontFamily: 'SpaceMono-Regular', // falls back gracefully if not loaded
          textShadowColor: particle.color,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
          includeFontPadding: false,
        }}
      >
        {particle.char}
      </Text>
    </Animated.View>
  );
}

type Props = {
  onFinish: () => void;
};

export default function IntroSphereAnimation({ onFinish }: Props) {
  const progress = useSharedValue(0);
  const glow = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  const particles = useMemo(() => createParticles(), []);

  const finish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    // Main assembly
    progress.value = withTiming(1, {
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    // Soft glow pulse near the end
    glow.value = withDelay(
      ANIM_DURATION - 180,
      withSequence(
        withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(0.55, { duration: 280 })
      )
    );

    // Hold a moment then fade the whole intro out
    const total = ANIM_DURATION + SETTLE_EXTRA;
    const timeout = setTimeout(() => {
      containerOpacity.value = withTiming(
        0,
        { duration: 320, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(finish)();
        }
      );
    }, total);

    return () => clearTimeout(timeout);
  }, [progress, glow, containerOpacity, finish]);

  const skip = () => {
    // Immediate skip
    containerOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(finish)();
    });
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.55,
    transform: [{ scale: 0.85 + glow.value * 0.25 }],
  }));

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={skip}>
      <Animated.View style={[styles.root, containerStyle]}>
        {/* Soft radial glow behind the sphere */}
        <Animated.View style={[styles.glow, glowStyle]} />

        {particles.map((p) => (
          <Shard key={p.id} particle={p} progress={progress} />
        ))}

        {/* Subtle skip hint – disappears quickly */}
        <Text style={styles.skipHint}>Tap to skip</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  glow: {
    position: 'absolute',
    width: SPHERE_RADIUS * 2.6,
    height: SPHERE_RADIUS * 2.6,
    borderRadius: SPHERE_RADIUS * 1.3,
    backgroundColor: '#0ea5e9',
    // soft blur approximation via large size + low opacity
    opacity: 0.25,
  },
  skipHint: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.28)',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
