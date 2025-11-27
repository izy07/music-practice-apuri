import React, { useState, useCallback, useMemo, memo } from 'react';
import { Image, View, ActivityIndicator, ImageProps, StyleSheet } from 'react-native';

interface OptimizedImageProps extends ImageProps {
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  cachePolicy?: 'memory' | 'disk' | 'memory-disk';
  fadeDuration?: number;
  progressive?: boolean;
}

// 画像キャッシュマネージャー（メモリキャッシュ）
const imageCache = new Map<string, boolean>();

export const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  placeholder,
  fallback,
  onError,
  onLoad,
  cachePolicy = 'memory-disk',
  fadeDuration = 300,
  progressive = true,
  source,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // 画像URLを抽出（キャッシュキー用）
  const imageKey = useMemo(() => {
    if (typeof source === 'object' && source !== null && 'uri' in source) {
      return source.uri;
    }
    return null;
  }, [source]);

  // キャッシュから読み込み済みかチェック
  const isCached = useMemo(() => {
    if (imageKey && cachePolicy !== 'disk') {
      return imageCache.has(imageKey);
    }
    return false;
  }, [imageKey, cachePolicy]);

  const handleLoad = useCallback((event: any) => {
    setLoading(false);
    
    // キャッシュに追加
    if (imageKey && cachePolicy !== 'disk') {
      imageCache.set(imageKey, true);
    }
    
    onLoad?.(event);
  }, [imageKey, cachePolicy, onLoad]);

  const handleError = useCallback((error: any) => {
    setLoading(false);
    setError(true);
    onError?.(error);
  }, [onError]);

  // エラー時のフォールバック
  if (error) {
    return <>{fallback}</>;
  }

  // スタイルをuseMemoでキャッシュ
  const containerStyle = useMemo(() => styles.container, []);
  const loaderContainerStyle = useMemo(() => styles.loaderContainer, []);
  
  const imageStyle = useMemo(() => [
    props.style,
    loading && !isCached ? { opacity: 0 } : { opacity: 1 },
    !isCached && fadeDuration > 0 ? { transition: `opacity ${fadeDuration}ms ease-in-out` } : null
  ], [props.style, loading, isCached, fadeDuration]);

  return (
    <View style={containerStyle}>
      {loading && !isCached && (
        <View style={loaderContainerStyle}>
          {placeholder || <ActivityIndicator size="small" />}
        </View>
      )}
      <Image
        {...props}
        source={source}
        onLoad={handleLoad}
        onError={handleError}
        style={imageStyle}
        // プログレッシブ読み込みを有効化
        progressiveRenderingEnabled={progressive}
        // キャッシュポリシーを設定
        cache={cachePolicy === 'disk' ? 'only-if-cached' : cachePolicy === 'memory' ? 'reload' : 'force-cache'}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数で不要な再レンダリングを防ぐ
  const prevSource = typeof prevProps.source === 'object' && prevProps.source !== null && 'uri' in prevProps.source ? prevProps.source.uri : prevProps.source;
  const nextSource = typeof nextProps.source === 'object' && nextProps.source !== null && 'uri' in nextProps.source ? nextProps.source.uri : nextProps.source;
  
  return (
    prevSource === nextSource &&
    prevProps.style === nextProps.style &&
    prevProps.cachePolicy === nextProps.cachePolicy
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});

// キャッシュクリア用のユーティリティ関数
export const clearImageCache = () => {
  imageCache.clear();
};
