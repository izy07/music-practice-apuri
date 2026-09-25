import React, { useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

type Props = {
  scrollOffset: number;
  inTune: boolean;
  cents: number;
  isActive: boolean;
  primaryColor: string;
  textColor: string;
  textSecondary: string;
  surfaceColor: string;
};

const BAND_COUNT = 12;
const BAND_WIDTH = 28;

/**
 * Peterson 風ストロボ表示
 * シャープ → 左へ、フラット → 右へ、合音 → 静止
 */
export function StrobeDisplay({
  scrollOffset,
  inTune,
  cents,
  isActive,
  primaryColor,
  textColor,
  textSecondary,
  surfaceColor,
}: Props) {
  const offsetRef = useRef(scrollOffset);
  offsetRef.current = scrollOffset;

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor: inTune ? '#00C853' : primaryColor }]}>
      <Text style={[styles.title, { color: textColor }]}>ストロボ（プロ）</Text>
      <View style={styles.strobeWindow} accessibilityLabel="ストロボチューナー">
        <View style={styles.strobeClip}>
          <View
            style={[
              styles.strobeBands,
              {
                transform: [
                  {
                    translateX: -((scrollOffset % (BAND_WIDTH * 2)) + BAND_WIDTH * BAND_COUNT),
                  },
                ],
              },
            ]}
          >
            {Array.from({ length: BAND_COUNT * 3 }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.band,
                  {
                    width: BAND_WIDTH,
                    backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#f5f5f5',
                    opacity: isActive ? 1 : 0.25,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.centerMarker} />
        </View>
      </View>
      <Text style={[styles.hint, { color: textSecondary }]}>
        { !isActive
          ? 'マイク開始後、長く伸ばした音で合わせてください'
          : inTune
            ? '● 合音（±0.1セント以内）'
            : cents > 0
              ? '↑ 高い — ストロボが左へ流れます'
              : '↓ 低い — ストロボが右へ流れます'}
      </Text>
      {isActive && (
        <Text style={[styles.centsFine, { color: inTune ? '#00C853' : textColor }]}>
          {cents > 0 ? '+' : ''}{cents.toFixed(2)} cents
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    marginTop: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  strobeWindow: {
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0d0d0d',
  },
  strobeClip: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  strobeBands: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'stretch',
    ...(Platform.OS === 'web' ? { willChange: 'transform' as const } : {}),
  },
  band: {
    height: '100%',
  },
  centerMarker: {
    position: 'absolute',
    left: '50%',
    marginLeft: -1,
    width: 2,
    top: 4,
    bottom: 4,
    backgroundColor: '#FF1744',
    opacity: 0.9,
  },
  hint: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  centsFine: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
