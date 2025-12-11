import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from './InstrumentThemeContext';
import { useLanguage } from './LanguageContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { BookOpen, Music, Target, Brain, ScrollText, BarChart3, X, Zap } from 'lucide-react-native';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { getUserProfile } from '@/repositories/userRepository';
import { getSession } from '@/lib/authService';
import { disableBackgroundFocus, enableBackgroundFocus } from '@/lib/modalFocusManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { instrumentService } from '@/services';

export default function InstrumentHeader() {
  const router = useRouter();
  const { selectedInstrument, currentTheme, setSelectedInstrument, dbInstruments } = useInstrumentTheme();
  const { language } = useLanguage();
  const { isAuthenticated, user } = useAuthAdvanced();
  const [showLearningTools, setShowLearningTools] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  
  // AsyncStorageから即座に読み込んだ楽器情報（リロード時の一瞬消えを防ぐ）
  const [cachedInstrumentInfo, setCachedInstrumentInfo] = useState<{ id: string; name: string; name_en: string } | null>(null);
  
  // 初期化時にAsyncStorageから楽器情報を即座に読み込む
  useEffect(() => {
    const loadCachedInstrument = async () => {
      try {
        const uid = user?.id || '';
        const getKey = (base: string, userId?: string) => userId ? `${base}:${userId}` : base;
        
        // ユーザー別キーから読み込む
        let storedInstrument = await AsyncStorage.getItem(getKey(STORAGE_KEYS.selectedInstrument, uid));
        
        // 従来キーもチェック
        if (!storedInstrument) {
          storedInstrument = await AsyncStorage.getItem(STORAGE_KEYS.selectedInstrument);
        }
        
        if (storedInstrument) {
          // デフォルト楽器から即座に取得（dbInstrumentsが読み込まれる前でも表示可能）
          const defaultInstruments = instrumentService.getDefaultInstruments();
          const instrument = defaultInstruments.find(inst => inst.id === storedInstrument);
          if (instrument) {
            setCachedInstrumentInfo({
              id: instrument.id,
              name: instrument.name,
              name_en: instrument.nameEn,
            });
          }
        }
      } catch (error) {
        // エラーは無視（コンテキストから取得する）
      }
    };
    
    loadCachedInstrument();
  }, [user?.id]);
  
  // 楽器情報をコンテキストのキャッシュから取得（データベースクエリ不要）
  const instrumentInfo = useMemo(() => {
    // selectedInstrumentまたはuser.selected_instrument_idを使用
    const instrumentId = selectedInstrument || user?.selected_instrument_id;
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
    const currentInstrumentId = selectedInstrument || user?.selected_instrument_id;
    if (currentInstrumentId && instrumentInfo) {
      const displayName = language === 'en' ? instrumentInfo.name_en : instrumentInfo.name;
      return removeEmoji(displayName);
    }
    
    // 過去に選択されていた楽器がある場合はそれを表示
    if (userInstrumentInfo) {
      const displayName = language === 'en' ? userInstrumentInfo.name_en : userInstrumentInfo.name;
      return removeEmoji(displayName);
    }
    
    // user.selected_instrument_idから直接楽器情報を取得
    if (user?.selected_instrument_id && dbInstruments.length > 0) {
      const instrument = dbInstruments.find(inst => inst.id === user.selected_instrument_id);
      if (instrument) {
        const displayName = language === 'en' ? instrument.nameEn : instrument.name;
        return removeEmoji(displayName);
      }
    }
    
    // AsyncStorageから読み込んだ楽器情報を表示（リロード時の一瞬消えを防ぐ）
    if (cachedInstrumentInfo) {
      const displayName = language === 'en' ? cachedInstrumentInfo.name_en : cachedInstrumentInfo.name;
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
        Piano: 'The piano has 88 keys, covering an extremely wide range that encompasses almost the entire range of human hearing. This breadth allows you to create multi-layered music all by yourself. Playing completely different rhythms and melodies with both hands simultaneously, while reading sheet music and using pedals, is an extremely advanced form of multitasking. This activates different areas of the brain and strengthens the connection between the left and right hemispheres.',
        Guitar: 'The guitar is a life companion. Portable and versatile, six strings can produce gentle melodies or powerful rock. The sensation of plucking strings with your fingertips and the moment when chords resonate together is a joy only players understand. Whether alone or in a session with friends, music fills your world the moment you pick up a guitar.',
        Violin: 'The violin produces delicate tones that resonate continuously. Unlike the piano\'s decaying sound, as long as the bow moves, the sound can be sustained, allowing you to extend notes or add crescendos while expressing emotional nuances. A small instrument with the power to fill large halls, it shines in both orchestras and solo performances. A timeless masterpiece loved for over 300 years.',
        Flute: 'The flute\'s tone is like an angel\'s whisper. With its clear transparency and lightness, it lifts listeners\' hearts to the heavens. It handles the highest range among woodwind instruments and shines brightly in orchestras. The sensation of blowing air and the moment sound emerges from your body creates a unique connection. Play the flute, and you become a musical fairy.',
        Trumpet: 'The trumpet illuminates the stage with its brilliant sound, commanding attention with just one note. As the star of brass instruments, it takes center stage in both jazz and classical music. The feeling of lips and instrument becoming one, the exhilaration of breath directly becoming sound, is extraordinary. An instrument that can energize the world with your sound.',
        Drums: 'Drums are the heart of music. Your rhythm drives the entire band and creates groove. The thrill of creating complex rhythms with hands and feet, the refreshing sound of sticks, is a joy only drummers know. The only instrument that lets you express music with your entire body. Both powerful and delicate. Your beat supports everyone\'s music.',
        Saxophone: 'The saxophone is an instrument with adult sophistication and passion. Smooth in jazz bars, vibrant in pop, it resonates beautifully in any scene. One note makes everyone turn around. The feeling of becoming one with the instrument when you blow, singing together, is irresistible. The moment of free solo expression is the best. Cool and touching—that\'s the saxophone.',
        Horn: 'The horn provides rich color to bands and orchestras with its enveloping, soft, and deep tone. Because it\'s among the most difficult brass instruments to play, the joy of producing beautiful sound is exceptional. From warm low notes to brilliant high notes, it has wide expressive range. Supporting orchestral harmony from behind the scenes while also shining in solos. Your horn adds depth and warmth to music.',
        Clarinet: 'The clarinet is a woodwind instrument that produces sound by vibrating a thin piece called a "reed." Primarily responsible for melodies, it\'s one of the star instruments entrusted with melodies in everything from pop to smooth pieces. From gentle resonance to power, it spans four octaves, and this wide range makes it versatile in bands, orchestras, jazz, and classical music.',
        Trombone: 'The trombone is a unique slide instrument. The sensation of extending the slide to change pitch is something special you can\'t experience elsewhere. Capable of producing powerful low notes to high notes with great depth. When you nail a glissando in jazz, you feel the vibration from your core. Cool looks and cool sound. Your sound gives power and depth to the entire performance.',
        Viola: 'The viola is an instrument with the charm of warm mid-range resonance. Slightly larger than the violin with lower range, it plays an important role in orchestras and chamber music. The beautiful mid-range tone speaks almost like a human voice. Supporting inner voices in chord playing, it adds depth and warmth to music. It may be an unobtrusive presence, but beautiful harmony cannot exist without the viola. Your viola enriches music.',
        Cello: 'The cello is an instrument enjoyable both solo and in ensemble. Combining the weight of low notes with the beauty of high notes, it\'s versatile enough to handle both melody and accompaniment. The playing style of embracing the instrument is like having a conversation with it. From Bach to modern times, it can play all kinds of music.',
        Bassoon: 'The bassoon is an instrument packed with unique charm. Its humorous and somewhat human-like tone adds distinctive color to orchestras. The rich resonance of the low range seems to speak. Sometimes comical, sometimes dramatic, it sings with rich expression. Because complex fingering is required, the sense of achievement when played is exceptional.',
        Oboe: 'The oboe is an instrument with enchanting beauty. Its core-rich, sweet tone has an unforgettable charm. It plays the important role of tuning the orchestra, serving as the standard for music. Playing is difficult, but the joy when beautiful sound emerges is irreplaceable. In music of any era, the oboe\'s tone shines with special brilliance.',
        Harp: 'The harp is a heavenly instrument. Its brilliant and fantastical tone invites listeners into a dream world. The rich harmony produced by 47 strings is like a small orchestra. The sparkling resonance of arpeggios and the brilliance of glissandos are unique to the harp. The fulfillment when you weave beautiful music is exceptional. From your fingertips, miraculous music is born.',
        Contrabass: 'The contrabass\'s solid low notes are an absolute presence supporting the entire ensemble. A large instrument with correspondingly rich resonance. The sensation of pressing strings and drawing the bow is the joy of expressing music with your entire body. Active in bands, jazz, and classical music, it supports from behind the scenes while also shining in solos. Your sound supports the entire performance.',
        Other: 'Your instrument has unique charm found nowhere else. Not being a major instrument makes individuality shine. Rare tones, special techniques, deep charms not widely known. The world of music is full of diversity, and every instrument has moments to shine. Your sound is one of a kind and will surely reach someone\'s heart.'
      };
      return appealMapEn[nameEn] || 'Your instrument has unique charm. Please experience it through sound.';
    } else {
      const appealMapJa: { [key: string]: string } = {
        Piano: 'ピアノの鍵盤は88鍵あります。これは他のほとんどの楽器と比べても非常に広い音域で、人間の聴覚が識別できる範囲をほぼカバーしています。この広さのおかげで、多層的な音楽をたった一人で作り出すことができます。また、左右の手が全く異なるリズムとメロディを同時に演奏し、さらに楽譜を読み、ペダルを踏むという作業は、極めて高度な多重タスク処理です。これにより、脳の異なる領域が活性化し、特に左右の脳の連携が強まります',
        Guitar: 'ギターは人生の相棒。どこへでも持っていけて、6本の弦から優しいメロディも力強いロックも生まれます。指先で弦を弾く感覚、コードが響き合う瞬間の心地よさは、弾いた人にしかわからない喜び。一人でも、仲間とのセッションでも。ギターを手にした瞬間から、あなたの世界に音楽が溢れます。',
        Violin: 'ヴァイオリンは繊細な音色が音になって響きます。ピアノのように減衰する音ではなく、弓がある限り音を持続できるため、音を長く伸ばしたり、クレッシェンド（だんだん強く）をかけたりしながら、感情の機微を表現できます。小さな楽器だけど大きなホールを満たす力があり、オーケストラでも独奏でも輝く。300年以上愛され続ける、永遠の名器です。',
        Flute: 'フルートの音色は天使の囁きのよう。澄んだ透明感と軽やかさで、聴く人の心を天に舞い上がらせます。木管楽器の中で最も高い音域を担当し、オーケストラでもひときわ輝く存在。息を吹き込む感覚、音が体から生まれる瞬間の一体感は格別です。フルートを吹けば、あなたも音楽の妖精になれます。',
        Trumpet: 'トランペットは輝かしい音色で場を明るく照らし、一音鳴らすだけで注目を集める存在感があります。金管楽器の花形として、ジャズでもクラシックでも主役級。唇と楽器が一つになって音を創る感覚、息がダイレクトに音になる高揚感は格別。あなたの音で、世界を元気にできる楽器です。',
        Drums: 'ドラムは音楽の心臓。あなたのリズムがバンド全体を動かし、グルーヴを生み出します。手と足を使って複雑なリズムを刻む快感、スティックが響く爽快感は、ドラマーにしかわからない喜び。全身を使って音楽を表現できる唯一の楽器。力強くもあり繊細でもある。あなたのビートが、みんなの音楽を支えています。',
        Saxophone: 'サックスは大人の色気と情熱を持つ楽器。ジャズバーではしっとりと、ポップスで華やかに、どんなシーンでも艶やかに響きます。一音聴けば誰もが振り返る魅力的な音色。息を吹き込むとき、楽器と一体になって歌う感覚がたまらない。ソロで自由に表現する瞬間は最高です。カッコよくて心に響く、それがサックス。',
        Horn: 'ホルンは包み込むような柔らかく深みのある音色で、吹奏楽やオーケストラに豊かな色彩を与えます。金管楽器の中でも演奏が難しいからこそ、美しい音が出せたときの喜びは格別。温かみのある低音から輝かしい高音まで、幅広い表現力を持つ。オーケストラのハーモニーを支える縁の下の力持ちでありながら、ソロでも輝く存在。あなたのホルンが、音楽に深みと温かさを加えます。',
        Clarinet: 'クラリネットは「リード」という薄い板を振動させて音を出す木管楽器です。主にメロディーを担当する楽器で、ポップな作品からしっとりした作品までどんな楽曲でもメロディーを任される花形の楽器の1つです。優しい響きから力強さまで、4オクターブもあり、その音域の広さから吹奏楽でもオーケストラでも、ジャズでもクラシックでも活躍できる多才な楽器です。',
        Trombone: 'トロンボーンは唯一無二のスライド楽器。スライドを伸ばして音程を変える感覚は、他では味わえない特別なものです。力強い低音から高音まで出せる懐の深さ。ジャズでグリッサンドを決めたとき、体の芯から震えるような響きを感じられます。見た目もカッコよく音もカッコいい。あなたの音が、演奏全体に力と深みを与えます。',
        Viola: 'ヴィオラは温かみのある中音域の響きが魅力の楽器。バイオリンより少し大きく、低い音域を持ち、オーケストラや室内楽で重要な役割を果たします。中音域の美しい音色は、まるで人の声のように語りかけるよう。和音演奏での内声部を支え、音楽に深みと温かさを加えます。目立たない存在かもしれませんが、ヴィオラなくして美しいハーモニーは生まれません。あなたのヴィオラが、音楽を豊かに彩ります。',
        Cello: 'チェロはソロでもアンサンブルでも楽しめる楽器です。低音の重厚さと高音の美しさを兼ね備え、メロディも伴奏もこなせる万能な存在。抱きかかえるように演奏するスタイルは、まるで楽器と対話しているよう。バッハから現代まで、あらゆる音楽を奏でられます。',
        Bassoon: 'ファゴットは個性派の魅力が詰まった楽器。ユーモラスでどこか人間味のある音色は、オーケストラに独特の彩りを添えます。低音域の味わい深い響きはまるで語りかけるよう。時にコミカルに、時にドラマティックに表情豊かに歌えます。複雑な指使いが必要だからこそ、奏でられたときの達成感は格別です。',
        Oboe: 'オーボエは妖艶な美しさを持つ楽器。芯のある甘美な音色は、一度聴いたら忘れられない魅力があります。オーケストラの調律を担当する重要な役割を持ち、音楽の基準となる存在。演奏は難しいけれど、美しい音が出せたときの喜びは何物にも代えがたい。どんな時代の音楽でも、オーボエの音色は特別な輝きを放ちます。',
        Harp: 'ハープは天上の楽器。煌びやかで幻想的な音色は、聴く人を夢の世界へ誘います。47本の弦が奏でる豊かなハーモニーは、まるで小さなオーケストラのよう。アルペジオのキラキラした響き、グリッサンドの華やかさはハープならではの魅力。美しい音楽を紡ぎ出せたときの充実感は格別です。あなたの指先から、奇跡の音楽が生まれます。',
        Contrabass: 'コントラバスのどっしりとした低音は、アンサンブル全体を支える絶対的な存在です。大きな楽器ですが、その分響きも豊か。弦を押さえ弓を引く感覚は、体全体で音楽を表現する喜び。吹奏楽、ジャズ、クラシックでも活躍し、縁の下の力持ちでありながらソロでも輝く。あなたの音が、演奏全体を支えます。',
        Other: 'あなたの楽器には、他にはない独自の魅力があります。メジャーな楽器でなくても、だからこそ個性が光る。珍しい音色、特別な奏法、あまり知られてない深い魅力を。音楽の世界は多様性に満ち、どんな楽器にも輝く瞬間があります。あなたの音は唯一無二で、誰かの心に必ず届きます。'
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
        <Text 
          style={[styles.instrumentName, { color: currentTheme.surface }]}
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
                  {language === 'en' ? 'Basic Practice' : '基礎練'}
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
                  {language === 'en' ? 'Guide' : 'ガイド'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => {
                  setShowLearningTools(false);
                  Alert.alert(
                    language === 'en' ? 'Note Training' : '音符トレーニング',
                    language === 'en' ? 'This feature is currently under development' : 'この機能は現在開発中です',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Music size={24} color="#4CAF50" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  {language === 'en' ? 'Note Game (Not Implemented)' : '音符ゲーム(未実装)'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.toolItem}
                onPress={() => {
                  setShowLearningTools(false);
                  Alert.alert(
                    language === 'en' ? 'Music Dictionary' : '音楽用語辞典',
                    language === 'en' ? 'This feature is currently under development' : 'この機能は現在開発中です',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <BookOpen size={24} color="#2196F3" />
                <Text style={[styles.toolText, { color: currentTheme.text }]}>
                  {language === 'en' ? 'Music Dictionary (Not Implemented)' : '音楽用語辞典(未実装)'}
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
                  {language === 'en' ? 'View Representative Songs' : '代表曲を見る'}
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
    marginTop: 12,
    marginBottom: 8,
  },
  container: {
    flex: 1,
    marginRight: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    maxHeight: 60,
    elevation: 3,
  },
  learningToolsButton: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    maxHeight: 60,
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