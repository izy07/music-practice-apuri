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
          <Text style={styles.title}>音楽練習アプリ プライバシーポリシー</Text>
          <Text style={styles.effectiveDate}>制定日: 2024年1月1日</Text>
          <Text style={styles.text}>最終更新日: 2026年2月3日</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>
            音楽練習アプリ（以下「本アプリ」）は、個人開発のアプリケーションとして、
            ユーザーの個人情報保護の重要性を認識し、個人情報の保護に関する法律（個人情報保護法）を遵守するとともに、
            以下に定めるプライバシーポリシー（以下「本ポリシー」）に従って、適切に取り扱うものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第1条（個人情報の定義）</Text>
          <Text style={styles.text}>
            「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、
            生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、
            連絡先その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、
            及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第2条（収集する個人情報）</Text>
          <Text style={styles.text}>
            本アプリは、以下の個人情報を収集します。
          </Text>
          <Text style={styles.text}>
            （1）認証情報
          </Text>
          <Text style={styles.text}>
            ・メールアドレス（アカウント作成時にSupabase認証システムを通じて収集）
          </Text>
          <Text style={styles.text}>
            （2）プロフィール情報（任意入力）
          </Text>
          <Text style={styles.text}>
            ・表示名（ニックネーム）
          </Text>
          <Text style={styles.text}>
            ・生年月日
          </Text>
          <Text style={styles.text}>
            ・現在の年齢
          </Text>
          <Text style={styles.text}>
            ・所属団体名
          </Text>
          <Text style={styles.text}>
            ・自己紹介文
          </Text>
          <Text style={styles.text}>
            ・音楽開始年齢
          </Text>
          <Text style={styles.text}>
            ・演奏歴年数
          </Text>
          <Text style={styles.text}>
            （3）アプリ利用データ
          </Text>
          <Text style={styles.text}>
            ・練習記録（練習日付、練習時間、練習内容、入力方法）
          </Text>
          <Text style={styles.text}>
            ・録音データ（演奏録音・レッスン録音の音声ファイル）
          </Text>
          <Text style={styles.text}>
            ・目標情報（タイトル、説明、目標日付、進捗状況）
          </Text>
          <Text style={styles.text}>
            ・イベント情報（タイトル、説明、イベント日付）
          </Text>
          <Text style={styles.text}>
            ・楽曲情報（タイトル、アーティスト、ジャンル、難易度、ステータス）
          </Text>
          <Text style={styles.text}>
            ・アプリ設定情報（言語設定、テーマ設定、通知設定、メトロノーム設定、チューナー設定）
          </Text>
          <Text style={styles.text}>
            （4）技術的情報
          </Text>
          <Text style={styles.text}>
            ・デバイス情報、OS情報、アプリバージョン情報（エラー解析・品質改善のため）
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第3条（個人情報の利用目的）</Text>
          <Text style={styles.text}>
            本アプリは、以下の利用目的で個人情報を取得・利用します。
          </Text>
          <Text style={styles.text}>
            （1）アカウント管理（本人認証、不正防止）
          </Text>
          <Text style={styles.text}>
            （2）サービス提供（練習記録の保存・表示、録音の保存・再生、目標管理、カレンダー表示、通知配信）
          </Text>
          <Text style={styles.text}>
            （3）品質改善（障害解析、利用統計、アプリの機能改善）
          </Text>
          <Text style={styles.text}>
            （4）お問合せ対応
          </Text>
          <Text style={styles.text}>
            （5）法令等に基づく対応
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第4条（録音データの使用方法）</Text>
          <Text style={[styles.text, { fontWeight: 'bold', color: '#2E7D32' }]}>
            本アプリは、音楽練習・学習アプリとして、録音機能を提供しています。
          </Text>
          <Text style={styles.text}>
            （1）録音データ（演奏録音・レッスン録音）は、ユーザー自身の音楽練習記録を保存・再生するための教育的な目的のみで使用されます。
          </Text>
          <Text style={styles.text}>
            （2）録音データは、ユーザー自身のアカウントにのみ保存され、他のユーザーと共有されることはありません。
          </Text>
          <Text style={styles.text}>
            （3）録音データは、アプリの機能（練習記録の保存・再生）のみに使用され、マーケティングや広告目的では使用されません。
          </Text>
          <Text style={styles.text}>
            （4）録音データは、セキュアなクラウドストレージ（Supabase）に保存されますが、データは暗号化され、ユーザー本人のみがアクセス可能です。
          </Text>
          <Text style={styles.text}>
            （5）録音データは、アカウント削除時に自動的に削除されます。
          </Text>
          <Text style={styles.text}>
            （6）レッスン録音は、音楽レッスンの記録としてユーザー自身が学習・復習するための教育的な目的のみで使用されます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第5条（個人情報の第三者提供）</Text>
          <Text style={[styles.text, { fontWeight: 'bold', color: '#2E7D32' }]}>
            本アプリは、ユーザーの個人情報を第三者に提供することはありません。
          </Text>
          <Text style={styles.text}>
            ただし、以下の場合を除きます。
          </Text>
          <Text style={styles.text}>
            （1）法令に基づく場合
          </Text>
          <Text style={styles.text}>
            （2）人の生命、身体又は財産の保護のために必要がある場合
          </Text>
          <Text style={styles.text}>
            （3）公衆衛生の向上又は児童の健全な育成の推進のために特に必要がある場合
          </Text>
          <Text style={styles.text}>
            （4）国の機関もしくは地方公共団体又はその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合
          </Text>
          <Text style={styles.text}>
            （5）ユーザーの同意がある場合
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第6条（学術研究目的でのデータ利用）</Text>
          <Text style={styles.text}>
            本アプリの開発者は、大学での学術研究目的で、匿名化された統計データを分析する場合があります。
          </Text>
          <Text style={styles.text}>
            （1）研究で使用されるデータは、個人を特定できないよう匿名化処理を行います。
          </Text>
          <Text style={styles.text}>
            （2）研究で使用されるデータには、録音データの音声ファイルは含まれません（統計情報のみ）。
          </Text>
          <Text style={styles.text}>
            （3）研究で使用されるデータには、メールアドレス、生年月日、所属団体名などの個人を特定できる情報は含まれません。
          </Text>
          <Text style={styles.text}>
            （4）研究で使用されるデータは、練習時間、練習内容の種類、楽器の種類、目標達成状況などの統計情報のみです。
          </Text>
          <Text style={styles.text}>
            （5）研究結果は、学術論文や学会発表などで公開される可能性がありますが、個人を特定できる情報は一切含まれません。
          </Text>
          <Text style={styles.text}>
            （6）研究で使用されるデータは、ユーザーの同意なく使用されることはありません。
          </Text>
          <Text style={styles.text}>
            研究目的でのデータ利用を希望しない場合は、お問い合わせ窓口（app.gakki@gmail.com）までご連絡ください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第7条（13歳未満のユーザーのプライバシー保護）</Text>
          <Text style={styles.text}>
            本アプリは、全世代向けの音楽練習アプリですが、特に13歳未満のユーザー（子供）のプライバシーを保護するため、以下の取り組みを行っています。
          </Text>
          <Text style={styles.text}>
            （1）13歳未満のユーザーがアカウントを作成する際は、保護者の同意を取得します。
          </Text>
          <Text style={styles.text}>
            （2）録音データを含むすべてのデータは、ユーザー自身のアカウントにのみ保存され、他のユーザーや第三者と共有されることはありません。
          </Text>
          <Text style={styles.text}>
            （3）録音データは、教育的な目的（音楽練習記録の保存・再生）のみに使用され、マーケティングや広告目的では使用されません。
          </Text>
          <Text style={styles.text}>
            （4）保護者は、お子様のアカウント情報や録音データの閲覧・削除をいつでもリクエストできます。
          </Text>
          <Text style={styles.text}>
            （5）米国のCOPPA（Children's Online Privacy Protection Act）にも準拠しています。
          </Text>
          <Text style={styles.text}>
            保護者の方からのお問い合わせは、個人情報保護管理者（app.gakki@gmail.com）までご連絡ください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第8条（個人情報保護管理者）</Text>
          <Text style={styles.text}>
            本アプリの個人情報保護管理者は以下の通りです。
          </Text>
          <Text style={styles.text}>
            ・連絡先: app.gakki@gmail.com
          </Text>
          <Text style={styles.text}>
            ・責任: 個人情報の適切な取り扱いの監督・管理
          </Text>
          <Text style={styles.text}>
            ・苦情・相談窓口: 個人情報に関する苦情・相談は上記連絡先までお寄せください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第9条（安全管理措置）</Text>
          <Text style={styles.text}>
            本アプリは、個人情報の漏洩、滅失、毀損の防止等のために、以下の安全管理措置を講じています。
          </Text>
          <Text style={styles.text}>
            ・技術的安全管理措置: アクセス制御、暗号化、ログ管理、セキュアなクラウドストレージ（Supabase）の利用
          </Text>
          <Text style={styles.text}>
            ・物理的安全管理措置: クラウドサービスのセキュリティ対策に依存
          </Text>
          <Text style={styles.text}>
            ・組織的安全管理措置: 個人情報保護管理者による適切な管理
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第10条（個人情報の開示・訂正・削除等）</Text>
          <Text style={styles.text}>
            ユーザーは、個人情報保護法に基づき、以下の権利を行使できます。
          </Text>
          <Text style={styles.text}>
            ・開示請求: 保有する個人情報の開示を請求
          </Text>
          <Text style={styles.text}>
            ・訂正・追加・削除請求: 個人情報の訂正・追加・削除を請求
          </Text>
          <Text style={styles.text}>
            ・利用停止・消去請求: 個人情報の利用停止・消去を請求
          </Text>
          <Text style={styles.text}>
            ・苦情申立て: 個人情報の取り扱いに関する苦情を申立て
          </Text>
          <Text style={styles.text}>
            上記請求は、個人情報保護管理者（app.gakki@gmail.com）までご連絡ください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第11条（プライバシーポリシーの変更）</Text>
          <Text style={styles.text}>
            本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、
            ユーザーに通知することなく、変更することができるものとします。
          </Text>
          <Text style={styles.text}>
            本アプリが別途定める場合を除いて、変更後のプライバシーポリシーは、
            本アプリ内に掲載したときから効力を生じるものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第12条（お問い合わせ窓口）</Text>
          <Text style={styles.text}>
            本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。
          </Text>
          <Text style={styles.text}>
            音楽練習アプリ運営事務局
          </Text>
          <Text style={styles.text}>
            メールアドレス: app.gakki@gmail.com
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>カリフォルニア州消費者プライバシー法（CCPA）対応</Text>
          <Text style={styles.text}>
            本アプリは、カリフォルニア州消費者プライバシー法（California Consumer Privacy Act, CCPA）に基づき、
            カリフォルニア州居住者の消費者権利を保護します。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CCPA 消費者権利</Text>
          <Text style={styles.text}>
            カリフォルニア州居住者は以下の権利を有します：
          </Text>
          <Text style={styles.text}>
            ・知る権利: 収集された個人情報の種類と使用目的を知る権利
          </Text>
          <Text style={styles.text}>
            ・削除権: 個人情報の削除を請求する権利
          </Text>
          <Text style={styles.text}>
            ・オプトアウト権: 個人情報の販売への同意を撤回する権利
          </Text>
          <Text style={styles.text}>
            ・差別禁止: 権利行使による差別的扱いを受けない権利
          </Text>
          <Text style={styles.text}>
            ・データ可搬性: 個人情報の移動可能性
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>個人情報の販売について</Text>
          <Text style={[styles.text, { fontWeight: 'bold', color: '#2E7D32' }]}>
            本アプリは、ユーザーの個人情報を第三者に販売することはありません。
          </Text>
          <Text style={styles.text}>
            収集した個人情報は、本アプリのサービス提供の目的のみに使用され、
            広告配信や第三者への販売には一切使用されません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CCPA 連絡先</Text>
          <Text style={styles.text}>
            CCPAに関するお問い合わせは以下の連絡先まで：
          </Text>
          <Text style={styles.text}>
            ・メール: app.gakki@gmail.com
          </Text>
          <Text style={styles.text}>
            ・オンライン: アプリ内「設定 &gt; プライバシー設定」から
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
  text: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
});
