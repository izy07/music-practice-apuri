import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Music2, Bell, Play, ExternalLink } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
  dismissDailyDiscovery,
  isDailyDiscoveryDismissed,
} from '@/lib/dailyDiscoveryStorage';
import { listAllRecordings } from '@/lib/database';
import {
  alertRecordingPlaybackError,
  prepareWebRecordingAudio,
} from '@/lib/recordingPlayback';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { trackFeatureAction } from '@/lib/featureUsageService';
import { FEATURE_IDS } from '@/lib/featureUsageEvents';

type Props = {
  instrumentId: string | null | undefined;
};

export default function DailyDiscoverySection({ instrumentId }: Props) {
  const router = useRouter();
  const { user } = useAuthAdvanced();
  const { currentTheme } = useInstrumentTheme();

  const [dailySong, setDailySong] = useState<DailySong | null>(null);
  const [comparison, setComparison] = useState<PastSelfComparison | null>(null);
  const [songDismissed, setSongDismissed] = useState(false);
  const [pastDismissed, setPastDismissed] = useState(false);
  const [loadingPast, setLoadingPast] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [playingSlot, setPlayingSlot] = useState<'past' | 'recent' | null>(null);

  const effectiveId = instrumentId
    ? getEffectiveInstrumentId(instrumentId, user?.selected_instrument_id)
    : null;

  const load = useCallback(async () => {
    if (!effectiveId || !user?.id) {
      setDailySong(null);
      setComparison(null);
      return;
    }

    setDailySong(getDailySong(effectiveId));

    const [songDismiss, pastDismiss] = await Promise.all([
      isDailyDiscoveryDismissed('song', user.id),
      isDailyDiscoveryDismissed('past_self', user.id),
    ]);
    setSongDismissed(songDismiss);
    setPastDismissed(pastDismiss);

    setLoadingPast(true);
    try {
      const { data, error } = await listAllRecordings(user.id, effectiveId);
      if (error) {
        logger.warn('過去の自分比較: 録音取得エラー', error);
        setComparison(null);
        return;
      }
      setComparison(
        pickPastSelfComparison((data || []) as RecordingSnapshot[])
      );
    } finally {
      setLoadingPast(false);
    }
  }, [effectiveId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleDismissSong = async () => {
    if (!user?.id) return;
    await dismissDailyDiscovery('song', user.id);
    setSongDismissed(true);
  };

  const handleDismissPast = async () => {
    if (!user?.id) return;
    await dismissDailyDiscovery('past_self', user.id);
    setPastDismissed(true);
  };

  const openPerformance = async (url: string) => {
    trackFeatureAction(FEATURE_IDS.calendar, 'daily_song_listen');
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('リンクを開けません', url);
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('リンクを開けません', 'しばらくしてからお試しください。');
      logger.warn('daily song link open failed', e);
    }
  };

  const stopPlayback = () => {
    setPlayingSlot(null);
  };

  const playRecording = async (rec: RecordingSnapshot, slot: 'past' | 'recent') => {
    if (!rec.file_path?.trim()) {
      Alert.alert('再生できません', '録音ファイルが見つかりません。');
      return;
    }

    setPlayingSlot(slot);
    trackFeatureAction(FEATURE_IDS.calendar, slot === 'past' ? 'past_self_play_old' : 'past_self_play_recent');

    try {
      if (Platform.OS === 'web') {
        const { audio, cleanup } = await prepareWebRecordingAudio(rec.file_path, {
          onEnded: () => setPlayingSlot(null),
          onError: (detail) => {
            alertRecordingPlaybackError(detail);
            setPlayingSlot(null);
          },
        });
        await audio.play();
        return;
      }

      const { data: publicData } = supabase.storage
        .from('recordings')
        .getPublicUrl(rec.file_path);
      let url = publicData?.publicUrl;
      if (!url) {
        const { data: signed, error } = await supabase.storage
          .from('recordings')
          .createSignedUrl(rec.file_path, 3600);
        if (error || !signed?.signedUrl) {
          throw new Error('録音URLを取得できませんでした');
        }
        url = signed.signedUrl;
      }

      Alert.alert(
        slot === 'past' ? '約3か月前の演奏' : 'いちばん新しい演奏',
        formatRecordingLabel(rec.recorded_at, rec.title || '演奏録音'),
        [
          {
            text: '録音ライブラリで聴く',
            onPress: () => router.push('/recordings-library'),
          },
          { text: 'OK', style: 'cancel', onPress: stopPlayback },
        ]
      );
      // ネイティブのインライン再生は録音ライブラリに委譲（安定性優先）
      setPlayingSlot(null);
    } catch (e) {
      alertRecordingPlaybackError(
        e instanceof Error ? e.message : '再生に失敗しました'
      );
      setPlayingSlot(null);
    }
  };

  if (!effectiveId || !user?.id) return null;

  const showSong = dailySong && !songDismissed;
  const showPast = !pastDismissed && (loadingPast || comparison);

  if (!showSong && !showPast) return null;

  const primary = currentTheme.primary;
  const surface = currentTheme.surface;
  const text = currentTheme.text;
  const textSecondary = currentTheme.textSecondary;

  return (
    <View style={styles.wrapper}>
      {showSong && dailySong ? (
        <View style={[styles.card, { backgroundColor: surface, borderColor: primary + '40' }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Music2 size={18} color={primary} />
              <Text style={[styles.cardLabel, { color: primary }]}>本日の曲</Text>
            </View>
            <TouchableOpacity
              onPress={handleDismissSong}
              accessibilityLabel="本日の曲を閉じる"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={textSecondary} />
            </TouchableOpacity>
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
                <Play size={16} color={surface} />
                <Text style={[styles.primaryBtnText, { color: surface }]}>
                  演奏を聴く
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: primary }]}
              onPress={() =>
                router.push(`/representative-songs?instrumentId=${effectiveId}`)
              }
            >
              <ExternalLink size={16} color={primary} />
              <Text style={[styles.secondaryBtnText, { color: primary }]}>
                代表曲をもっと見る
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {showPast ? (
        <View style={[styles.card, { backgroundColor: surface, borderColor: '#7E57C240' }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Bell size={18} color="#7E57C2" />
              <Text style={[styles.cardLabel, { color: '#7E57C2' }]}>
                過去の自分から通知
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDismissPast}
              accessibilityLabel="過去の自分通知を閉じる"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {loadingPast ? (
            <ActivityIndicator color={primary} style={{ marginVertical: 12 }} />
          ) : comparison ? (
            <>
              <Text style={[styles.lead, { color: text }]}>
                3か月前のあなたの演奏を聴いてみませんか？
              </Text>
              <Text style={[styles.pastSub, { color: textSecondary }]}>
                {comparison.gapDays}日分の変化を、Past You → Today で比べられます。
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#7E57C2', marginTop: 8 }]}
                onPress={() => setShowCompareModal(true)}
              >
                <Play size={16} color="#FFFFFF" />
                <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>
                  3か月前 → 今日 を比較する
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      ) : null}

      <Modal
        visible={showCompareModal && !!comparison}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowCompareModal(false);
          stopPlayback();
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: surface }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.modalTitle, { color: text }]}>
                こんなに変わったんだ
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCompareModal(false);
                  stopPlayback();
                }}
              >
                <X size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {comparison ? (
              <>
                <CompareRow
                  label="約3か月前"
                  recording={comparison.past}
                  playing={playingSlot === 'past'}
                  onPlay={() => playRecording(comparison.past, 'past')}
                  theme={{ primary, text, textSecondary, surface }}
                />
                <Text style={[styles.arrow, { color: textSecondary }]}>↓</Text>
                <CompareRow
                  label="いちばん新しい"
                  recording={comparison.recent}
                  playing={playingSlot === 'recent'}
                  onPlay={() => playRecording(comparison.recent, 'recent')}
                  theme={{ primary, text, textSecondary, surface }}
                />
                <Text style={[styles.modalHint, { color: textSecondary }]}>
                  同じ曲なら並べて聴くと上達が実感しやすいです。
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CompareRow({
  label,
  recording,
  playing,
  onPlay,
  theme,
}: {
  label: string;
  recording: RecordingSnapshot;
  playing: boolean;
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
        disabled={playing}
      >
        {playing ? (
          <ActivityIndicator color={theme.surface} size="small" />
        ) : (
          <Play size={18} color={theme.surface} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  lead: {
    fontSize: 14,
    marginBottom: 6,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  composer: {
    fontSize: 14,
    marginBottom: 8,
  },
  trivia: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  compareLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
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
    fontSize: 20,
    marginVertical: 4,
  },
  modalHint: {
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
});
