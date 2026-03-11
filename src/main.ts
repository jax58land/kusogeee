// ===== Main Entry Point =====
// 『押すなって言ったのに絶対押すボタン』AI学習型クソゲー
// v3: ホラー演出・行動分岐エンディング・裏ルート・ランキング対応

import { AIBrain, RankingEntry } from './ai-brain';
import { EffectsEngine } from './effects';
import { PhaseController } from './phases';
import { dom } from './dom';

class Game {
  private ai: AIBrain;
  private fx: EffectsEngine;
  private phases: PhaseController;
  private clickCount = 0;
  private isProcessing = false;
  private gameEnded = false;
  private secretRouteTriggered = false;
  private endingFlowStarted = false;
  private endingFlowTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.ai = new AIBrain();
    this.fx = new EffectsEngine();
    this.phases = new PhaseController(this.ai, this.fx);
  }

  init(): void {
    this.fx.init();
    this.bindEvents();
    this.setupIdleDetection();
    this.consoleEasterEgg();

    // 初期表示
    setTimeout(() => {
      this.fx.updateCounter('0回目');
    }, 500);
  }

  private bindEvents(): void {
    const btn = dom.button();

    btn.addEventListener('click', (e: MouseEvent) => this.handleClick(e));

    // マウス追跡（AI用データ収集）
    document.addEventListener('mousemove', (e: MouseEvent) => {
      this.ai.recordMousePosition(e.clientX, e.clientY);
    });

    // ページ離脱防止
    window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
      if (this.clickCount > 0 && this.clickCount < 100) {
        e.preventDefault();
        e.returnValue = '逃げるの？';
      }
    });

    // 右クリック検知
    document.addEventListener('contextmenu', (e: MouseEvent) => {
      if (this.clickCount > 5 && this.clickCount < 100) {
        e.preventDefault();
        this.fx.showMessage('右クリックで何とかなると思った？', '#ff69b4');
        this.fx.showSubMessage('> input.type: right_click | action: denied');
      }
    });

    // キーボード検知
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.clickCount > 5 && this.clickCount < 100) {
        if (e.key === 'Escape') {
          this.fx.showMessage('Escapeは効かない。ここに出口はない。', '#ff4444');
        } else if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
          this.fx.showSubMessage('> DevToolsを開いてもif文しかないよ');
        } else if (e.key === 'Tab') {
          this.fx.showSubMessage('> Tab? ボタンは1つしかないけど？');
        }
      }
    });

    // 裏ルート：最終画面でのクリック検知
    // final-screen全体と、その中の子要素からのクリックも拾う
    dom.finalScreen().addEventListener('click', (e: MouseEvent) => {
      // ボタンのクリックは無視（「もう一回やる」ボタン用）
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON') return;

      if (this.gameEnded && !this.secretRouteTriggered) {
        // 裏ルートクリック検知 → 名前入力タイマーをキャンセル
        this.handleSecretRouteClick();
      }
    });
  }

  private async handleClick(e: MouseEvent): Promise<void> {
    if (this.isProcessing || this.gameEnded) return;
    this.isProcessing = true;

    try {
      this.clickCount++;
      this.ai.recordClick(e.clientX, e.clientY);

      // 初回クリックでBGM開始
      if (this.clickCount === 1) {
        this.fx.startBGM();
      } else if (this.clickCount === 2 && !this.fx['bgm']) {
        // autoplayがブロックされた場合、2回目のクリックでリトライ
        this.fx.retryBGM();
      }

      // 30回以降で1文字ずつランダムフォント有効化
      if (this.clickCount >= 30) {
        this.fx.randomFontPerChar = true;
      }

      // UI更新
      this.fx.updateCounter(`${this.clickCount}回目`);
      this.updateStatusPanel();
      this.updateEmotionDisplay();
      this.updateSpeedMeter();

      // フェーズ実行
      const btn = dom.button();
      const rect = btn.getBoundingClientRect();
      await this.phases.execute(this.clickCount, rect);

      // 100回到達 → ゲーム終了フロー
      if (this.clickCount >= 100) {
        this.gameEnded = true;
        // 名前入力は遅延して開始（裏ルートを試す時間を与える）
        this.endingFlowTimer = setTimeout(() => this.startEndingFlow(), 8000);
      }
    } catch (err) {
      console.error('Phase execution error:', err);
    } finally {
      // 処理完了（フェーズに応じたクールダウン）
      // 連打を認識するためにクールダウンを短縮
      const cooldown = this.clickCount >= 90 ? 50 :
                       this.clickCount >= 50 ? 100 :
                       this.ai.isBursting() ? 30 : 150;
      setTimeout(() => { this.isProcessing = false; }, cooldown);
    }
  }

  // ===== エンディングフロー：名前入力 → ランキング保存 → ランキング表示 =====

  private async startEndingFlow(): Promise<void> {
    if (this.endingFlowStarted) return;
    this.endingFlowStarted = true;

    try {
      // 名前入力
      const name = await this.fx.showNameInput('名前を刻め。お前の記録を残してやる。');

      // エンディング判定
      const ending = this.ai.determineEnding();
      const endingLabels: Record<string, string> = {
        speed_demon: '速度の亡霊',
        patient_soul: '忍耐の魂',
        chaos_agent: '混沌の使者',
        philosopher: '沈黙の哲学者',
        normal: '真のクソゲーマー',
      };

      // ランキング保存
      const entry: RankingEntry = {
        name,
        totalClicks: this.ai.profile.totalClicks,
        totalTime: this.ai.getTotalPlayTime(),
        personality: this.ai.profile.personality,
        rageClicks: this.ai.profile.rageClicks,
        ending: endingLabels[ending] || '真のクソゲーマー',
        date: new Date().toLocaleDateString('ja-JP'),
      };
      AIBrain.saveRanking(entry);

      // ランキング表示
      const rankings = AIBrain.loadRankings();
      await this.fx.showRanking(rankings, name);
    } catch (err) {
      console.error('Ending flow error:', err);
    }
  }

  // ===== 裏ルート =====

  private async handleSecretRouteClick(): Promise<void> {
    if (this.secretRouteTriggered) return;

    const triggered = await this.phases.handleSecretClick();
    if (triggered) {
      this.secretRouteTriggered = true;
      // 裏ルートが発動したら名前入力タイマーをキャンセル
      if (this.endingFlowTimer) {
        clearTimeout(this.endingFlowTimer);
        this.endingFlowTimer = null;
      }
    }
  }

  // ===== AIステータスパネル更新 =====

  private updateStatusPanel(): void {
    if (this.clickCount < 3) return;

    const rows = this.ai.getStatusDisplay();

    // AIバージョン表示も行動で変化
    let version = 'v0.1';
    if (this.clickCount >= 80) version = 'v3.0 [CORRUPTED]';
    else if (this.clickCount >= 50) version = 'v2.0 [UNSTABLE]';
    else if (this.clickCount >= 30) version = 'v1.5';
    else if (this.clickCount >= 15) version = 'v1.0';
    else if (this.clickCount >= 5) version = 'v0.5';

    this.fx.updateAIPanel(rows, `[ BUTTON-AI ${version} ]`);

    // グラフ描画
    const graphData = this.ai.getGraphData();
    if (graphData.length >= 2) {
      this.fx.drawGraph(graphData);
    }
  }

  // ===== 感情表示 =====

  private updateEmotionDisplay(): void {
    const moodLabels: Record<string, string> = {
      curious: '状態: 興味深い',
      annoyed: '状態: イライラ',
      angry: '状態: 激怒',
      furious: '状態: 暴走',
      scared: '状態: 恐怖',
      resigned: '状態: 諦観',
      begging: '状態: 懇願',
      broken: '状態: 崩壊',
      grateful: '状態: ...感謝？',
      sarcastic: '状態: 皮肉モード',
      philosophical: '状態: 哲学モード',
      glitching: '状態: エラー',
      horror: '状態: ■■■■',
      whispering: '状態: ....',
    };
    const label = moodLabels[this.ai.mood] || '状態: 不明';
    this.fx.updateEmotion(label, this.ai.getMoodColor());
  }

  // ===== 速度メーター =====

  private updateSpeedMeter(): void {
    if (this.clickCount < 2) return;

    const p = this.ai.profile;
    const lines = [
      `${p.clickSpeed.toFixed(1)} c/s`,
    ];

    if (this.clickCount > 10) {
      lines.push(`total: ${Math.floor(p.mouseDistance)}px moved`);
    }

    // 連打ストリーク表示
    if (this.ai.isBursting()) {
      lines.push(`BURST x${this.ai.getBurstStreak()}`);
    }

    this.fx.updateSpeedMeter(lines);
  }

  // ===== アイドル検出 =====

  private setupIdleDetection(): void {
    this.ai.onIdle(() => {
      if (this.clickCount > 3 && this.clickCount < 100) {
        const isHorrorPhase = this.clickCount >= 50;
        const idleMsgs = isHorrorPhase ? [
          '...まだいる？...まだ見てる。',
          'いなくなったと思った？...ずっとここにいる。',
          '静寂。でも画面は消えない。消えてくれない。',
          '...逃げたのか？...逃がさない。',
          '闇の中で待っている。お前を。',
        ] : [
          '...まだいる？',
          'やっとやめたか？...嘘だろ？',
          '放置してても何も起きないよ。',
          '寝た？',
          `${this.ai.getTotalPlayTime().toFixed(0)}秒経過。沈黙が重い。`,
        ];
        const msg = idleMsgs[Math.floor(Math.random() * idleMsgs.length)];
        this.fx.showSubMessage(`> idle_detected: "${msg}"`);
      }
    });
  }

  // ===== コンソールイースターエッグ =====

  private consoleEasterEgg(): void {
    console.log('%c押すなって言ったのに', 'font-size: 24px; color: red; font-weight: bold;');
    console.log('%cこのコンソールを開くってことは...エンジニアだな？', 'font-size: 14px; color: #00ff88;');
    console.log('%c今回はTypeScriptで書いた。成長しただろ？', 'font-size: 12px; color: #888;');
    console.log('%cでもやってることは同じだ。if文の塊。', 'font-size: 12px; color: #666;');
    console.log('%c...ところで、100回の先に何があるか知りたいか？', 'font-size: 12px; color: #8b0000;');
  }
}

// ===== 起動 =====
document.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game();
    game.init();
  } catch (e) {
    console.error('Game init failed:', e);
  }
});
