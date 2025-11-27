/**
 * 依存性注入コンテナ
 * 
 * 依存性逆転の原則（DIP）を実装し、テスト容易性と拡張性を向上
 * サービス間の結合度を削減
 */

type Constructor<T> = new (...args: any[]) => T;
type Factory<T> = (...args: any[]) => T;
type ServiceIdentifier<T> = string | Constructor<T>;

/**
 * サービス定義
 */
interface ServiceDefinition<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

/**
 * 依存性注入コンテナ
 */
class DIContainer {
  private services = new Map<string, ServiceDefinition<any>>();

  /**
   * シングルトンサービスを登録
   */
  registerSingleton<T>(
    identifier: ServiceIdentifier<T>,
    factory: Factory<T>
  ): void {
    const key = this.getKey(identifier);
    this.services.set(key, {
      factory,
      singleton: true,
    });
  }

  /**
   * ファクトリーサービスを登録（毎回新しいインスタンスを作成）
   */
  registerFactory<T>(
    identifier: ServiceIdentifier<T>,
    factory: Factory<T>
  ): void {
    const key = this.getKey(identifier);
    this.services.set(key, {
      factory,
      singleton: false,
    });
  }

  /**
   * サービスを解決
   */
  resolve<T>(identifier: ServiceIdentifier<T>): T {
    const key = this.getKey(identifier);
    const definition = this.services.get(key);

    if (!definition) {
      throw new Error(`Service not found: ${key}`);
    }

    // シングルトンの場合は既存のインスタンスを返す
    if (definition.singleton) {
      if (!definition.instance) {
        definition.instance = definition.factory();
      }
      return definition.instance;
    }

    // ファクトリーの場合は毎回新しいインスタンスを作成
    return definition.factory();
  }

  /**
   * サービスが登録されているかチェック
   */
  has(identifier: ServiceIdentifier<any>): boolean {
    const key = this.getKey(identifier);
    return this.services.has(key);
  }

  /**
   * 識別子をキーに変換
   */
  private getKey(identifier: ServiceIdentifier<any>): string {
    if (typeof identifier === 'string') {
      return identifier;
    }
    return identifier.name;
  }

  /**
   * 全てのサービスをクリア（テスト用）
   */
  clear(): void {
    this.services.clear();
  }
}

// グローバルコンテナインスタンス
const container = new DIContainer();

/**
 * サービス登録ヘルパー
 */
export const registerService = <T>(
  identifier: ServiceIdentifier<T>,
  factory: Factory<T>,
  singleton: boolean = true
): void => {
  if (singleton) {
    container.registerSingleton(identifier, factory);
  } else {
    container.registerFactory(identifier, factory);
  }
};

/**
 * サービス解決ヘルパー
 */
export const resolveService = <T>(identifier: ServiceIdentifier<T>): T => {
  return container.resolve(identifier);
};

/**
 * サービス存在チェックヘルパー
 */
export const hasService = (identifier: ServiceIdentifier<any>): boolean => {
  return container.has(identifier);
};

/**
 * コンテナをリセット（テスト用）
 */
export const resetContainer = (): void => {
  container.clear();
};

// サービス識別子の定数
export const SERVICE_KEYS = {
  GOAL_SERVICE: 'GoalService',
  PRACTICE_SERVICE: 'PracticeService',
  USER_SERVICE: 'UserService',
  AUTH_SERVICE: 'AuthService',
} as const;

