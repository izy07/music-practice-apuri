import React from 'react';
import { View, Text, ViewProps } from 'react-native';

type Props = ViewProps & {
  children?: React.ReactNode;
};

// View直下に生テキストが混入しても落ちないように安全に包むラッパー
export default function SafeView({ children, ...rest }: Props) {
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

  return <View {...rest}>{normalizedChildren}</View>;
}


