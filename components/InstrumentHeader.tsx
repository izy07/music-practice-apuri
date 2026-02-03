import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInstrumentTheme } from './InstrumentThemeContext';
import { useLanguage } from './LanguageContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { BookOpen, Music, Target, Brain, ScrollText, BarChart3, X, Zap } from 'lucide-react-native';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { getUserProfile } from '@/repositories/userRepository';
import { getSession } from '@/lib/authService';
import { disableBackgroundFocus, enableBackgroundFocus } from '@/lib/modalFocusManager';
import { getCurrentRouteFromHistory } from '@/lib/navigationHistory';
import { getEffectiveInstrumentId } from '@/lib/instrumentUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
export default function InstrumentHeader() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { selectedInstrument, currentTheme, setSelectedInstrument, dbInstruments } = useInstrumentTheme();
  const { language } = useLanguage();
  const { isAuthenticated, user } = useAuthAdvanced();
  const [showLearningTools, setShowLearningTools] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [localCustomInstrumentName, setLocalCustomInstrumentName] = useState<string | null>(null);
  
  // 楽器IDを一度だけ算出（表示・スタイル判定で使う）
  const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
  const shouldUseSmallInstrumentFont = (() => {
    // クラリネット / トランペット / トロンボーン / コントラバスは文字数が長めなので少し小さく表示
    const SMALL_FONT_IDS = new Set<string>([
      '550e8400-e29b-41d4-a716-446655440009', // Clarinet
      '550e8400-e29b-41d4-a716-446655440005', // Trumpet
      '550e8400-e29b-41d4-a716-446655440010', // Trombone
      '550e8400-e29b-41d4-a716-446655440015', // Contrabass
    ]);
    return Boolean(currentInstrumentId && SMALL_FONT_IDS.has(currentInstrumentId));
  })();

  // 楽器情報をコンテキストから取得（単一のデータソース）
  const instrumentInfo = useMemo(() => {
    // 有効な楽器IDを取得（統一的なフォールバック処理）
    const instrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
    if (!instrumentId) return null;
    
    // コンテキストのdbInstrumentsから楽器情報を取得
    const instrument = dbInstruments.find(inst => inst.id === instrumentId);
    if (instrument) {
      return {
        id: instrument.id,
        name: instrument.name,
        name_en: instrument.nameEn,
      };
    }
    return null;
  }, [selectedInstrument, user?.selected_instrument_id, dbInstruments]);

  // ユーザーの過去の楽器選択を取得（初回のみ、最適化）
  const [userInstrumentInfo, setUserInstrumentInfo] = useState<{ id: string; name: string; name_en: string } | null>(null);
  
  useEffect(() => {
    let cancelled = false;
    
    const fetchUserInstrument = async () => {
      // 認証状態を確認
      if (!isAuthenticated || !user) {
        return;
      }
      
      // selectedInstrument状態を優先的に使用（楽器選択直後の反映を確実にするため）
      // user.selected_instrument_idは、selectedInstrument状態がない場合のみ使用
      if (selectedInstrument) {
        // コンテキストのキャッシュから楽器情報を取得（データベースクエリ不要）
        const instrument = dbInstruments.find(inst => inst.id === selectedInstrument);
        if (instrument && !cancelled) {
          setUserInstrumentInfo({
            id: instrument.id,
            name: instrument.name,
            name_en: instrument.nameEn,
          });
        }
        return;
      }
      
      // selectedInstrument状態がない場合のみ、user.selected_instrument_idを使用
      const instrumentIdFromUser = user.selected_instrument_id;
      
      try {
        // user.selected_instrument_idがある場合は即座に使用
        if (instrumentIdFromUser) {
          // コンテキストに未反映の場合は即時反映
          try {
            await setSelectedInstrument(instrumentIdFromUser);
          } catch (e) {
            // 失敗しても表示用のフォールバックは続ける
          }
          
          // コンテキストのキャッシュから楽器情報を取得（データベースクエリ不要）
          const instrument = dbInstruments.find(inst => inst.id === instrumentIdFromUser);
          if (instrument && !cancelled) {
            setUserInstrumentInfo({
              id: instrument.id,
              name: instrument.name,
              name_en: instrument.nameEn,
            });
          }
          return;
        }
        
        // user.selected_instrument_idがない場合は、プロフィールから取得
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

        if (profileResult.data?.selected_instrument_id) {
          const profile = profileResult.data;
          const instrumentId = profile.selected_instrument_id;
          // コンテキストに未反映の場合は即時反映
          if (!selectedInstrument && instrumentId) {
            try {
              await setSelectedInstrument(instrumentId);
            } catch (e) {
              // 失敗しても表示用のフォールバックは続ける
            }
          }
          
          // コンテキストのキャッシュから楽器情報を取得（データベースクエリ不要）
          if (instrumentId) {
            const instrument = dbInstruments.find(inst => inst.id === instrumentId);
            if (instrument && !cancelled) {
              setUserInstrumentInfo({
                id: instrument.id,
                name: instrument.name,
                name_en: instrument.nameEn,
              });
            }
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

    // 認証状態が更新されるまで少し待つ
    if (isAuthenticated && user) {
      const timeoutId = setTimeout(() => {
        fetchUserInstrument();
      }, 300);
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }
    
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, selectedInstrument, dbInstruments, setSelectedInstrument]);

  // Webプラットフォームでのフォーカス管理
  useEffect(() => {
    if (Platform.OS === 'web') {
      const isModalOpen = showLearningTools || showAppealModal;
      if (isModalOpen) {
        disableBackgroundFocus();
      } else {
        enableBackgroundFocus();
      }
    }
    
    return () => {
      if (Platform.OS === 'web' && !showLearningTools && !showAppealModal) {
        enableBackgroundFocus();
      }
    };
  }, [showLearningTools, showAppealModal]);

  // 「その他」カスタム名のローカルフォールバックを読み込み（DBカラム未作成/反映遅延対策）
  useEffect(() => {
    const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
    if (currentInstrumentId !== '550e8400-e29b-41d4-a716-446655440016') {
      setLocalCustomInstrumentName(null);
      return;
    }

    const userId = user?.id;
    if (!userId) {
      setLocalCustomInstrumentName(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const key = `custom_instrument_name_${userId}`;
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          const v = window.localStorage.getItem(key);
          if (!cancelled) setLocalCustomInstrumentName(v && v.trim() ? v : null);
          return;
        }
        const v = await AsyncStorage.getItem(key);
        if (!cancelled) setLocalCustomInstrumentName(v && v.trim() ? v : null);
      } catch {
        if (!cancelled) setLocalCustomInstrumentName(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedInstrument, user?.selected_instrument_id, user?.id]);

  // 絵文字を削除する関数
  const removeEmoji = (text: string): string => {
    if (!text) return text;
    // 絵文字のUnicode範囲を削除
    // 基本的な絵文字（U+1F300-U+1F9FF）、補助絵文字（U+1FA00-U+1FAFF）、
    // 装飾記号（U+2600-U+26FF）、その他の記号（U+2700-U+27BF）などを削除
    return text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // 絵文字
      .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '') // 補助絵文字
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // 装飾記号
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // その他の記号
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // 補助絵文字・記号
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // 国旗
      .trim();
  };

  const getInstrumentName = () => {
    // 現在選択されている楽器がある場合はそれを表示
    const currentInstrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
    
    // その他楽器（ID: 550e8400-e29b-41d4-a716-446655440016）の場合は、カスタム楽器名を優先的に表示
    if (currentInstrumentId === '550e8400-e29b-41d4-a716-446655440016') {
      const custom = user?.custom_instrument_name || localCustomInstrumentName;
      if (custom) return custom;
    }
    
    if (currentInstrumentId && instrumentInfo) {
      const displayName = language === 'en' ? instrumentInfo.name_en : instrumentInfo.name;
      return removeEmoji(displayName);
    }
    
    // 過去に選択されていた楽器がある場合はそれを表示
    if (userInstrumentInfo) {
      // その他楽器の場合は、カスタム楽器名を優先的に表示
      if (userInstrumentInfo.id === '550e8400-e29b-41d4-a716-446655440016' && user?.custom_instrument_name) {
        return user.custom_instrument_name;
      }
      const displayName = language === 'en' ? userInstrumentInfo.name_en : userInstrumentInfo.name;
      return removeEmoji(displayName);
    }
    
    // user.selected_instrument_idから直接楽器情報を取得
    if (user?.selected_instrument_id && dbInstruments.length > 0) {
      // その他楽器の場合は、カスタム楽器名を優先的に表示
      if (user.selected_instrument_id === '550e8400-e29b-41d4-a716-446655440016' && user?.custom_instrument_name) {
        return user.custom_instrument_name;
      }
      const instrument = dbInstruments.find(inst => inst.id === user.selected_instrument_id);
      if (instrument) {
        const displayName = language === 'en' ? instrument.nameEn : instrument.name;
        return removeEmoji(displayName);
      }
    }
    
    // AsyncStorageから読み込んだ楽器情報を表示（リロード時の一瞬消えを防ぐ）
    // Contextから取得した楽器情報を使用（単一のデータソース）
    if (instrumentInfo) {
      // その他楽器の場合は、カスタム楽器名を優先的に表示
      if (instrumentInfo.id === '550e8400-e29b-41d4-a716-446655440016' && user?.custom_instrument_name) {
        return user.custom_instrument_name;
      }
      const displayName = language === 'en' ? instrumentInfo.name_en : instrumentInfo.name;
      return removeEmoji(displayName);
    }
    
    // 楽器が選択されていない場合（存在しない状況なので空文字列を返す）
    // デフォルトのピアノを表示しない（読み込み中にピアノと表示されるのを防ぐ）
    return '';
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
    if (language === 'en') {
      const appealMapEn: { [key: string]: string } = {
        Piano: 'The piano is called the "king of instruments" and can perfectly play both melody and accompaniment all by itself. Its impressive range of 88 keys covers almost the entire range of human hearing. It can produce notes lower than the lowest contrabass used in wind ensembles and orchestras, and higher than the highest piccolo. Few instruments can cover such a wide range. With just a touch, you can express emotions—a versatile and luxurious instrument.',
        Guitar: 'The guitar offers a diverse range of tones, from the natural warmth of wood in acoustic guitars to the dynamic sounds of electric guitars that can create infinite tonal variations. Its rich tones soothe the heart and allow you to express your emotions directly. The guitar is called a "partner" because you can easily carry it and play whenever you want. Classical guitars use nylon strings, which are soft and produce gentle tones. Electric guitars are highly versatile, active in popular music, rock, pop, jazz, and blues.',
        Violin: 'The violin has a bright and brilliant tone and plays a central role in orchestras, often carrying the main melodies. Unlike the piano\'s decaying sound, as long as the bow moves, the sound can be sustained, allowing you to extend notes. It offers complete freedom in dynamics, spans over four octaves, and despite its small size, has the power to fill large halls. A timeless masterpiece loved for over 300 years.',
        Flute: 'The flute\'s tone is like an angel\'s whisper. With its clear transparency and lightness, it lifts listeners\' hearts to the heavens. It handles the highest range among woodwind instruments, and its clear resonance shines brightly. Its elegant form and sound captivate listeners instantly with its brilliance.',
        Trumpet: 'The trumpet commands overwhelming star presence with its brilliant golden tone, transforming the atmosphere with just one note. As the star of brass instruments, it can express a wide range of emotions from powerful and heroic fanfares to melancholic jazz solos.',
        Drums: 'Drums are called the heart of music and play a role in controlling the tempo and atmosphere of entire pieces. The feeling of creating rhythm yourself and supporting the whole brings great fulfillment, offering a different satisfaction than other instruments. Moving the body beyond reason, supporting and exploding the foundation of music—this primal energy is the drums\' greatest charm.',
        Saxophone: 'The saxophone is used in various music genres such as jazz, classical, and pop. Its characteristic is that while it is a reed instrument, it possesses the rich tone and expressive power of brass instruments. It resonates beautifully in jazz with a smooth, mellow sound, and vibrantly in pop—charming in any scene. With just one note, everyone turns around. Its captivating tone.',
        Horn: 'The horn combines the power of brass instruments with the gentleness of woodwinds, playing an indispensable role in supporting orchestral harmony. It\'s so difficult to play that it\'s even in the Guinness Book of World Records, but the sense of achievement when you produce the ideal sound is a lifetime treasure. Its profound resonance gives music special depth and warmth.',
        Clarinet: 'The clarinet is a woodwind instrument that produces sound by vibrating a thin piece called a "reed." Primarily responsible for melodies, it\'s one of the star instruments entrusted with melodies in everything from pop to smooth pieces. From gentle resonance to power, it spans four octaves, and this wide range makes it versatile in bands, orchestras, jazz, and classical music.',
        Trombone: 'The trombone is a unique slide instrument. The sensation of extending the slide to change pitch is something special you can\'t experience elsewhere. Capable of producing powerful low notes to high notes with great depth. When you nail a glissando in jazz, you feel the vibration from your core. Cool looks and cool sound. Your sound gives power and depth to the entire performance.',
        Viola: 'The viola is an instrument with the charm of warm mid-range resonance. Slightly larger than the violin with lower range, it plays an important role in orchestras and chamber music. The beautiful mid-range tone speaks almost like a human voice. Supporting inner voices in chord playing, it adds depth and warmth to music. It may be an unobtrusive presence, but beautiful harmony cannot exist without the viola. Your viola enriches music.',
        Cello: 'The cello is an instrument enjoyable both solo and in ensemble. Combining the weight of low notes with the beauty of high notes, it\'s versatile enough to handle both melody and accompaniment. The playing style of embracing the instrument is like having a conversation with it. From Bach to modern times, it can play all kinds of music.',
        Bassoon: 'The bassoon\'s humorous and somewhat human-like tone adds a unique color to orchestras.',
        Oboe: 'The oboe is an instrument with enchanting beauty. Its core-rich, sweet tone has an unforgettable charm. It plays the important role of tuning the orchestra, serving as the standard for music. Playing is difficult, but the joy when beautiful sound emerges is irreplaceable. In music of any era, the oboe\'s tone shines with special brilliance.',
        Harp: 'The harp is a heavenly instrument. Its brilliant and fantastical tone invites listeners into a dream world. The rich harmony produced by 47 strings is like a small orchestra. The sparkling resonance of arpeggios and the brilliance of glissandos are unique to the harp. The fulfillment when you weave beautiful music is exceptional. From your fingertips, miraculous music is born.',
        Contrabass: 'The contrabass can produce warm and powerful low notes that vibrate through the entire hall. When played with fingers, it becomes jazz; when played with a bow, it becomes orchestral. It is active in orchestras and wind ensembles, of course, as well as jazz, pop, rock, and various other fields. It serves as the foundation of music, bringing together the overall resonance, and while it supports the entire music as a "behind-the-scenes force," it can also become the protagonist in solos.',
        Other: 'Your instrument is packed with "unknown possibilities" and unique charm that don\'t fit into existing frameworks. Precisely because it\'s not a major instrument, each note you play becomes a fresh surprise for listeners and allows you to directly express your own individuality that no one else can imitate. The process of exploring playing techniques and tones not yet widely known is an adventure that opens new horizons in music. Its one-of-a-kind resonance adds new colors to the diverse world of music and will surely leave a special mark on someone\'s heart.'
      };
      return appealMapEn[nameEn] || 'Your instrument has unique charm. Please experience it through sound.';
    } else {
      const appealMapJa: { [key: string]: string } = {
        Piano: 'ピアノは「楽器の王様」と呼ばれ、一台でメロディーと伴奏のすべてを奏でることができる楽器です。88鍵という音域は人間の聴覚をほぼカバーしており、吹奏楽やオーケストラで使用される一番低いコントラバスより低い音も、一番高いピッコロより高い音も出せます。これほど広い音域が出せる楽器は多くありません。タッチひとつで感情を表現できる、万能で贅沢な楽器です。',
        Guitar: 'ギターは木材のぬくもりを感じる自然な響き（アコギ）から、無限に音色を作り出せるダイナミックな響き（エレキ）まで、多彩な音色で心を癒し、弾き手の感情をストレートに表現できます。ギターは弾きながら手軽に持ち運べ、好きな時に弾けることから「相棒」と言われています。クラシックギターに使用されてるナイロン弦はそのやわらかさから、優しい音色が出せることが特徴です。。エレキギターはポピュラー音楽ではもちろん、ロックやポップスはもちろん、ジャズとかブルースでも活躍する非常に対応幅が広い楽器です。',
        Violin: 'ヴァイオリンは明るく華やかな音色を持っており、オーケストラでも主要なメロディーを奏でることが多く、中心的な役割を担います。ピアノのように減衰する音ではなく、弓がある限り音を持続できるため、音を長く伸ばしたり、音の強弱が自由自在で、小さな楽器だけど大きなホールを満たす力があります。300年以上愛され続ける、永遠の名器です。',
        Flute: 'フルートの音色は天使の囁きのように澄んだ透明感と軽やかさで、聴く人の心を揺さぶります。木管楽器の中で最も高い音域を担当し、その優美な姿と澄んだ響きは聴く人を一瞬で魅了する華やかさがあります。全体の音色を明るく輝かせる役割を持ちながら、たった一音で空気感を変えてしまう、圧倒的な気品と主役級の華やかさを兼ね備えた楽器です。',
        Trumpet: 'トランペットは輝かしい音色で、一音鳴らすだけでその場の空気を一変させる圧倒的な主役級の存在感があります。金管楽器の花形として、明るく華やかなファンファーレから、ジャズの哀愁漂うソロまで、幅広く表現できる楽器です。強弱の幅が広いため、湧き上がるような喜びや堂々とした気持ちを表現するフレーズに使われることが多いです。',
        Drums: 'ドラムは音楽の心臓と呼ばれ、曲全体のテンポや雰囲気をコントロールする役割があります。自分がリズムを作り出し、全体を支える感覚はとても充実感があり、他の楽器とは異なる満足感を味わえます。体を動かし、音楽の根底を支え、爆発させる、その原始的なエネルギーがドラムの最大の魅力です。',
        Saxophone: 'サックスはジャズやクラシック、ポップスなど様々な音楽ジャンルで使用される楽器です。サックスの特徴は、リード楽器でありながら、金管楽器さながらの豊かな音色と表現力を持つ点です。ジャズではしっとりと、ポップスで華やかに、どんなシーンでも艶やかに響きます。一音聴けば誰もが振り返る魅力的な音色。',
        Horn: 'ホルンは金管楽器の力強さと木管楽器の優しさを両立し、オーケストラではハーモニーを支える要として欠かせない役割を担います。ソロでは映画音楽やオーケストラで、耳に残る美しいメロディーラインを担当することが多いです。 世界で最も演奏が難しい楽器としてギネスにも載るほどですが、その分、理想の音が出せた時の達成感は一生ものです。その奥深い響きが、音楽に特別な深みと温もりを与えます。',
        Clarinet: 'クラリネットは「リード」という薄い板を振動させて音を出す木管楽器です。木の温かみを感じさせるまろやかで優しい音色で人々を魅了してきました。主にメロディーを担当する楽器で、ポップな作品からしっとりした作品までどんな楽曲でもメロディーを任される花形の楽器の1つです。優しい響きから力強さまで、4オクターブもあり、その音域の広さから吹奏楽でもオーケストラでも、ジャズでもクラシックでも活躍できる多才な楽器です。',
        Trombone: 'トロンボーンは力強い音色が特徴です。トロンボーンの特徴であり最大の魅力であるスライドは、ほかの楽器にはないかっこよさがあります。スライドを活かし、曲中でグリッサンドが登場する機会が多いです。力強い低音から高音まで出せる懐の深さ。ジャズでグリッサンドを決めたとき、体の芯から震えるような響きを感じられます。見た目もカッコよく音もカッコいい。あなたの音が、演奏全体に力と深みを与えます。',
        Viola: 'ヴィオラは温かみのある中音域の響きが魅力の楽器。バイオリンより少し大きく、低い音域を持ち、オーケストラや室内楽で重要な役割を果たします。中音域の美しい音色は、まるで人の声のように語りかけるよう。和音演奏での内声部を支え、音楽に深みと温かさを加えます。目立たない存在かもしれませんが、ヴィオラなくして美しいハーモニーは生まれません。あなたのヴィオラが、音楽を豊かに彩ります。',
        Cello: 'チェロはソロでもアンサンブルでも楽しめる楽器です。低音の重厚さと高音の美しさを兼ね備え、メロディも伴奏もこなせる万能な存在。抱きかかえるように演奏するスタイルは、まるで楽器と対話しているよう。バッハから現代まで、あらゆる音楽を奏でられます。',
        Bassoon: 'ファゴットのユーモラスでどこか人間味のある音色は、オーケストラに独特の彩りを添えます。',
        Oboe: 'オーボエは柔らかく豊かな響きを持ち、ホール全体を包み込むような優美な音色が特徴です。吹奏楽、オーケストラの調律を担当する重要な役割を持ち、音楽の基準となる存在で、高音域から低音域まで幅広く応用することができます。また、オーボエが持つ音色がメロディやハーモニーに厚みを加え、音楽全体のバランスを整える重要な役割を果たします。独自の音色を持つオーボエは、唯一無二の楽器です。',
        Harp: 'ハープは天上の楽器。煌びやかで幻想的な音色は、聴く人を夢の世界へ誘います。47本の弦が奏でる豊かなハーモニーは、まるで小さなオーケストラのよう。アルペジオのキラキラした響き、グリッサンドの華やかさはハープならではの魅力。美しい音楽を紡ぎ出せたときの充実感は格別です。あなたの指先から、奇跡の音楽が生まれます。',
        Contrabass: 'コントラバスはホール全体を振動させるような、温かく力強い低音を響かせることができます。指で弾くとジャズに、弓で弾くとオーケストラになります。オーケストラや吹奏楽はもちろん、ジャズ、ポップス、ロックなど様々な分野で活躍します。音楽の土台となり、全体の響きをまとめ上げる重要な役割を果たし音楽全体を支える縁の下の力持ちでありながらソロでも主役になれる楽器です。',
        Other: 'あなたが手にしたその楽器には、既存の枠組みには収まりきらない「未知の可能性」と独自の魅力が詰まっています。メジャーな楽器ではないからこそ、奏でられる一音一音が聴く人にとって新鮮な驚きとなり、誰にも真似できないあなただけの個性をダイレクトに表現できます。まだ広く知られていない奏法や音色を探求する過程は、音楽の新しい地平を切り拓く冒険そのもの。その唯一無二の響きは、多様な音楽の世界に新しい色彩を加え、誰かの心に特別な足跡を残すはずです。'
      };
      return appealMapJa[nameEn] || 'その楽器ならではの魅力がたくさん。ぜひ音で確かめてください。';
    }
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

  // 現在の画面パスを取得する関数
  const getCurrentRoute = (): string => {
    // 根本的な解決: Expo Routerのsegmentsを優先的に使用（より確実）
    // segmentsはExpo Routerが管理する現在のルート情報であり、window.location.pathnameより正確
    if (segments.length > 0) {
      // (tabs)グループ内にいる場合
      if (segments[0] === '(tabs)' && segments.length > 1) {
        const lastSegment = segments[segments.length - 1];
        // タブ画面かどうかを確認
        const tabScreens = ['index', 'timer', 'goals', 'tuner', 'settings', 'basic-practice', 'beginner-guide', 'score-auto-scroll', 'statistics'];
        if (tabScreens.includes(lastSegment)) {
          return `/(tabs)/${lastSegment}`;
        }
      }
      // その他のセグメントの場合
      const lastSegment = segments[segments.length - 1];
      if (lastSegment !== 'auth' && lastSegment !== 'login' && lastSegment !== 'signup') {
        const tabScreens = ['index', 'timer', 'goals', 'tuner', 'settings', 'basic-practice', 'beginner-guide', 'score-auto-scroll', 'statistics'];
        if (tabScreens.includes(lastSegment)) {
          return `/(tabs)/${lastSegment}`;
        }
      }
    }
    
    // フォールバック: window.location.pathnameから直接現在のURLを取得
    if (typeof window !== 'undefined' && window.location) {
      const pathname = window.location.pathname;
      // パス名からタブ画面のルートを抽出
      const tabScreens = ['index', 'timer', 'goals', 'tuner', 'settings', 'basic-practice', 'beginner-guide', 'score-auto-scroll', 'statistics'];
      for (const screen of tabScreens) {
        if (pathname.includes(`/${screen}`) || pathname.endsWith(`/${screen}`) || pathname === `/${screen}`) {
          return `/(tabs)/${screen}`;
        }
      }
      // パス名が / または /(tabs) の場合はカレンダー画面
      if (pathname === '/' || pathname === '/(tabs)' || pathname.includes('/index')) {
        return '/(tabs)/index';
      }
    }
    
    // デフォルトはカレンダー画面
    return '/(tabs)/index';
  };

  // 学習ツールから遷移する際の共通処理
  const navigateFromLearningTools = (targetRoute: string) => {
    // モーダルを閉じてから遷移
    setShowLearningTools(false);
    
    // モーダルが閉じるのを待ってから遷移（Web環境で確実に動作するように）
    setTimeout(() => {
      try {
        // Web環境ではrouter.pushを使用（router.replaceが正しく動作しない場合があるため）
        if (Platform.OS === 'web') {
          router.push(targetRoute as any);
        } else {
          // モバイル環境ではrouter.replaceを使用
    router.replace(targetRoute as any);
        }
      } catch (error) {
        logger.error('学習ツールからのナビゲーションエラー:', error);
        // エラー時はpushで再試行
        router.push(targetRoute as any);
      }
    }, 150); // 少し長めの遅延（モーダルのアニメーションが完了するのを待つ）
  };

  // ステータスバーの高さを計算（Web環境でもスマホでの見た目を確認できるようにスペースを確保）
  const statusBarHeight = Platform.OS === 'web' 
    ? 16 // Web環境では適度な余白を確保
    : Math.max(insets.top, Platform.OS === 'ios' ? 16 : 12); // ネイティブ環境でも適度な余白を確保

  return (
    <View style={[styles.headerContainer, { paddingTop: statusBarHeight }]}>

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
        <Text 
          style={[
            styles.instrumentName,
            { color: currentTheme.surface },
            shouldUseSmallInstrumentFont ? styles.instrumentNameSmall : null,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.8}
        >
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
        <Text 
          style={[styles.learningToolsButtonText, { color: currentTheme.surface }]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.8}
        >
          {language === 'en' ? 'Learning Tools' : '学習ツール'}
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
                {language === 'en' ? 'Learning Tools' : '学習ツール'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  closeModal();
                }}
                style={[styles.closeButton, { backgroundColor: currentTheme.background }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={currentTheme.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.toolsList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => {
                  navigateFromLearningTools('/(tabs)/basic-practice');
                }}
              >
                <Zap size={24} color="#FF6B35" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  {language === 'en' ? 'Basic Practice' : '基礎練'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => {
                  navigateFromLearningTools('/(tabs)/beginner-guide');
                }}
              >
                <BookOpen size={24} color="#8B4513" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  {language === 'en' ? 'Guide' : 'ガイド'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => {
                  navigateFromLearningTools('/(tabs)/music-dictionary');
                }}
              >
                <BookOpen size={24} color="#2196F3" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  {language === 'en' ? 'Music Dictionary' : '音楽用語辞典'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.toolItem}
                onPress={() => {
                  setShowLearningTools(false);
                  // AI自動譜読み機能（後で実装）
                  Alert.alert(
                    language === 'en' ? 'Coming Soon' : '準備中',
                    language === 'en' ? 'AI automatic score reading feature is coming soon' : 'AI自動譜読み機能は準備中です'
                  );
                }}
              >
                <Brain size={24} color="#9C27B0" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  {language === 'en' ? 'AI Auto Score Reading (Not Implemented)' : 'AI自動譜読み機能(未実装)'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.toolItem}
                onPress={() => {
                  navigateFromLearningTools('/(tabs)/score-auto-scroll');
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
                  try {
                    navigateFromLearningTools('/(tabs)/statistics');
                  } catch (e) {
                    setShowLearningTools(false);
                    Alert.alert(
                      language === 'en' ? 'Coming Soon' : '準備中',
                      language === 'en' ? 'Statistics screen is coming soon' : '統計画面は準備中です'
                    );
                  }
                }}
              >
                <BarChart3 size={24} color="#607D8B" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  {language === 'en' ? 'Graphs & Statistics' : 'グラフ・統計分析'}
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
                  if (!info) return language === 'en' ? 'Instrument Appeal' : '楽器の魅力';
                  const emoji = getInstrumentEmoji(info.name_en);
                  const displayName = language === 'en' ? info.name_en : info.name;
                  const appealText = language === 'en' ? 'Appeal' : 'の魅力';
                  return `${emoji} ${displayName} ${appealText}`;
                })()}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  closeAppealModal();
                }}
                style={[styles.closeButton, { backgroundColor: currentTheme.background }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={currentTheme.primary} />
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
                  if (!info) return language === 'en' ? 'Select an instrument to learn about its appeal.' : '楽器を選択すると、その楽器の魅力をご紹介します。';
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
                <Text style={[styles.modalActionText, { color: currentTheme.surface }]}>
                  {language === 'en' ? 'View Songs' : '演奏を聞く'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={closeAppealModal}
                style={[styles.modalActionButton, { backgroundColor: currentTheme.secondary }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalActionText, { color: currentTheme.text }]}>
                  {language === 'en' ? 'Close' : '閉じる'}
                </Text>
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
    marginTop: 0,
    marginBottom: 6,
  },
  container: {
    flex: 1,
    marginRight: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    maxHeight: 56,
    elevation: 3,
  },
  learningToolsButton: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    maxHeight: 56,
    elevation: 3,
  },
  learningToolsButtonText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
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
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  instrumentNameSmall: {
    fontSize: 15,
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