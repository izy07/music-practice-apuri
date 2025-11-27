import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, BarChart3, Calendar, Clock, Target } from 'lucide-react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';

const { width } = Dimensions.get('window');

interface PracticeStatsModalProps {
  visible: boolean;
  onClose: () => void;
  monthlyTotal: number;
  totalPracticeTime: number;
  practiceData: { [key: number]: { minutes: number; hasRecord: boolean } };
  currentMonth: Date;
}

export default function PracticeStatsModal({
  visible,
  onClose,
  monthlyTotal,
  totalPracticeTime,
  practiceData,
  currentMonth,
}: PracticeStatsModalProps) {
  const { currentTheme } = useInstrumentTheme();

  // 統計データの計算
  const practiceDays = Object.values(practiceData).filter(day => day.hasRecord).length;
  const averagePerDay = practiceDays > 0 ? Math.round(monthlyTotal / practiceDays) : 0;
  const totalPracticeDays = Object.values(practiceData).filter(day => day.hasRecord).length;
  
  // 今月の目標達成率（例：30日で120時間を目標とする場合）
  const monthlyGoal = 30 * 2; // 1日2時間を目標
  const goalAchievement = Math.round((monthlyTotal / monthlyGoal) * 100);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: currentTheme.text }]}>
              練習統計詳細
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={currentTheme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Current Month Stats */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color={currentTheme.primary} />
                <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月の統計
                </Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{Math.floor(monthlyTotal / 60)}時間{monthlyTotal % 60}分</Text>
                  <Text style={styles.statLabel}>合計練習時間</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{practiceDays}日</Text>
                  <Text style={styles.statLabel}>練習日数</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{averagePerDay}分</Text>
                  <Text style={styles.statLabel}>1日平均</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{goalAchievement}%</Text>
                  <Text style={styles.statLabel}>目標達成率</Text>
                </View>
              </View>
            </View>

            {/* Overall Stats */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <BarChart3 size={20} color={currentTheme.primary} />
                <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                  総合計統計
                </Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {Math.floor(totalPracticeTime / 60)}時間{totalPracticeTime % 60}分
                  </Text>
                  <Text style={styles.statLabel}>累計練習時間</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{totalPracticeDays}日</Text>
                  <Text style={styles.statLabel}>総練習日数</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {totalPracticeDays > 0 ? Math.round(totalPracticeTime / totalPracticeDays) : 0}分
                  </Text>
                  <Text style={styles.statLabel}>総平均/日</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {Math.floor(totalPracticeTime / 60 / 24)}日
                  </Text>
                  <Text style={styles.statLabel}>24時間換算</Text>
                </View>
              </View>
            </View>

            {/* Weekly Breakdown */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clock size={20} color={currentTheme.primary} />
                <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                  週別内訳
                </Text>
              </View>
              
              <View style={styles.weeklyBreakdown}>
                {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => {
                  const dayData = Object.entries(practiceData).filter(([dayNum, data]) => {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), parseInt(dayNum));
                    return date.getDay() === index && data.hasRecord;
                  });
                  
                  const totalMinutes = dayData.reduce((sum, [_, data]) => sum + data.minutes, 0);
                  
                  return (
                    <View key={day} style={styles.weekDayCard}>
                      <Text style={styles.weekDayLabel}>{day}</Text>
                      <Text style={styles.weekDayValue}>{totalMinutes}分</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Tips */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Target size={20} color={currentTheme.primary} />
                <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                  練習のヒント
                </Text>
              </View>
              
              <View style={styles.tipsContainer}>
                <Text style={[styles.tipText, { color: currentTheme.textSecondary }]}>
                  • 毎日少しずつでも練習を続けることが大切です
                </Text>
                <Text style={[styles.tipText, { color: currentTheme.textSecondary }]}>
                  • 週末にまとめて練習するよりも、毎日短時間練習する方が効果的です
                </Text>
                <Text style={[styles.tipText, { color: currentTheme.textSecondary }]}>
                  • 目標を立てて、達成感を味わいながら練習を続けましょう
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  weeklyBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDayCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  weekDayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  weekDayValue: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '500',
  },
  tipsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
});
