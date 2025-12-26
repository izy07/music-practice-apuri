import logger from '@/lib/logger';

// Persistent timer service that maintains state across screen changes
class TimerService {
  private static instance: TimerService;
  private _timerSeconds: number = 0;
  private _stopwatchSeconds: number = 0;
  private _isTimerRunning: boolean = false;
  private _isStopwatchRunning: boolean = false;
  private _timerInterval: ReturnType<typeof setInterval> | null = null;
  private _stopwatchInterval: ReturnType<typeof setInterval> | null = null;
  private _listeners: ((timerSeconds: number, stopwatchSeconds: number, isTimerRunning: boolean, isStopwatchRunning: boolean) => void)[] = [];
  
  // Timer preset values
  private _timerPresetSeconds: number = 0;
  
  // 正確な時間計測のための開始時刻
  private _timerStartTime: number | null = null; // タイマー開始時刻（ミリ秒）
  private _timerPausedSeconds: number = 0; // 一時停止時の残り秒数
  private _stopwatchStartTime: number | null = null; // ストップウォッチ開始時刻（ミリ秒）
  private _stopwatchPausedSeconds: number = 0; // 一時停止時の経過秒数

  static getInstance(): TimerService {
    if (!TimerService.instance) {
      TimerService.instance = new TimerService();
    }
    return TimerService.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  // Timer methods
  setTimerPreset(seconds: number) {
    logger.debug('TimerService setTimerPreset called with:', seconds);
    // Stop timer if running
    this.pauseTimer();
    
    this._timerPresetSeconds = seconds;
    this._timerSeconds = seconds;
    this._timerPausedSeconds = seconds;
    this._timerStartTime = null;
    logger.debug('TimerService state updated:', { _timerPresetSeconds: this._timerPresetSeconds, _timerSeconds: this._timerSeconds });
    this._notifyListeners();
  }

  addTimerTime(seconds: number) {
    // 実行中の場合、現在の残り時間を更新
    if (this._isTimerRunning && this._timerStartTime !== null) {
      const elapsed = Math.floor((Date.now() - this._timerStartTime) / 1000);
      const remaining = this._timerPausedSeconds - elapsed;
      this._timerPausedSeconds = Math.max(0, remaining + seconds);
      this._timerStartTime = Date.now();
    } else {
      this._timerPausedSeconds += seconds;
      this._timerSeconds = this._timerPausedSeconds;
    }
    this._timerPresetSeconds = this._timerPausedSeconds;
    this._notifyListeners();
  }

  startTimer() {
    // 既存のインターバルをクリア（念のため）
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    
    if (!this._isTimerRunning && this._timerSeconds > 0) {
      this._isTimerRunning = true;
      // 開始時刻を記録（再開時は既存の_timerPausedSecondsを使用）
      if (this._timerStartTime === null) {
        this._timerStartTime = Date.now();
        this._timerPausedSeconds = this._timerSeconds;
      }
      
      this._timerInterval = setInterval(() => {
        // 停止中でないことを確認（二重チェック）
        if (!this._isTimerRunning || this._timerStartTime === null) {
          return;
        }
        
        // 現在時刻から開始時刻を引いて経過時間を計算
        const elapsed = Math.floor((Date.now() - this._timerStartTime) / 1000);
        const remaining = Math.max(0, this._timerPausedSeconds - elapsed);
        
        this._timerSeconds = remaining;
        this._notifyListeners();
        
        if (remaining <= 0) {
          this.pauseTimer();
          this._timerSeconds = 0;
          this._timerPausedSeconds = 0;
          this._timerStartTime = null;
          this._notifyListeners();
        }
      }, 100); // 100msごとに更新（より滑らかな表示）
      this._notifyListeners();
    }
  }

  pauseTimer() {
    // まず実行フラグをfalseに設定（インターバルコールバック内のチェックを有効にする）
    this._isTimerRunning = false;
    
    // 一時停止時に現在の残り時間を正確に保存
    if (this._timerStartTime !== null) {
      const elapsed = Math.floor((Date.now() - this._timerStartTime) / 1000);
      const remaining = Math.max(0, this._timerPausedSeconds - elapsed);
      this._timerPausedSeconds = remaining;
      this._timerSeconds = remaining;
      this._timerStartTime = null;
    }
    
    // その後、インターバルをクリア
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    
    this._notifyListeners();
  }

  resetTimer() {
    this.pauseTimer();
    this._timerSeconds = this._timerPresetSeconds;
    this._timerPausedSeconds = this._timerPresetSeconds;
    this._timerStartTime = null;
    this._notifyListeners();
  }

  clearTimer() {
    this.pauseTimer();
    this._timerSeconds = 0;
    this._timerPresetSeconds = 0;
    this._notifyListeners();
  }

  // Stopwatch methods
  startStopwatch() {
    // 既存のインターバルをクリア（念のため）
    if (this._stopwatchInterval) {
      clearInterval(this._stopwatchInterval);
      this._stopwatchInterval = null;
    }
    
    if (!this._isStopwatchRunning) {
      this._isStopwatchRunning = true;
      // 開始時刻を記録（再開時は既存の_stopwatchPausedSecondsを使用）
      if (this._stopwatchStartTime === null) {
        this._stopwatchStartTime = Date.now();
        // 再開時は、停止時の経過秒数を考慮して開始時刻を調整
        const pausedMs = this._stopwatchPausedSeconds * 1000;
        this._stopwatchStartTime = Date.now() - pausedMs;
      }
      
      this._stopwatchInterval = setInterval(() => {
        // 停止中でないことを確認（二重チェック）
        if (!this._isStopwatchRunning || this._stopwatchStartTime === null) {
          return;
        }
        
        // 現在時刻から開始時刻を引いて経過時間を計算
        const elapsed = Math.floor((Date.now() - this._stopwatchStartTime) / 1000);
        this._stopwatchSeconds = elapsed;
        this._notifyListeners();
      }, 100); // 100msごとに更新（より滑らかな表示）
      this._notifyListeners();
    }
  }

  pauseStopwatch() {
    // まず実行フラグをfalseに設定（インターバルコールバック内のチェックを有効にする）
    this._isStopwatchRunning = false;
    
    // 一時停止時に現在の経過時間を正確に保存
    if (this._stopwatchStartTime !== null) {
      const elapsed = Math.floor((Date.now() - this._stopwatchStartTime) / 1000);
      this._stopwatchPausedSeconds = elapsed;
      this._stopwatchSeconds = elapsed;
      this._stopwatchStartTime = null;
    }
    
    // その後、インターバルをクリア
    if (this._stopwatchInterval) {
      clearInterval(this._stopwatchInterval);
      this._stopwatchInterval = null;
    }
    
    this._notifyListeners();
  }

  resetStopwatch() {
    this.pauseStopwatch();
    this._stopwatchSeconds = 0;
    this._stopwatchPausedSeconds = 0;
    this._stopwatchStartTime = null;
    this._notifyListeners();
  }

  // Getters
  getTimerSeconds(): number {
    return this._timerSeconds;
  }

  getStopwatchSeconds(): number {
    return this._stopwatchSeconds;
  }

  isTimerRunning(): boolean {
    return this._isTimerRunning;
  }

  isStopwatchRunning(): boolean {
    return this._isStopwatchRunning;
  }

  addListener(listener: (timerSeconds: number, stopwatchSeconds: number, isTimerRunning: boolean, isStopwatchRunning: boolean) => void) {
    this._listeners.push(listener);
  }

  removeListener(listener: (timerSeconds: number, stopwatchSeconds: number, isTimerRunning: boolean, isStopwatchRunning: boolean) => void) {
    this._listeners = this._listeners.filter(l => l !== listener);
  }

  private _notifyListeners() {
    this._listeners.forEach(listener => {
      listener(this._timerSeconds, this._stopwatchSeconds, this._isTimerRunning, this._isStopwatchRunning);
    });
  }
}

export default TimerService;