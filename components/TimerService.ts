import logger from '@/lib/logger';

// Persistent timer service that maintains state across screen changes
class TimerService {
  private static instance: TimerService;
  private _timerSeconds: number = 0;
  private _stopwatchSeconds: number = 0;
  private _isTimerRunning: boolean = false;
  private _isStopwatchRunning: boolean = false;
  private _timerInterval: number | null = null;
  private _stopwatchInterval: number | null = null;
  private _listeners: ((timerSeconds: number, stopwatchSeconds: number, isTimerRunning: boolean, isStopwatchRunning: boolean) => void)[] = [];
  
  // Timer preset values
  private _timerPresetSeconds: number = 0;

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
    logger.debug('TimerService state updated:', { _timerPresetSeconds: this._timerPresetSeconds, _timerSeconds: this._timerSeconds });
    this._notifyListeners();
  }

  addTimerTime(seconds: number) {
    this._timerSeconds += seconds;
    this._timerPresetSeconds = this._timerSeconds;
    this._notifyListeners();
  }

  startTimer() {
    if (!this._isTimerRunning && this._timerSeconds > 0) {
      this._isTimerRunning = true;
      this._timerInterval = setInterval(() => {
        this._timerSeconds--;
        this._notifyListeners();
        
        if (this._timerSeconds <= 0) {
          this.pauseTimer();
          this._timerSeconds = 0;
          this._notifyListeners();
        }
      }, 1000);
      this._notifyListeners();
    }
  }

  pauseTimer() {
    this._isTimerRunning = false;
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    this._notifyListeners();
  }

  resetTimer() {
    this.pauseTimer();
    this._timerSeconds = this._timerPresetSeconds;
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
    if (!this._isStopwatchRunning) {
      this._isStopwatchRunning = true;
      this._stopwatchInterval = setInterval(() => {
        this._stopwatchSeconds++;
        this._notifyListeners();
      }, 1000);
      this._notifyListeners();
    }
  }

  pauseStopwatch() {
    this._isStopwatchRunning = false;
    if (this._stopwatchInterval) {
      clearInterval(this._stopwatchInterval);
      this._stopwatchInterval = null;
    }
    this._notifyListeners();
  }

  resetStopwatch() {
    this.pauseStopwatch();
    this._stopwatchSeconds = 0;
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