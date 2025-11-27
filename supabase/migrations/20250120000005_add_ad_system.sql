-- 広告報酬テーブル
CREATE TABLE IF NOT EXISTS ad_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('practice_level', 'statistics', 'sheet_capacity')),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('unlock', 'capacity_boost', 'access_extension')),
  reward_value INTEGER NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used')),
  
  -- インデックス
  CONSTRAINT unique_active_reward UNIQUE (user_id, ad_type, status)
);

-- 広告視聴履歴テーブル
CREATE TABLE IF NOT EXISTS ad_view_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('practice_level', 'statistics', 'sheet_capacity')),
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed BOOLEAN NOT NULL DEFAULT false,
  reward_id UUID REFERENCES ad_rewards(id) ON DELETE SET NULL,
  
  -- インデックス
  CONSTRAINT unique_user_ad_view UNIQUE (user_id, ad_type, viewed_at)
);

-- RLSポリシーの設定
ALTER TABLE ad_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_view_history ENABLE ROW LEVEL SECURITY;

-- ad_rewardsのRLSポリシー
CREATE POLICY "Users can view their own ad rewards" ON ad_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ad rewards" ON ad_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad rewards" ON ad_rewards
  FOR UPDATE USING (auth.uid() = user_id);

-- ad_view_historyのRLSポリシー
CREATE POLICY "Users can view their own ad view history" ON ad_view_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ad view history" ON ad_view_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_ad_rewards_user_id ON ad_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_rewards_ad_type ON ad_rewards(ad_type);
CREATE INDEX IF NOT EXISTS idx_ad_rewards_status ON ad_rewards(status);
CREATE INDEX IF NOT EXISTS idx_ad_rewards_expires_at ON ad_rewards(expires_at);

CREATE INDEX IF NOT EXISTS idx_ad_view_history_user_id ON ad_view_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_view_history_ad_type ON ad_view_history(ad_type);
CREATE INDEX IF NOT EXISTS idx_ad_view_history_viewed_at ON ad_view_history(viewed_at);

-- 関数：期限切れの報酬を自動的に無効化
CREATE OR REPLACE FUNCTION cleanup_expired_ad_rewards()
RETURNS void AS $$
BEGIN
  UPDATE ad_rewards 
  SET status = 'expired' 
  WHERE expires_at < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- 定期実行のためのトリガー（オプション）
-- この関数は定期的に手動で実行するか、cronジョブで実行することを推奨

-- ビュー：ユーザーの現在の報酬状況
CREATE OR REPLACE VIEW user_ad_status AS
SELECT 
  ar.user_id,
  ar.ad_type,
  ar.reward_type,
  ar.reward_value,
  ar.expires_at,
  ar.status,
  CASE 
    WHEN ar.expires_at > NOW() THEN 
      EXTRACT(EPOCH FROM (ar.expires_at - NOW())) / 3600
    ELSE 0
  END as hours_remaining
FROM ad_rewards ar
WHERE ar.status = 'active' AND ar.expires_at > NOW();

-- ビュー：広告視聴統計
CREATE OR REPLACE VIEW ad_view_stats AS
SELECT 
  user_id,
  ad_type,
  COUNT(*) as total_views,
  COUNT(*) FILTER (WHERE completed) as completed_views,
  ROUND(
    (COUNT(*) FILTER (WHERE completed)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2
  ) as completion_rate
FROM ad_view_history
GROUP BY user_id, ad_type;

-- コメント
COMMENT ON TABLE ad_rewards IS '広告視聴による報酬管理テーブル';
COMMENT ON TABLE ad_view_history IS '広告視聴履歴テーブル';
COMMENT ON VIEW user_ad_status IS 'ユーザーの現在の広告報酬状況ビュー';
COMMENT ON VIEW ad_view_stats IS '広告視聴統計ビュー';
