import {
  getNoteFromFrequency,
  mpmPitchDetection,
  combineAlgorithms,
  createFrequencyStabilizerState,
  stabilizeDetectedFrequency,
  applyCentsDeadZone,
} from '@/lib/tunerAudioProcessor';

describe('tunerAudioProcessor', () => {
  describe('getNoteFromFrequency', () => {
    it('A4=442Hz、基準442Hzのときセントは0', () => {
      const result = getNoteFromFrequency(442, 442);
      expect(result.note).toBe('A');
      expect(result.octave).toBe(4);
      expect(result.cents).toBeCloseTo(0, 0);
    });

    it('A4=442Hz、基準440Hzのときセントは約+8（高い）', () => {
      const result = getNoteFromFrequency(442, 440);
      expect(result.note).toBe('A');
      expect(result.octave).toBe(4);
      expect(result.cents).toBeGreaterThan(7);
      expect(result.cents).toBeLessThan(10);
    });

    it('第2引省略時はデフォルト442HzでA4=442が0セント', () => {
      const result = getNoteFromFrequency(442);
      expect(result.cents).toBeCloseTo(0, 0);
    });

    it('A4=440Hz、基準442Hzのときセントは約-8（低い）', () => {
      const result = getNoteFromFrequency(440, 442);
      expect(result.note).toBe('A');
      expect(result.octave).toBe(4);
      expect(result.cents).toBeLessThan(-7);
      expect(result.cents).toBeGreaterThan(-10);
    });
  });

  /** 正弦波バッファを生成（ピッチ検出精度テスト用） */
  const makeSine = (freq: number, sampleRate: number, length: number): Float32Array => {
    const buf = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      buf[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }
    return buf;
  };

  describe('mpmPitchDetection（市販チューナー級精度）', () => {
    const sampleRate = 44100;
    const length = 8192;

    it('A4=440Hzを±1セント以内で検出する', () => {
      const buf = makeSine(440, sampleRate, length);
      const detected = mpmPitchDetection(buf, sampleRate);
      expect(detected).toBeGreaterThan(0);
      const cents = 1200 * Math.log2(detected / 440);
      expect(Math.abs(cents)).toBeLessThan(1);
    });

    it('A4=442Hzを±1セント以内で検出する', () => {
      const buf = makeSine(442, sampleRate, length);
      const detected = mpmPitchDetection(buf, sampleRate);
      expect(detected).toBeGreaterThan(0);
      const cents = 1200 * Math.log2(detected / 442);
      expect(Math.abs(cents)).toBeLessThan(1);
    });

    it('E2=82.41Hz（ギター6弦）を±2セント以内で検出する', () => {
      const buf = makeSine(82.41, sampleRate, 16384);
      const detected = mpmPitchDetection(buf, sampleRate);
      expect(detected).toBeGreaterThan(0);
      const cents = 1200 * Math.log2(detected / 82.41);
      expect(Math.abs(cents)).toBeLessThan(2);
    });

    it('無音は-1を返す', () => {
      const buf = new Float32Array(4096);
      expect(mpmPitchDetection(buf, sampleRate)).toBe(-1);
    });
  });

  describe('combineAlgorithms', () => {
    it('A4=440Hzを±1セント以内で検出する', () => {
      const sampleRate = 44100;
      const buf = makeSine(440, sampleRate, 8192);
      const detected = combineAlgorithms(buf, sampleRate);
      expect(detected).toBeGreaterThan(0);
      const cents = 1200 * Math.log2(detected / 440);
      expect(Math.abs(cents)).toBeLessThan(1);
    });

    it('低音E2でも長窓なら±2セント以内（ネイティブ高精度窓）', () => {
      const sampleRate = 44100;
      const buf = makeSine(82.41, sampleRate, 16384);
      const detected = combineAlgorithms(buf, sampleRate);
      expect(detected).toBeGreaterThan(0);
      const cents = 1200 * Math.log2(detected / 82.41);
      expect(Math.abs(cents)).toBeLessThan(2);
    });

    it('ノイズの長窓でも100ms以内に戻る', () => {
      const sampleRate = 44100;
      const buf = new Float32Array(16384);
      for (let i = 0; i < buf.length; i++) {
        buf[i] = (Math.random() - 0.5) * 0.2;
      }
      const started = performance.now();
      combineAlgorithms(buf, sampleRate);
      expect(performance.now() - started).toBeLessThan(100);
    });
  });

  describe('stabilizeDetectedFrequency / applyCentsDeadZone', () => {
    it('連続した近い周波数を平滑化する', () => {
      let state = createFrequencyStabilizerState();
      const inputs = [440, 440.2, 439.8, 440.1, 440.05];
      let last = 0;
      for (const f of inputs) {
        const result = stabilizeDetectedFrequency(state, f);
        expect(result.accepted).toBe(true);
        if (result.accepted) {
          state = result.state;
          last = result.frequency;
        }
      }
      expect(Math.abs(last - 440)).toBeLessThan(1);
    });

    it('デッドゾーン内のセントは0', () => {
      expect(applyCentsDeadZone(0.2)).toBe(0);
      expect(applyCentsDeadZone(0.5)).not.toBe(0);
    });
  });
});
