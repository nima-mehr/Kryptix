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
  withRepeat,
  Easing,
  runOnJS,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const INTRO_RADIUS = Math.min(SCREEN_W, SCREEN_H) * 0.28;
const LOGO_SIZE = 44;
const LOGO_RADIUS = LOGO_SIZE * 0.42;
const LOGO_SCALE = LOGO_RADIUS / INTRO_RADIUS;

const LOGO_GLYPH = Math.max(7, LOGO_SIZE * 0.2);
const INTRO_GLYPH = LOGO_GLYPH / LOGO_SCALE;

const ANIM_DURATION = 1100;
const MOVE_DURATION = 520;
const SETTLE_HOLD = 180;

const GLYPHS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=?αβγδΩΣπμλθξζφψχ'.split('');

const COLORS = ['#00f0ff', '#4da3ff', '#a78bfa', '#67e8f9', '#c084fc', '#22d3ee'];

const PARTICLE_COUNT = 36;

type Particle = {
  id: number;
  char: string;
  // Unit sphere position * INTRO_RADIUS
  tx: number;
  ty: number;
  tz: number;
  startX: number;
  startY: number;
  size: number;
  color: string;
};

function createParticles(): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Fibonacci sphere – real 3D distribution
    const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = Math.PI * (3 - Math.sqrt(5)) * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    const angle = Math.random() * Math.PI * 2;
    const dist = INTRO_RADIUS * 2.6 + Math.random() * 160;

    particles.push({
      id: i,
      char: GLYPHS[i % GLYPHS.length],
      tx: x * INTRO_RADIUS,
      ty: y * INTRO_RADIUS,
      tz: z * INTRO_RADIUS,
      startX: Math.cos(angle) * dist,
      startY: Math.sin(angle) * dist * 0.85,
      size: INTRO_GLYPH,
      color: COLORS[i % COLORS.length],
    });
  }
  return particles;
}

type ShardProps = {
  particle: Particle;
  progress: Animated.SharedValue<number>;
  spinY: Animated.SharedValue<number>;
  spinX: Animated.SharedValue<number>;
};

function Shard({ particle, progress, spinY, spinX }: ShardProps) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;

    const yaw = (spinY.value * Math.PI) / 180;
    const pitch = (spinX.value * Math.PI) / 180;

    // Rotate around Y
    let x = particle.tx * Math.cos(yaw) - particle.tz * Math.sin(yaw);
    let z = particle.tx * Math.sin(yaw) + particle.tz * Math.cos(yaw);
    let y = particle.ty;

    // Then rotate around X
    const y2 = y * Math.cos(pitch) - z * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z * Math.cos(pitch);
    y = y2;
    z = z2;

    // Perspective projection
    const perspective = INTRO_RADIUS * 2.8;
    const scale3d = perspective / (perspective + z);
    const projX = x * scale3d;
    const projY = y * scale3d;

    const depth = (z + INTRO_RADIUS) / (INTRO_RADIUS * 2); // 0 back → 1 front

    const flyX = interpolate(p, [0, 1], [particle.startX, projX]);
    const flyY = interpolate(p, [0, 1], [particle.startY, projY]);

    const baseOpacity = interpolate(p, [0, 0.12, 1], [0, 1, 1]);
    const opacity = baseOpacity * (0.35 + 0.65 * (1 - depth * 0.85));

    const baseScale = interpolate(p, [0, 0.55, 1], [0.4, 1.05, 1]);
    const scale = baseScale * scale3d;

    return {
      position: 'absolute' as const,
      left: flyX - particle.size / 2,
      top: flyY - particle.size / 2,
      opacity,
      transform: [{ scale }],
      zIndex: Math.round((1 - depth) * 200),
    };
  });

  return (
    <Animated.View style={style} pointerEvents="none">
      <Text
        style={{
          fontSize: particle.size,
          color: particle.color,
          fontWeight: '600',
          textShadowColor: particle.color,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 6,
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
  const spinY = useSharedValue(0);
  const spinX = useSharedValue(0);
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

  const startSpin = useCallback(() => {
    spinY.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
    spinX.value = withRepeat(
      withTiming(360, { duration: 18000, easing: Easing.linear }),
      -1,
      false
    );
  }, [spinY, spinX]);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });

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

      runOnJS(startSpin)();

      setTimeout(() => {
        runOnJS(ready)();
      }, MOVE_DURATION);
    }, ANIM_DURATION + SETTLE_HOLD);

    return () => {
      clearTimeout(t);
      cancelAnimation(spinY);
      cancelAnimation(spinX);
    };
  }, [progress, move, overlayOpacity, spinY, spinX, skipHintOpacity, ready, startSpin]);

  const skip = () => {
    setBlocking(false);
    progress.value = 1;
    move.value = withTiming(1, { duration: 260 });
    overlayOpacity.value = withTiming(0, { duration: 200 });
    skipHintOpacity.value = 0;
    startSpin();
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
        {particles.map((p) => (
          <Shard
            key={p.id}
            particle={p}
            progress={progress}
            spinY={spinY}
            spinX={spinX}
          />
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
