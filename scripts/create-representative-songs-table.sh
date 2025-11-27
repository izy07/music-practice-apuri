#!/bin/bash
# representative_songsテーブルを作成するスクリプト

set -e

echo "📋 representative_songsテーブルを作成します..."

# マイグレーションファイルを実行
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/20250122000001_ensure_representative_songs_table.sql

echo "✅ representative_songsテーブルの作成が完了しました"

