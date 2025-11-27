import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import logger from './logger';
import { ErrorHandler } from './errorHandler';

export interface Room {
  id: string;
  parent_room_id?: string;
  name: string;
  description?: string;
  icon_name: string;
  color_theme: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface Score {
  id: string;
  room_id: string;
  title: string;
  composer?: string;
  file_path: string;
  file_type: 'image' | 'pdf';
  page_count: number;
  thumbnail_path?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ScoreEdit {
  id: string;
  score_id: string;
  user_id: string;
  edit_type: 'drawing' | 'text' | 'stamp' | 'highlight';
  edit_data: any;
  page_number: number;
  created_at: string;
}

export interface ScoreComment {
  id: string;
  score_id: string;
  user_id: string;
  comment: string;
  page_number: number;
  x_position?: number;
  y_position?: number;
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AudioMemo {
  id: string;
  score_id: string;
  user_id: string;
  audio_path: string;
  duration_seconds: number;
  page_number: number;
  x_position?: number;
  y_position?: number;
  created_at: string;
}

// 部屋管理機能
export class RoomManager {
  // 部屋の作成
  static async createRoom(
    name: string,
    description: string,
    password: string,
    parentRoomId?: string,
    iconName: string = 'music',
    colorTheme: string = '#2196F3',
    userId?: string
  ): Promise<{ success: boolean; room?: Room; error?: string }> {
    try {
      logger.debug('RoomManager.createRoom 開始:', { name, description, iconName, colorTheme, userId });
      
      // ユーザーIDが渡された場合はそれを使用
      if (userId) {
        logger.debug('渡されたユーザーIDを使用:', userId);
        const user = { id: userId };
        
        // 6文字のユニークな部屋IDを生成
        const roomId = await this.generateUniqueRoomId();
        logger.debug('生成された部屋ID:', roomId);
        
        // パスワードをハッシュ化
        const passwordHash = await bcrypt.hash(password, 10);
        logger.debug('パスワードハッシュ化完了');

        const { data: room, error } = await supabase
          .from('rooms')
          .insert({
            id: roomId,
            parent_room_id: parentRoomId || null,
            name,
            description,
            password_hash: passwordHash,
            icon_name: iconName,
            color_theme: colorTheme,
            created_by: userId
          })
          .select()
          .single();

        logger.debug('データベース挿入結果:', { room, error });

        if (error) throw error;

        // 作成者を管理者として部屋に追加
        logger.debug('メンバー追加開始');
        await this.addMemberToRoom(room.id, userId, 'ユーザー', 'admin');
        logger.debug('メンバー追加完了');

        return { success: true, room };
      }
      
      // ユーザーIDが渡されていない場合は認証から取得
      // 認証状態を確認（複数の方法を試行）
      let user = null;
      
      // 方法1: セッションから取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      logger.debug('セッション情報:', { session, sessionError });
      
      if (session?.user) {
        user = session.user;
        logger.debug('セッションからユーザー取得:', user);
      } else {
        // 方法2: 直接ユーザー取得
        const { data: { user: directUser }, error: userError } = await supabase.auth.getUser();
        logger.debug('直接ユーザー取得:', { directUser, userError });
        
        if (directUser) {
          user = directUser;
          logger.debug('直接取得でユーザー取得成功:', user);
        }
      }
      
      if (!user) {
        ErrorHandler.handle(sessionError, 'ユーザー取得', false);
        return { success: false, error: 'ユーザーが認証されていません' };
      }
      
      logger.debug('最終的な認証ユーザー:', user);

      // 内部ID（UUID）を生成
      const internalId = crypto.randomUUID();
      
      // 6文字のユニークな表示用部屋IDを生成
      const displayRoomId = await this.generateUniqueRoomId();
      logger.debug('生成された内部ID:', internalId);
      logger.debug('生成された表示用部屋ID:', displayRoomId);
      
      // パスワードをハッシュ化
      const passwordHash = await bcrypt.hash(password, 10);
      logger.debug('パスワードハッシュ化完了');

      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          id: internalId,
          room_id: displayRoomId,
          parent_room_id: parentRoomId || null,
          name,
          description,
          password_hash: passwordHash,
          icon_name: iconName,
          color_theme: colorTheme,
          created_by: user.id
        })
        .select()
        .single();

      logger.debug('データベース挿入結果:', { room, error });

      if (error) throw error;

      // 作成者を管理者として部屋に追加
      logger.debug('メンバー追加開始');
      await this.addMemberToRoom(room.id, user.id, user.email || 'ユーザー', 'admin');
      logger.debug('メンバー追加完了');

      return { success: true, room };
    } catch (error) {
      ErrorHandler.handle(error, '部屋作成', false);
      return { success: false, error: '部屋の作成に失敗しました' };
    }
  }

  // 部屋への入室
  static async joinRoom(
    roomId: string,
    password: string,
    nickname: string
  ): Promise<{ success: boolean; room?: Room; error?: string }> {
    try {
      // 認証状態を確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        return { success: false, error: 'ユーザーが認証されていません' };
      }
      
      const user = session.user;

      // 部屋を検索
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_archived', false)
        .single();

      if (roomError || !room) {
        return { success: false, error: '部屋が見つかりません' };
      }

      // パスワードを検証
      const isValidPassword = await bcrypt.compare(password, room.password_hash);
      if (!isValidPassword) {
        return { success: false, error: '合言葉が正しくありません' };
      }

      // 既にメンバーかチェック
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        return { success: true, room };
      }

      // メンバーとして追加
      await this.addMemberToRoom(room.id, user.id, nickname, 'member');

      return { success: true, room };
    } catch (error) {
      ErrorHandler.handle(error, '部屋入室', false);
      return { success: false, error: '部屋への入室に失敗しました' };
    }
  }

  // ユーザーの部屋一覧を取得
  static async getUserRooms(): Promise<{ success: boolean; rooms?: Room[]; error?: string }> {
    try {
      // 認証状態を確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        return { success: false, error: 'ユーザーが認証されていません' };
      }
      
      const user = session.user;

      // 1) ユーザーの参加している room_id を先に取得
      const { data: memberships, error: memberError } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const roomIds = (memberships || []).map((m: any) => m.room_id);
      if (roomIds.length === 0) {
        return { success: true, rooms: [] };
      }

      // 2) 部屋本体を取得（RLSで再帰が発生しないよう単純select）
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select('*')
        .in('id', roomIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, rooms };
    } catch (error) {
      ErrorHandler.handle(error, '部屋一覧取得', false);
      return { success: false, error: '部屋一覧の取得に失敗しました' };
    }
  }

  // 部屋のメンバー一覧を取得
  static async getRoomMembers(displayRoomId: string): Promise<{ success: boolean; members?: RoomMember[]; error?: string }> {
    try {
      // 表示用部屋IDから内部IDを取得
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_id', displayRoomId)
        .single();

      if (roomError) {
        ErrorHandler.handle(roomError, '部屋ID取得', false);
        return { success: false, error: '部屋が見つかりません' };
      }

      const { data: members, error } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', room.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return { success: true, members };
    } catch (error) {
      ErrorHandler.handle(error, 'メンバー一覧取得', false);
      return { success: false, error: 'メンバー一覧の取得に失敗しました' };
    }
  }

  // 部屋にメンバーを追加
  static async addMemberToRoom(
    roomId: string,
    userId: string,
    displayName: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('room_members')
        .insert({
          room_id: roomId,
          user_id: userId,
          display_name: displayName,
          role
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      ErrorHandler.handle(error, 'メンバー追加', false);
      return { success: false, error: 'メンバーの追加に失敗しました' };
    }
  }

  // 部屋のメンバーを削除
  static async removeMemberFromRoom(
    displayRoomId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 表示用部屋IDから内部IDを取得
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_id', displayRoomId)
        .single();

      if (roomError) {
        ErrorHandler.handle(roomError, '部屋ID取得', false);
        return { success: false, error: '部屋が見つかりません' };
      }

      const { error } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      ErrorHandler.handle(error, 'メンバー削除', false);
      return { success: false, error: 'メンバーの削除に失敗しました' };
    }
  }

  // 部屋の削除（アーカイブ）
  static async archiveRoom(displayRoomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ is_archived: true })
        .eq('room_id', displayRoomId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      ErrorHandler.handle(error, '部屋アーカイブ', false);
      return { success: false, error: '部屋のアーカイブに失敗しました' };
    }
  }

  // ユニークな部屋IDを生成（重複チェックなしでUUIDベース）
  private static async generateUniqueRoomId(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    
    // 6文字のランダムな部屋IDを生成
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // タイムスタンプの下2桁を追加してユニーク性を確保
    const timestamp = Date.now().toString().slice(-2);
    roomId = roomId.slice(0, 4) + timestamp;
    
    return roomId;
  }
}

