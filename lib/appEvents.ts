/**
 * アプリ内イベント（iOS / Android / Web 共通）
 * Web は CustomEvent、ネイティブは DeviceEventEmitter を使う
 */

import { DeviceEventEmitter, Platform } from 'react-native';

export const APP_EVENTS = {
  CALENDAR_GOAL_UPDATED: 'calendarGoalUpdated',
  /** マイク所有者の交代要求（チューナー ↔ 録音の排他） */
  REQUEST_RELEASE_MIC: 'requestReleaseMic',
} as const;

type CalendarGoalUpdatedDetail = { reason?: string };
export type RequestReleaseMicDetail = {
  requester: 'tuner' | 'recorder';
};

export function emitCalendarGoalUpdated(detail?: CalendarGoalUpdatedDetail): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(APP_EVENTS.CALENDAR_GOAL_UPDATED, { detail })
    );
    return;
  }
  DeviceEventEmitter.emit(APP_EVENTS.CALENDAR_GOAL_UPDATED, detail ?? {});
}

export function subscribeCalendarGoalUpdated(
  handler: (detail?: CalendarGoalUpdatedDetail) => void
): () => void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<CalendarGoalUpdatedDetail>;
      handler(customEvent?.detail);
    };
    window.addEventListener(APP_EVENTS.CALENDAR_GOAL_UPDATED, listener);
    return () => {
      window.removeEventListener(APP_EVENTS.CALENDAR_GOAL_UPDATED, listener);
    };
  }

  const subscription = DeviceEventEmitter.addListener(
    APP_EVENTS.CALENDAR_GOAL_UPDATED,
    (detail?: CalendarGoalUpdatedDetail) => {
      handler(detail);
    }
  );
  return () => {
    subscription.remove();
  };
}

export function emitRequestReleaseMic(detail: RequestReleaseMicDetail): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(APP_EVENTS.REQUEST_RELEASE_MIC, { detail })
    );
    return;
  }
  DeviceEventEmitter.emit(APP_EVENTS.REQUEST_RELEASE_MIC, detail);
}

export function subscribeRequestReleaseMic(
  handler: (detail: RequestReleaseMicDetail) => void
): () => void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<RequestReleaseMicDetail>;
      if (customEvent?.detail) handler(customEvent.detail);
    };
    window.addEventListener(APP_EVENTS.REQUEST_RELEASE_MIC, listener);
    return () => {
      window.removeEventListener(APP_EVENTS.REQUEST_RELEASE_MIC, listener);
    };
  }

  const subscription = DeviceEventEmitter.addListener(
    APP_EVENTS.REQUEST_RELEASE_MIC,
    (detail: RequestReleaseMicDetail) => {
      handler(detail);
    }
  );
  return () => {
    subscription.remove();
  };
}
