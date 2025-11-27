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
  SafeAreaView,
} from 'react-native';
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
    <SafeAreaView style={styles.container} edges={[]}>
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
          <Text style={styles.title}>音楽練習アプリ 利用規約</Text>
          <Text style={styles.effectiveDate}>制定日: 2024年1月1日</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第1条（目的）</Text>
          <Text style={styles.text}>
            本規約は、音楽練習アプリ（以下「本アプリ」）の利用条件を定めるものです。
            ユーザーは本規約に同意の上、本アプリを利用するものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第2条（定義）</Text>
          <Text style={styles.text}>
            本規約において使用する用語の意義は、次の各号に定めるところによります。
          </Text>
          <Text style={styles.text}>
            （1）「本アプリ」とは、音楽練習に関する機能を提供するアプリケーションをいいます。
          </Text>
          <Text style={styles.text}>
            （2）「ユーザー」とは、本アプリを利用する個人をいいます。
          </Text>
          <Text style={styles.text}>
            （3）「コンテンツ」とは、本アプリ内で提供される情報、データ、音楽、動画等をいいます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第3条（利用登録）</Text>
          <Text style={styles.text}>
            本アプリの利用を希望する者は、本規約に同意の上、当社の定める方法によって利用登録を申請し、
            当社がこれを承認することによって、利用登録が完了するものとします。
          </Text>
          <Text style={styles.text}>
            当社は、利用登録の申請者に以下の事由があると判断した場合、
            利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。
          </Text>
          <Text style={styles.text}>
            （1）利用登録の申請に際して虚偽の事項を届け出た場合
          </Text>
          <Text style={styles.text}>
            （2）本規約に違反したことがある者からの申請である場合
          </Text>
          <Text style={styles.text}>
            （3）その他、当社が利用登録を相当でないと判断した場合
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第4条（ユーザーIDおよびパスワードの管理）</Text>
          <Text style={styles.text}>
            ユーザーは、自己の責任において、本アプリのユーザーIDおよびパスワードを適切に管理するものとします。
          </Text>
          <Text style={styles.text}>
            ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、
            もしくは第三者と共用することはできません。当社は、ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、
            そのユーザーIDを登録しているユーザー自身による利用とみなします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第5条（禁止事項）</Text>
          <Text style={styles.text}>
            ユーザーは、本アプリの利用にあたり、以下の行為をしてはなりません。
          </Text>
          <Text style={styles.text}>
            （1）法令または公序良俗に違反する行為
          </Text>
          <Text style={styles.text}>
            （2）犯罪行為に関連する行為
          </Text>
          <Text style={styles.text}>
            （3）本アプリの内容等、本アプリに含まれる著作権、商標権ほか知的財産権を侵害する行為
          </Text>
          <Text style={styles.text}>
            （4）当社、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、
            妨害したりする行為
          </Text>
          <Text style={styles.text}>
            （5）本アプリによって得られた情報を商業的に利用する行為
          </Text>
          <Text style={styles.text}>
            （6）当社のサービスの運営を妨害するおそれのある行為
          </Text>
          <Text style={styles.text}>
            （7）不正アクセスをし、またはこれを試みる行為
          </Text>
          <Text style={styles.text}>
            （8）その他、当社が不適切と判断する行為
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第6条（本アプリの提供の停止等）</Text>
          <Text style={styles.text}>
            当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく
            本アプリの全部または一部の提供を停止または中断することができるものとします。
          </Text>
          <Text style={styles.text}>
            （1）本アプリにかかるコンピュータシステムの保守点検または更新を行う場合
          </Text>
          <Text style={styles.text}>
            （2）地震、落雷、火災、停電または天災などの不可抗力により、本アプリの提供が困難となった場合
          </Text>
          <Text style={styles.text}>
            （3）コンピュータまたは通信回線等が事故により停止した場合
          </Text>
          <Text style={styles.text}>
            （4）その他、当社が本アプリの提供が困難と判断した場合
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第7条（利用制限および登録抹消）</Text>
          <Text style={styles.text}>
            当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、
            ユーザーに対して、本アプリの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
          </Text>
          <Text style={styles.text}>
            （1）本規約のいずれかの条項に違反した場合
          </Text>
          <Text style={styles.text}>
            （2）登録事項に虚偽の事実があることが判明した場合
          </Text>
          <Text style={styles.text}>
            （3）料金等の支払債務の不履行があった場合
          </Text>
          <Text style={styles.text}>
            （4）当社からの連絡に対し、一定期間返答がない場合
          </Text>
          <Text style={styles.text}>
            （5）本アプリについて、最後の利用から一定期間利用がない場合
          </Text>
          <Text style={styles.text}>
            （6）その他、当社が本アプリの利用を適当でないと判断した場合
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第8条（退会）</Text>
          <Text style={styles.text}>
            ユーザーは、当社の定める退会手続により、本アプリから退会できるものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第9条（保証の否認および免責事項）</Text>
          <Text style={styles.text}>
            当社は、本アプリに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、
            特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）
            がないことを明示的にも黙示的にも保証しておりません。
          </Text>
          <Text style={styles.text}>
            当社は、本アプリに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。
            ただし、本アプリに関する当社とユーザーとの間の契約（本規約を含みます。）が
            消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第10条（サービス内容の変更等）</Text>
          <Text style={styles.text}>
            当社は、ユーザーに通知することなく、本アプリの内容を変更しまたは本アプリの提供を中止することができるものとし、
            これによってユーザーに生じた損害について一切の責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第11条（利用規約の変更）</Text>
          <Text style={styles.text}>
            当社は以下の場合には、ユーザーの個別の同意を要せず、本規約を変更することができるものとします。
          </Text>
          <Text style={styles.text}>
            （1）本規約の変更がユーザーの一般の利益に適合するとき。
          </Text>
          <Text style={styles.text}>
            （2）本規約の変更が本アプリの利用契約の目的に反せず、かつ、変更の必要性、
            変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき。
          </Text>
          <Text style={styles.text}>
            当社はユーザーに対し、前項による本規約の変更にあたり、事前に、本規約を変更する旨及び変更後の本規約の内容並びにその効力発生時期を通知いたします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第12条（個人情報の取扱い）</Text>
          <Text style={styles.text}>
            当社は、本アプリの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第13条（通知または連絡）</Text>
          <Text style={styles.text}>
            ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。
            当社は、ユーザーから、当社が別途定める方式に従った変更届け出がない限り、
            現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、
            これらは、発信時にユーザーへ到達したものとみなします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第14条（権利義務の譲渡の禁止）</Text>
          <Text style={styles.text}>
            ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、
            または担保に供することはできません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第15条（準拠法・裁判管轄）</Text>
          <Text style={styles.text}>
            本規約の解釈にあたっては、日本法を準拠法とします。
          </Text>
          <Text style={styles.text}>
            本アプリに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
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
