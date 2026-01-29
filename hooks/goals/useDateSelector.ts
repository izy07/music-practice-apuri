import { useState, useCallback } from 'react';

/**
 * 日付選択ロジックを管理するカスタムフック
 * 機能を変えずに、日付選択関連の状態とロジックを分離
 */
export function useDateSelector(initialDate?: string) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  /**
   * 日付を選択する
   * タイムゾーンの問題を回避するため、ローカル時間で日付を取得
   */
  const selectDate = useCallback((date: Date, onDateSelected: (formattedDate: string) => void) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    onDateSelected(formattedDate);
    setShowCalendar(false);
  }, []);

  /**
   * カレンダーの月を変更する
   */
  const changeMonth = useCallback((direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  }, [currentMonth]);

  /**
   * 年を変更する
   */
  const changeYear = useCallback((delta: number) => {
    setSelectedYear(prev => prev + delta);
  }, []);

  /**
   * 月を変更する（年をまたぐ場合も考慮）
   */
  const changeMonthWithYear = useCallback((delta: number) => {
    if (delta < 0) {
      // 前の月
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(prev => prev - 1);
      } else {
        setSelectedMonth(prev => prev - 1);
      }
    } else {
      // 次の月
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(prev => prev + 1);
      } else {
        setSelectedMonth(prev => prev + 1);
      }
    }
  }, [selectedMonth]);

  return {
    showCalendar,
    setShowCalendar,
    currentMonth,
    setCurrentMonth,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    selectDate,
    changeMonth,
    changeYear,
    changeMonthWithYear,
  };
}
