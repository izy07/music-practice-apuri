#!/bin/bash

# Supabaseヘルス監視スクリプト
# 使用方法: ./supabase-health-monitor.sh

# 設定
LOG_DIR="./logs"
HEALTH_LOG="$LOG_DIR/health-monitor.log"
ALERT_LOG="$LOG_DIR/alerts.log"
CHECK_INTERVAL=60  # 1分間隔
MAX_FAILURES=3     # 最大失敗回数
ALERT_EMAIL=""     # アラートメールアドレス（設定する場合）

# ログディレクトリを作成
mkdir -p "$LOG_DIR"

# ログ関数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - HEALTH: $1" | tee -a "$HEALTH_LOG"
}

alert() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERT: $1" | tee -a "$ALERT_LOG"
    echo "$1"
}

# ヘルスチェック関数
perform_health_check() {
    local failures=0
    local health_score=100
    
    log "🏥 ヘルスチェック開始"
    
    # 1. 基本的な状態チェック
    if ! npx supabase status > /dev/null 2>&1; then
        alert "❌ Supabaseが完全に停止しています"
        failures=$((failures + 1))
        health_score=$((health_score - 30))
    else
        log "✅ Supabase基本状態: 正常"
    fi
    
    # 2. データベース接続チェック
    if ! docker exec supabase_db_music-practice pg_isready -U postgres > /dev/null 2>&1; then
        alert "❌ データベース接続が失敗しています"
        failures=$((failures + 1))
        health_score=$((health_score - 25))
    else
        log "✅ データベース接続: 正常"
    fi
    
    # 3. REST API接続チェック
    if ! curl -s -f "http://127.0.0.1:54321/rest/v1/" > /dev/null 2>&1; then
        alert "❌ REST API接続が失敗しています"
        failures=$((failures + 1))
        health_score=$((health_score - 20))
    else
        log "✅ REST API接続: 正常"
    fi
    
    # 4. Auth API接続テスト
    local auth_api_working=false
    local auth_retry_count=0
    local max_auth_retries=3
    
    while [ $auth_retry_count -lt $max_auth_retries ] && [ "$auth_api_working" = false ]; do
        if curl -s -f --connect-timeout 5 "http://127.0.0.1:54321/auth/v1/health" > /dev/null 2>&1; then
            log "✅ Auth API: 正常"
            auth_api_working=true
            break
        else
            auth_retry_count=$((auth_retry_count + 1))
            if [ $auth_retry_count -lt $max_auth_retries ]; then
                log "Auth API接続試行 ${auth_retry_count}/${max_auth_retries} 失敗、再試行中..."
                sleep 2
            fi
        fi
    done
    
    if [ "$auth_api_working" = false ]; then
        alert "❌ Auth API接続が失敗しています（${max_auth_retries}回試行後）"
        failures=$((failures + 1))
        health_score=$((health_score - 15))
    fi
    
    # 5. リソース使用量チェック
    local memory_usage=$(docker stats --no-stream --format "{{.MemPerc}}" supabase_db_music-practice 2>/dev/null | sed 's/%//')
    if [ -n "$memory_usage" ] && [ "$memory_usage" -gt 80 ] 2>/dev/null; then
        alert "⚠️ データベースのメモリ使用量が高いです: ${memory_usage}%"
        health_score=$((health_score - 10))
    else
        log "✅ リソース使用量: 正常"
    fi
    
    # ヘルススコアの評価
    if [ $health_score -ge 90 ]; then
        log "🎉 ヘルススコア: ${health_score}/100 (優秀)"
    elif [ $health_score -ge 70 ]; then
        log "✅ ヘルススコア: ${health_score}/100 (良好)"
    elif [ $health_score -ge 50 ]; then
        log "⚠️ ヘルススコア: ${health_score}/100 (注意)"
    else
        log "❌ ヘルススコア: ${health_score}/100 (危険)"
    fi
    
    return $failures
}

# 自動修復関数
auto_repair() {
    local failures=$1
    
    log "🔧 自動修復を開始します (失敗回数: $failures)"
    
    if [ $failures -ge $MAX_FAILURES ]; then
        alert "🚨 失敗回数が上限に達しました。完全な再起動を実行します"
        
        # Supabaseを完全に再起動
        log "🔄 Supabaseを完全に再起動中..."
        npx supabase stop
        sleep 10
        
        # Dockerのクリーンアップ
        log "🧹 Dockerコンテナをクリーンアップ中..."
        docker container prune -f > /dev/null 2>&1
        docker system prune -f > /dev/null 2>&1
        
        # Supabaseを再起動
        log "🚀 Supabaseを起動中..."
        npx supabase start
        sleep 20
        
        # 修復後のヘルスチェック
        log "🔍 修復後のヘルスチェック中..."
        if perform_health_check; then
            log "✅ 自動修復が成功しました"
        else
            alert "❌ 自動修復が失敗しました。手動での確認が必要です"
        fi
    else
        log "⚠️ 失敗回数が少ないため、軽微な修復を実行します"
        
        # 軽微な修復（個別サービスの再起動など）
        if ! curl -s -f "http://127.0.0.1:54321/rest/v1/" > /dev/null 2>&1; then
            log "🔄 Kong Gatewayを再起動中..."
            docker restart supabase_kong_music-practice > /dev/null 2>&1
            sleep 5
        fi
        
        if ! docker exec supabase_db_music-practice pg_isready -U postgres > /dev/null 2>&1; then
            log "🔄 データベースを再起動中..."
            docker restart supabase_db_music-practice > /dev/null 2>&1
            sleep 10
        fi
    fi
}

# メイン監視ループ
main() {
    log "🚀 Supabaseヘルス監視を開始します"
    log "監視間隔: ${CHECK_INTERVAL}秒"
    log "最大失敗回数: ${MAX_FAILURES}回"
    log "ログファイル: $HEALTH_LOG"
    log "アラートログ: $ALERT_LOG"
    echo ""
    
    local consecutive_failures=0
    
    while true; do
        log "🔍 ヘルスチェック実行中..."
        
        # ヘルスチェック実行
        if perform_health_check; then
            log "✅ ヘルスチェック完了: 正常"
            consecutive_failures=0
        else
            consecutive_failures=$((consecutive_failures + 1))
            log "❌ ヘルスチェック完了: 異常 (連続失敗: $consecutive_failures)"
            
            # 自動修復の実行
            auto_repair $consecutive_failures
        fi
        
        log "次のチェックまで ${CHECK_INTERVAL} 秒待機中..."
        log "----------------------------------------"
        
        sleep $CHECK_INTERVAL
    done
}

# シグナルハンドリング
trap 'log "🛑 監視を停止します"; exit 0' INT TERM

# スクリプト実行
main "$@"
