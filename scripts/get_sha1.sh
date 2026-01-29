#!/bin/bash
# Android SHA-1取得スクリプト
# Google OAuth認証やFirebase認証に必要なSHA-1フィンガープリントを取得します

set -e

echo "🔐 Android SHA-1取得スクリプト"
echo "================================"
echo ""

# デバッグキーストアのパス（デフォルト）
DEBUG_KEYSTORE="$HOME/.android/debug.keystore"
DEBUG_KEYSTORE_PASSWORD="android"
DEBUG_KEY_ALIAS="androiddebugkey"

# EAS管理のキーストアを使用する場合
USE_EAS=false

# 引数チェック
if [ "$1" = "--eas" ] || [ "$1" = "-e" ]; then
  USE_EAS=true
  echo "📦 EAS管理のキーストアからSHA-1を取得します"
  echo ""
  
  # EAS CLIがインストールされているか確認
  if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLIがインストールされていません"
    echo "   インストール: npm install -g eas-cli"
    exit 1
  fi
  
  # EASにログインしているか確認
  if ! eas whoami &> /dev/null; then
    echo "❌ EASにログインしていません"
    echo "   ログイン: eas login"
    exit 1
  fi
  
  echo "📋 EAS管理のキーストア情報を取得中..."
  echo ""
  
  # EASの認証情報を取得（この方法はEAS CLIのバージョンによって異なる場合があります）
  echo "⚠️  EAS管理のキーストアからSHA-1を取得するには、以下のいずれかの方法を使用してください:"
  echo ""
  echo "方法1: EAS Buildのビルドログから取得"
  echo "   1. eas build --platform android を実行"
  echo "   2. ビルドログにSHA-1が表示されます"
  echo ""
  echo "方法2: Google Play Consoleから取得"
  echo "   1. Google Play Console → アプリ → リリース → 設定 → アプリの署名"
  echo "   2. 「アプリの署名証明書」セクションにSHA-1が表示されます"
  echo ""
  echo "方法3: ローカルのキーストアファイルがある場合"
  echo "   このスクリプトを --local オプションで実行してください"
  echo ""
  exit 0
fi

if [ "$1" = "--local" ] || [ "$1" = "-l" ]; then
  if [ -z "$2" ]; then
    echo "❌ ローカルキーストアのパスを指定してください"
    echo "   使用例: ./scripts/get_sha1.sh --local /path/to/keystore.jks"
    exit 1
  fi
  
  KEYSTORE_PATH="$2"
  KEYSTORE_PASSWORD="${3:-}"
  KEY_ALIAS="${4:-}"
  
  echo "📁 ローカルキーストアからSHA-1を取得します"
  echo "   キーストア: $KEYSTORE_PATH"
  echo ""
  
  if [ ! -f "$KEYSTORE_PATH" ]; then
    echo "❌ キーストアファイルが見つかりません: $KEYSTORE_PATH"
    exit 1
  fi
  
  if [ -z "$KEYSTORE_PASSWORD" ]; then
    echo "🔑 キーストアのパスワードを入力してください:"
    read -s KEYSTORE_PASSWORD
    echo ""
  fi
  
  if [ -z "$KEY_ALIAS" ]; then
    echo "🔑 キーエイリアスを入力してください（デフォルト: key）:"
    read KEY_ALIAS
    KEY_ALIAS="${KEY_ALIAS:-key}"
    echo ""
  fi
  
  echo "🔍 SHA-1を取得中..."
  echo ""
  
  keytool -keystore "$KEYSTORE_PATH" \
    -list -v \
    -alias "$KEY_ALIAS" \
    -storepass "$KEYSTORE_PASSWORD" 2>/dev/null | grep -A 5 "証明書のフィンガープリント" | grep "SHA1:" || \
  keytool -keystore "$KEYSTORE_PATH" \
    -list -v \
    -alias "$KEY_ALIAS" \
    -storepass "$KEYSTORE_PASSWORD" 2>/dev/null | grep -A 5 "Certificate fingerprints" | grep "SHA1:"
  
  exit 0
fi

# デバッグキーストアから取得（デフォルト）
echo "🔍 デバッグキーストアからSHA-1を取得します"
echo "   キーストア: $DEBUG_KEYSTORE"
echo ""

