'use client';

import { useEffect } from 'react';

const THROTTLE_MS = 30 * 60 * 1000; // 30分
const STORAGE_KEY = 'last_activity_sent';

async function sendActivity() {
  const last = localStorage.getItem(STORAGE_KEY);
  if (last && Date.now() - Number(last) < THROTTLE_MS) return;

  try {
    const res = await fetch('/api/activity', { method: 'POST' });
    if (res.ok) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
  } catch {
    // 失敗しても無視
  }
}

export function useActivityTracker() {
  useEffect(() => {
    // 初回表示時に送信
    sendActivity();

    // タブがアクティブになったときに送信
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
