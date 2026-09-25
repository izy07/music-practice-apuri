import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import type { FeatureId, FeatureUsageEventType } from '@/lib/featureUsageEvents';

const QUEUE_KEY = '@feature_usage_event_queue';
const SESSION_KEY = '@feature_usage_session_id';
const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_BATCH_SIZE = 8;

export interface FeatureUsagePayload {
  eventType: FeatureUsageEventType;
  featureId: FeatureId | string;
  eventName: string;
  instrumentId?: string | null;
  metadata?: Record<string, unknown>;
}

interface QueuedFeatureUsageEvent extends FeatureUsagePayload {
  userId: string;
  platform: 'web' | 'ios' | 'android' | 'unknown';
  sessionId: string;
  createdAt: string;
}

let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushInProgress = false;

const getPlatform = (): QueuedFeatureUsageEvent['platform'] => {
  if (Platform.OS === 'web') return 'web';
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'unknown';
};

export const getOrCreateSessionId = async (): Promise<string> => {
  const existing = await AsyncStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(SESSION_KEY, id);
  return id;
};

const readQueue = async (): Promise<QueuedFeatureUsageEvent[]> => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedFeatureUsageEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = async (events: QueuedFeatureUsageEvent[]): Promise<void> => {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(events));
};

const scheduleFlush = (): void => {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    void flushFeatureUsageQueue();
  }, FLUSH_INTERVAL_MS);
};

export const flushFeatureUsageQueue = async (): Promise<void> => {
  if (flushInProgress) return;
  flushInProgress = true;
  try {
    const queue = await readQueue();
    if (queue.length === 0) return;

    // JWT 未付与のまま insert すると RLS 403 → キューが増え続けるだけなので送信しない
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      logger.debug('機能利用ログ送信スキップ（未ログイン）');
      return;
    }

    const sessionUserId = sessionData.session.user?.id;
    const batch = queue
      .filter((e) => !sessionUserId || e.userId === sessionUserId)
      .slice(0, FLUSH_BATCH_SIZE);
    if (batch.length === 0) return;

    const rows = batch.map((e) => ({
      user_id: e.userId,
      event_type: e.eventType,
      feature_id: e.featureId,
      event_name: e.eventName,
      platform: e.platform,
      instrument_id: e.instrumentId ?? null,
      metadata: e.metadata ?? {},
      session_id: e.sessionId,
      created_at: e.createdAt,
    }));

    const { error } = await supabase.from('feature_usage_events').insert(rows);
    if (error) {
      logger.warn('機能利用ログ送信失敗（キューに保持）', error.message);
      return;
    }

    const sentIds = new Set(batch.map((e) => `${e.createdAt}:${e.eventName}:${e.sessionId}`));
    await writeQueue(
      queue.filter((e) => !sentIds.has(`${e.createdAt}:${e.eventName}:${e.sessionId}`))
    );
  } finally {
    flushInProgress = false;
  }
};

/** 機能利用イベントを記録（オフライン時はキューに蓄積） */
export const trackFeatureUsage = async (
  userId: string | null | undefined,
  payload: FeatureUsagePayload
): Promise<void> => {
  if (!userId) return;

  try {
    const sessionId = await getOrCreateSessionId();
    const event: QueuedFeatureUsageEvent = {
      ...payload,
      userId,
      platform: getPlatform(),
      sessionId,
      createdAt: new Date().toISOString(),
    };

    const queue = await readQueue();
    queue.push(event);
    await writeQueue(queue);
    scheduleFlush();

    if (queue.length >= FLUSH_BATCH_SIZE) {
      await flushFeatureUsageQueue();
    }
  } catch (error) {
    logger.warn('機能利用ログ記録失敗', error);
  }
};

export const trackFeatureAction = async (
  userId: string | null | undefined,
  featureId: FeatureId | string,
  actionName: string,
  metadata?: Record<string, unknown>,
  instrumentId?: string | null
): Promise<void> => {
  await trackFeatureUsage(userId, {
    eventType: 'action',
    featureId,
    eventName: `${featureId}.${actionName}`,
    instrumentId,
    metadata,
  });
};

export const trackFeatureScreenView = async (
  userId: string | null | undefined,
  featureId: FeatureId | string,
  metadata?: Record<string, unknown>,
  instrumentId?: string | null
): Promise<void> => {
  await trackFeatureUsage(userId, {
    eventType: 'screen_view',
    featureId,
    eventName: `${featureId}.screen_view`,
    instrumentId,
    metadata,
  });
};
