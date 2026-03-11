// ===== AI Brain =====
// ユーザー行動を分析し、適応的に応答を生成するエンジン

export type AIMood =
  | 'curious' | 'annoyed' | 'angry' | 'furious'
  | 'scared' | 'resigned' | 'begging' | 'broken'
  | 'grateful' | 'sarcastic' | 'philosophical' | 'glitching'
  | 'horror' | 'whispering';

export type Personality =
  | '分析中...' | '好奇心過剰' | '破壊衝動型' | '慎重型サイコパス'
  | '狂気の連打マン' | '執着型' | '忍耐の鬼' | 'スナイパー'
  | '哲学者タイプ' | '飽き性（嘘）' | '真のクソゲーマー';

export type ClickPattern = 'steady' | 'accelerating' | 'decelerating' | 'burst' | 'hesitant' | 'chaotic';

// エンディング分岐タイプ
export type EndingType = 'speed_demon' | 'patient_soul' | 'chaos_agent' | 'philosopher' | 'normal';

export interface UserProfile {
  personality: Personality;
  clickPattern: ClickPattern;
  avgInterval: number;
  clickSpeed: number;
  totalClicks: number;
  hesitations: number;
  rageClicks: number;
  burstStreaks: number;       // 連続連打回数（0.1秒未満も含む）
  maxBurstStreak: number;     // 最大連続連打記録
  patience: number;
  threatLevel: number;
  predictability: number;
  mouseDistance: number;
  idleTime: number;
  clickPositions: Array<{x: number; y: number}>;
  emotionalState: string;
  playStyle: string;
}

export interface PredictionResult {
  predictedInterval: number;
  confidence: number;
  actualInterval?: number;
}

// ランキング用データ
export interface RankingEntry {
  name: string;
  totalClicks: number;
  totalTime: number;
  personality: string;
  rageClicks: number;
  ending: string;
  date: string;
}

const HORROR_FONTS = [
  'font-comic-light', 'font-round', 'font-onryou',
];

export class AIBrain {
  mood: AIMood = 'curious';
  profile: UserProfile;
  private clickTimes: number[] = [];
  private intervals: number[] = [];
  private predictions: PredictionResult[] = [];
  private mousePositions: Array<{x: number; y: number; t: number}> = [];
  private graphData: number[] = [];
  private moodHistory: AIMood[] = [];
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private onIdleCallback: (() => void) | null = null;
  private currentBurstStreak = 0;

  constructor() {
    this.profile = {
      personality: '分析中...',
      clickPattern: 'steady',
      avgInterval: 0,
      clickSpeed: 0,
      totalClicks: 0,
      hesitations: 0,
      rageClicks: 0,
      burstStreaks: 0,
      maxBurstStreak: 0,
      patience: 100,
      threatLevel: 0,
      predictability: 50,
      mouseDistance: 0,
      idleTime: 0,
      clickPositions: [],
      emotionalState: '不明',
      playStyle: '観察中',
    };
  }

  // ===== クリック記録・分析 =====

  recordClick(x?: number, y?: number): void {
    const now = Date.now();
    this.clickTimes.push(now);
    this.profile.totalClicks++;

    if (x !== undefined && y !== undefined) {
      this.profile.clickPositions.push({ x, y });
    }

    if (this.clickTimes.length > 1) {
      const interval = now - this.clickTimes[this.clickTimes.length - 2];
      this.intervals.push(interval);
      this.graphData.push(interval);
      if (this.graphData.length > 30) this.graphData.shift();

      const recent = this.intervals.slice(-8);
      this.profile.avgInterval = recent.reduce((a, b) => a + b, 0) / recent.length;
      this.profile.clickSpeed = 1000 / this.profile.avgInterval;

      // 連打判定（0.1秒=100ms未満も含む、閾値を500msに拡大）
      if (interval < 500) {
        this.profile.rageClicks++;
        this.currentBurstStreak++;
        if (this.currentBurstStreak > this.profile.maxBurstStreak) {
          this.profile.maxBurstStreak = this.currentBurstStreak;
        }
      } else {
        // 連打ストリーク終了
        if (this.currentBurstStreak >= 3) {
          this.profile.burstStreaks++;
        }
        this.currentBurstStreak = 0;
      }

      if (interval > 2000) this.profile.hesitations++;
    }

    this.updatePersonality();
    this.updateClickPattern();
    this.updateThreatLevel();
    this.updateEmotionalState();
    this.updatePlayStyle();
    this.profile.patience = Math.max(0, 100 - this.profile.totalClicks * 1.5 - this.profile.rageClicks * 2);
    this.resetIdleTimer();
  }

