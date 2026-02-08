/**
 * プライバシーポリシー画面
 * - アプリのプライバシーポリシーを表示
 * - 新規登録画面から遷移
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { safeGoBack } from '@/lib/navigationUtils';

const colors = {
  primary: '#2E7D32',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
};

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const goBack = () => {
    // プライバシー設定画面から開いた場合は、プライバシー設定画面に戻る
    safeGoBack(router, '/(tabs)/privacy-settings', true);
  };

  return (
    <SafeAreaView style={styles.container} >
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プライバシーポリシー</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.title}>音楽練習支援アプリケーション「Music Practice」</Text>
          <Text style={styles.effectiveDate}>最終更新日: 2026年1月8日</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 基本方針</Text>
          <Text style={styles.text}>
            本アプリは、お客様の個人情報の保護を最重要事項と考え、個人情報保護法および関連法令を遵守し、適切な個人情報の取得、利用、管理を行います。本プライバシーポリシーは、音楽練習支援アプリケーション「Music Practice」（以下「本アプリ」といいます）における個人情報の取り扱いについて定めるものです。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 収集する個人情報の範囲</Text>
          <Text style={styles.text}>
            本アプリは、サービスの提供に必要な範囲内で、以下の個人情報を収集いたします。
          </Text>
          <Text style={styles.text}>
            アカウント情報: メールアドレス、パスワード（暗号化保存）
          </Text>
          <Text style={styles.text}>
            プロフィール情報: お名前、楽器の種類、練習設定、練習レベル
          </Text>
          <Text style={styles.text}>
            練習記録: 練習時間、練習内容、目標設定、達成状況
          </Text>
          <Text style={styles.text}>
            演奏データ: 録音・録画ファイル、楽曲情報
          </Text>
          <Text style={styles.text}>
            カレンダー情報: 練習日程、イベント記録
          </Text>
          <Text style={styles.text}>
            デバイス情報: 端末の種類、OSバージョン、アプリバージョン
          </Text>
          <Text style={styles.text}>
            ログ情報: アクセスログ、エラーログ、使用統計
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 個人情報の利用目的</Text>
          <Text style={styles.text}>
            収集した個人情報は、以下の目的で利用いたします。
          </Text>
          <Text style={styles.text}>
            本アプリの提供・運営
          </Text>
          <Text style={styles.text}>
            ユーザー認証・セキュリティの確保
          </Text>
          <Text style={styles.text}>
            練習記録の管理・分析
          </Text>
          <Text style={styles.text}>
            カスタマイズされた練習メニューの提供
          </Text>
          <Text style={styles.text}>
            お客様サポート・お問い合わせへの対応
          </Text>
          <Text style={styles.text}>
            サービスの改善・新機能の開発
          </Text>
          <Text style={styles.text}>
            広告配信の最適化
          </Text>
          <Text style={styles.text}>
            法令に基づく対応
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. アプリの権限と使用目的</Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600' }]}>4.1 マイク権限</Text>
          <Text style={styles.text}>
            使用目的: ユーザー自身の演奏を録音するために使用します。
          </Text>
          <Text style={styles.text}>
            使用タイミング: 録音機能を起動した時のみ、マイクへのアクセスを要求します。
          </Text>
          <Text style={styles.text}>
            データの取り扱い: 録音された音声データは、ユーザー本人のアカウントにのみ保存され、他のユーザーや第三者と共有されることはありません。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>4.2 カメラ権限</Text>
          <Text style={styles.text}>
            使用目的: 以下の目的で使用します。
          </Text>
          <Text style={styles.text}>
            • ユーザー自身の演奏を録画するため（録画機能）
          </Text>
          <Text style={styles.text}>
            • 楽器の演奏姿勢を確認するため（姿勢確認機能）
          </Text>
          <Text style={styles.text}>
            使用タイミング: 録画機能または姿勢確認機能を起動した時のみ、カメラへのアクセスを要求します。
          </Text>
          <Text style={styles.text}>
            データの取り扱い: 録画された動画データは、ユーザー本人のアカウントにのみ保存され、他のユーザーや第三者と共有されることはありません。姿勢確認機能で撮影した画像は、端末に一時的に保存される場合がありますが、クラウドには保存されません。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>4.3 ストレージ権限（画像・動画の選択）</Text>
          <Text style={styles.text}>
            使用目的: プロフィール画像の設定や、既存の録音・録画ファイルを選択するために使用します。
          </Text>
          <Text style={styles.text}>
            使用タイミング: プロフィール画像を変更する時、または既存のファイルを選択する時のみ、ストレージへのアクセスを要求します。
          </Text>
          <Text style={styles.text}>
            データの取り扱い: 選択した画像・動画ファイルは、ユーザー本人のアカウントにのみ保存され、他のユーザーや第三者と共有されることはありません。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>4.4 通知権限</Text>
          <Text style={styles.text}>
            使用目的: 練習リマインダーやアプリからのお知らせを送信するために使用します。
          </Text>
          <Text style={styles.text}>
            使用タイミング: ユーザーが通知設定を有効にした時のみ、通知権限を要求します。
          </Text>
          <Text style={styles.text}>
            データの取り扱い: 通知機能は、ユーザーが設定した練習スケジュールに基づいてのみ使用され、個人情報を含む通知は送信されません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 録音・録画データの取扱い</Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600' }]}>5.1 データの保存場所と方法</Text>
          <Text style={styles.text}>
            保存場所: クラウドストレージ（Supabase Storage）に保存されます。端末には保存されません。
          </Text>
          <Text style={styles.text}>
            アクセス権限: ユーザー本人のみがアクセス可能です。
          </Text>
          <Text style={styles.text}>
            共有機能: 他のユーザーとの共有機能、SNSへのシェア機能は提供しておりません。すべてのデータは完全にプライベートです。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>5.2 ファイルサイズ制限</Text>
          <Text style={styles.text}>
            音声ファイル: 10MB以下を推奨
          </Text>
          <Text style={styles.text}>
            動画ファイル: 50MB以下を推奨
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>5.3 保存期間</Text>
          <Text style={styles.text}>
            演奏録音: アカウント削除時まで保存
          </Text>
          <Text style={styles.text}>
            レッスン録音: 30日後に自動削除（お気に入り登録したものを除く）
          </Text>
          <Text style={styles.text}>
            録画データ: アカウント削除時まで保存
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>5.4 未成年者の録音・録画データに関する注意事項</Text>
          <Text style={styles.text}>
            本アプリは13歳以上の方を対象としていますが、18歳未満の未成年者が録音・録画機能を利用する場合、以下の点にご注意ください。
          </Text>
          <Text style={styles.text}>
            録音・録画データには、お子様の声や顔が含まれる可能性があります
          </Text>
          <Text style={styles.text}>
            保護者の方は、お子様が録音・録画機能を利用することについて、事前に説明し、同意を得てください
          </Text>
          <Text style={styles.text}>
            データはクラウドストレージに保存されますが、第三者と共有されることはありません
          </Text>
          <Text style={styles.text}>
            不要になったデータは、お子様と相談の上、適宜削除してください
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>5.5 録音・録画データへのアクセス</Text>
          <Text style={styles.text}>
            当社は、以下の目的に限り、録音・録画データにアクセスすることがあります。
          </Text>
          <Text style={styles.text}>
            サービスの改善・品質向上
          </Text>
          <Text style={styles.text}>
            不正利用の検知・防止
          </Text>
          <Text style={styles.text}>
            法令遵守（裁判所命令、捜査機関からの要請等）
          </Text>
          <Text style={styles.text}>
            通常の運用において、当社がお客様の録音・録画データの内容を確認することはありません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. 広告配信サービスの利用</Text>
          <Text style={styles.text}>
            本アプリでは、広告配信のために以下の第三者サービスを利用しています。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600' }]}>5.1 Google AdMob</Text>
          <Text style={styles.text}>
            提供元: Google LLC
          </Text>
          <Text style={styles.text}>
            広告の種類:
          </Text>
          <Text style={styles.text}>
            バナー広告（画面上部または下部に表示）
          </Text>
          <Text style={styles.text}>
            リワード広告（動画視聴で報酬を得る）
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>5.2 収集される情報</Text>
          <Text style={styles.text}>
            AdMobは、広告配信のために以下の情報を収集する場合があります。
          </Text>
          <Text style={styles.text}>
            広告識別子（iOS: IDFA / Android: AAID）
          </Text>
          <Text style={styles.text}>
            IPアドレス
          </Text>
          <Text style={styles.text}>
            デバイス情報（機種、OS、画面サイズ等）
          </Text>
          <Text style={styles.text}>
            アプリ使用状況
          </Text>
          <Text style={styles.text}>
            広告のインタラクションデータ（表示回数、クリック等）
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>5.3 非パーソナライズド広告について</Text>
          <Text style={styles.text}>
            本アプリでは、非パーソナライズド広告のみを配信しています。
          </Text>
          <Text style={styles.text}>
            非パーソナライズド広告とは: ユーザーの興味関心や過去の行動履歴に基づかない広告です。
          </Text>
          <Text style={styles.text}>
            広告は、アプリのコンテンツ、現在表示されている画面、一般的な位置情報（都市レベル）に基づいて配信されます。
          </Text>
          <Text style={styles.text}>
            個人の興味関心に基づいた広告（パーソナライズド広告）は配信されません。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>5.4 広告識別子について</Text>
          <Text style={styles.text}>
            広告識別子は、広告配信の測定やフリークエンシーキャップ（同じ広告の表示回数制限）のために使用されます。
          </Text>
          <Text style={styles.text}>
            広告識別子のリセット方法:
          </Text>
          <Text style={styles.text}>
            iOS: 設定 &gt; プライバシー &gt; 広告 &gt; 「広告識別子をリセット」
          </Text>
          <Text style={styles.text}>
            Android: 設定 &gt; Google &gt; 広告 &gt; 「広告IDをリセット」
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>5.5 リワード広告について</Text>
          <Text style={styles.text}>
            ユーザーは、リワード広告（動画広告）を視聴することで、演奏録音を1回追加で記録できる報酬を得ることができます。リワード広告の視聴は完全に任意であり、視聴しない場合でも本アプリの基本機能は利用できます。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>5.6 広告の非表示</Text>
          <Text style={styles.text}>
            プレミアムプランに加入することで、すべての広告を非表示にすることができます。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>5.7 Google AdMobのプライバシーポリシー</Text>
          <Text style={styles.text}>
            AdMobのデータ取り扱いに関する詳細は、Googleのプライバシーポリシーをご確認ください。
          </Text>
          <Text style={styles.text}>
            Google プライバシーポリシー: https://policies.google.com/privacy
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. 個人情報の管理・保護</Text>
          <Text style={styles.text}>
            本アプリは、お客様の個人情報を適切に管理し、以下の措置により保護いたします。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600' }]}>データ保存・管理</Text>
          <Text style={styles.text}>
            当アプリで取得した情報は、厳重に管理されたサーバー（Supabase）に保存されます
          </Text>
          <Text style={styles.text}>
            データベースとして Supabase を利用し、ユーザーの練習ログを安全に保存・管理します
          </Text>
          <Text style={styles.text}>
            不正アクセスや紛失を防ぐための多層防御システムを採用
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>通信セキュリティ</Text>
          <Text style={styles.text}>
            通信時にはデータの暗号化（SSL/TLS）を実施し、第三者による傍受を防止
          </Text>
          <Text style={styles.text}>
            すべてのAPIリクエストはHTTPSプロトコルで暗号化されます
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>アクセス制御</Text>
          <Text style={styles.text}>
            個人情報への不正アクセス、紛失、漏洩、改ざん、破壊の防止
          </Text>
          <Text style={styles.text}>
            Row Level Security (RLS) による厳格なアクセス制御
          </Text>
          <Text style={styles.text}>
            認証されたユーザーのみが自分のデータにアクセス可能
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>運用体制</Text>
          <Text style={styles.text}>
            個人情報を取り扱う従業員への教育・監督
          </Text>
          <Text style={styles.text}>
            個人情報の取り扱いに関する内部規程の策定・運用
          </Text>
          <Text style={styles.text}>
            定期的なセキュリティ監査の実施
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>データ保持期間</Text>
          <Text style={styles.text}>
            本アプリは、サービス提供に必要な期間、お客様の個人情報を保持いたします
          </Text>
          <Text style={styles.text}>
            アカウント削除時またはお客様からの削除請求時には、合理的な期間内（通常30日以内）にデータを削除いたします
          </Text>
          <Text style={styles.text}>
            ただし、法令に基づく保存義務がある場合は、その期間に従ってデータを保持することがあります
          </Text>
          <Text style={styles.text}>
            バックアップデータは、システムの復旧に必要な期間（通常最大90日間）保持される場合があります
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. 個人情報の第三者提供</Text>
          <Text style={styles.text}>
            本アプリは、以下の場合を除き、お客様の個人情報を第三者に提供いたしません。
          </Text>
          <Text style={styles.text}>
            お客様の事前の同意がある場合
          </Text>
          <Text style={styles.text}>
            法令に基づく場合
          </Text>
          <Text style={styles.text}>
            人の生命、身体または財産の保護のために必要な場合
          </Text>
          <Text style={styles.text}>
            公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合
          </Text>
          <Text style={styles.text}>
            国の機関または地方公共団体が法令の定める事務を遂行することに対して協力する必要がある場合
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. 個人情報の委託・外部サービスの利用</Text>
          <Text style={styles.text}>
            本アプリは、運営に必要な範囲内で、個人情報の取り扱いを委託することがあります。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600' }]}>利用する外部サービス</Text>
          <Text style={styles.text}>
            Supabase（データベース・認証サービス・ストレージ）
          </Text>
          <Text style={styles.text}>
            練習記録、ユーザー情報、録音・録画データなどを保存
          </Text>
          <Text style={styles.text}>
            ISO 27001認証取得済みの高セキュリティ環境
          </Text>
          <Text style={styles.text}>
            データセンター: AWS（Amazon Web Services）
          </Text>
          <Text style={styles.text}>
            Google AdMob（広告配信サービス）
          </Text>
          <Text style={styles.text}>
            非パーソナライズド広告の配信
          </Text>
          <Text style={styles.text}>
            詳細は第5項を参照
          </Text>
          <Text style={styles.text}>
            委託先との間で適切な契約を締結し、委託先における個人情報の適切な管理を監督いたします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. 個人情報の開示・訂正・利用停止</Text>
          <Text style={styles.text}>
            お客様は、本アプリが保有するお客様の個人情報について、以下の請求を行うことができます。
          </Text>
          <Text style={styles.text}>
            個人情報の開示
          </Text>
          <Text style={styles.text}>
            個人情報の訂正・追加・削除
          </Text>
          <Text style={styles.text}>
            個人情報の利用停止・消去
          </Text>
          <Text style={styles.text}>
            個人情報の第三者提供の停止
          </Text>
          <Text style={styles.text}>
            これらの請求については、お客様ご本人であることを確認の上、合理的な範囲内で対応いたします。請求方法の詳細については、お問い合わせ先までご連絡ください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. データのエクスポート</Text>
          <Text style={styles.text}>
            現在、本アプリではデータエクスポート機能を提供しておりません。
          </Text>
          <Text style={styles.text}>
            アカウント削除前に必要なデータ（練習記録、録音・録画ファイル等）は、ユーザー自身で別途保存していただく必要があります。
          </Text>
          <Text style={styles.text}>
            将来的にデータエクスポート機能を追加する場合は、本プライバシーポリシーを更新し、アプリ内でお知らせいたします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. クッキー・トラッキング技術の使用</Text>
          <Text style={styles.text}>
            本アプリは、利用状況の分析、サービスの改善、セキュリティの向上を目的として、クッキーやその他のトラッキング技術を使用することがあります。これらの技術により収集される情報は、個人を特定できない形で統計的に処理され、サービスの向上に活用されます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. 未成年者の個人情報</Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600' }]}>12.1 年齢制限</Text>
          <Text style={styles.text}>
            本アプリは13歳以上の方を対象としています。13歳未満の方は本アプリを利用できません。
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>12.2 未成年者（13歳以上18歳未満）の利用について</Text>
          <Text style={styles.text}>
            18歳未満の未成年者が本アプリを利用する場合は、保護者の同意を得た上で利用してください
          </Text>
          <Text style={styles.text}>
            保護者の方は、お子様の本アプリ利用について、適切に監督してください
          </Text>
          <Text style={styles.text}>
            未成年者の個人情報は、保護者の同意の下でのみ収集・利用いたします
          </Text>
          <Text style={[styles.subsectionTitle, { fontWeight: '600', marginTop: 12 }]}>12.3 保護者の方へ</Text>
          <Text style={styles.text}>
            お子様が本アプリを利用する際は、本プライバシーポリシーおよび利用規約の内容を事前にご確認ください
          </Text>
          <Text style={styles.text}>
            お子様の個人情報の取り扱いについて、ご不明な点がございましたらお問い合わせください
          </Text>
          <Text style={styles.text}>
            録音・録画機能の利用については、特にご注意ください（第4.4項参照）
          </Text>
          <Text style={styles.text}>
            広告表示について、お子様と話し合い、適切にご指導ください
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. データ侵害時の対応</Text>
          <Text style={styles.text}>
            万が一、お客様の個人情報が漏洩、滅失、毀損等（以下「データ侵害」といいます）した場合、当社は以下の対応を行います。
          </Text>
          <Text style={styles.text}>
            事実関係の調査: 速やかにデータ侵害の事実関係、原因、影響範囲を調査いたします
          </Text>
          <Text style={styles.text}>
            お客様への通知: 影響を受けるお客様に対して、速やかにメールまたはアプリ内通知にて連絡いたします
          </Text>
          <Text style={styles.text}>
            個人情報保護委員会への報告: 法令に基づき、必要に応じて個人情報保護委員会に報告いたします
          </Text>
          <Text style={styles.text}>
            再発防止策の実施: データ侵害の原因を分析し、再発防止のための技術的・組織的措置を講じます
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. プライバシーポリシーの変更</Text>
          <Text style={styles.text}>
            本アプリは、必要に応じて本プライバシーポリシーを変更することがあります。
          </Text>
          <Text style={styles.text}>
            重要な変更がある場合は、アプリ内での通知またはメールによりお客様にお知らせいたします。
          </Text>
          <Text style={styles.text}>
            変更後のプライバシーポリシーは、本アプリ上で公開されます。
          </Text>
          <Text style={styles.text}>
            変更後も本アプリの利用を継続された場合、変更後のプライバシーポリシーに同意したものとみなします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>16. お問い合わせ先</Text>
          <Text style={styles.text}>
            個人情報の取り扱いに関するお問い合わせは、以下までお願いいたします。
          </Text>
          <Text style={styles.text}>
            連絡先
          </Text>
          <Text style={styles.text}>
            📧 Gmail: app.gakki@gmail.com
          </Text>
          <Text style={styles.text}>
            🕒 受付時間: 24時間受付（返信は1営業日以内）
          </Text>
          <Text style={styles.text}>
            お客様の個人情報の取り扱いについて、迅速かつ適切に対応いたします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プライバシーポリシーについて</Text>
          <Text style={styles.text}>
            本プライバシーポリシーは、お客様の個人情報保護の重要性を認識し、適切な取り扱いを実現するためのものです。ご不明な点がございましたら、お気軽にお問い合わせください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>
            以上
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  effectiveDate: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
});
