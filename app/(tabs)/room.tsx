import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Music, Users, Settings, X, Upload, Edit3, MessageCircle, Play } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { RoomManager, ScoreManager, Room, Score, RoomMember } from '@/lib/roomDatabase';

export default function RoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  
  // 状態管理
  const [room, setRoom] = useState<Room | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [showUploadScore, setShowUploadScore] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isNewRoom, setIsNewRoom] = useState(false);
  
  // 楽譜アップロードフォーム
  const [uploadForm, setUploadForm] = useState({
    title: '',
    composer: '',
    filePath: '',
    fileType: 'image' as 'image' | 'pdf',
    pageCount: 1
  });

  // 部屋情報を読み込み
  useEffect(() => {
    if (params.roomId) {
      loadRoomData(params.roomId as string);
    }
  }, [params.roomId]);

  const loadRoomData = async (roomId: string) => {
    setLoading(true);
    try {
      // 部屋情報を取得（簡易実装）
      // TODO: 実際の部屋データを取得
      const mockRoom: Room = {
        id: roomId,
        name: '上智大学管弦楽部',
        description: '上智大学の管弦楽部の練習部屋です',
        icon_name: 'music',
        color_theme: '#2196F3',
        is_active: true,
        created_by: 'user123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setRoom(mockRoom);

      // 楽譜一覧を取得
      const scoresResult = await ScoreManager.getRoomScores(roomId);
      if (scoresResult.success && scoresResult.scores) {
        setScores(scoresResult.scores);
      }

      // メンバー一覧を取得
      const membersResult = await RoomManager.getRoomMembers(roomId);
      if (membersResult.success && membersResult.members) {
        setMembers(membersResult.members);
      }
            } catch (error) {
          // 部屋データ読み込みエラー
        } finally {
      setLoading(false);
    }
  };

  // 楽譜アップロード
  const handleUploadScore = async () => {
    if (!uploadForm.title.trim()) {
      Alert.alert('エラー', '楽譜タイトルを入力してください');
      return;
    }

    if (!uploadForm.filePath.trim()) {
      Alert.alert('エラー', 'ファイルを選択してください');
      return;
    }

    if (!room) return;

    setLoading(true);
    try {
      const result = await ScoreManager.uploadScore(
        room.id,
        uploadForm.title.trim(),
        uploadForm.composer.trim(),
        uploadForm.filePath,
        uploadForm.fileType,
        uploadForm.pageCount
      );

      if (result.success && result.score) {
        Alert.alert('成功', '楽譜をアップロードしました！');
        setShowUploadScore(false);
        setUploadForm({ title: '', composer: '', filePath: '', fileType: 'image', pageCount: 1 });
        loadRoomData(room.id);
      } else {
        Alert.alert('エラー', result.error || '楽譜のアップロードに失敗しました');
      }
            } catch (error) {
          Alert.alert('エラー', '楽譜のアップロードに失敗しました');
        } finally {
      setLoading(false);
    }
  };

  // 楽譜を開く
  const openScore = (score: Score) => {
    // TODO: 楽譜編集画面に遷移
    Alert.alert('楽譜を開く', `楽譜「${score.title}」を開きます`);
  };

  // 楽譜を編集
  const editScore = (score: Score) => {
    // TODO: 楽譜編集画面に遷移
    Alert.alert('楽譜を編集', `楽譜「${score.title}」を編集します`);
  };

  if (!room) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
        <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}> 
          読み込み中...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} > 
      {/* ヘッダー */}
      <View style={styles.header}> 
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.push('/(tabs)/settings' as any)} 
        > 
          <ArrowLeft size={24} color={currentTheme.text} /> 
        </TouchableOpacity> 
        
        <View style={styles.headerContent}> 
          <View style={[styles.roomIcon, { backgroundColor: room.color_theme }]}> 
            <Music size={24} color="#FFFFFF" /> 
          </View> 
          <View style={styles.roomInfo}> 
            <Text style={[styles.roomName, { color: currentTheme.text }]}> 
              {room.name} 
            </Text> 
            <Text style={[styles.roomId, { color: currentTheme.primary }]}> 
              ID: {room.id} 
            </Text> 
          </View> 
        </View> 

        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => setShowMembers(true)} 
        > 
          <Users size={24} color={currentTheme.text} /> 
        </TouchableOpacity> 
      </View>

      {/* 部屋の説明 */}
      {room.description && (
        <View style={[styles.descriptionContainer, { backgroundColor: currentTheme.surface }]}> 
          <Text style={[styles.descriptionText, { color: currentTheme.textSecondary }]}> 
            {room.description} 
          </Text> 
        </View>
      )}

      {/* 部屋作成後の歓迎メッセージ */}
      {scores.length === 0 && !loading && (
        <View style={[styles.welcomeContainer, { backgroundColor: `${currentTheme.primary}20` }]}>
          <Text style={[styles.welcomeTitle, { color: currentTheme.primary }]}>
            🎉 部屋を作成しました！
          </Text>
          <Text style={[styles.welcomeText, { color: currentTheme.textSecondary }]}>
            最初の楽譜をアップロードして、練習を始めましょう
          </Text>
          <TouchableOpacity
            style={[styles.uploadPromptButton, { backgroundColor: currentTheme.primary }]}
            onPress={() => setShowUploadScore(true)}
          >
            <Upload size={16} color="#FFFFFF" />
            <Text style={styles.uploadPromptButtonText}>最初の楽譜をアップロード</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* アクションボタン */}
      <View style={styles.actionButtons}> 
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: currentTheme.primary }]} 
          onPress={() => setShowUploadScore(true)} 
        > 
          <Upload size={20} color={currentTheme.surface} /> 
          <Text style={[styles.actionButtonText, { color: currentTheme.surface }]}> 
            楽譜をアップロード 
          </Text> 
        </TouchableOpacity> 
      </View>

      {/* 楽譜一覧 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}> 
        <View style={styles.scoresContainer}> 
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}> 
            楽譜一覧 
          </Text> 
          
          {loading ? (
            <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}> 
              読み込み中... 
            </Text> 
          ) : scores.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: currentTheme.surface }]}> 
              <Music size={48} color={currentTheme.textSecondary} /> 
              <Text style={[styles.emptyStateTitle, { color: currentTheme.text }]}> 
                まだ楽譜がありません 
              </Text> 
              <Text style={[styles.emptyStateText, { color: currentTheme.textSecondary }]}> 
                楽譜をアップロードして練習を始めましょう 
              </Text> 
              <TouchableOpacity
                style={[styles.uploadPromptButton, { backgroundColor: currentTheme.primary }]}
                onPress={() => setShowUploadScore(true)}
              >
                <Upload size={16} color="#FFFFFF" />
                <Text style={styles.uploadPromptButtonText}>最初の楽譜をアップロード</Text>
              </TouchableOpacity>
            </View> 
          ) : (
            scores.map((score) => (
              <View 
                key={score.id} 
                style={[styles.scoreCard, { backgroundColor: currentTheme.surface }]} 
              > 
                <View style={styles.scoreHeader}> 
                  <View style={styles.scoreInfo}> 
                    <Text style={[styles.scoreTitle, { color: currentTheme.text }]}> 
                      {score.title} 
                    </Text> 
                    {score.composer && (
                      <Text style={[styles.scoreComposer, { color: currentTheme.textSecondary }]}> 
                        {score.composer} 
                      </Text> 
                    )}
                    <Text style={[styles.scorePages, { color: currentTheme.primary }]}> 
                      {score.page_count}ページ 
                    </Text> 
                  </View> 
                  
                  <View style={styles.scoreActions}> 
                    <TouchableOpacity 
                      style={[styles.scoreActionButton, { backgroundColor: currentTheme.primary }]} 
                      onPress={() => openScore(score)} 
                    > 
                      <Play size={16} color={currentTheme.surface} /> 
                    </TouchableOpacity> 
                    
                    <TouchableOpacity 
                      style={[styles.scoreActionButton, { backgroundColor: currentTheme.secondary }]} 
                      onPress={() => editScore(score)} 
                    > 
                      <Edit3 size={16} color={currentTheme.text} /> 
                    </TouchableOpacity> 
                  </View> 
                </View> 
              </View> 
            ))
          )}
        </View> 
      </ScrollView>

      {/* 楽譜アップロードモーダル */}
      <Modal 
        visible={showUploadScore} 
        transparent={true} 
        animationType="slide" 
        onRequestClose={() => setShowUploadScore(false)} 
      > 
        <View style={styles.modalOverlay}> 
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}> 
            <View style={styles.modalHeader}> 
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}> 
                楽譜をアップロード 
              </Text> 
              <TouchableOpacity onPress={() => setShowUploadScore(false)}> 
                <X size={24} color={currentTheme.text} /> 
              </TouchableOpacity> 
            </View>

            <ScrollView style={styles.modalBody}> 
              <View style={styles.inputContainer}> 
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}> 
                  楽譜タイトル * 
                </Text> 
                <TextInput 
                  style={[styles.textInput, {  
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]} 
                  value={uploadForm.title} 
                  onChangeText={(text) => setUploadForm(prev => ({ ...prev, title: text }))} 
                  placeholder="例：交響曲第5番" 
                  placeholderTextColor={currentTheme.textSecondary}
                  nativeID="room-title-input"
                  accessibilityLabel="楽譜タイトル"
                /> 
              </View> 

              <View style={styles.inputContainer}> 
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}> 
                  作曲者 
                </Text> 
                <TextInput 
                  style={[styles.textInput, {  
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]} 
                  value={uploadForm.composer} 
                  onChangeText={(text) => setUploadForm(prev => ({ ...prev, composer: text }))} 
                  placeholder="例：ベートーヴェン" 
                  placeholderTextColor={currentTheme.textSecondary}
                  nativeID="room-composer-input"
                  accessibilityLabel="作曲者"
                /> 
              </View> 

              <View style={styles.inputContainer}> 
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}> 
                  ファイルパス * 
                </Text> 
                <TextInput 
                  style={[styles.textInput, {  
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]} 
                  value={uploadForm.filePath} 
                  onChangeText={(text) => setUploadForm(prev => ({ ...prev, filePath: text }))} 
                  placeholder="ファイルパスを入力" 
                  placeholderTextColor={currentTheme.textSecondary}
                  nativeID="room-filepath-input"
                  accessibilityLabel="ファイルパス"
                /> 
              </View>

              <View style={styles.inputContainer}> 
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}> 
                  ページ数 
                </Text> 
                <TextInput 
                  style={[styles.textInput, {  
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]} 
                  value={uploadForm.pageCount.toString()} 
                  onChangeText={(text) => setUploadForm(prev => ({ ...prev, pageCount: parseInt(text) || 1 }))} 
                  placeholder="1" 
                  placeholderTextColor={currentTheme.textSecondary} 
                  keyboardType="numeric"
                  nativeID="room-pagecount-input"
                  accessibilityLabel="ページ数" 
                /> 
              </View>

              <TouchableOpacity 
                style={[styles.modalButton, {  
                  backgroundColor: currentTheme.primary,
                  opacity: loading ? 0.6 : 1
                }]} 
                onPress={handleUploadScore} 
                disabled={loading} 
              > 
                <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}> 
                  {loading ? 'アップロード中...' : '楽譜をアップロード'} 
                </Text> 
              </TouchableOpacity> 
            </ScrollView> 
          </View> 
        </View> 
      </Modal>

      {/* メンバー一覧モーダル */}
      <Modal 
        visible={showMembers} 
        transparent={true} 
        animationType="slide" 
        onRequestClose={() => setShowMembers(false)} 
      > 
        <View style={styles.modalOverlay}> 
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}> 
            <View style={styles.modalHeader}> 
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}> 
                メンバー一覧 
              </Text> 
              <TouchableOpacity onPress={() => setShowMembers(false)}> 
                <X size={24} color={currentTheme.text} /> 
              </TouchableOpacity> 
            </View>

            <ScrollView style={styles.modalBody}> 
              {members.length === 0 ? (
                <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}> 
                  メンバーが見つかりません 
                </Text> 
              ) : (
                members.map((member) => (
                  <View 
                    key={member.id} 
                    style={[styles.memberItem, { backgroundColor: currentTheme.background }]} 
                  > 
                    <View style={styles.memberInfo}> 
                      <Text style={[styles.memberNickname, { color: currentTheme.text }]}> 
                        {member.display_name} 
                      </Text> 
                      <Text style={[styles.memberRole, { color: currentTheme.primary }]}> 
                        {member.role === 'admin' ? '管理者' : 'メンバー'} 
                      </Text> 
                    </View> 
                    <Text style={[styles.memberJoined, { color: currentTheme.textSecondary }]}> 
                      {new Date(member.joined_at).toLocaleDateString('ja-JP')} 
                    </Text> 
                  </View> 
                ))
              )}
            </ScrollView> 
          </View> 
        </View> 
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  roomId: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingsButton: {
    padding: 8,
  },
  descriptionContainer: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionButtons: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scoresContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 16,
    
    
    elevation: 4,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  scoreCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    
    
    elevation: 4,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreComposer: {
    fontSize: 14,
    marginBottom: 4,
  },
  scorePages: {
    fontSize: 12,
    fontWeight: '500',
  },
  scoreActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    
    
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberNickname: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberJoined: {
    fontSize: 12,
  },
  // 新しく追加したスタイル
  welcomeContainer: {
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  uploadPromptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