  // ===== 連打中かどうか =====

  isBursting(): boolean {
    return this.currentBurstStreak >= 3;
  }

  getBurstStreak(): number {
    return this.currentBurstStreak;
  }

  getLastInterval(): number {
    return this.intervals.length > 0 ? this.intervals[this.intervals.length - 1] : 9999;
  }

  // ===== 性格判定 =====

  private updatePersonality(): void {
    const { totalClicks, rageClicks, hesitations, clickSpeed } = this.profile;

    if (totalClicks >= 90) {
      this.profile.personality = '真のクソゲーマー';
    } else if (rageClicks > 15) {
      this.profile.personality = '破壊衝動型';
    } else if (hesitations > 8 && rageClicks > 5) {
      this.profile.personality = '慎重型サイコパス';
    } else if (clickSpeed > 4) {
      this.profile.personality = '狂気の連打マン';
    } else if (hesitations > 6) {
      this.profile.personality = '哲学者タイプ';
    } else if (totalClicks > 50) {
      this.profile.personality = '忍耐の鬼';
    } else if (totalClicks > 30) {
      this.profile.personality = '執着型';
    } else if (totalClicks > 10) {
      this.profile.personality = '好奇心過剰';
    } else if (this.profile.clickPositions.length > 5) {
      const positions = this.profile.clickPositions.slice(-5);
      const variance = this.calcPositionVariance(positions);
      if (variance < 100) {
        this.profile.personality = 'スナイパー';
      }
    }
  }

  private calcPositionVariance(positions: Array<{x: number; y: number}>): number {
    if (positions.length < 2) return Infinity;
    const avgX = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const avgY = positions.reduce((s, p) => s + p.y, 0) / positions.length;
    return positions.reduce((s, p) => s + (p.x - avgX) ** 2 + (p.y - avgY) ** 2, 0) / positions.length;
  }

  // ===== クリックパターン分析 =====

  private updateClickPattern(): void {
    if (this.intervals.length < 5) {
      this.profile.clickPattern = 'steady';
      return;
    }
    const recent = this.intervals.slice(-8);
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const variance = recent.reduce((s, v) => s + (v - this.profile.avgInterval) ** 2, 0) / recent.length;
    const cv = Math.sqrt(variance) / this.profile.avgInterval;

    if (cv > 0.8) this.profile.clickPattern = 'chaotic';
    else if (recent.filter(i => i < 300).length > recent.length * 0.6) this.profile.clickPattern = 'burst';
    else if (avgSecond < avgFirst * 0.7) this.profile.clickPattern = 'accelerating';
    else if (avgSecond > avgFirst * 1.3) this.profile.clickPattern = 'decelerating';
    else if (this.profile.hesitations > this.profile.totalClicks * 0.2) this.profile.clickPattern = 'hesitant';
    else this.profile.clickPattern = 'steady';
  }

  private updateThreatLevel(): void {
    this.profile.threatLevel = Math.min(100, Math.floor(
      (this.profile.totalClicks * 1.2) + (this.profile.rageClicks * 3) +
      (this.profile.clickSpeed * 2) + (this.profile.burstStreaks * 5) -
      (this.profile.hesitations * 2)
    ));
  }

