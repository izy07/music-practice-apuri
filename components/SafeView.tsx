import React from 'react';
import { View, Text, ViewProps } from 'react-native';

type Props = ViewProps & {
  children?: React.ReactNode;
};

// View直下に生テキストが混入しても落ちないように安全に包むラッパー
export default function SafeView({ children, pointerEvents, style, ...rest }: Props) {
  const normalizedChildren = React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      const trimmed = child.trim();
      if (!trimmed || trimmed === '.') {
        return null; // 空白・ピリオド単体は捨てる
      }
      return <Text>{trimmed}</Text>;
    }
    return child as React.ReactElement | null;
  });

  // pointerEventsをstyleに移動（非推奨警告を回避）
  // pointerEventsをrestから除外して、propsとして渡さないようにする
  const { pointerEvents: _, ...restWithoutPointerEvents } = rest as any;
  const viewStyle = pointerEvents 
    ? [{ pointerEvents: pointerEvents as any }, style]
    : style;

  return <View style={viewStyle} {...restWithoutPointerEvents}>{normalizedChildren}</View>;
}


