import {
  hpsPitchDetection,
  combineAlgorithmsPro,
  stabilizeProFrequency,
  applyProCentsDeadZone,
  createProFrequencyStabilizerState,
  estimatePhaseAtFrequency,
  createPhaseStrobeState,
  updatePhaseStrobe,
} from '@/lib/tunerProMode';

const makeSine = (freq: number, sampleRate: number, length: number): Float32Array => {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return buf;
};

describe('tunerProMode', () => {
  const sampleRate = 44100;

  describe('hpsPitchDetection', () => {
    it('倍音を含む信号の基音を検出する', () => {
      const length = 32768;
      const buf = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        buf[i] =
          0.5 * Math.sin(2 * Math.PI * 440 * t) +
          0.25 * Math.sin(2 * Math.PI * 880 * t) +
          0.125 * Math.sin(2 * Math.PI * 1320 * t);
      }
      const detected = hpsPitchDetection(buf, sampleRate);
      expect(detected).toBeGreaterThan(0);
      const cents = 1200 * Math.log2(detected / 440);
      expect(Math.abs(cents)).toBeLessThan(5);
    });
  });

  describe('combineAlgorithmsPro', () => {
    it('A4=442Hzを±1セント以内で検出する', () => {
      const buf = makeSine(442, sampleRate, 32768);
      const detected = combineAlgorithmsPro(buf, sampleRate);
      expect(detected).toBeGreaterThan(0);
      const cents = 1200 * Math.log2(detected / 442);
      expect(Math.abs(cents)).toBeLessThan(1);
    });
  });

  describe('stabilizeProFrequency', () => {
    it('連続フレームで長期中央値を返す', () => {
      let state = createProFrequencyStabilizerState();
      const targets = [440, 440.1, 439.9, 440.05, 439.95, 440, 440.02, 439.98];
      let lastFrequency = 0;
      for (const f of targets) {
        const result = stabilizeProFrequency(state, f);
        expect(result.accepted).toBe(true);
        if (result.accepted) {
          state = result.state;
          lastFrequency = result.frequency;
        }
      }
      expect(lastFrequency).toBeGreaterThan(439.5);
      expect(lastFrequency).toBeLessThan(440.5);
    });
  });

  describe('applyProCentsDeadZone', () => {
    it('±0.05セント以内は0になる', () => {
      expect(applyProCentsDeadZone(0.04)).toBe(0);
      expect(applyProCentsDeadZone(-0.04)).toBe(0);
      expect(applyProCentsDeadZone(0.2)).toBe(0.2);
    });
  });

  describe('updatePhaseStrobe', () => {
    it('合音時はストロボが停止する', () => {
      const state = createPhaseStrobeState(440);
      const update = updatePhaseStrobe(state, 440, 0, 440, 1000, 0.05);
      expect(update.inTune).toBe(true);
      expect(update.scrollSpeed).toBe(0);
    });

    it('位相推定が有限値を返す', () => {
      const buf = makeSine(440, sampleRate, 4096);
      const phase = estimatePhaseAtFrequency(buf, sampleRate, 440);
      expect(Number.isFinite(phase)).toBe(true);
    });
  });
});
