-- 経歴・実績関連テーブルを作成

-- ブランク期間テーブル
CREATE TABLE IF NOT EXISTS user_break_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 過去の所属団体テーブル
CREATE TABLE IF NOT EXISTS user_past_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 受賞履歴テーブル
CREATE TABLE IF NOT EXISTS user_awards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    organization TEXT,
    date DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 演奏経験テーブル
CREATE TABLE IF NOT EXISTS user_performances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    venue TEXT,
    date DATE,
    role TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE user_break_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_past_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_performances ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成（ユーザーは自分のデータのみアクセス可能）
CREATE POLICY "Users can view their own break periods" ON user_break_periods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own break periods" ON user_break_periods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own break periods" ON user_break_periods
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own break periods" ON user_break_periods
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own past organizations" ON user_past_organizations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own past organizations" ON user_past_organizations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own past organizations" ON user_past_organizations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own past organizations" ON user_past_organizations
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own awards" ON user_awards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own awards" ON user_awards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own awards" ON user_awards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own awards" ON user_awards
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own performances" ON user_performances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performances" ON user_performances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performances" ON user_performances
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own performances" ON user_performances
    FOR DELETE USING (auth.uid() = user_id);
