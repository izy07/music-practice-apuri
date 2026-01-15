import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '@/hooks/useSubscription';

const TAB_BAR_HEIGHT = 65;
const DUMMY_AD_HEIGHT = 50;
// 値を増やすほど「上」に、減らすほど「下（タブバーに近く）」に寄ります
const BOTTOM_OFFSET = -10;

// WebではAdMobネイティブSDKが使えないため、レイアウト確認用のダミー枠を表示
export const BottomBannerAd = () => {
  const insets = useSafeAreaInsets();
  const { entitlement, loading } = useSubscription();

  const shouldShow = useMemo(() => {
    if (Platform.OS !== 'web') return false;
    if (loading) return false;
    return !entitlement.isEntitled;
  }, [entitlement.isEntitled, loading]);

  // 念のため（web以外ではnative側が使われる想定）
  if (!shouldShow) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          bottom: TAB_BAR_HEIGHT + (insets.bottom || 0) + BOTTOM_OFFSET,
        },
      ]}
    >
      <View style={styles.box}>
        <Text style={styles.text}>Ad (Web preview) {DUMMY_AD_HEIGHT}px</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
  },
  box: {
    width: '100%',
    height: DUMMY_AD_HEIGHT,
    backgroundColor: '#EEEEEE',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
  },
});

