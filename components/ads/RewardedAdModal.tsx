import React from 'react';

type RewardedAdModalProps = {
  visible: boolean;
  onRewardEarned: () => void;
  onClose: () => void;
  onError?: (error: Error) => void;
};

/** リワード広告（AdMob）はクローズドテスト向けに一時無効 */
export const RewardedAdModal: React.FC<RewardedAdModalProps> = () => null;
