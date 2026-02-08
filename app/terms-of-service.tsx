/**
 * 利用規約画面
 * - アプリの利用規約を表示
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

export default function TermsOfServiceScreen() {
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
        <Text style={styles.headerTitle}>利用規約</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.title}>音楽練習支援アプリケーション</Text>
          <Text style={styles.effectiveDate}>最終更新日: 2026年1月8日</Text>
          <Text style={[styles.text, { fontWeight: 'bold', color: colors.primary, marginTop: 8 }]}>
            本規約は法的拘束力があります。ご利用前に必ずお読みください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第1条（適用）</Text>
          <Text style={styles.text}>
            本利用規約（以下「本規約」といいます）は、株式会社Music Practice（以下「当社」といいます）が提供する音楽練習支援アプリケーション「Music Practice」（以下「本サービス」といいます）の利用に関する条件を、本サービスを利用するお客様（以下「ユーザー」といいます）と当社との間で定めるものです。
          </Text>
          <Text style={styles.text}>
            本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されるものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第2条（利用登録）</Text>
          <Text style={styles.text}>
            本サービスの利用を希望する者は、本規約に同意の上、当社の定める方法によって利用登録を申請するものとします。
          </Text>
          <Text style={styles.text}>
            当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。
          </Text>
          <Text style={styles.text}>
            （1）虚偽の事項を届け出た場合
          </Text>
          <Text style={styles.text}>
            （2）本規約に違反したことがある者からの申請である場合
          </Text>
          <Text style={styles.text}>
            （3）その他、当社が利用登録を適当でないと判断した場合
          </Text>
          <Text style={styles.text}>
            利用登録の申請が承認された場合、当該申請者は、本規約に従って本サービスの利用を開始することができるものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第3条（未成年者の利用）</Text>
          <Text style={styles.text}>
            本サービスは13歳以上の方を対象としています。13歳未満の方は本サービスを利用できません。
          </Text>
          <Text style={styles.text}>
            13歳以上18歳未満の未成年者が本サービスを利用する場合は、保護者の同意を得た上で利用するものとします。
          </Text>
          <Text style={styles.text}>
            保護者は、未成年者の本サービス利用について一切の責任を負うものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第4条（利用料金および支払方法）</Text>
          <Text style={styles.text}>
            本サービスの基本機能（楽譜表示、練習記録、目標設定等）は無料でご利用いただけます。
          </Text>
          <Text style={styles.text}>
            プレミアム機能（楽譜共有、高度な分析機能、無制限クラウドストレージ等）については、以下の料金体系に従います。
          </Text>
          <Text style={styles.text}>
            月額プラン: 380円（税込）
          </Text>
          <Text style={styles.text}>
            年額プラン: 3,600円（税込、月額換算300円、月額プランより約21%割引）
          </Text>
          <Text style={styles.text}>
            料金の支払いは、App Store、Google Play Storeを通じて行うものとし、各ストアの利用規約が適用されます。
          </Text>
          <Text style={styles.text}>
            料金の返金については、各ストアの返金ポリシーに従うものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第5条（サブスクリプション）</Text>
          <Text style={styles.text}>
            プレミアムプランは自動更新される定期購読（サブスクリプション）です。
          </Text>
          <Text style={styles.text}>
            解約しない限り、契約期間終了時に自動的に更新され、料金が請求されます。
          </Text>
          <Text style={styles.text}>
            解約は、次回更新日の24時間前までに、App StoreまたはGoogle Play Storeの設定画面から行う必要があります。
          </Text>
          <Text style={styles.text}>
            解約後も、契約期間終了までプレミアム機能を利用できます。
          </Text>
          <Text style={styles.text}>
            プレミアムプランに無料トライアル期間はありません。登録と同時に課金が開始されます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第6条（広告の表示）</Text>
          <Text style={styles.text}>
            本サービスの無料版では、第三者配信の広告（バナー広告）が表示されます。
          </Text>
          <Text style={styles.text}>
            ユーザーは、リワード広告（動画広告）を視聴することで、演奏録音を1回追加で記録できる報酬を得ることができます。リワード広告の視聴は任意です。
          </Text>
          <Text style={styles.text}>
            プレミアムプランにアップグレードすることで、すべての広告を非表示にできます。
          </Text>
          <Text style={styles.text}>
            広告の内容、品質、広告主のサービスや商品について、当社は一切の責任を負いません。
          </Text>
          <Text style={styles.text}>
            広告を通じて第三者のウェブサイトやアプリにアクセスした場合、当該第三者の利用規約およびプライバシーポリシーが適用されます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第7条（アカウント管理）</Text>
          <Text style={styles.text}>
            ユーザーは、自己の責任において、本サービスのアカウント情報（メールアドレス、パスワード等）を適切に管理するものとします。
          </Text>
          <Text style={styles.text}>
            ユーザーは、いかなる場合にも、アカウント情報を第三者に譲渡または貸与し、第三者と共用することはできません。
          </Text>
          <Text style={styles.text}>
            アカウント情報の管理不十分、使用上の過誤、第三者の使用等によって生じた損害に関する責任はユーザーが負うものとし、当社は一切の責任を負いません。
          </Text>
          <Text style={styles.text}>
            アカウント情報が第三者によって使用されていることが判明した場合、ユーザーは直ちに当社にその旨を連絡するものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第8条（アプリの権限と使用目的）</Text>
          <Text style={styles.text}>
            本アプリは、以下の権限を使用します。各権限の使用目的は以下の通りです。
          </Text>
          <Text style={styles.text}>
            （1）マイク権限: ユーザー自身の演奏を録音するために使用します。録音機能を起動した時のみ、マイクへのアクセスを要求します。
          </Text>
          <Text style={styles.text}>
            （2）カメラ権限: ユーザー自身の演奏を録画するため、および楽器の演奏姿勢を確認するために使用します。録画機能または姿勢確認機能を起動した時のみ、カメラへのアクセスを要求します。
          </Text>
          <Text style={styles.text}>
            （3）ストレージ権限: プロフィール画像の設定や、既存の録音・録画ファイルを選択するために使用します。プロフィール画像を変更する時、または既存のファイルを選択する時のみ、ストレージへのアクセスを要求します。
          </Text>
          <Text style={styles.text}>
            （4）通知権限: 練習リマインダーやアプリからのお知らせを送信するために使用します。ユーザーが通知設定を有効にした時のみ、通知権限を要求します。
          </Text>
          <Text style={styles.text}>
            すべての権限は、ユーザーが明示的に許可した場合にのみ使用され、許可されなかった場合でも、該当機能以外のアプリの基本機能は利用できます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第9条（録音・録画データの取扱い）</Text>
          <Text style={styles.text}>
            ユーザーは、本サービスにおいて自己の演奏を録音・録画することができます。
          </Text>
          <Text style={styles.text}>
            録音・録画データは、クラウドストレージ（Supabase Storage）に保存され、ユーザー本人のみがアクセスできます。
          </Text>
          <Text style={styles.text}>
            録音・録画データの保存期間は以下の通りです。
          </Text>
          <Text style={styles.text}>
            演奏録音: アカウント削除時まで保存
          </Text>
          <Text style={styles.text}>
            レッスン録音: 30日後に自動削除（お気に入り登録したものを除く）
          </Text>
          <Text style={styles.text}>
            録画データ: アカウント削除時まで保存
          </Text>
          <Text style={styles.text}>
            推奨ファイルサイズは以下の通りです。
          </Text>
          <Text style={styles.text}>
            音声ファイル: 10MB以下
          </Text>
          <Text style={styles.text}>
            動画ファイル: 50MB以下
          </Text>
          <Text style={styles.text}>
            録音・録画データの他のユーザーとの共有機能、SNSへのシェア機能は提供しておりません。すべてのデータは完全にプライベートです。
          </Text>
          <Text style={styles.text}>
            ユーザーは、第三者の権利を侵害する録音・録画（無断での他者の演奏録音等）をアップロードしてはなりません。
          </Text>
          <Text style={styles.text}>
            当社は、サービスの改善、不正利用の検知、法令遵守の目的で、録音・録画データにアクセスすることがあります。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第10条（禁止事項）</Text>
          <Text style={styles.text}>
            ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
          </Text>
          <Text style={styles.text}>
            （1）法令または公序良俗に違反する行為
          </Text>
          <Text style={styles.text}>
            （2）犯罪行為に関連する行為
          </Text>
          <Text style={styles.text}>
            （3）当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為
          </Text>
          <Text style={styles.text}>
            （4）本サービスの運営を妨害するおそれのある行為
          </Text>
          <Text style={styles.text}>
            （5）他のユーザーに関する個人情報等を収集または蓄積する行為
          </Text>
          <Text style={styles.text}>
            （6）他のユーザーに成りすます行為
          </Text>
          <Text style={styles.text}>
            （7）不適切な内容（暴力的、性的、差別的等）の投稿
          </Text>
          <Text style={styles.text}>
            （8）当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為
          </Text>
          <Text style={styles.text}>
            （9）その他、当社が不適切と判断する行為
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第11条（知的財産権）</Text>
          <Text style={styles.text}>
            本サービスおよび本サービスに関連する一切の知的財産権（著作権、商標権、特許権等）は、当社または正当な権利者に帰属します。
          </Text>
          <Text style={styles.text}>
            ユーザーが本サービスを通じて作成した練習記録、演奏データ、設定情報等の著作権は、ユーザーに帰属します。
          </Text>
          <Text style={styles.text}>
            ただし、当社は、本サービスの提供、維持、改善、プロモーションに必要な範囲で、ユーザーが作成したデータを利用できるものとします。この利用には、複製、翻案、公衆送信等が含まれますが、個人を特定できる形での公開は行いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第12条（本サービスの提供の停止等）</Text>
          <Text style={styles.text}>
            当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
          </Text>
          <Text style={styles.text}>
            （1）本サービスにかかるコンピュータシステムの保守点検または更新を行う場合
          </Text>
          <Text style={styles.text}>
            （2）地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合
          </Text>
          <Text style={styles.text}>
            （3）コンピュータまたは通信回線等が事故により停止した場合
          </Text>
          <Text style={styles.text}>
            （4）その他、当社が本サービスの提供が困難と判断した場合
          </Text>
          <Text style={styles.text}>
            当社は、本サービスの提供の停止または中断によりユーザーまたは第三者に生じた損害について、一切の責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第13条（利用制限および登録抹消）</Text>
          <Text style={styles.text}>
            当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
          </Text>
          <Text style={styles.text}>
            （1）本規約のいずれかの条項に違反した場合
          </Text>
          <Text style={styles.text}>
            （2）登録事項に虚偽の事実があることが判明した場合
          </Text>
          <Text style={styles.text}>
            （3）当社からの連絡に対し、一定期間返答がない場合
          </Text>
          <Text style={styles.text}>
            （4）第14条に定める反社会的勢力に該当することが判明した場合
          </Text>
          <Text style={styles.text}>
            （5）その他、当社が本サービスの利用を適当でないと判断した場合
          </Text>
          <Text style={styles.text}>
            当社は、本条に基づき当社が行った行為によりユーザーに生じた損害について、一切の責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第14条（アカウントの削除とデータの取扱い）</Text>
          <Text style={styles.text}>
            ユーザーは、当社所定の方法により、いつでも本サービスの利用を終了し、アカウントを削除することができます。
          </Text>
          <Text style={styles.text}>
            アカウント削除の申請があった場合、当社は30日以内にユーザーのすべての個人データおよび録音・録画データを削除いたします。
          </Text>
          <Text style={styles.text}>
            アカウント削除後は、ユーザーのすべてのデータが復元不可能な形で削除されます。削除前に必要なデータは、ユーザー自身で保存してください。
          </Text>
          <Text style={styles.text}>
            当社は、現在データエクスポート機能を提供しておりません。必要なデータは、削除前にユーザー自身で別途保存してください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第15条（反社会的勢力の排除）</Text>
          <Text style={styles.text}>
            ユーザーは、現在、暴力団、暴力団員、暴力団員でなくなった時から5年を経過しない者、暴力団準構成員、暴力団関係企業、総会屋等、社会運動等標ぼうゴロまたは特殊知能暴力集団等、その他これらに準ずる者（以下総称して「反社会的勢力等」といいます）に該当しないこと、および次の各号のいずれにも該当しないことを表明し、かつ将来にわたっても該当しないことを確約するものとします。
          </Text>
          <Text style={styles.text}>
            （1）反社会的勢力等が経営を支配していると認められる関係を有すること
          </Text>
          <Text style={styles.text}>
            （2）反社会的勢力等が経営に実質的に関与していると認められる関係を有すること
          </Text>
          <Text style={styles.text}>
            （3）自己、自社もしくは第三者の不正の利益を図る目的または第三者に損害を加える目的をもってするなど、不当に反社会的勢力等を利用していると認められる関係を有すること
          </Text>
          <Text style={styles.text}>
            （4）反社会的勢力等に対して資金等を提供し、または便宜を供与するなどの関与をしていると認められる関係を有すること
          </Text>
          <Text style={styles.text}>
            （5）その他役員等または経営に実質的に関与している者が反社会的勢力等と社会的に非難されるべき関係を有すること
          </Text>
          <Text style={styles.text}>
            当社は、ユーザーが前項の規定に違反した場合、何らの催告を要せず、直ちにアカウントを削除し、本サービスの提供を停止することができるものとします。
          </Text>
          <Text style={styles.text}>
            当社は、本条に基づく措置によりユーザーに生じた損害について、一切の責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第16条（個人情報の取扱い）</Text>
          <Text style={styles.text}>
            当社は、本サービスの提供に必要な範囲で、ユーザーの個人情報を収集・利用・保存するものとします。
          </Text>
          <Text style={styles.text}>
            当社は、個人情報保護法その他の法令に従い、適切に個人情報を取り扱うものとします。
          </Text>
          <Text style={styles.text}>
            個人情報の取扱いについては、別途定めるプライバシーポリシーに従うものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第17条（保証の否認）</Text>
          <Text style={styles.text}>
            当社は、本サービスについて、以下の保証を行いません。
          </Text>
          <Text style={styles.text}>
            （1）特定の目的への適合性
          </Text>
          <Text style={styles.text}>
            （2）商品性
          </Text>
          <Text style={styles.text}>
            （3）正確性、完全性、有用性
          </Text>
          <Text style={styles.text}>
            （4）バグ、エラー、不具合がないこと
          </Text>
          <Text style={styles.text}>
            （5）中断されないこと
          </Text>
          <Text style={styles.text}>
            （6）セキュリティ上の欠陥がないこと
          </Text>
          <Text style={styles.text}>
            本サービスは「現状有姿」（AS IS）で提供されます。
          </Text>
          <Text style={styles.text}>
            当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第18条（免責事項）</Text>
          <Text style={styles.text}>
            当社は、本サービスの利用により生じるユーザーの損害について、一切の責任を負いません。ただし、本サービスに関する当社とユーザーとの間の契約（本規約を含みます）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。
          </Text>
          <Text style={styles.text}>
            前項ただし書に定める場合であっても、当社は、当社の過失（重過失を除きます）による債務不履行または不法行為によりユーザーに生じた損害のうち特別な事情から生じた損害（当社またはユーザーが損害発生につき予見し、または予見し得た場合を含みます）について一切の責任を負いません。
          </Text>
          <Text style={styles.text}>
            当社の責めに帰すべき事由によりユーザーに損害が生じた場合、当社が賠償する損害の範囲は、ユーザーが当社に支払った直近12ヶ月分の利用料金を上限とします。
          </Text>
          <Text style={styles.text}>
            当社は、広告の内容、広告を通じて提供される第三者のサービスや商品について一切の責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第19条（サービス内容の変更等）</Text>
          <Text style={styles.text}>
            当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第20条（利用規約の変更）</Text>
          <Text style={styles.text}>
            当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
          </Text>
          <Text style={styles.text}>
            変更後の利用規約は、本サービス上での掲示その他当社が定める方法により、ユーザーに通知するものとします。
          </Text>
          <Text style={styles.text}>
            本規約の変更後、本サービスの利用を継続した場合には、変更後の規約に同意したものとみなします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第21条（通知または連絡）</Text>
          <Text style={styles.text}>
            ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。
          </Text>
          <Text style={styles.text}>
            当社は、ユーザーから、当社が別途定める方法に従った変更の届出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第22条（権利義務の譲渡の禁止）</Text>
          <Text style={styles.text}>
            ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第23条（準拠法・裁判管轄）</Text>
          <Text style={styles.text}>
            本規約の解釈にあたっては、日本法を準拠法とします。
          </Text>
          <Text style={styles.text}>
            本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>お問い合わせ</Text>
          <Text style={styles.text}>
            本利用規約に関するお問い合わせは、以下の方法でお願いいたします。
          </Text>
          <Text style={styles.text}>
            📧 メール: app.gakki@gmail.com
          </Text>
          <Text style={styles.text}>
            🕒 受付時間: 24時間受付（返信は1営業日以内）
          </Text>
          <Text style={styles.text}>
            📱 アプリ内サポート: 設定 &gt; ヘルプ・サポート
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
