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
    router.back();
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
          <Text style={styles.sectionTitle}>個人情報保護方針（個人情報保護法対応）</Text>
          <Text style={styles.text}>
            本アプリは、個人情報の保護に関する法律（個人情報保護法）に基づき、以下の方針で個人情報を適切に取り扱います。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 個人情報の取得・利用目的</Text>
          <Text style={styles.text}>本アプリは、以下の利用目的で個人情報を取得・利用します。</Text>
          <Text style={styles.text}>・アカウント管理（本人認証、不正防止）</Text>
          <Text style={styles.text}>・サービス提供（練習記録、録音、目標管理、通知配信）</Text>
          <Text style={styles.text}>・品質改善（障害解析、利用統計）</Text>
          <Text style={styles.text}>・お問合せ対応</Text>
          <Text style={styles.text}>・法令等に基づく対応</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 個人情報保護管理者</Text>
          <Text style={styles.text}>本アプリの個人情報保護管理者は以下の通りです。</Text>
          <Text style={styles.text}>・氏名: 音楽練習アプリ プライバシー担当者</Text>
          <Text style={styles.text}>・連絡先: app.gakki@gmail.com</Text>
          <Text style={styles.text}>・責任: 個人情報の適切な取り扱いの監督・管理</Text>
          <Text style={styles.text}>・苦情・相談窓口: 個人情報に関する苦情・相談は上記連絡先までお寄せください。</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 安全管理措置</Text>
          <Text style={styles.text}>本アプリは、個人情報の漏洩、滅失、毀損の防止等のために、以下の安全管理措置を講じています。</Text>
          <Text style={styles.text}>・組織的安全管理措置: 責任者設置、取扱規程整備、従業員教育</Text>
          <Text style={styles.text}>・人的安全管理措置: 機密保持契約締結、アクセス制限</Text>
          <Text style={styles.text}>・物理的安全管理措置: 入退室管理、機器の盗難・紛失防止</Text>
          <Text style={styles.text}>・技術的安全管理措置: アクセス制御、暗号化、ログ管理</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 個人情報の開示・訂正・削除等</Text>
          <Text style={styles.text}>ユーザーは、個人情報保護法に基づき、以下の権利を行使できます。</Text>
          <Text style={styles.text}>・開示請求: 保有する個人情報の開示を請求</Text>
          <Text style={styles.text}>・訂正・追加・削除請求: 個人情報の訂正・追加・削除を請求</Text>
          <Text style={styles.text}>・利用停止・消去請求: 個人情報の利用停止・消去を請求</Text>
          <Text style={styles.text}>・苦情申立て: 個人情報の取り扱いに関する苦情を申立て</Text>
          <Text style={styles.text}>上記請求は、個人情報保護管理者（app.gakki@gmail.com）までご連絡ください。</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 第三者提供の制限</Text>
          <Text style={styles.text}>本アプリは、以下の場合を除き、個人情報を第三者に提供しません。</Text>
          <Text style={styles.text}>・法令に基づく場合</Text>
          <Text style={styles.text}>・人の生命、身体又は財産の保護のために必要がある場合</Text>
          <Text style={styles.text}>・公衆衛生の向上又は児童の健全な育成の推進のために特に必要がある場合</Text>
          <Text style={styles.text}>・国の機関もしくは地方公共団体又はその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</Text>
          <Text style={styles.text}>・ユーザーの同意がある場合</Text>
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
          <Text style={styles.text}>カリフォルニア州居住者は以下の権利を有します：</Text>
          <Text style={styles.text}>・知る権利: 収集された個人情報の種類と使用目的を知る権利</Text>
          <Text style={styles.text}>・削除権: 個人情報の削除を請求する権利</Text>
          <Text style={styles.text}>・オプトアウト権: 個人情報の販売への同意を撤回する権利</Text>
          <Text style={styles.text}>・差別禁止: 権利行使による差別的扱いを受けない権利</Text>
          <Text style={styles.text}>・データ可搬性: 個人情報の移動可能性</Text>
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
          <Text style={styles.text}>CCPAに関するお問い合わせは以下の連絡先まで：</Text>
          <Text style={styles.text}>・メール: app.gakki@gmail.com</Text>
          <Text style={styles.text}>・電話: 1-800-XXX-XXXX（米国内のみ）</Text>
          <Text style={styles.text}>・郵送: Privacy Department, Music Practice App, [住所]</Text>
          <Text style={styles.text}>・オンライン: アプリ内「設定 &gt; プライバシー設定」から</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>音楽練習アプリ プライバシーポリシー</Text>
          <Text style={styles.effectiveDate}>制定日: 2024年1月1日</Text>
          <Text style={styles.text}>最終更新日: 2025-10-20</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>
            音楽練習アプリ（以下「本アプリ」）は、ユーザーの個人情報保護の重要性を認識し、
            個人情報の保護に関する法律（個人情報保護法）を遵守するとともに、
            以下に定めるプライバシーポリシー（以下「本ポリシー」）に従って、
            適切に取り扱うものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第1条（個人情報）</Text>
          <Text style={styles.text}>
            「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、
            生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、
            連絡先その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、
            及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第2条（個人情報の収集方法）</Text>
          <Text style={styles.text}>
            本アプリは、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレス、
            銀行口座番号、クレジットカード番号、運転免許証番号などの個人情報をお尋ねすることがあります。
            また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、
            本アプリの提携先（情報提供元、広告主、広告配信先などを含みます。以下「提携先」）などから収集することがあります。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第3条（個人情報を収集・利用する目的）</Text>
          <Text style={styles.text}>
            本アプリが個人情報を収集・利用する目的は、以下のとおりです。
          </Text>
          <Text style={styles.text}>
            （1）本アプリの提供・運営のため
          </Text>
          <Text style={styles.text}>
            （2）ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）
          </Text>
          <Text style={styles.text}>
            （3）ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等及び本アプリが提供する他のサービスの案内のメールを送付するため
          </Text>
          <Text style={styles.text}>
            （4）メンテナンス、重要なお知らせなど必要に応じたご連絡のため
          </Text>
          <Text style={styles.text}>
            （5）利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため
          </Text>
          <Text style={styles.text}>
            （6）ユーザーにご自身の登録情報の閲覧・変更・削除・ご利用状況の閲覧を行っていただくため
          </Text>
          <Text style={styles.text}>
            （7）有料サービスにおいて、ユーザーに利用料金を請求するため
          </Text>
          <Text style={styles.text}>
            （8）上記の利用目的に付随する目的
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第4条（利用目的の変更）</Text>
          <Text style={styles.text}>
            本アプリは、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、
            個人情報の利用目的を変更するものとします。
            利用目的の変更を行った場合には、変更後の目的について、
            本アプリ所定の方法により、ユーザーに通知し、または本アプリウェブサイト上に公表するものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第5条（個人情報の第三者提供）</Text>
          <Text style={styles.text}>
            本アプリは、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、
            第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
          </Text>
          <Text style={styles.text}>
            （1）人の生命、身体または財産の保護のために必要がある場合であって、
            本人の同意を得ることが困難であるとき
          </Text>
          <Text style={styles.text}>
            （2）公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、
            本人の同意を得ることが困難であるとき
          </Text>
          <Text style={styles.text}>
            （3）国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、
            本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき
          </Text>
          <Text style={styles.text}>
            （4）予め次の事項を告知あるいは公表し、かつ本アプリが個人情報保護委員会に届出をしたとき
          </Text>
          <Text style={styles.text}>
            ・利用目的に第三者への提供を含むこと
          </Text>
          <Text style={styles.text}>
            ・第三者に提供されるデータの項目
          </Text>
          <Text style={styles.text}>
            ・第三者への提供の手段または方法
          </Text>
          <Text style={styles.text}>
            ・本人の求めに応じて個人情報の第三者への提供を停止すること
          </Text>
          <Text style={styles.text}>
            ・本人の求めを受け付ける方法
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第6条（個人情報の開示）</Text>
          <Text style={styles.text}>
            本アプリは、本人から個人情報の開示を求められたときは、本人に対し、遅滞なくこれを開示します。
            ただし、開示することにより次のいずれかに該当する場合は、その全部または一部を開示しないこともあり、
            開示しない決定をした場合には、その旨を遅滞なく通知します。
          </Text>
          <Text style={styles.text}>
            （1）本人または第三者の生命、身体、財産その他の権利利益を害するおそれがある場合
          </Text>
          <Text style={styles.text}>
            （2）本アプリの業務の適正な実施に著しい支障を及ぼすおそれがある場合
          </Text>
          <Text style={styles.text}>
            （3）その他法令に違反することとなる場合
          </Text>
          <Text style={styles.text}>
            前項の定めにかかわらず、履歴情報および特性情報などの個人情報以外の情報については、原則として開示いたしません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第7条（個人情報の訂正および削除）</Text>
          <Text style={styles.text}>
            ユーザーは、本アプリの保有する自己の個人情報が誤った情報である場合には、
            本アプリが定める手続により、本アプリに対して個人情報の訂正、追加または削除（以下「訂正等」）を請求することができます。
          </Text>
          <Text style={styles.text}>
            本アプリは、ユーザーから前項の請求を受けてその請求に理由があると判断した場合には、
            遅滞なく、当該個人情報の訂正等を行うものとします。
          </Text>
          <Text style={styles.text}>
            本アプリは、前項の規定に基づき訂正等を行った場合、または訂正等を行わない旨の決定をしたときは遅滞なく、
            これをユーザーに通知します。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第8条（個人情報の利用停止等）</Text>
          <Text style={styles.text}>
            本アプリは、本人から、個人情報が、利用目的の範囲を超えて取り扱われているという理由、
            または不正の手段により取得されたものであるという理由により、
            その利用の停止または消去（以下「利用停止等」）を求められた場合には、
            遅滞なく必要な調査を行います。
          </Text>
          <Text style={styles.text}>
            前項の調査結果に基づき、その請求に理由があると判断した場合には、遅滞なく、当該個人情報の利用停止等を行います。
          </Text>
          <Text style={styles.text}>
            本アプリは、前項の規定に基づき利用停止等を行った場合、または利用停止等を行わない旨の決定をしたときは、
            遅滞なく、これをユーザーに通知します。
          </Text>
          <Text style={styles.text}>
            前2項にかかわらず、利用停止等に多額の費用を有する場合その他利用停止等を行うことが困難な場合であって、
            ユーザーの権利利益を保護するために必要なこれに代わるべき措置をとれる場合は、この代替策を講じるものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第9条（プライバシーポリシーの変更）</Text>
          <Text style={styles.text}>
            本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、
            ユーザーに通知することなく、変更することができるものとします。
          </Text>
          <Text style={styles.text}>
            本アプリが別途定める場合を除いて、変更後のプライバシーポリシーは、
            本アプリウェブサイトに掲載したときから効力を生じるものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第10条（お問い合わせ窓口）</Text>
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
    marginBottom: 16,
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
