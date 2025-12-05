import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Music, Users, X } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { RoomManager, Room, RoomMember } from '@/lib/roomDatabase';

export default function RoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentTheme } = useInstrumentTheme();
  
  // 状態管理
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [loading, setLoading] = useState(false);

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
  loadingText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 16,
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
});
