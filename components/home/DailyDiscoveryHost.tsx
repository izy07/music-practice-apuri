import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSegments } from 'expo-router';
import { useRouter } from 'expo-router';
import { Bell, ExternalLink, Music2, Play, Sparkles, X } from 'lucide-react-native';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { getEffectiveInstrumentId } from '@/lib/instrumentUtils';
import { getDailySong, DailySong } from '@/lib/dailySong';
import {
  pickPastSelfComparison,
  PastSelfComparison,
  formatRecordingLabel,
  RecordingSnapshot,
} from '@/lib/pastSelfRecording';
import {
  dismissDailyDiscoveryForToday,
  incrementDailyDiscoveryOpenCount,
  isDailyDiscoveryDismissedToday,
  isDailyDiscoveryEnabled,
  shouldShowPastSelfComparison,
} from '@/lib/dailyDiscoveryStorage';
import { listAllRecordings } from '@/lib/database';
import { useInlineRecordingPlayer } from '@/hooks/useInlineRecordingPlayer';
import logger from '@/lib/logger';
import { trackFeatureAction } from '@/lib/featureUsageService';
import { FEATURE_IDS } from '@/lib/featureUsageEvents';

const OPEN_DELAY_MS = 700;

/**
 * 1日1回、メインタブ初回表示時に「本日の曲」を紹介。
 * 「過去の自分（録音比較）」はアプリ起動 8 回に 1 回だけ載せる。
 */
