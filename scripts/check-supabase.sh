#!/bin/bash

# Supabase状態確認スクリプト（改善版）
# 使用方法: ./check-supabase.sh

# 色付き出力の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ヘルスチェック関数
check_service_health() {
    local service_name="$1"
    local container_name="$2"
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name"; then
        local status=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$container_name" | awk '{print $2}')
        if [[ "$status" == *"Up"* ]]; then
            success "$service_name: 正常動作中 ($status)"
            return 0
        else
            warning "$service_name: 異常状態 ($status)"
            return 1
        fi
    else
        error "$service_name: 停止中"
        return 1
    fi
}

# データベース接続テスト
test_database_connection() {
    log "🗄️ データベース接続テスト中..."
    
    if docker exec supabase_db_music-practice pg_isready -U postgres > /dev/null 2>&1; then
        success "データベース接続: 正常"
        
        # 基本的なクエリテスト
        if docker exec supabase_db_music-practice psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
            success "データベースクエリ: 正常"
            return 0
        else
            warning "データベースクエリ: 異常"
            return 1
        fi
    else
        error "データベース接続: 失敗"
        return 1
    fi
}

# API接続テスト
test_api_connection() {
    log "🌐 API接続テスト中..."
    
    # REST APIテスト
    if curl -s -f "http://127.0.0.1:54321/rest/v1/" > /dev/null 2>&1; then
        success "REST API: 正常"
    else
        error "REST API: 失敗"
        return 1
    fi
    
    # Auth APIテスト
    if curl -s -f "http://127.0.0.1:54321/auth/v1/health" > /dev/null 2>&1; then
        success "Auth API: 正常"
    else
        error "Auth API: 失敗"
        return 1
    fi
    
    # Storage APIテスト
    if curl -s -f "http://127.0.0.1:54321/storage/v1/" > /dev/null 2>&1; then
        success "Storage API: 正常"
    else
        error "Storage API: 失敗"
        return 1
    fi
    
    return 0
}

# リソース使用量チェック
check_resource_usage() {
    log "💾 リソース使用量を確認中..."
    
    # Dockerコンテナのリソース使用量
    echo ""
    echo "Dockerコンテナのリソース使用量:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    
    # ディスク使用量
    echo ""
    echo "ディスク使用量:"
    df -h | grep -E "(Filesystem|/dev/)"
}

# メイン処理
main() {
    echo "🔍 Supabaseの詳細な状態確認を開始します..."
    echo "=========================================="
    
    # 基本的な状態確認
    log "📊 Supabaseの基本状態を確認中..."
    if npx supabase status > /dev/null 2>&1; then
        success "Supabaseは起動しています"
        echo ""
        npx supabase status
    else
        error "Supabaseが停止しています"
        echo ""
        echo "🔄 再起動しますか？ (y/n)"
        read -r response
        
        if [[ "$response" =~ ^[Yy]$ ]]; then
            log "🔄 Supabaseを再起動中..."
            npx supabase stop
            sleep 5
            npx supabase start
            success "再起動完了"
        else
            log "❌ 再起動をキャンセルしました"
            exit 1
        fi
    fi
    
    echo ""
    echo "=========================================="
    
    # サービスヘルスチェック
    log "🏥 各サービスのヘルスチェック中..."
    
    local overall_health=true
    
    # 主要サービスのチェック
    check_service_health "PostgreSQL" "supabase_db_music-practice" || overall_health=false
    check_service_health "Kong Gateway" "supabase_kong_music-practice" || overall_health=false
    check_service_health "Auth Service" "supabase_auth_music-practice" || overall_health=false
    check_service_health "Realtime" "supabase_realtime_music-practice" || overall_health=false
    check_service_health "Storage" "supabase_storage_music-practice" || overall_health=false
    
    echo ""
    echo "=========================================="
    
    # 接続テスト
    local connection_health=true
    
    test_database_connection || connection_health=false
    echo ""
    test_api_connection || connection_health=false
    
    echo ""
    echo "=========================================="
    
    # リソース使用量
    check_resource_usage
    
    echo ""
    echo "=========================================="
    
    # 総合評価
    log "📋 総合評価:"
    if [ "$overall_health" = true ] && [ "$connection_health" = true ]; then
        success "🎉 Supabaseは完全に正常に動作しています！"
    elif [ "$overall_health" = true ]; then
        warning "⚠️ サービスは起動していますが、接続に問題があります"
    elif [ "$connection_health" = true ]; then
        warning "⚠️ 接続は正常ですが、一部のサービスに問題があります"
    else
        error "❌ Supabaseに重大な問題があります。再起動が必要です"
    fi
    
    echo ""
    echo "=========================================="
    
    # 推奨アクション
    if [ "$overall_health" = false ] || [ "$connection_health" = false ]; then
        log "🔧 推奨アクション:"
        echo "1. Supabaseの再起動: npx supabase restart"
        echo "2. データベースのリセット: npx supabase db reset"
        echo "3. 完全な再起動: npx supabase stop && npx supabase start"
        echo "4. Dockerのクリーンアップ: docker system prune -f"
    fi
}

# スクリプト実行
main "$@"