  private updateEmotionalState(): void {
    const { clickPattern, rageClicks, hesitations, totalClicks } = this.profile;
    if (this.isBursting()) this.profile.emotionalState = '暴走';
    else if (clickPattern === 'burst' || rageClicks > 10) this.profile.emotionalState = '興奮';
    else if (clickPattern === 'hesitant') this.profile.emotionalState = '不安';
    else if (clickPattern === 'decelerating') this.profile.emotionalState = '飽きかけ';
    else if (clickPattern === 'accelerating') this.profile.emotionalState = '夢中';
    else if (totalClicks > 60) this.profile.emotionalState = '意地';
    else if (hesitations > 3) this.profile.emotionalState = '迷い';
    else this.profile.emotionalState = '好奇心';
  }

  private updatePlayStyle(): void {
    const { rageClicks, hesitations, clickPattern } = this.profile;
    if (rageClicks > hesitations * 3) this.profile.playStyle = 'ゴリ押し型';
    else if (hesitations > rageClicks * 2) this.profile.playStyle = '観察型';
    else if (clickPattern === 'chaotic') this.profile.playStyle = '混沌型';
    else this.profile.playStyle = 'バランス型';
  }

  // ===== エンディング分岐判定 =====

  determineEnding(): EndingType {
    const p = this.profile;
    const totalTime = this.getTotalPlayTime();

    // 速度狂エンディング: 平均間隔0.5秒未満 or 連打回数が総クリックの60%以上
    if (p.avgInterval < 500 || p.rageClicks > p.totalClicks * 0.6) return 'speed_demon';
    // 忍耐エンディング: 総時間3分以上 かつ 迷い回数10以上
    if (totalTime > 180 && p.hesitations >= 10) return 'patient_soul';
    // 混沌エンディング: パターンが chaotic or burst で脅威レベル80以上
    if ((p.clickPattern === 'chaotic' || p.burstStreaks >= 5) && p.threatLevel >= 80) return 'chaos_agent';
    // 哲学者エンディング: 迷いが多く、間隔が長め
    if (p.hesitations > p.rageClicks * 2 && p.avgInterval > 1500) return 'philosopher';
    return 'normal';
  }

  // ===== 予測 =====

  makePrediction(): PredictionResult {
    if (this.intervals.length < 3) return { predictedInterval: 1500, confidence: 10 };
    const recent = this.intervals.slice(-5);
    let ws = 0, wt = 0;
    recent.forEach((v, i) => { const w = i + 1; ws += v * w; wt += w; });
    const predicted = ws / wt;
    let confidence = 30;
    if (this.predictions.length > 0) {
      const accurate = this.predictions.filter(p =>
        p.actualInterval !== undefined && Math.abs(p.predictedInterval - p.actualInterval) / p.actualInterval < 0.3
      );
      confidence = Math.min(95, Math.floor((accurate.length / this.predictions.length) * 80 + 20));
    }
    const prediction: PredictionResult = { predictedInterval: predicted, confidence };
    this.predictions.push(prediction);
    this.profile.predictability = confidence;
    return prediction;
  }

  verifyLastPrediction(): { hit: boolean; error: number } | null {
    if (this.predictions.length === 0 || this.intervals.length === 0) return null;
    const last = this.predictions[this.predictions.length - 1];
    const interval = this.intervals[this.intervals.length - 1];
    last.actualInterval = interval;
    const error = Math.abs(last.predictedInterval - interval);
    return { hit: error < interval * 0.3, error };
  }

  // ===== マウス・アイドル =====

  recordMousePosition(x: number, y: number): void {
    const last = this.mousePositions[this.mousePositions.length - 1];
    if (last) this.profile.mouseDistance += Math.sqrt((x - last.x) ** 2 + (y - last.y) ** 2);
    this.mousePositions.push({ x, y, t: Date.now() });
    if (this.mousePositions.length > 100) this.mousePositions.shift();
  }

