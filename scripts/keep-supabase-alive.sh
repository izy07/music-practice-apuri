#!/bin/bash

# Supabase監視・自動再起動スクリプト（改善版）
# 使用方法: ./keep-supabase-alive.sh

# ログファイルの設定
LOG_DIR="./logs"
LOG_FILE="$LOG_DIR/supabase-monitor.log"
ERROR_LOG="$LOG_DIR/supabase-errors.log"

# ログディレクトリを作成
mkdir -p "$LOG_DIR"

# ログ関数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

error_log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: $1" | tee -a "$ERROR_LOG"
}

# スクリプト開始
log "🚀 Supabase監視スクリプトを開始します..."
log "このスクリプトはSupabaseが停止した場合に自動的に再起動します"
log "停止するには Ctrl+C を押してください"
log "ログファイル: $LOG_FILE"
log "エラーログ: $ERROR_LOG"
echo ""

# 監視間隔（秒）
CHECK_INTERVAL=30
RESTART_COUNT=0
MAX_RESTARTS_PER_HOUR=5
LAST_RESTART_TIME=0

# サービスチェック関数
check_supabase_services() {
    local status_output
    status_output=$(npx supabase status 2>&1)
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        return 1
    fi
    
    # 重要なサービスの状態をチェック
    if echo "$status_output" | grep -q "Stopped services"; then
        local stopped_services
        stopped_services=$(echo "$status_output" | grep "Stopped services" -A 10 | grep -E "supabase_|postgres|kong|realtime" | head -5)
        if [ -n "$stopped_services" ]; then
            log "⚠️ 一部のサービスが停止しています:"
            echo "$stopped_services" | while read -r service; do
                log "   - $service"
            done
            return 2
        fi
    fi
    
    return 0
}

# データベース接続テスト
check_database_connection() {
    if docker exec supabase_db_music-practice pg_isready -U postgres > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# API接続テスト
check_api_connection() {
    if curl -s -f "http://127.0.0.1:54321/rest/v1/" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 再起動制限チェック
can_restart() {
    local current_time=$(date +%s)
    local time_diff=$((current_time - LAST_RESTART_TIME))
    
    # 1時間以内の再起動回数をチェック
    if [ $RESTART_COUNT -ge $MAX_RESTARTS_PER_HOUR ]; then
        if [ $time_diff -lt 3600 ]; then
            return 1
        else
            # 1時間経過したらカウントをリセット
            RESTART_COUNT=0
        fi
    fi
    
    return 0
}

# Supabase再起動
restart_supabase() {
    if ! can_restart; then
        error_log "再起動制限に達しました（1時間以内に${MAX_RESTARTS_PER_HOUR}回）。手動での確認が必要です。"
        return 1
    fi
    
    log "🔄 Supabaseを再起動中..."
    
    # 現在の時間を記録
    LAST_RESTART_TIME=$(date +%s)
    RESTART_COUNT=$((RESTART_COUNT + 1))
    
    # Supabaseを停止
    log "停止中..."
    npx supabase stop > /dev/null 2>&1
    
    # 完全に停止するまで待機
    sleep 10
    
    # Dockerコンテナの残骸をクリーンアップ
    log "Dockerコンテナをクリーンアップ中..."
    docker container prune -f > /dev/null 2>&1
    
    # Supabaseを再起動
    log "起動中..."
    npx supabase start > /dev/null 2>&1
    
    # 起動完了まで待機
    log "起動完了まで待機中..."
    sleep 15
    
    # 起動確認
    if check_supabase_services; then
        log "✅ Supabaseの再起動が完了しました（再起動回数: ${RESTART_COUNT}/時）"
        return 0
    else
        error_log "❌ Supabaseの再起動に失敗しました"
        return 1
    fi
}

# メイン監視ループ
while true; do
    log "🔍 Supabaseの状態を確認中..."
    
    # 基本的な状態チェック
    if ! check_supabase_services; then
        error_log "❌ Supabaseが停止しているか、異常な状態です"
        
        # 再起動を試行
        if restart_supabase; then
            log "✅ 再起動が成功しました"
        else
            error_log "❌ 再起動が失敗しました"
        fi
    else
        # 詳細チェック
        local detailed_check=true
        
        # データベース接続チェック
        if ! check_database_connection; then
            log "⚠️ データベース接続に問題があります"
            detailed_check=false
        fi
        
        # API接続チェック
        if ! check_api_connection; then
            log "⚠️ API接続に問題があります"
            detailed_check=false
        fi
        
        if [ "$detailed_check" = true ]; then
            log "✅ Supabaseは正常に動作しています"
        else
            log "⚠️ 一部の機能に問題がありますが、基本的な動作は継続中"
        fi
    fi
    
    log "次の確認まで ${CHECK_INTERVAL} 秒待機中..."
    log "----------------------------------------"
    
    # 指定した間隔で待機
    sleep $CHECK_INTERVAL
done
