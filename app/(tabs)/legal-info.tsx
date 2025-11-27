import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { FileText, Shield, ChevronLeft, Mail, Calendar, Building, AlertTriangle } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigationUtils';

export default function LegalInfoScreen() {
  const { currentTheme } = useInstrumentTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  const openExternalLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      // エラーハンドリング
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity
          onPress={() => safeGoBack('/(tabs)/settings')}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>法的情報</Text>
        <View style={styles.placeholder} />
      </View>

      {/* タブ切り替え */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'terms' && { backgroundColor: currentTheme.primary }
          ]}
          onPress={() => setActiveTab('terms')}
        >
          <FileText size={20} color={activeTab === 'terms' ? '#FFFFFF' : currentTheme.text} />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'terms' ? '#FFFFFF' : currentTheme.text }
          ]}>
            利用規約
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'privacy' && { backgroundColor: currentTheme.primary }
          ]}
          onPress={() => setActiveTab('privacy')}
        >
          <Shield size={20} color={activeTab === 'privacy' ? '#FFFFFF' : currentTheme.text} />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'privacy' ? '#FFFFFF' : currentTheme.text }
          ]}>
            プライバシーポリシー
          </Text>
        </TouchableOpacity>
      </View>

      {/* コンテンツ */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'terms' ? (
          <View style={[styles.contentSection, { backgroundColor: currentTheme.surface }]}>
            {/* タイトルセクション */}
            <View style={styles.titleSection}>
              <View style={[styles.titleIcon, { backgroundColor: `${currentTheme.primary}20` }]}>
                <FileText size={32} color={currentTheme.primary} />
              </View>
              <Text style={[styles.mainTitle, { color: currentTheme.text }]}>
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
            
            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第1条（適用）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              本利用規約（以下「本規約」といいます）は、個人開発者（以下「開発者」といいます）が提供する音楽練習支援アプリケーション「Music Practice」（以下「本サービス」といいます）の利用に関する条件を、本サービスを利用するお客様（以下「ユーザー」といいます）と開発者との間で定めるものです。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第2条（利用登録）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              1. 本サービスの利用を希望する者は、本規約に同意の上、開発者の定める方法によって利用登録を申請するものとします。
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              2. 開発者は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 虚偽の事項を届け出た場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 本規約に違反したことがある者からの申請である場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 13歳未満の者からの申請である場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • その他、開発者が利用登録を適当でないと判断した場合
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第3条（利用料金および支払方法）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              1. 本サービスの基本機能（楽譜表示、練習記録、目標設定等）は無料でご利用いただけます。
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              2. プレミアム機能（楽譜共有、高度な分析機能、無制限クラウドストレージ等）については、以下の料金体系に従います。
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 月額プラン: 980円（税込）
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 年額プラン: 9,800円（税込、月額プランより約17%割引）
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 学生プラン: 月額490円（税込、学生証の提示が必要）
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              3. 料金の支払いは、App Store、Google Play Storeを通じて行うものとし、各ストアの利用規約が適用されます。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第4条（禁止事項）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 法令または公序良俗に違反する行為
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 犯罪行為に関連する行為
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 著作権法に違反する楽譜のアップロード・共有
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 開発者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 本サービスの運営を妨害するおそれのある行為
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 他のユーザーに関する個人情報等を収集または蓄積する行為
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 他のユーザーに成りすます行為
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 不適切な内容（暴力的、性的、差別的等）の投稿
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 開発者のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • その他、開発者が不適切と判断する行為
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第5条（本サービスの提供の停止等）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              1. 開発者は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 本サービスにかかるコンピュータシステムの保守点検または更新を行う場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • その他、開発者が本サービスの提供が困難と判断した場合
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              2. 開発者は、本サービスの提供の停止または中断によりユーザーまたは第三者に生じた損害について、一切の責任を負いません。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第6条（個人情報の取扱い）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              1. 開発者は、本サービスの提供に必要な範囲で、ユーザーの個人情報を収集・利用・保存するものとします。
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              2. 開発者は、個人情報保護法その他の法令に従い、適切に個人情報を取り扱うものとします。
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              3. 個人情報の取扱いについては、別途定めるプライバシーポリシーに従うものとします。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第7条（楽譜・コンテンツの取扱い）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              1. ユーザーがアップロードする楽譜・コンテンツについては、ユーザーが適法な権利を有するものに限ります。
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              2. 著作権法に違反する楽譜のアップロードは禁止されており、違反が発覚した場合、当該コンテンツを削除する場合があります。
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              3. ユーザーがアップロードした楽譜・コンテンツの著作権は、ユーザーに帰属するものとします。
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              4. 開発者は、本サービスの提供に必要な範囲で、ユーザーがアップロードした楽譜・コンテンツを利用することができるものとします。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第8条（利用制限および登録抹消）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              1. 開発者は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 本規約のいずれかの条項に違反した場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 登録事項に虚偽の事実があることが判明した場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 開発者からの連絡に対し、一定期間返答がない場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • その他、開発者が本サービスの利用を適当でないと判断した場合
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              2. 開発者は、本条に基づき開発者が行った行為によりユーザーに生じた損害について、一切の責任を負いません。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第9条（免責事項）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              1. 開発者は、本アプリに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              2. 開発者は、本アプリの利用により生じるユーザーの損害について、一切の責任を負いません。ただし、本アプリに関する開発者とユーザーとの間の契約（本規約を含みます）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第10条（サービス内容の変更等）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              開発者は、ユーザーに通知することなく、本アプリの内容を変更しまたは本アプリの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第11条（利用規約の変更）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              開発者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本アプリの利用を継続した場合には、変更後の規約に同意したものとみなします。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第12条（通知または連絡）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              ユーザーと開発者との間の通知または連絡は、開発者の定める方法によって行うものとします。開発者は、ユーザーから、開発者が別途定める方法に従った変更の届出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第13条（権利義務の譲渡の禁止）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              ユーザーは、開発者の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>第14条（準拠法・裁判管轄）</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              1. 本規約の解釈にあたっては、日本法を準拠法とします。
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              2. 本アプリに関して紛争が生じた場合には、開発者の本店所在地を管轄する裁判所を専属的合意管轄とします。
            </Text>

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
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => openExternalLink('mailto:app.gakki@gmail.com')}
                >
                  <Mail size={16} color={currentTheme.primary} />
                  <Text style={[styles.contactItemText, { color: currentTheme.text }]}>
                    app.gakki@gmail.com
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.contactHours, { color: currentTheme.textSecondary }]}>
                  受付時間: 24時間対応
                </Text>
              </View>
            </View>

            <Text style={[styles.articleText, { color: currentTheme.textSecondary, marginTop: 20, textAlign: 'center' }]}>
              以上
            </Text>
          </View>
        ) : (
          <View style={[styles.contentSection, { backgroundColor: currentTheme.surface }]}>
            {/* タイトルセクション */}
            <View style={styles.titleSection}>
              <View style={[styles.titleIcon, { backgroundColor: `${currentTheme.primary}20` }]}>
                <Shield size={32} color={currentTheme.primary} />
              </View>
              <Text style={[styles.mainTitle, { color: currentTheme.text }]}>
                プライバシーポリシー
              </Text>
              <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
                個人情報保護方針
              </Text>
              <Text style={[styles.lastUpdated, { color: currentTheme.textSecondary }]}>
                最終更新日: 2025年1月20日
              </Text>
            </View>
            
            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>1. 基本方針</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              開発者は、お客様の個人情報の保護を最重要事項と考え、個人情報保護法および関連法令を遵守し、適切な個人情報の取得、利用、管理を行います。本プライバシーポリシーは、開発者が提供する音楽練習支援アプリケーション「Music Practice」（以下「本アプリ」といいます）における個人情報の取り扱いについて定めるものです。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>2. 収集する個人情報の範囲</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              開発者は、本アプリの提供に必要な範囲内で、以下の個人情報を収集いたします。
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • アカウント情報：メールアドレス、パスワード
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • プロフィール情報：お名前、楽器の種類、練習設定
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 利用履歴：練習時間、練習内容、目標設定
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • デバイス情報：端末の種類、OSバージョン、アプリバージョン
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • ログ情報：アクセスログ、エラーログ、使用統計
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>3. 個人情報の利用目的</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              収集した個人情報は、以下の目的で利用いたします。
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 本アプリの提供・運営
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • ユーザー認証・セキュリティの確保
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 練習記録の管理・分析
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • カスタマイズされた練習メニューの提供
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • お客様サポート・お問い合わせへの対応
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • サービスの改善・新機能の開発
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 法令に基づく対応
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>4. 個人情報の管理・保護</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              開発者は、お客様の個人情報を適切に管理し、以下の措置により保護いたします。
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 個人情報への不正アクセス、紛失、漏洩、改ざん、破壊の防止
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 個人情報を取り扱う従業員への教育・監督
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 個人情報の取り扱いに関する内部規程の策定・運用
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 個人情報の暗号化による保護
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 定期的なセキュリティ監査の実施
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>5. 個人情報の第三者提供</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              開発者は、以下の場合を除き、お客様の個人情報を第三者に提供いたしません。
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • お客様の事前の同意がある場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 法令に基づく場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 人の生命、身体または財産の保護のために必要な場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 国の機関または地方公共団体が法令の定める事務を遂行することに対して協力する必要がある場合
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>6. 個人情報の委託</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              開発者は、本アプリの運営に必要な範囲内で、個人情報の取り扱いを委託することがあります。この場合、委託先との間で適切な契約を締結し、委託先における個人情報の適切な管理を監督いたします。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>7. 個人情報の開示・訂正・利用停止</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              お客様は、開発者が保有するお客様の個人情報について、以下の請求を行うことができます。
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 個人情報の開示
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 個人情報の訂正・追加・削除
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 個人情報の利用停止・消去
            </Text>
            <Text style={[styles.bulletPoint, { color: currentTheme.textSecondary }]}>
              • 個人情報の第三者提供の停止
            </Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              これらの請求については、お客様ご本人であることを確認の上、合理的な範囲内で対応いたします。請求方法の詳細については、お問い合わせ先までご連絡ください。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>8. クッキー・トラッキング技術の使用</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              開発者は、本アプリの利用状況の分析、サービスの改善、セキュリティの向上を目的として、クッキーやその他のトラッキング技術を使用することがあります。これらの技術により収集される情報は、個人を特定できない形で統計的に処理され、サービスの向上に活用されます。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>9. 未成年者の個人情報</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              開発者は、未成年者の個人情報の取り扱いについて、特に慎重に対応いたします。未成年者の個人情報を収集する際は、保護者の同意を得ることを原則とし、必要に応じて年齢確認を行います。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>10. プライバシーポリシーの変更</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              開発者は、必要に応じて本プライバシーポリシーを変更することがあります。重要な変更がある場合は、アプリ内での通知またはメールによりお客様にお知らせいたします。変更後のプライバシーポリシーは、本アプリ上で公開されます。
            </Text>

            <Text style={[styles.articleTitle, { color: currentTheme.text }]}>11. お問い合わせ先</Text>
            <Text style={[styles.articleText, { color: currentTheme.textSecondary }]}>
              個人情報の取り扱いに関するお問い合わせは、以下の方法でお願いいたします。
            </Text>

            {/* お問い合わせセクション */}
            <View style={[styles.contactSection, { backgroundColor: currentTheme.surface }]}>
              <View style={styles.contactHeader}>
                <Shield size={24} color={currentTheme.primary} />
                <Text style={[styles.contactTitle, { color: currentTheme.text }]}>
                  個人情報保護担当者
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => openExternalLink('mailto:app.gakki@gmail.com')}
                >
                  <Mail size={16} color={currentTheme.primary} />
                  <Text style={[styles.contactItemText, { color: currentTheme.text }]}>
                    app.gakki@gmail.com
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => openExternalLink('tel:+81-3-1234-5678')}
                >
                  <Phone size={16} color={currentTheme.primary} />
                  <Text style={[styles.contactItemText, { color: currentTheme.text }]}>
                    03-1234-5678
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.contactHours, { color: currentTheme.textSecondary }]}>
                  受付時間: 24時間対応
                </Text>
                <Text style={[styles.contactNote, { color: currentTheme.textSecondary }]}>
                  お客様の個人情報の取り扱いについて、迅速かつ適切に対応いたします。
                </Text>
              </View>
            </View>

            <Text style={[styles.articleText, { color: currentTheme.textSecondary, marginTop: 20, textAlign: 'center' }]}>
              制定日：2025年1月15日
            </Text>
          </View>
        )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentSection: {
    padding: 20,
    borderRadius: 0,
    marginBottom: 20,
  },
  // タイトルセクション
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  titleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mainTitle: {
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
    marginBottom: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  importantText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  articleText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
    marginLeft: 16,
  },
  // お問い合わせセクション
  contactSection: {
    padding: 20,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 20,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 18,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  contactItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactHours: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  contactNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