// 楽譜管理機能
export class ScoreManager {
  // 楽譜のアップロード
  static async uploadScore(
    roomId: string,
    title: string,
    composer: string,
    filePath: string,
    fileType: 'image' | 'pdf',
    pageCount: number = 1,
    thumbnailPath?: string
  ): Promise<{ success: boolean; score?: Score; error?: string }> {
    try {
      // 認証状態を確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        return { success: false, error: 'ユーザーが認証されていません' };
      }
      
      const user = session.user;

      const { data: score, error } = await supabase
        .from('scores')
        .insert({
          room_id: roomId,
          title,
          composer,
          file_path: filePath,
          file_type: fileType,
          page_count: pageCount,
          thumbnail_path: thumbnailPath,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, score };
    } catch (error) {
      ErrorHandler.handle(error, '楽譜アップロード', false);
      return { success: false, error: '楽譜のアップロードに失敗しました' };
    }
  }

  // 部屋の楽譜一覧を取得
  static async getRoomScores(displayRoomId: string): Promise<{ success: boolean; scores?: Score[]; error?: string }> {
    try {
      // 表示用部屋IDから内部IDを取得
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_id', displayRoomId)
        .single();

      if (roomError) {
        ErrorHandler.handle(roomError, '部屋ID取得', false);
        return { success: false, error: '部屋が見つかりません' };
      }

      const { data: scores, error } = await supabase
        .from('scores')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, scores };
    } catch (error) {
      ErrorHandler.handle(error, '楽譜一覧取得', false);
      return { success: false, error: '楽譜一覧の取得に失敗しました' };
    }
  }

  // 楽譜の編集を保存
  static async saveScoreEdit(
    scoreId: string,
    editType: 'drawing' | 'text' | 'stamp' | 'highlight',
    editData: any,
    pageNumber: number = 1
  ): Promise<{ success: boolean; edit?: ScoreEdit; error?: string }> {
    try {
      // 認証状態を確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        return { success: false, error: 'ユーザーが認証されていません' };
      }
      
      const user = session.user;

      const { data: edit, error } = await supabase
        .from('score_edits')
        .insert({
          score_id: scoreId,
          user_id: user.id,
          edit_type: editType,
          edit_data: editData,
          page_number: pageNumber
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, edit };
    } catch (error) {
      ErrorHandler.handle(error, '楽譜編集保存', false);
      return { success: false, error: '楽譜編集の保存に失敗しました' };
    }
  }

  // 楽譜のコメントを保存
  static async saveScoreComment(
    scoreId: string,
    comment: string,
    pageNumber: number = 1,
    xPosition?: number,
    yPosition?: number,
    parentCommentId?: string
  ): Promise<{ success: boolean; comment?: ScoreComment; error?: string }> {
    try {
      // 認証状態を確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        return { success: false, error: 'ユーザーが認証されていません' };
      }
      
      const user = session.user;

      const { data: commentData, error } = await supabase
        .from('score_comments')
        .insert({
          score_id: scoreId,
          user_id: user.id,
          comment,
          page_number: pageNumber,
          x_position: xPosition,
          y_position: yPosition,
          parent_comment_id: parentCommentId
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, comment: commentData };
    } catch (error) {
      ErrorHandler.handle(error, 'コメント保存', false);
      return { success: false, error: 'コメントの保存に失敗しました' };
    }
  }

  // 楽譜のコメント一覧を取得
  static async getScoreComments(scoreId: string): Promise<{ success: boolean; comments?: ScoreComment[]; error?: string }> {
    try {
      const { data: comments, error } = await supabase
        .from('score_comments')
        .select('*')
        .eq('score_id', scoreId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return { success: true, comments };
    } catch (error) {
      ErrorHandler.handle(error, 'コメント一覧取得', false);
      return { success: false, error: 'コメント一覧の取得に失敗しました' };
    }
  }
}
