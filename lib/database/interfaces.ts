/**
 * データベースアクセスの抽象化インターフェース
 * 
 * 依存性逆転の原則（DIP）に従い、具体的な実装ではなく抽象に依存する設計
 * これにより、テスト容易性と拡張性が向上します
 */

/**
 * データベース操作の結果型
 */
export type RepositoryResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * クエリオプション
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * 基本的なリポジトリインターフェース
 */
export interface BaseRepository<T> {
  findById(id: string): Promise<RepositoryResult<T>>;
  findAll(options?: QueryOptions): Promise<RepositoryResult<T[]>>;
  create(data: Partial<T>): Promise<RepositoryResult<T>>;
  update(id: string, data: Partial<T>): Promise<RepositoryResult<T>>;
  delete(id: string): Promise<RepositoryResult<void>>;
}

/**
 * ユーザー認証関連のインターフェース
 */
export interface IAuthRepository {
  getCurrentUser(): Promise<RepositoryResult<{ id: string; email?: string }>>;
  getSession(): Promise<RepositoryResult<{ accessToken: string; refreshToken: string }>>;
  signOut(): Promise<RepositoryResult<void>>;
}

/**
 * データアクセスレイヤーの抽象化
 * これにより、Supabaseの実装詳細からUIを切り離す
 */
export interface IDataAccessLayer {
  auth: IAuthRepository;
}

