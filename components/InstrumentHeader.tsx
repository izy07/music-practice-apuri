import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from './InstrumentThemeContext';
import { BookOpen, Music, Target, Brain, ScrollText, BarChart3, X, Zap } from 'lucide-react-native';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { getUserProfile } from '@/repositories/userRepository';
import { getSession } from '@/lib/authService';

export default function InstrumentHeader() {
  const router = useRouter();
  const { selectedInstrument, currentTheme, setSelectedInstrument, dbInstruments } = useInstrumentTheme();
  const [showLearningTools, setShowLearningTools] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  
  // 楽器情報をコンテキストのキャッシュから取得（データベースクエリ不要）
  const instrumentInfo = useMemo(() => {
    if (!selectedInstrument) return null;
    
    // コンテキストのdbInstrumentsから楽器情報を取得
    const instrument = dbInstruments.find(inst => inst.id === selectedInstrument);
    if (instrument) {
      return {
        id: instrument.id,
        name: instrument.name,
        name_en: instrument.nameEn,
      };
    }
    return null;
  }, [selectedInstrument, dbInstruments]);

  // ユーザーの過去の楽器選択を取得（初回のみ、最適化）
  const [userInstrumentInfo, setUserInstrumentInfo] = useState<{ id: string; name: string; name_en: string } | null>(null);
  
  useEffect(() => {
    let cancelled = false;
    
    const fetchUserInstrument = async () => {
      // 既にselectedInstrumentがある場合はスキップ
      if (selectedInstrument) {
        return;
      }
      
      try {
        // 認証状態を確認（サービス層経由）
        const { session, error: sessionError } = await getSession();
        if (sessionError || !session || !session.user || cancelled) {
          return;
        }

        // セッションが有効かチェック
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at && session.expires_at < now) {
          return;
        }

        // リポジトリ層経由でユーザープロフィールを取得
        const profileResult = await getUserProfile(session.user.id);

        if (cancelled) return;

        if (profileResult.success && profileResult.data?.selected_instrument_id) {
          const profile = profileResult.data;
          // コンテキストに未反映の場合は即時反映
          if (!selectedInstrument) {
            try {
              await setSelectedInstrument(profile.selected_instrument_id);
            } catch (e) {
              // 失敗しても表示用のフォールバックは続ける
            }
          }
          
          // コンテキストのキャッシュから楽器情報を取得（データベースクエリ不要）
          const instrument = dbInstruments.find(inst => inst.id === profile.selected_instrument_id);
          if (instrument && !cancelled) {
            setUserInstrumentInfo({
              id: instrument.id,
              name: instrument.name,
              name_en: instrument.nameEn,
            });
          }
        }
      } catch (error) {
        if (cancelled) return;
        
        // 認証関連のエラーは静かに無視
        if (error && typeof error === 'object' && 'message' in error) {
          const errorMessage = (error as { message?: string }).message;
          if (errorMessage && 
                !errorMessage.includes('JWT') && 
                !errorMessage.includes('401') && 
                !errorMessage.includes('403') && 
                !errorMessage.includes('406')) {
              ErrorHandler.handle(error, 'ユーザー楽器情報取得', false);
            }
        }
      }
    };

    fetchUserInstrument();
    
    return () => {
      cancelled = true;
    };
  }, [selectedInstrument, dbInstruments, setSelectedInstrument]);


  const getInstrumentName = () => {
    // 現在選択されている楽器がある場合はそれを表示
    if (selectedInstrument && instrumentInfo) {
      const emoji = getInstrumentEmoji(instrumentInfo.name_en);
      // 楽器名が6文字以上の場合は絵文字を付けない
      if (instrumentInfo.name.length >= 6) {
        return instrumentInfo.name;
      }
      return `${emoji} ${instrumentInfo.name}`;
    }
    
    // 過去に選択されていた楽器がある場合はそれを表示
    if (userInstrumentInfo) {
      const emoji = getInstrumentEmoji(userInstrumentInfo.name_en);
      // 楽器名が6文字以上の場合は絵文字を付けない
      if (userInstrumentInfo.name.length >= 6) {
        return userInstrumentInfo.name;
      }
      return `${emoji} ${userInstrumentInfo.name}`;
    }
    
    // 楽器が選択されていない場合
    return '楽器を選択してください';
  };

  const getCurrentInstrumentInfo = () => {
    if (selectedInstrument && instrumentInfo) return instrumentInfo;
    if (userInstrumentInfo) return userInstrumentInfo;
    return null;
  };

  const getInstrumentEmoji = (nameEn: string): string => {
    const emojiMap: { [key: string]: string } = {
      'Piano': '🎹',
      'Guitar': '🎸',
      'Violin': '🎻',
      'Flute': '🪈',
      'Trumpet': '🎺',
      'Drums': '🥁',
      'Saxophone': '🎷',
      'Horn': '📯',
      'Clarinet': '🎵',
      'Trombone': '🎺',
      'Cello': '🎻',
      'Bassoon': '🎵',
      'Oboe': '🎵',
      'Harp': '🎶',
      'Contrabass': '🎻',
      'Other': '❓'
    };
    return emojiMap[nameEn] || '🎵';
  };

  const handleInstrumentPress = () => {
    // 楽器選択画面に遷移
    router.push('/(tabs)/instrument-selection');
  };

  const openAppealModal = () => {
    setShowAppealModal(true);
  };

  const closeAppealModal = () => {
    setShowAppealModal(false);
  };

  const getInstrumentAppeal = (nameEn: string): string => {
    const appealMap: { [key: string]: string } = {
      Piano: 'ピアノの鍵盤は88鍵あります。これは他のほとんどの楽器と比べても非常に広い音域で、人間の聴覚が識別できる範囲をほぼカバーしています。この広さのおかげで、多層的な音楽をたった一人で作り出すことができます。また、左右の手が全く異なるリズムとメロディを同時に演奏し、さらに楽譜を読み、ペダルを踏むという作業は、極めて高度な多重タスク処理です。これにより、脳の異なる領域が活性化し、特に左右の脳の連携が強まります',
      Guitar: 'ギターは人生の相棒。どこへでも持っていけて、6本の弦から優しいメロディも力強いロックも生まれます。指先で弦を弾く感覚、コードが響き合う瞬間の心地よさは、弾いた人にしかわからない喜び。一人でも、仲間とのセッションでも。ギターを手にした瞬間から、あなたの世界に音楽が溢れます。',
      Violin: 'ヴァイオリンは繊細な音色が音になって響きます。ピアノのように減衰する音ではなく、弓がある限り音を持続できるため、音を長く伸ばしたり、クレッシェンド（だんだん強く）をかけたりしながら、感情の機微を表現できます。小さな楽器だけど大きなホールを満たす力があり、オーケストラでも独奏でも輝く。300年以上愛され続ける、永遠の名器です。',
      Flute: 'フルートの音色は天使の囁きのよう。澄んだ透明感と軽やかさで、聴く人の心を天に舞い上がらせます。木管楽器の中で最も高い音域を担当し、オーケストラでもひときわ輝く存在。息を吹き込む感覚、音が体から生まれる瞬間の一体感は格別です。フルートを吹けば、あなたも音楽の妖精になれます。',
      Trumpet: 'トランペットは輝かしい音色で場を明るく照らし、一音鳴らすだけで注目を集める存在感があります。金管楽器の花形として、ジャズでもクラシックでも主役級。唇と楽器が一つになって音を創る感覚、息がダイレクトに音になる高揚感は格別。あなたの音で、世界を元気にできる楽器です。',
      Drums: 'ドラムは音楽の心臓。あなたのリズムがバンド全体を動かし、グルーヴを生み出します。手と足を使って複雑なリズムを刻む快感、スティックが響く爽快感は、ドラマーにしかわからない喜び。全身を使って音楽を表現できる唯一の楽器。力強くもあり繊細でもある。あなたのビートが、みんなの音楽を支えています。',
      Saxophone: 'サックスは大人の色気と情熱を持つ楽器。ジャズバーではしっとりと、ポップスで華やかに、どんなシーンでも艶やかに響きます。一音聴けば誰もが振り返る魅力的な音色。息を吹き込むとき、楽器と一体になって歌う感覚がたまらない。ソロで自由に表現する瞬間は最高です。カッコよくて心に響く、それがサックス。',
      Horn: 'ホルンの全体が包まれるような柔らかく深みのある音色は、吹奏楽、オーケストラ、に色彩を与えます。演奏が難しい金管楽器の一つだからこそ、美しい音が出せたときの喜びはひとしきです。',
      Clarinet: 'クラリネットは「リード」という薄い板を振動させて音を出す木管楽器です。主にメロディーを担当する楽器で、ポップな作品からしっとりした作品までどんな楽曲でもメロディーを任される花形の楽器の1つです。。優しい響きから力強さまで、4オクターブもあり、その音域の広さから吹奏楽でもオーケストラでも、ジャズでもクラシックでも活躍できる多才な楽器です。',
      Trombone: 'トロンボーンは唯一無二のスライド楽器。スライドを伸ばして音程を変える感覚は、他では味わえない特別なものです。力強い低音から高音まで出せる懐の深さ。ジャズでグリッサンドを決めたとき、体の芯から震えるような響きを感じられます。見た目もカッコよく音もカッコいい。あなたの音が、演奏全体に力と深みを与えます。',
      Cello: 'チェロはソロでもアンサンブルでも楽しめる楽器です。。低音の重厚さと高音の美しさを兼ね備え、メロディも伴奏もこなせる万能な存在。抱きかかえるように演奏するスタイルは、まるで楽器と対話しているよう。バッハから現代まで、あらゆる音楽を奏でられます。',
      Bassoon: 'ファゴットは個性派の魅力が詰まった楽器。ユーモラスでどこか人間味のある音色は、オーケストラに独特の彩りを添えます。低音域の味わい深い響きはまるで語りかけるよう。時にコミカルに、時にドラマティックに表情豊かに歌えます。複雑な指使いが必要だからこそ、奏でられたときの達成感は格別です。',
      Oboe: 'オーボエは妖艶な美しさを持つ楽器。芯のある甘美な音色は、一度聴いたら忘れられない魅力があります。オーケストラの調律を担当する重要な役割を持ち、音楽の基準となる存在。演奏は難しいけれど、美しい音が出せたときの喜びは何物にも代えがたい。どんな時代の音楽でも、オーボエの音色は特別な輝きを放ちます。',
      Harp: 'ハープは天上の楽器。煌びやかで幻想的な音色は、聴く人を夢の世界へ誘います。47本の弦が奏でる豊かなハーモニーは、まるで小さなオーケストラのよう。アルペジオのキラキラした響き、グリッサンドの華やかさはハープならではの魅力。美しい音楽を紡ぎ出せたときの充実感は格別です。あなたの指先から、奇跡の音楽が生まれます。',
      Contrabass: 'コントラバスのどっしりとした低音は、アンサンブル全体を支える絶対的な存在です。大きな楽器ですが、その分響きも豊か。弦を押さえ弓を引く感覚は、体全体で音楽を表現する喜び。吹奏楽、ジャズ、クラシックでも活躍し、縁の下の力持ちでありながらソロでも輝く。あなたの音が、演奏全体を支えます。',
      Other: 'あなたの楽器には、他にはない独自の魅力があります。メジャーな楽器でなくても、だからこそ個性が光る。珍しい音色、特別な奏法、あまり知られてない深い魅力を。音楽の世界は多様性に満ち、どんな楽器にも輝く瞬間があります。あなたの音は唯一無二で、誰かの心に必ず届きます。'
    };
    return appealMap[nameEn] || 'その楽器ならではの魅力がたくさん。ぜひ音で確かめてください。';
  };

  const closeModal = () => {
    try {
      setShowLearningTools(false);
    } catch (error) {
      ErrorHandler.handle(error, 'closeModal', false);
    }
  };

  const openModal = () => {
    try {
      setShowLearningTools(true);
    } catch (error) {
      ErrorHandler.handle(error, 'openModal', false);
    }
  };

  return (
    <View style={styles.headerContainer}>

      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: currentTheme.primary,
            borderColor: currentTheme.primary,
          }
        ]}
        onPress={openAppealModal}
        activeOpacity={0.8}
      >
        <Text style={[styles.instrumentName, { color: currentTheme.surface }]}>
          {getInstrumentName()}
        </Text>
      </TouchableOpacity>
      
      {/* 学習ツールメニューボタン */}
      <TouchableOpacity
        style={[
          styles.learningToolsButton,
          {
            backgroundColor: currentTheme.primary,
            borderColor: currentTheme.primary,
          }
        ]}
        onPress={() => {
          openModal();
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.learningToolsButtonText, { color: currentTheme.surface }]}>
          学習ツール
        </Text>
      </TouchableOpacity>
      
      {/* 学習ツールモーダル */}
      <Modal
        visible={showLearningTools}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          closeModal();
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
                  onPress={() => {
          closeModal();
        }}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                学習ツール
              </Text>
              <TouchableOpacity
                            onPress={() => {
              closeModal();
            }}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.toolsList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => {
                  setShowLearningTools(false);
                  router.push('/(tabs)/basic-practice');
                }}
              >
                <Zap size={24} color="#FF6B35" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  基礎練
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => {
                  setShowLearningTools(false);
                  router.push('/(tabs)/beginner-guide');
                }}
              >
                <BookOpen size={24} color="#8B4513" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  ガイド
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => {
                  setShowLearningTools(false);
                  Alert.alert('音符トレーニング', 'この機能は現在開発中です', [{ text: 'OK' }]);
                }}
              >
                <Music size={24} color="#4CAF50" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  音符ゲーム(未実装)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.toolItem}
                onPress={() => {
                  setShowLearningTools(false);
                  Alert.alert('音楽用語辞典', 'この機能は現在開発中です', [{ text: 'OK' }]);
                }}
              >
                <BookOpen size={24} color="#2196F3" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  音楽用語辞典(未実装)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.toolItem}
                onPress={() => {
                  setShowLearningTools(false);
                  // AI自動譜読み機能（後で実装）
                  Alert.alert('準備中', 'AI自動譜読み機能は準備中です');
                }}
              >
                <Brain size={24} color="#9C27B0" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  AI自動譜読み機能(未実装)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.toolItem}
                onPress={() => {
                  setShowLearningTools(false);
                  router.push('/(tabs)/score-auto-scroll');
                }}
              >
                <ScrollText size={24} color="#FF9800" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  譜面自動スクロール機能(未実装)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.toolItem}
                onPress={() => {
                  setShowLearningTools(false);
                  try {
                    router.push('/(tabs)/statistics');
                  } catch (e) {
                    Alert.alert('準備中', '統計画面は準備中です');
                  }
                }}
              >
                <BarChart3 size={24} color="#607D8B" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  グラフ・統計分析
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 楽器の魅力モーダル */}
      <Modal
        visible={showAppealModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          closeAppealModal();
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            closeAppealModal();
          }}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {(() => {
                  const info = getCurrentInstrumentInfo();
                  if (!info) return '楽器の魅力';
                  const emoji = getInstrumentEmoji(info.name_en);
                  return `${emoji} ${info.name} の魅力`;
                })()}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  closeAppealModal();
                }}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ paddingBottom: 20, paddingTop: 0 }}
            >
              <Text style={[styles.appealText, { color: currentTheme.text }]}>
                {(() => {
                  const info = getCurrentInstrumentInfo();
                  if (!info) return '楽器を選択すると、その楽器の魅力をご紹介します。';
                  return getInstrumentAppeal(info.name_en);
                })()}
              </Text>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                onPress={() => {
                  closeAppealModal();
                  router.push(`/representative-songs?instrumentId=${selectedInstrument}`);
                }}
                style={[styles.modalActionButton, { backgroundColor: currentTheme.accent }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalActionText, { color: currentTheme.surface }]}>代表曲を見る</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={closeAppealModal}
                style={[styles.modalActionButton, { backgroundColor: currentTheme.secondary }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalActionText, { color: currentTheme.text }]}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  container: {
    flex: 0.5,
    marginRight: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    
    
    elevation: 3,
  },
  learningToolsButton: {
    flex: 0.5,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    
    
    elevation: 3,
  },
  learningToolsButtonText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  instrumentName: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 0,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    
    
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  toolsList: {
    flex: 1,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  toolText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
  changeHint: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 4,
    opacity: 0.8,
    textAlign: 'center',
  },
  appealText: {
    fontSize: 16,
    lineHeight: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 0,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});