if [ ! -f "$DEBUG_KEYSTORE" ]; then
  echo "⚠️  デバッグキーストアが見つかりません: $DEBUG_KEYSTORE"
  echo ""
  echo "📝 デバッグキーストアを作成しますか？ (y/n)"
  read -r CREATE_KEYSTORE
  if [ "$CREATE_KEYSTORE" = "y" ] || [ "$CREATE_KEYSTORE" = "Y" ]; then
    echo ""
    echo "🔧 デバッグキーストアを作成中..."
    mkdir -p "$HOME/.android"
    keytool -genkey -v \
      -keystore "$DEBUG_KEYSTORE" \
      -storepass "$DEBUG_KEYSTORE_PASSWORD" \
      -alias "$DEBUG_KEY_ALIAS" \
      -keypass "$DEBUG_KEYSTORE_PASSWORD" \
      -keyalg RSA \
      -keysize 2048 \
      -validity 10000 \
      -dname "CN=Android Debug,O=Android,C=US" 2>/dev/null || \
    keytool -genkeypair -v \
      -keystore "$DEBUG_KEYSTORE" \
      -storepass "$DEBUG_KEYSTORE_PASSWORD" \
      -alias "$DEBUG_KEY_ALIAS" \
      -keypass "$DEBUG_KEYSTORE_PASSWORD" \
      -keyalg RSA \
      -keysize 2048 \
      -validity 10000 \
      -dname "CN=Android Debug,O=Android,C=US"
    echo "✅ デバッグキーストアを作成しました"
    echo ""
  else
    echo ""
    echo "📋 他の方法でSHA-1を取得する場合:"
    echo ""
    echo "1. EAS Buildを使用している場合:"
    echo "   eas build --platform android を実行し、ビルドログからSHA-1を確認"
    echo ""
    echo "2. Google Play Consoleから取得:"
    echo "   Google Play Console → アプリ → リリース → 設定 → アプリの署名"
    echo ""
    echo "3. ローカルキーストアがある場合:"
    echo "   ./scripts/get_sha1.sh --local /path/to/keystore.jks"
    echo ""
    exit 0
  fi
fi

echo "🔍 SHA-1を取得中..."
echo ""

# SHA-1を取得（日本語環境と英語環境の両方に対応）
SHA1=$(keytool -keystore "$DEBUG_KEYSTORE" \
  -list -v \
  -alias "$DEBUG_KEY_ALIAS" \
  -storepass "$DEBUG_KEYSTORE_PASSWORD" 2>/dev/null | \
  grep -E "(SHA1:|SHA-1:)" | \
  sed 's/.*\([0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]:[0-9A-F][0-9A-F]\)/\1/' | \
  head -1 | \
  sed 's/.*SHA1: //' | \
  sed 's/.*SHA-1: //' | \
  tr -d ' ')

if [ -z "$SHA1" ]; then
  echo "❌ SHA-1の取得に失敗しました"
  echo ""
  echo "🔍 詳細情報を表示します:"
  keytool -keystore "$DEBUG_KEYSTORE" \
    -list -v \
    -alias "$DEBUG_KEY_ALIAS" \
    -storepass "$DEBUG_KEYSTORE_PASSWORD"
  exit 1
fi

echo "✅ SHA-1フィンガープリント:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$SHA1"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 このSHA-1を以下の場所に登録してください:"
echo ""
echo "1. Google Cloud Console"
echo "   https://console.cloud.google.com/"
echo "   → APIとサービス → 認証情報"
echo "   → OAuth 2.0 クライアントID → Androidアプリ"
echo "   → 「SHA-1証明書フィンガープリント」に追加"
echo ""
echo "2. Firebase Console（Firebaseを使用している場合）"
echo "   https://console.firebase.google.com/"
echo "   → プロジェクト設定 → アプリ → Androidアプリ"
echo "   → 「SHA証明書フィンガープリント」に追加"
echo ""
echo "3. Google Play Console（アプリ署名用）"
echo "   https://play.google.com/console/"
echo "   → アプリ → リリース → 設定 → アプリの署名"
echo ""
