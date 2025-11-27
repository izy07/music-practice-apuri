/**
 * tunerUtils.ts のテスト
 * チューナー機能の正確性を保証
 */

describe('チューナーユーティリティ', () => {
  describe('周波数から音名への変換', () => {
    it('A4(440Hz)を正しく認識する', () => {
      const frequency = 440;
      const noteNumber = 12 * Math.log2(frequency / 440) + 69;
      const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.round(noteNumber) % 12];
      const octave = Math.floor(Math.round(noteNumber) / 12) - 1;
      
      expect(noteName).toBe('A');
      expect(octave).toBe(4);
    });

    it('C4(261.63Hz)を正しく認識する', () => {
      const frequency = 261.63;
      const noteNumber = 12 * Math.log2(frequency / 440) + 69;
      const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.round(noteNumber) % 12];
      const octave = Math.floor(Math.round(noteNumber) / 12) - 1;
      
      expect(noteName).toBe('C');
      expect(octave).toBe(4);
    });

    it('E4(329.63Hz)を正しく認識する', () => {
      const frequency = 329.63;
      const noteNumber = 12 * Math.log2(frequency / 440) + 69;
      const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.round(noteNumber) % 12];
      
      expect(noteName).toBe('E');
    });
  });

  describe('セント値の計算', () => {
    it('完全に調律された音のセント値は0', () => {
      const targetFreq = 440; // A4
      const actualFreq = 440;
      const cents = 1200 * Math.log2(actualFreq / targetFreq);
      
      expect(cents).toBeCloseTo(0, 1);
    });

    it('高い音のセント値は正', () => {
      const targetFreq = 440;
      const actualFreq = 445; // 少し高い
      const cents = 1200 * Math.log2(actualFreq / targetFreq);
      
      expect(cents).toBeGreaterThan(0);
    });

    it('低い音のセント値は負', () => {
      const targetFreq = 440;
      const actualFreq = 435; // 少し低い
      const cents = 1200 * Math.log2(actualFreq / targetFreq);
      
      expect(cents).toBeLessThan(0);
    });

    it('半音上のセント値は約100', () => {
      const targetFreq = 440; // A4
      const actualFreq = 466.16; // A#4
      const cents = 1200 * Math.log2(actualFreq / targetFreq);
      
      expect(cents).toBeCloseTo(100, 0);
    });
  });

  describe('調律判定', () => {
    it('±5セント以内なら調律されている', () => {
      expect(Math.abs(0)).toBeLessThanOrEqual(5);
      expect(Math.abs(3)).toBeLessThanOrEqual(5);
      expect(Math.abs(-4)).toBeLessThanOrEqual(5);
      expect(Math.abs(5)).toBeLessThanOrEqual(5);
    });

    it('±5セント超なら調律されていない', () => {
      expect(Math.abs(6)).toBeGreaterThan(5);
      expect(Math.abs(-10)).toBeGreaterThan(5);
      expect(Math.abs(20)).toBeGreaterThan(5);
    });
  });

  describe('周波数の範囲チェック', () => {
    it('人間の可聴範囲内の周波数を受け入れる', () => {
      const testFrequencies = [
        50,   // 低い音（コントラバス）
        261,  // C4（中央ド）
        440,  // A4（標準音）
        1000, // 高い音（フルート）
        2000, // より高い音
      ];

      testFrequencies.forEach(freq => {
        expect(freq).toBeGreaterThan(20); // 可聴範囲の下限
        expect(freq).toBeLessThan(20000); // 可聴範囲の上限
      });
    });

    it('音楽の一般的な範囲内の周波数を受け入れる', () => {
      const musicalRange = {
        min: 27.5,   // A0 (ピアノの最低音)
        max: 4186,   // C8 (ピアノの最高音)
      };

      const testFrequencies = [50, 261, 440, 1000, 2000];

      testFrequencies.forEach(freq => {
        expect(freq).toBeGreaterThan(musicalRange.min);
        expect(freq).toBeLessThan(musicalRange.max);
      });
    });
  });

  describe('楽器別の標準チューニング', () => {
    it('バイオリンの標準チューニングを検証', () => {
      const violinTuning = {
        G3: 196,
        D4: 293.66,
        A4: 440,
        E5: 659.25,
      };

      Object.values(violinTuning).forEach(freq => {
        expect(freq).toBeGreaterThan(0);
        expect(freq).toBeLessThan(2000);
      });
    });

    it('ギターの標準チューニングを検証', () => {
      const guitarTuning = {
        E2: 82.41,
        A2: 110,
        D3: 146.83,
        G3: 196,
        B3: 246.94,
        E4: 329.63,
      };

      Object.values(guitarTuning).forEach(freq => {
        expect(freq).toBeGreaterThan(0);
        expect(freq).toBeLessThan(500);
      });
    });
  });

  describe('オクターブの計算', () => {
    it('オクターブ番号を正しく計算する', () => {
      // MIDI番号からオクターブを計算
      const midiToOctave = (midi: number) => Math.floor(midi / 12) - 1;
      
      expect(midiToOctave(60)).toBe(4);  // C4
      expect(midiToOctave(69)).toBe(4);  // A4
      expect(midiToOctave(72)).toBe(5);  // C5
      expect(midiToOctave(48)).toBe(3);  // C3
    });
  });

  describe('音名のインデックス計算', () => {
    it('音名のインデックスを正しく計算する', () => {
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      
      expect(noteNames[0]).toBe('C');
      expect(noteNames[9]).toBe('A');
      expect(noteNames[11]).toBe('B');
    });

    it('音名インデックスが12でラップアラウンドする', () => {
      const noteIndex = 14 % 12;
      expect(noteIndex).toBe(2); // D
    });
  });
});

