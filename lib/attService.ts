import { Platform } from 'react-native';

export class ATTService {
  private static instance: ATTService;
  private trackingStatus: any = null;

  private constructor() {}

  static getInstance(): ATTService {
    if (!ATTService.instance) {
      ATTService.instance = new ATTService();
    }
    return ATTService.instance;
  }

  /**
   * ATTの許可をリクエスト
   */
  async requestTrackingPermission(): Promise<any> {
    if (Platform.OS !== 'ios') {
      // iOS以外では常に許可済みとして扱う
      this.trackingStatus = { status: 'authorized' };
      return this.trackingStatus;
    }

    // iOS環境では実際のATT実装が必要
    // 現在はWeb環境でのエラー回避のため、常に許可済みとして扱う
    this.trackingStatus = { status: 'authorized' };
    return this.trackingStatus;
  }

  /**
   * 現在のトラッキング許可状況を取得
   */
  async getTrackingStatus(): Promise<any> {
    if (Platform.OS !== 'ios') {
      return { status: 'authorized' };
    }

    // iOS環境では実際のATT実装が必要
    // 現在はWeb環境でのエラー回避のため、常に許可済みとして扱う
    return { status: 'authorized' };
  }

  /**
   * トラッキングが許可されているかチェック
   */
  async isTrackingAuthorized(): Promise<boolean> {
    const status = await this.getTrackingStatus();
    return status.status === 'authorized';
  }

  /**
   * ATTの説明テキストを取得
   */
  getATTExplanationText(): string {
    return 'このアプリは、より良いサービスを提供するために、あなたの使用状況を追跡することがあります。この情報は、アプリの改善やパーソナライズされた体験の提供に使用されます。';
  }

  /**
   * ATTの設定画面への案内テキストを取得
   */
  getATTSettingsGuideText(): string {
    return 'トラッキングの設定を変更したい場合は、iOSの設定 > プライバシーとセキュリティ > トラッキングから変更できます。';
  }
}
