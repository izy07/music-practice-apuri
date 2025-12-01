import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Shield, Users, CreditCard, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';

export default function TermsOfServiceScreen() {
  const { currentTheme } = useInstrumentTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack('/(tabs)/privacy-settings')}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          利用規約
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* タイトルセクション */}
        <View style={[styles.titleSection, { backgroundColor: currentTheme.surface }]}>
          <View style={[styles.titleIcon, { backgroundColor: `${currentTheme.primary}20` }]}>
            <FileText size={32} color={currentTheme.primary} />
          </View>
          <Text style={[styles.title, { color: currentTheme.text }]}>
            Music Practice 利用規約
          </Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            音楽練習支援アプリケーション
          </Text>
          <Text style={[styles.lastUpdated, { color: currentTheme.textSecondary }]}>
            最終更新日: 2025年1月20日
          </Text>
        </View>

        {/* 重要事項 */}
        <View style={[styles.importantNotice, { backgroundColor: `${currentTheme.primary}10` }]}>
          <AlertTriangle size={20} color={currentTheme.primary} />
          <Text style={[styles.importantText, { color: currentTheme.text }]}>
            本規約は法的拘束力があります。ご利用前に必ずお読みください。
          </Text>
        </View>

        {/* 第1条 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              第1条（適用）
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本利用規約（以下「本規約」といいます）は、株式会社Music Practice（以下「当社」といいます）が提供する音楽練習支援アプリケーション「Music Practice」（以下「本サービス」といいます）の利用に関する条件を、本サービスを利用するお客様（以下「ユーザー」といいます）と当社との間で定めるものです。
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されるものとします。
          </Text>
        </View>

        {/* 第2条 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              第2条（利用登録）
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            1. 本サービスの利用を希望する者は、本規約に同意の上、当社の定める方法によって利用登録を申請するものとします。
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            2. 当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 虚偽の事項を届け出た場合
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 本規約に違反したことがある者からの申請である場合
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 13歳未満の者からの申請である場合
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • その他、当社が利用登録を適当でないと判断した場合
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            3. 利用登録の申請が承認された場合、当該申請者は、本規約に従って本サービスの利用を開始することができるものとします。
          </Text>
        </View>

        {/* 第3条 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              第3条（利用料金および支払方法）
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            1. 本サービスの基本機能（楽譜表示、練習記録、目標設定等）は無料でご利用いただけます。
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            2. プレミアム機能（楽譜共有、高度な分析機能、無制限クラウドストレージ等）については、以下の料金体系に従います。
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 月額プラン: 980円（税込）
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 年額プラン: 9,800円（税込、月額プランより約17%割引）
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 学生プラン: 月額490円（税込、学生証の提示が必要）
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            3. 料金の支払いは、App Store、Google Play Storeを通じて行うものとし、各ストアの利用規約が適用されます。
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            4. 料金の返金については、各ストアの返金ポリシーに従うものとします。
          </Text>
        </View>

        {/* 第4条 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              第4条（禁止事項）
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 法令または公序良俗に違反する行為
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 犯罪行為に関連する行為
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 著作権法に違反する楽譜のアップロード・共有
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 本サービスの運営を妨害するおそれのある行為
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 他のユーザーに関する個人情報等を収集または蓄積する行為
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 他のユーザーに成りすます行為
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 不適切な内容（暴力的、性的、差別的等）の投稿
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • その他、当社が不適切と判断する行為
            </Text>
          </View>
        </View>

        {/* 第5条 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              第5条（本サービスの提供の停止等）
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            1. 当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 本サービスにかかるコンピュータシステムの保守点検または更新を行う場合
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • その他、当社が本サービスの提供が困難と判断した場合
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            2. 当社は、本サービスの提供の停止または中断によりユーザーまたは第三者に生じた損害について、一切の責任を負いません。
          </Text>
        </View>

        {/* 第6条 - 新規追加 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              第6条（個人情報の取扱い）
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            1. 当社は、本サービスの提供に必要な範囲で、ユーザーの個人情報を収集・利用・保存するものとします。
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            2. 当社は、個人情報保護法その他の法令に従い、適切に個人情報を取り扱うものとします。
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            3. 個人情報の取扱いについては、別途定めるプライバシーポリシーに従うものとします。
          </Text>
        </View>

        {/* 第7条 - 新規追加 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              第7条（楽譜・コンテンツの取扱い）
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            1. ユーザーがアップロードする楽譜・コンテンツについては、ユーザーが適法な権利を有するものに限ります。
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            2. 著作権法に違反する楽譜のアップロードは禁止されており、違反が発覚した場合、当該コンテンツを削除する場合があります。
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            3. ユーザーがアップロードした楽譜・コンテンツの著作権は、ユーザーに帰属するものとします。
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            4. 当社は、本サービスの提供に必要な範囲で、ユーザーがアップロードした楽譜・コンテンツを利用することができるものとします。
          </Text>
        </View>

        {/* 第8条 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              第8条（利用制限および登録抹消）
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            1. 当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 本規約のいずれかの条項に違反した場合
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 登録事項に虚偽の事実があることが判明した場合
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • 当社からの連絡に対し、一定期間返答がない場合
            </Text>
            <Text style={[styles.bulletItem, { color: currentTheme.textSecondary }]}>
              • その他、当社が本サービスの利用を適当でないと判断した場合
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            2. 当社は、本条に基づき当社が行った行為によりユーザーに生じた損害について、一切の責任を負いません。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            第7条（免責事項）
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            1. 当社は、本アプリに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。{'\n\n'}
            2. 当社は、本アプリの利用により生じるユーザーの損害について、一切の責任を負いません。ただし、本アプリに関する当社とユーザーとの間の契約（本規約を含みます）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            第8条（サービス内容の変更等）
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            当社は、ユーザーに通知することなく、本アプリの内容を変更しまたは本アプリの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            第9条（利用規約の変更）
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本アプリの利用を継続した場合には、変更後の規約に同意したものとみなします。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            第10条（通知または連絡）
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。当社は、ユーザーから、当社が別途定める方法に従った変更の届出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            第11条（権利義務の譲渡の禁止）
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            第12条（準拠法・裁判管轄）
          </Text>
          <Text style={[styles.sectionText, { color: currentTheme.textSecondary }]}>
            1. 本規約の解釈にあたっては、日本法を準拠法とします。{'\n\n'}
            2. 本アプリに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
          </Text>
        </View>

        {/* お問い合わせセクション */}
        <View style={[styles.contactSection, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.contactHeader}>
            <Shield size={24} color={currentTheme.primary} />
            <Text style={[styles.contactTitle, { color: currentTheme.text }]}>
              お問い合わせ
            </Text>
          </View>
          <Text style={[styles.contactText, { color: currentTheme.textSecondary }]}>
            本利用規約に関するお問い合わせは、以下の方法でお願いいたします。
          </Text>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactItem, { color: currentTheme.text }]}>
              📧 メール: app.gakki@gmail.com
            </Text>
            <Text style={[styles.contactItem, { color: currentTheme.text }]}>
              🕒 受付時間: 24時間対応
            </Text>
            <Text style={[styles.contactItem, { color: currentTheme.text }]}>
              📱 アプリ内サポート: 設定 {'>'} ヘルプ・サポート
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ヘッダー
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
  // タイトルセクション
  titleSection: {
    padding: 24,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
    
    
    elevation: 2,
  },
  titleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
  },
  // 重要事項
  importantNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  importantText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  // セクション
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    
    
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  // 箇条書き
  bulletList: {
    marginLeft: 16,
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  // お問い合わせセクション
  contactSection: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 16,
    
    
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  contactInfo: {
    alignItems: 'center',
  },
  contactItem: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
}); 
