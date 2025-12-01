import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';

export default function PrivacyPolicyScreen() {
  const { currentTheme } = useInstrumentTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary || '#E0E0E0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack('/(tabs)/privacy-settings')}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          プライバシーポリシー
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: currentTheme.text }]}>
          プライバシーポリシー
        </Text>
        
        <Text style={[styles.lastUpdated, { color: currentTheme.textSecondary }]}>
          最終更新日: 2025年10月12日
        </Text>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            1. 基本方針
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本アプリは、お客様の個人情報の保護を最重要事項と考え、個人情報保護法および関連法令を遵守し、適切な個人情報の取得、利用、管理を行います。本プライバシーポリシーは、音楽練習支援アプリケーション「Music Practice」（以下「本アプリ」といいます）における個人情報の取り扱いについて定めるものです。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            2. 収集する個人情報の範囲
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本アプリは、サービスの提供に必要な範囲内で、以下の個人情報を収集いたします。{'\n\n'}
            • アカウント情報：メールアドレス、パスワード（暗号化保存）{'\n'}
            • プロフィール情報：お名前、楽器の種類、練習設定、練習レベル{'\n'}
            • 練習記録：練習時間、練習内容、目標設定、達成状況{'\n'}
            • 演奏データ：録音・録画ファイル、楽曲情報{'\n'}
            • カレンダー情報：練習日程、イベント記録{'\n'}
            • デバイス情報：端末の種類、OSバージョン、アプリバージョン{'\n'}
            • ログ情報：アクセスログ、エラーログ、使用統計
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            3. 個人情報の利用目的
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            収集した個人情報は、以下の目的で利用いたします。{'\n\n'}
            • 本アプリの提供・運営{'\n'}
            • ユーザー認証・セキュリティの確保{'\n'}
            • 練習記録の管理・分析{'\n'}
            • カスタマイズされた練習メニューの提供{'\n'}
            • お客様サポート・お問い合わせへの対応{'\n'}
            • サービスの改善・新機能の開発{'\n'}
            • 法令に基づく対応
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            4. データ処理の法的根拠（GDPR Article 6）
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本アプリは、以下の法的根拠に基づいて個人データを処理いたします。{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【同意 (Article 6(1)(a))】</Text>{'\n'}
            • ユーザーが明示的に同意した場合のデータ処理{'\n'}
            • プライバシーポリシーへの同意{'\n'}
            • マーケティング目的でのデータ利用{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【契約履行 (Article 6(1)(b))】</Text>{'\n'}
            • サービス利用契約の履行に必要なデータ処理{'\n'}
            • アカウント管理、認証、課金処理{'\n'}
            • ユーザーサポートの提供{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【正当利益 (Article 6(1)(f))】</Text>{'\n'}
            • サービス改善・開発のための分析{'\n'}
            • セキュリティの確保{'\n'}
            • 不正利用の防止
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            5. データ主体の権利（GDPR）
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            お客様は、GDPRに基づいて以下の権利を有します。{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【アクセス権 (Article 15)】</Text>{'\n'}
            • 処理されている個人データの確認{'\n'}
            • データ処理の目的・期間・受信者の情報取得{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【訂正権 (Article 16)】</Text>{'\n'}
            • 不正確な個人データの訂正{'\n'}
            • 不完全なデータの補完{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【消去権 (Article 17)】</Text>{'\n'}
            • 個人データの削除要求{'\n'}
            • 「忘れられる権利」の行使{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【データポータビリティ権 (Article 20)】</Text>{'\n'}
            • 機械可読形式でのデータ提供{'\n'}
            • 他のサービスへのデータ移行{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【異議申し立て権 (Article 21)】</Text>{'\n'}
            • 特定のデータ処理への異議申し立て{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【処理制限権 (Article 18)】</Text>{'\n'}
            • データ処理の一時的制限
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            6. 個人情報の管理・保護
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本アプリは、お客様の個人情報を適切に管理し、以下の措置により保護いたします。{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【データ保存・管理】</Text>{'\n'}
            • 当アプリで取得した情報は、厳重に管理されたサーバー（Supabase）に保存されます{'\n'}
            • データベースとして Supabase を利用し、ユーザーの練習ログを安全に保存・管理します{'\n'}
            • 不正アクセスや紛失を防ぐための多層防御システムを採用{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【通信セキュリティ】</Text>{'\n'}
            • 通信時にはデータの暗号化（SSL/TLS）を実施し、第三者による傍受を防止{'\n'}
            • すべてのAPIリクエストはHTTPSプロトコルで暗号化されます{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【アクセス制御】</Text>{'\n'}
            • 個人情報への不正アクセス、紛失、漏洩、改ざん、破壊の防止{'\n'}
            • Row Level Security (RLS) による厳格なアクセス制御{'\n'}
            • 認証されたユーザーのみが自分のデータにアクセス可能{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【運用体制】</Text>{'\n'}
            • 個人情報を取り扱う従業員への教育・監督{'\n'}
            • 個人情報の取り扱いに関する内部規程の策定・運用{'\n'}
            • 定期的なセキュリティ監査の実施
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            5. 個人情報の第三者提供
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本アプリは、以下の場合を除き、お客様の個人情報を第三者に提供いたしません。{'\n\n'}
            • お客様の事前の同意がある場合{'\n'}
            • 法令に基づく場合{'\n'}
            • 人の生命、身体または財産の保護のために必要な場合{'\n'}
            • 公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合{'\n'}
            • 国の機関または地方公共団体が法令の定める事務を遂行することに対して協力する必要がある場合
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            6. 個人情報の委託・外部サービスの利用
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本アプリは、運営に必要な範囲内で、個人情報の取り扱いを委託することがあります。{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【利用する外部サービス】</Text>{'\n'}
            • Supabase（データベース・認証サービス）{'\n'}
            　- 練習記録、ユーザー情報、楽曲データなどを保存{'\n'}
            　- ISO 27001認証取得済みの高セキュリティ環境{'\n'}
            　- データセンター：AWS（Amazon Web Services）{'\n\n'}
            委託先との間で適切な契約を締結し、委託先における個人情報の適切な管理を監督いたします。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            7. 個人情報の開示・訂正・利用停止
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            お客様は、本アプリが保有するお客様の個人情報について、以下の請求を行うことができます。{'\n\n'}
            • 個人情報の開示{'\n'}
            • 個人情報の訂正・追加・削除{'\n'}
            • 個人情報の利用停止・消去{'\n'}
            • 個人情報の第三者提供の停止{'\n\n'}
            これらの請求については、お客様ご本人であることを確認の上、合理的な範囲内で対応いたします。請求方法の詳細については、お問い合わせ先までご連絡ください。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            8. クッキー・トラッキング技術の使用
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本アプリは、利用状況の分析、サービスの改善、セキュリティの向上を目的として、クッキーやその他のトラッキング技術を使用することがあります。これらの技術により収集される情報は、個人を特定できない形で統計的に処理され、サービスの向上に活用されます。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            9. 未成年者の個人情報
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本アプリは、未成年者の個人情報の取り扱いについて、特に慎重に対応いたします。未成年者の個人情報を収集する際は、保護者の同意を得ることを原則とし、必要に応じて年齢確認を行います。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            10. プライバシーポリシーの変更
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本アプリは、必要に応じて本プライバシーポリシーを変更することがあります。重要な変更がある場合は、アプリ内での通知またはメールによりお客様にお知らせいたします。変更後のプライバシーポリシーは、本アプリ上で公開されます。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            11. データ保護責任者（DPO）
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本アプリは、GDPRに基づいてデータ保護責任者（Data Protection Officer, DPO）を任命しています。{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【連絡先】</Text>{'\n'}
            • 氏名: データ保護責任者{'\n'}
            • メール: app.gakki@gmail.com{'\n'}
            • 電話: +81-3-1234-5678{'\n\n'}
            <Text style={{ fontWeight: '600' }}>【業務内容】</Text>{'\n'}
            • データ保護法の遵守状況の監視{'\n'}
            • データ保護影響評価（DPIA）の実施支援{'\n'}
            • データ主体の権利に関する相談対応{'\n'}
            • データ保護に関する教育・研修{'\n\n'}
            データ保護に関するご質問やご相談は、上記連絡先までお気軽にお問い合わせください。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            12. お問い合わせ先
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            個人情報の取り扱いに関するお問い合わせは、以下までお願いいたします。{'\n\n'}
            <Text style={{ fontWeight: '600' }}>連絡先</Text>{'\n'}
            Gmail: app.gakki@gmail.com{'\n\n'}
            お客様の個人情報の取り扱いについて、迅速かつ適切に対応いたします。
          </Text>
        </View>

        <View style={[styles.contactSection, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.contactTitle, { color: currentTheme.text }]}>
            プライバシーポリシーについて
          </Text>
          <Text style={[styles.contactText, { color: currentTheme.textSecondary }]}>
            本プライバシーポリシーは、お客様の個人情報保護の重要性を認識し、適切な取り扱いを実現するためのものです。ご不明な点がございましたら、お気軽にお問い合わせください。
          </Text>
        </View>
      </ScrollView>
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
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    
    
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  contactSection: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
    marginTop: 16,
    
    
    elevation: 2,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  contactText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