export default function DailyDiscoveryHost() {
  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuthAdvanced();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { playingId, play, stop } = useInlineRecordingPlayer();

  const [visible, setVisible] = useState(false);
  const [dailySong, setDailySong] = useState<DailySong | null>(null);
  const [comparison, setComparison] = useState<PastSelfComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const hasScheduledRef = useRef(false);

  const effectiveId = getEffectiveInstrumentId(
    selectedInstrument,
    user?.selected_instrument_id
  );

  const isOnboarding =
    segments.includes('tutorial') || segments.includes('instrument-selection');

  const closeForToday = useCallback(async () => {
    await stop();
    setVisible(false);
    setShowCompare(false);
    if (user?.id) {
      await dismissDailyDiscoveryForToday(user.id);
    }
  }, [stop, user?.id]);

  const tryOpenDailyModal = useCallback(async () => {
    if (!user?.id || !effectiveId || isOnboarding) return;

    const enabled = await isDailyDiscoveryEnabled(user.id);
    if (!enabled) return;

    const openCount = await incrementDailyDiscoveryOpenCount(user.id);
    const showPastSelf = shouldShowPastSelfComparison(openCount);

    const dismissed = await isDailyDiscoveryDismissedToday(user.id);
    if (dismissed) return;

    setLoading(true);
    try {
      const song = getDailySong(effectiveId);
      let comp: PastSelfComparison | null = null;

      if (showPastSelf) {
        const { data, error } = await listAllRecordings(user.id, effectiveId);
        if (!error && data?.length) {
          comp = pickPastSelfComparison(data as RecordingSnapshot[], {
            selectionSeed: openCount,
          });
        }
      }

      if (!song && !comp) return;

      setDailySong(song);
      setComparison(comp);
      setShowCompare(false);
      setVisible(true);

      void trackFeatureAction(user.id, FEATURE_IDS.calendar, 'daily_discovery_show', {
        hasSong: !!song,
        hasComparison: !!comp,
      });
    } catch (e) {
      logger.warn('DailyDiscoveryHost load failed', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, effectiveId, isOnboarding]);

  useEffect(() => {
    if (!user?.id || !effectiveId || isOnboarding) return;
    if (hasScheduledRef.current) return;
    hasScheduledRef.current = true;

    const timer = setTimeout(() => {
      void tryOpenDailyModal();
    }, OPEN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user?.id, effectiveId, isOnboarding, tryOpenDailyModal]);

  const openPerformance = async (url: string) => {
    if (user?.id) {
      void trackFeatureAction(user.id, FEATURE_IDS.calendar, 'daily_song_listen');
    }
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      } else {
        Alert.alert('リンクを開けません', url);
      }
    } catch {
      Alert.alert('リンクを開けません', 'しばらくしてからお試しください。');
    }
  };

  if (!user?.id || !effectiveId) return null;

  const primary = currentTheme.primary;
  const surface = currentTheme.surface;
  const text = currentTheme.text;
  const textSecondary = currentTheme.textSecondary;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => void closeForToday()}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: surface }]}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Sparkles size={20} color={primary} />
              <Text style={[styles.headerTitle, { color: text }]}>今日のおすすめ</Text>
            </View>
            <TouchableOpacity
              onPress={() => void closeForToday()}
              accessibilityLabel="今日のおすすめを閉じる"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={primary} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {dailySong ? (
                <View style={[styles.block, { borderColor: primary + '35' }]}>
                  <View style={styles.blockLabelRow}>
                    <Music2 size={16} color={primary} />
                    <Text style={[styles.blockLabel, { color: primary }]}>本日の曲</Text>
                  </View>
                  <Text style={[styles.lead, { color: textSecondary }]}>
                    今日はこの曲を知ってみよう
                  </Text>
                  <Text style={[styles.songTitle, { color: text }]}>
                    {dailySong.song.title}
                  </Text>
                  <Text style={[styles.composer, { color: textSecondary }]}>
                    {dailySong.song.composer}
                  </Text>
                  <Text style={[styles.trivia, { color: text }]}>
                    💡 {dailySong.trivia}
                  </Text>
                  <View style={styles.actions}>
                    {dailySong.performanceUrl ? (
                      <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: primary }]}
                        onPress={() => openPerformance(dailySong.performanceUrl!)}
                      >
                        <Play size={15} color={surface} />
                        <Text style={[styles.primaryBtnText, { color: surface }]}>
                          演奏を聴く
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { borderColor: primary }]}
                      onPress={() => {
                        void closeForToday();
                        router.push(`/representative-songs?instrumentId=${effectiveId}`);
                      }}
                    >
                      <ExternalLink size={15} color={primary} />
                      <Text style={[styles.secondaryBtnText, { color: primary }]}>
                        代表曲をもっと見る
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {comparison ? (
                <View style={[styles.block, { borderColor: '#7E57C240' }]}>
                  <View style={styles.blockLabelRow}>
                    <Bell size={16} color="#7E57C2" />
                    <Text style={[styles.blockLabel, { color: '#7E57C2' }]}>
                      過去の自分から通知
                    </Text>
                  </View>
                  <Text style={[styles.lead, { color: text }]}>{comparison.headline}</Text>
                  <Text style={[styles.pastSub, { color: textSecondary }]}>
                    {comparison.gapDays}日分の変化を、Past You → Today で比べられます。
                  </Text>

                  {!showCompare ? (
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: '#7E57C2', marginTop: 10 }]}
                      onPress={() => setShowCompare(true)}
                    >
                      <Play size={15} color="#FFFFFF" />
                      <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>
                        {comparison.gapLabel} → 今日 を比較する
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.compareArea}>
                      <Text style={[styles.compareHeading, { color: text }]}>
                        こんなに変わったんだ
                      </Text>
                      <CompareRow
                        label={comparison.gapLabel}
                        recording={comparison.past}
                        isPlaying={playingId === comparison.past.id}
                        onPlay={() => {
                          void play(comparison.past);
                          if (user?.id) {
                            void trackFeatureAction(
                              user.id,
                              FEATURE_IDS.calendar,
                              'past_self_play_old'
                            );
                          }
                        }}
                        theme={{ primary, text, textSecondary, surface }}
                      />
                      <Text style={[styles.arrow, { color: textSecondary }]}>↓</Text>
                      <CompareRow
                        label="いちばん新しい"
                        recording={comparison.recent}
                        isPlaying={playingId === comparison.recent.id}
                        onPlay={() => {
                          void play(comparison.recent);
                          if (user?.id) {
                            void trackFeatureAction(
                              user.id,
                              FEATURE_IDS.calendar,
                              'past_self_play_recent'
                            );
                          }
                        }}
                        theme={{ primary, text, textSecondary, surface }}
                      />
                    </View>
                  )}
                </View>
              ) : null}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: currentTheme.secondary }]}
            onPress={() => void closeForToday()}
          >
            <Text style={[styles.closeBtnText, { color: text }]}>今日は閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function CompareRow({
  label,
  recording,
  isPlaying,
  onPlay,
  theme,
}: {
  label: string;
  recording: RecordingSnapshot;
  isPlaying: boolean;
  onPlay: () => void;
  theme: {
    primary: string;
    text: string;
    textSecondary: string;
    surface: string;
  };
}) {
  return (
    <View style={[styles.compareRow, { borderColor: theme.primary + '30' }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.compareLabel, { color: theme.primary }]}>{label}</Text>
        <Text style={[styles.compareTitle, { color: theme.text }]} numberOfLines={1}>
          {recording.title || '演奏録音'}
        </Text>
        <Text style={[styles.compareDate, { color: theme.textSecondary }]}>
          {formatRecordingLabel(recording.recorded_at, '')}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.playCircle, { backgroundColor: theme.primary }]}
        onPress={onPlay}
      >
        {isPlaying ? (
          <ActivityIndicator color={theme.surface} size="small" />
        ) : (
          <Play size={18} color={theme.surface} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    borderRadius: 18,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    gap: 14,
  },
  block: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  blockLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  blockLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  lead: {
    fontSize: 14,
    marginBottom: 6,
  },
  songTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  composer: {
    fontSize: 14,
    marginTop: 2,
    marginBottom: 8,
  },
  trivia: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  pastSub: {
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    gap: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  compareArea: {
    marginTop: 10,
  },
  compareHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  compareLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  compareTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  compareDate: {
    fontSize: 12,
    marginTop: 2,
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  arrow: {
    textAlign: 'center',
    fontSize: 18,
    marginVertical: 2,
  },
  closeBtn: {
    marginHorizontal: 18,
    marginVertical: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