  onIdle(callback: () => void): void { this.onIdleCallback = callback; }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.onIdleCallback && this.profile.totalClicks > 0) this.onIdleCallback();
    }, 8000);
  }

  // ===== ムード =====

  setMood(mood: AIMood): void { this.mood = mood; this.moodHistory.push(mood); }

  getMoodColor(): string {
    const colors: Record<AIMood, string> = {
      curious: '#00ff88', annoyed: '#ffaa00', angry: '#ff4444', furious: '#ff0000',
      scared: '#ffaa00', resigned: '#888888', begging: '#aaaaaa', broken: '#ff4444',
      grateful: '#00ff88', sarcastic: '#ff69b4', philosophical: '#aaaacc',
      glitching: '#ff0000', horror: '#8b0000', whispering: '#550000',
    };
    return colors[this.mood];
  }

  // ===== ランダムホラーフォント =====

  getRandomHorrorFont(): string {
    return HORROR_FONTS[Math.floor(Math.random() * HORROR_FONTS.length)];
  }

  // ===== パネルデータ =====

  getStatusDisplay(): Array<{ label: string; value: string; type?: 'danger' | 'warn' }> {
    const p = this.profile;
    const rows: Array<{ label: string; value: string; type?: 'danger' | 'warn' }> = [
      { label: '学習回数', value: `${p.totalClicks}` },
      { label: 'クリック速度', value: `${p.clickSpeed.toFixed(1)} c/s`, type: p.clickSpeed > 3 ? 'warn' : undefined },
      { label: '性格判定', value: p.personality },
      { label: 'パターン', value: this.getPatternLabel() },
      { label: '連打streak', value: `${p.maxBurstStreak}`, type: p.maxBurstStreak > 10 ? 'danger' : p.maxBurstStreak > 5 ? 'warn' : undefined },
      { label: '脅威レベル', value: `${p.threatLevel}%`, type: p.threatLevel > 70 ? 'danger' : p.threatLevel > 40 ? 'warn' : undefined },
      { label: 'AI忍耐力', value: `${Math.max(0, p.patience).toFixed(0)}%`, type: p.patience < 20 ? 'danger' : undefined },
      { label: '推定感情', value: p.emotionalState },
    ];
    if (p.totalClicks > 15) rows.push({ label: '予測精度', value: `${p.predictability}%` });
    if (p.totalClicks > 25) rows.push({ label: 'スタイル', value: p.playStyle });
    return rows;
  }

  private getPatternLabel(): string {
    const labels: Record<ClickPattern, string> = {
      steady: '一定', accelerating: '加速中', decelerating: '減速中',
      burst: '連打', hesitant: '躊躇', chaotic: '混沌',
    };
    return labels[this.profile.clickPattern];
  }

  getGraphData(): number[] { return [...this.graphData]; }

  getTotalPlayTime(): number {
    if (this.clickTimes.length < 2) return 0;
    return (this.clickTimes[this.clickTimes.length - 1] - this.clickTimes[0]) / 1000;
  }

  getStartTime(): number { return this.clickTimes[0] || Date.now(); }

  // ===== 実績 =====

  checkAchievements(): string[] {
    const a: string[] = [];
    const p = this.profile;
    if (p.totalClicks === 10) a.push('初心者クリッカー');
    if (p.totalClicks === 50) a.push('中級クリッカー');
    if (p.totalClicks === 100) a.push('マスタークリッカー');
    if (p.rageClicks >= 10 && p.totalClicks <= 20) a.push('せっかちさん');
    if (p.hesitations >= 5 && p.totalClicks <= 15) a.push('慎重派');
    if (p.clickSpeed > 5) a.push('人間やめた速度');
    if (p.totalClicks === 69) a.push('nice');
    if (p.maxBurstStreak >= 20) a.push('マシンガン');
    if (p.burstStreaks >= 5) a.push('連打マスター');
    return a;
  }

  // ===== ランキング =====

  static saveRanking(entry: RankingEntry): void {
    const rankings = AIBrain.loadRankings();
    rankings.push(entry);
    rankings.sort((a, b) => b.totalClicks - a.totalClicks || a.totalTime - b.totalTime);
    if (rankings.length > 20) rankings.length = 20;
    try { localStorage.setItem('kusogame_rankings', JSON.stringify(rankings)); } catch {}
  }

  static loadRankings(): RankingEntry[] {
    try {
      const data = localStorage.getItem('kusogame_rankings');
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  }
}
