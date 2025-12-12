import logger from './logger';
import { ErrorHandler } from './errorHandler';

// 最適化されたデータ取得関数
const fetchPracticeRecordsOptimized = async () => {
  if (!user?.id) return;
  
  setLoading(true);
  
  try {
    // 1. 必要なカラムのみ取得
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('selected_instrument_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const currentInstrumentId = profile?.selected_instrument_id;
    
    // 2. 集計クエリでデータベース側で処理
    let query = supabase
      .from('practice_sessions')
      .select(`
        practice_date,
        duration_minutes,
        created_at
      `)
      .eq('user_id', user.id);
    
    if (currentInstrumentId) {
      query = query.eq('instrument_id', currentInstrumentId);
    }
    
    // 3. 期間制限でデータ量を削減
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    query = query
      .gte('practice_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('practice_date', { ascending: false })
      .limit(100); // ページネーション対応: メモリ使用量削減のため100件に制限
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    setPracticeRecords(data || []);
  } catch (error) {
    ErrorHandler.handle(error, '練習記録取得', true);
    Alert.alert('エラー', '練習記録の取得に失敗しました');
  } finally {
    setLoading(false);
  }
};

// さらに最適化: 集計済みデータを取得
const fetchAggregatedData = async () => {
  if (!user?.id) return;
  
  setLoading(true);
  
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('selected_instrument_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const currentInstrumentId = profile?.selected_instrument_id;
    
    // 週別集計データを直接取得
    const { data: weeklyData, error: weeklyError } = await supabase
      .rpc('get_weekly_practice_stats', {
        user_id_param: user.id,
        instrument_id_param: currentInstrumentId,
        start_date_param: getStartOfWeek().toISOString().split('T')[0]
      });
    
    if (weeklyError) throw weeklyError;
    
    // 月別集計データを直接取得
    const { data: monthlyData, error: monthlyError } = await supabase
      .rpc('get_monthly_practice_stats', {
        user_id_param: user.id,
        instrument_id_param: currentInstrumentId,
        year_param: new Date().getFullYear(),
        month_param: new Date().getMonth() + 1
      });
    
    if (monthlyError) throw monthlyError;
    
    setWeeklyStats(weeklyData || []);
    setMonthlyStats(monthlyData || []);
    
  } catch (error) {
    ErrorHandler.handle(error, '集計データ取得', true);
    Alert.alert('エラー', '統計データの取得に失敗しました');
  } finally {
    setLoading(false);
  }
};
