/**
 * ユーザープロフィール管理のカスタムフック
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/lib/tabs/goals/types';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

export const useUserProfile = () => {
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(false);

  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserProfile({ nickname: 'ユーザー', organization: undefined });
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        ErrorHandler.handle(error, 'プロフィール取得', false);
        if (error.code === 'PGRST116' || error.code === '406') {
          setUserProfile({ nickname: 'ユーザー', organization: undefined });
          return;
        }
        setUserProfile({ nickname: 'ユーザー', organization: undefined });
        return;
      }

      if (profile) {
        // 新規登録画面で設定したニックネーム（display_name）を表示
        // 新規登録時に signup.tsx で設定した nickname が display_name として保存されている
        const resolvedNickname = (profile.display_name && String(profile.display_name).trim().length > 0)
          ? profile.display_name
          : 'ユーザー';
        setUserProfile({
          nickname: resolvedNickname,
          organization: undefined
        });
      } else {
        setUserProfile({ nickname: 'ユーザー', organization: undefined });
      }
    } catch (error) {
      ErrorHandler.handle(error, 'プロフィール読み込み', false);
      setUserProfile({ nickname: 'ユーザー', organization: undefined });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    userProfile,
    loading,
    loadUserProfile
  };
};

