import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  StyleSheet,
  Dimensions,
  Pressable,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const INTRO_RADIUS = Math.min(SCREEN_W, SCREEN_H) * 0.28;
const LOGO_RADIUS = 22;
const LOGO_SCALE = LOGO_RADIUS / INTRO_RADIUS;

const ANIM_DURATION = 1100;
const MOVE_DURATION = 520;
const SETTLE_HOLD = 180;

const GLYPHS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=?αβγδΩΣπμλθξζφψχ'.split('');

type Particle = {
  id: number;
  char: string;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  size: number;
  color: string;
  rotate: number;
};

const PARTICLE_COUNT = 56;
const COLORS = ['#00f0ff', '#4da3ff', '#a78bfa', '#67e8f9', '#c084fc', '#22d3ee'];

function createParticles(): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = Math.PI * (3 - Math.sqrt(5)) * i;

    const targetX = Math.cos(theta) * radiusAtY * INTRO_RADIUS;
    const targetY = y * INTRO_RADIUS;

    const angle = Math.random() * Math.PI * 2;
    const dist = INTRO_RADIUS * 2.6 + Math.random() * 160;
    const startX = Math.cos(angle) * dist;
    const startY = Math.sin(angle) * dist * 0.85;

    particles.push({
      id: i,
      char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      targetX,
      targetY,
      startX,
      startY,
      size: 10 + Math.floor(Math.random() * 8),
      color: COLORS[i % COLORS.length],
      rotate: (Math.random() - 0.5) * 36,
    });
  }
  return particles;
}

type ShardProps = {
  particle: Particle;
  progress: Animated.SharedValue<number>;
  spin: Animated.SharedValue<number>;
};

function Shard({ particle, progress, spin }: ShardProps) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;

    const angle = (spin.value * Math.PI) / 180;
    const cosA = Math.cos(angle);
    const spunX = particle.targetX * cosA;
    const depth = 0.55 + 0.45 * Math.abs(cosA);

    const x = interpolate(p, [0, 1], [particle.startX, spunX]);
    const y = interpolate(p, [0, 1], [particle.startY, particle.targetY]);

    const baseOpacity = interpolate(p, [0, 0.12, 1], [0, 1, 0.95]);
    const opacity = baseOpacity * (0.65 + 0.35 * depth);

    const baseScale = interpolate(p, [0, 0.55, 1], [0.3, 1.1, 1]);
    const scale = baseScale * depth;

    const rot = interpolate(p, [0, 1], [particle.rotate * 2.2, particle.rotate * 0.25]);

    return {
      position: 'absolute' as const,
      left: x - particle.size / 2,
      top: y - particle.size / 2,
      opacity,
      transform: [{ scale }, { rotate: `${rot}deg` }],
      zIndex: Math.round(depth * 100),
    };
  });

  return (
    <Animated.View style={style} pointerEvents="none">
      <Text
        style={{
          fontSize: particle.size,
          color: particle.color,
          fontWeight: '600',
          fontFamily: 'SpaceMono-Regular',
          textShadowColor: particle.color,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 7,
          includeFontPadding: false,
        }}
      >
        {particle.char}
      </Text>
    </Animated.View>
  );
}

type Props = {
  logoCenterX?: number;
  logoCenterY?: number;
  onReady: () => void;
};

export default function IntroSphereAnimation({
  logoCenterX,
  logoCenterY,
  onReady,
}: Props) {
  const [blocking, setBlocking] = useState(true);
  const progress = useSharedValue(0);
  const move = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const spin = useSharedValue(0);
  const glow = useSharedValue(0);
  const skipHintOpacity = useSharedValue(1);

  const targetLogoX = useSharedValue(logoCenterX ?? SCREEN_W / 2);
  const targetLogoY = useSharedValue(logoCenterY ?? SCREEN_H * 0.32);

  useEffect(() => {
    if (logoCenterX != null) targetLogoX.value = logoCenterX;
    if (logoCenterY != null) targetLogoY.value = logoCenterY;
  }, [logoCenterX, logoCenterY, targetLogoX, targetLogoY]);

  const particles = useMemo(() => createParticles(), []);

  const ready = useCallback(() => {
    onReady();
  }, [onReady]);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    glow.value = withDelay(
      ANIM_DURATION - 160,
      withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.45, { duration: 260 })
      )
    );

    const t = setTimeout(() => {
      runOnJS(setBlocking)(false);
      move.value = withTiming(1, {
        duration: MOVE_DURATION,
        easing: Easing.inOut(Easing.cubic),
      });
      overlayOpacity.value = withTiming(0, {
        duration: MOVE_DURATION,
        easing: Easing.in(Easing.quad),
      });
      skipHintOpacity.value = withTiming(0, { duration: 160 });

      spin.value = withRepeat(
        withTiming(360, { duration: 14000, easing: Easing.linear }),
        -1,
        false
      );

      setTimeout(() => {
        runOnJS(ready)();
      }, MOVE_DURATION);
    }, ANIM_DURATION + SETTLE_HOLD);

    return () => {
      clearTimeout(t);
      cancelAnimation(spin);
    };
  }, [progress, move, overlayOpacity, spin, glow, skipHintOpacity, ready]);

  const skip = () => {
    setBlocking(false);
    progress.value = 1;
    move.value = withTiming(1, { duration: 260 });
    overlayOpacity.value = withTiming(0, { duration: 200 });
    skipHintOpacity.value = 0;
    glow.value = 0.4;
    spin.value = withRepeat(
      withTiming(360, { duration: 14000, easing: Easing.linear }),
      -1,
      false
    );
    runOnJS(ready)();
  };

  const sphereStyle = useAnimatedStyle(() => {
    const introCX = SCREEN_W / 2;
    const introCY = SCREEN_H / 2 - 20;

    const cx = interpolate(move.value, [0, 1], [introCX, targetLogoX.value]);
    const cy = interpolate(move.value, [0, 1], [introCY, targetLogoY.value]);
    const scale = interpolate(move.value, [0, 1], [1, LOGO_SCALE]);

    return {
      position: 'absolute' as const,
      left: cx,
      top: cy,
      width: 0,
      height: 0,
      transform: [{ scale }],
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => {
    const s = interpolate(move.value, [0, 1], [1, LOGO_SCALE * 1.5]);
    return {
      opacity: glow.value * 0.5,
      transform: [{ scale: s }],
    };
  });

  const skipStyle = useAnimatedStyle(() => ({
    opacity: skipHintOpacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none" />

      {blocking && (
        <Pressable style={StyleSheet.absoluteFill} onPress={skip}>
          <Animated.Text style={[styles.skipHint, skipStyle]}>
            Tap to skip
          </Animated.Text>
        </Pressable>
      )}

      <Animated.View style={sphereStyle} pointerEvents="none">
        <Animated.View style={[styles.glow, glowStyle]} />
        {particles.map((p) => (
          <Shard key={p.id} particle={p} progress={progress} spin={spin} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  glow: {
    position: 'absolute',
    width: INTRO_RADIUS * 2.4,
    height: INTRO_RADIUS * 2.4,
    marginLeft: -INTRO_RADIUS * 1.2,
    marginTop: -INTRO_RADIUS * 1.2,
    borderRadius: INTRO_RADIUS * 1.2,
    backgroundColor: '#0ea5e9',
  },
  skipHint: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.28)',
    fontSize: 13,
    letterSpacing: 0.5,
    zIndex: 20,
  },
});
