#!/bin/bash

# コンポーネントサイズ分析スクリプト
# 使用方法: ./scripts/analyze-component-size.sh

echo "📊 コンポーネントサイズ分析"
echo "=================================="
echo ""

echo "🔴 要分割（1000行以上）:"
find app -name "*.tsx" -type f -exec wc -l {} \; | awk '$1 > 1000 {print $1 " lines - " $2}' | sort -rn

echo ""
echo "🟡 分割推奨（500-1000行）:"
find app -name "*.tsx" -type f -exec wc -l {} \; | awk '$1 >= 500 && $1 <= 1000 {print $1 " lines - " $2}' | sort -rn

echo ""
echo "✅ 適切なサイズ（500行未満）:"
find app -name "*.tsx" -type f -exec wc -l {} \; | awk '$1 < 500 {count++} END {print count " ファイル"}'

echo ""
echo "=================================="
echo "📈 統計:"
echo "総ファイル数: $(find app -name "*.tsx" | wc -l)"
echo "平均行数: $(find app -name "*.tsx" -type f -exec wc -l {} \; | awk '{total += $1; count++} END {print int(total/count)}')"

