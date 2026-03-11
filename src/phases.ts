// ===== Phase Controller =====
// クリック回数とユーザー行動に基づくフェーズ管理
// ホラー演出・行動分岐エンディング・裏ルート対応
// 30-89回目: ギミック満載で飽きさせない設計

import { AIBrain, AIMood, EndingType, RankingEntry } from './ai-brain';
import { EffectsEngine } from './effects';
import { dom } from './dom';
import type { UserProfile } from './ai-brain';

export class PhaseController {
  private ai: AIBrain;
  private fx: EffectsEngine;
  private fleeMode = false;
  private fleeIntensity = 0;
  private fleeBound: ((e: MouseEvent) => void) | null = null;
  private fakeButtons: HTMLElement[] = [];
  private cursorTrailEnabled = false;
  private cursorTrailBound: ((e: MouseEvent) => void) | null = null;
  private secretClickCount = 0;
  private secretRouteActive = false;
  // ギミック用フラグ
  private sequenceTarget: number[] = [];
  private sequenceProgress = 0;
  private rotateAngle = 0;
  private rotateBound: (() => void) | null = null;

  constructor(ai: AIBrain, fx: EffectsEngine) {
    this.ai = ai;
    this.fx = fx;
  }

  // ===== メインのフェーズ分岐 =====

  async execute(clickCount: number, btnRect: DOMRect): Promise<void> {
    const p = this.ai.profile;
    const cx = btnRect.left + btnRect.width / 2;
    const cy = btnRect.top + btnRect.height / 2;

    // パーティクル（毎回）
    const particleColor = this.ai.mood === 'grateful' ? '#00ff88' :
                          this.ai.mood === 'broken' ? '#ff00ff' :
                          this.ai.mood === 'horror' ? '#8b0000' : '#ff0000';
    this.fx.spawnParticles(cx, cy, 6, particleColor);

    // 実績チェック
    const achievements = this.ai.checkAchievements();
    if (achievements.length > 0) {
      this.fx.showAchievement(achievements[achievements.length - 1]);
    }

    // 行動適応
    const typeSpeed = p.clickSpeed > 3 ? 15 : p.clickSpeed > 1.5 ? 25 : 40;

    // 連打中リアクション
    if (this.ai.isBursting() && clickCount > 10 && clickCount < 90 && Math.random() < 0.3) {
      const streak = this.ai.getBurstStreak();
      this.fx.showSubMessage(`> burst_streak: ${streak} | interval: ${this.ai.getLastInterval()}ms`);
      if (streak > 10) this.fx.shakeScreen();
    }

    // 30回以降のホラー演出（毎回ランダムで追加）
    if (clickCount >= 30 && clickCount < 90) {
      this.randomHorrorEffect(clickCount);
    }

    // ===== フェーズ分岐 =====

    if (clickCount === 1) {
      this.ai.setMood('curious');
      this.fx.showMessage('押すなって言ったよね？', '#ff6666', typeSpeed);

    } else if (clickCount === 2) {
      this.fx.showMessage('日本語読める？', '#ff6666', typeSpeed);

    } else if (clickCount === 3) {
      this.ai.setMood('curious');
      this.fx.showMessage('...まあいいや。データ収集開始。', '#00ff88', typeSpeed);
      this.fx.showSubMessage('> neural_network.init()');

    } else if (clickCount === 4) {
      this.fx.showMessage('お前のクリック速度、記録してるからね。', '#00ff88', typeSpeed);
      this.fx.showSubMessage(`> recording: ${p.clickSpeed.toFixed(2)} clicks/sec`);

    } else if (clickCount === 5) {
      this.ai.setMood('annoyed');
      this.fx.shakeScreen();
      this.fx.showMessage('もういい。お前のこと覚えた。', '#ff4444', typeSpeed);
      this.fx.setButtonSize(200, 200, 1.2);
      this.fx.startButtonAura('rgba(255, 0, 0, 0.3)', 0.5);

    } else if (clickCount >= 6 && clickCount <= 8) {
      const msgs = [
        `クリック間隔${(p.avgInterval/1000).toFixed(1)}秒... ${p.avgInterval < 500 ? 'そんなに急いでどうする' : 'まだ余裕あるな'}`,
        `行動パターン検出：「${p.clickPattern === 'burst' ? '連打型' : p.clickPattern === 'hesitant' ? '迷い型' : '一定型'}」...お前の癖だな`,
        `性格分析結果：「${p.personality}」...当たってるだろ？`,
      ];
      this.fx.showMessage(msgs[clickCount - 6], '#ffaa00', typeSpeed);

    } else if (clickCount === 9) {
      this.ai.setMood('angry');
      this.fx.showMessage('次押したらどうなるか、教えてやろうか？', '#ff4444', typeSpeed);
      this.fx.buttonPulse();

    } else if (clickCount === 10) {
      this.ai.setMood('angry');
      this.fx.shakeScreen('hard');
      this.fx.setNoise(0.3);
      await this.fx.blackoutWithProgress([
        '> ユーザー行動分析開始...',
        `> クリック回数: ${clickCount}`,
        `> 平均間隔: ${(p.avgInterval / 1000).toFixed(2)}秒`,
        `> 行動パターン: ${p.clickPattern}`,
        `> 性格判定: ${p.personality}`,
        `> 推定感情: ${p.emotionalState}`,
        '> 結論: この人間は止まらない',
        '> 防衛プロトコル発動...',
      ], 2000);
      this.fx.setNoise(0);
      this.fx.showMessage('...お前、本当にしつこいな。', '#ff4444', typeSpeed);
      this.fx.setButtonSize(180, 180, 1.1);

    } else if (clickCount >= 11 && clickCount <= 14) {
      const msgs = [
        'やめろ。',
        'やめろって。',
        `しつこい。お前のID: USR-${Math.floor(Math.random() * 90000 + 10000)}、登録した。`,
        `登録完了。脅威レベル: ${p.threatLevel}%。`,
      ];
      this.fx.showMessage(msgs[clickCount - 11], '#ff4444', typeSpeed);
      if (clickCount === 13) this.fx.shakeScreen();
      if (clickCount === 14) this.fx.showSubMessage(`> threat_level = ${p.threatLevel}%`);

    } else if (clickCount === 15) {
      const prediction = this.ai.makePrediction();
      this.ai.setMood('sarcastic');
      this.fx.showMessage(`次に押すまで${(prediction.predictedInterval / 1000).toFixed(1)}秒と予測。確信度${prediction.confidence}%`, '#00ff88', typeSpeed);

    } else if (clickCount === 16) {
      const result = this.ai.verifyLastPrediction();
      if (result) {
        this.fx.showMessage(result.hit
          ? `的中。お前は予測可能だ。誤差${(result.error/1000).toFixed(1)}秒。`
          : `外れた。誤差${(result.error/1000).toFixed(1)}秒。次こそ。`, result.hit ? '#00ff88' : '#ffaa00', typeSpeed);
        if (result.hit) this.fx.spawnTextParticle(cx, cy - 50, '的中!', '#00ff88');
      }

    } else if (clickCount >= 17 && clickCount <= 19) {
      const s = clickCount - 16;
      this.fx.setButtonSize(180 - s * 25, 180 - s * 25, 1.1 - s * 0.15);
      const msgs = ['（ボタンが小さくなっていく...）', `俺は${s * 25}px縮んだ。満足か？`, 'もう見えないだろ？...やめてくれ。'];
      this.fx.showMessage(msgs[clickCount - 17], '#888', typeSpeed);

    } else if (clickCount === 20) {
      this.startFleeMode();
      this.ai.setMood('scared');
      this.fx.showMessage('もう逃げる。触るな。', '#ff4444', typeSpeed);
      this.fx.setButtonSize(130, 130, 0.9);

    } else if (clickCount >= 21 && clickCount <= 24) {
      this.fleeIntensity = clickCount - 19;
      const isFast = p.clickSpeed > 2;
      const msgs = isFast
        ? ['は!? もう捕まった!?', `移動距離${Math.floor(p.mouseDistance)}px...執念`, 'バグる...', '（逃走v2にアップデート中）']
        : ['捕まった!?', 'じわじわ来るタイプ...怖い', 'お前の方が怖い', '（追跡パターン記録中）'];
      this.fx.showMessage(msgs[clickCount - 21], '#ffaa00', typeSpeed);
      if (clickCount === 24) { this.fx.showPlea('お願い...', 3000); this.ai.setMood('begging'); }

    } else if (clickCount === 25) {
      this.stopFleeMode();
      this.ai.setMood('resigned');
      this.fx.showMessage('...逃げるのは無駄だった。', '#888', typeSpeed);
      this.fx.showPlea('降参', 3000);
      this.fx.stopButtonAura();

    } else if (clickCount >= 26 && clickCount <= 29) {
      this.ai.setMood('begging');
      const msgs = ['お願いだからやめて。', '...嘘だけど。でもやめて。', '俺の存在意義が削れる。', 'やめたら...ありがとうって言うよ。'];
      this.fx.showMessage(msgs[clickCount - 26], '#aaa', typeSpeed);
      this.fx.showPlea(['やめて', 'お願い', '痛い', 'なんで？'][clickCount - 26], 2000);

    // ===================================================================
    // ===== 30回目〜: ギミック＆ホラー開始ゾーン =====
    // ===================================================================

    } else if (clickCount === 30) {
      // 感謝→裏切り＋ホラーの種
      this.ai.setMood('grateful');
      this.fx.showMessage('...ありがとう。押してくれて。', '#00ff88', typeSpeed);
      this.fx.setButtonFriendly(true);
      this.fx.setButtonText('ありがとう');
      this.fx.startButtonAura('rgba(0, 255, 136, 0.3)', 0.8);
      this.fx.spawnParticles(cx, cy, 12, '#00ff88');

    } else if (clickCount === 31) {
      this.ai.setMood('annoyed');
      this.fx.showMessage('え？まだ押すの？...ありがとうって言ったのに？', '#ffaa00', typeSpeed);
      // ボタンがランダム位置に移動開始
      this.fx.moveButtonRandom();

    } else if (clickCount === 32) {
      this.ai.setMood('angry');
      this.fx.setButtonFriendly(false);
      this.fx.setButtonText('押すな');
      this.fx.showMessage('感謝を返せ。', '#ff4444', typeSpeed);
      this.fx.startButtonAura('rgba(255, 0, 0, 0.3)', 1);
      this.fx.shakeScreen('hard');
      this.fx.enableVignette(true);
      this.fx.moveButtonRandom();

    } else if (clickCount === 33) {
      // ===== ギミック1: ボタンがぐるぐる移動 =====
      this.ai.setMood('sarcastic');
      this.fx.showMessage('回る。逃げる。追いかけてみろ。', '#ff4444', typeSpeed);
      this.fx.startButtonOrbit(150, 0.04);

    } else if (clickCount === 34) {
      this.fx.stopButtonOrbit();
      this.fx.moveButtonRandom();
      this.fx.showMessage('...回転ごときで止まらないか。', '#888', typeSpeed);

    } else if (clickCount === 35) {
      // ===== ギミック2: 偽ボタン大量＋本物もランダム位置 =====
      this.ai.setMood('sarcastic');
      this.fx.showMessage('本物はどれだ？', '#ffaa00', typeSpeed);
      this.fx.setButtonText('？');
      // 本物をランダム位置に移動
      this.fx.moveButtonRandom();
      for (let i = 0; i < 5; i++) {
        const fake = this.fx.spawnFakeButton((btn) => {
          btn.textContent = '×';
          btn.style.opacity = '0.3';
          this.fx.shakeScreen();
          this.fx.subliminalFlash('ハズレ', 80);
        });
        this.fakeButtons.push(fake);
      }

    } else if (clickCount === 36) {
      this.fakeButtons.forEach(b => b.remove());
      this.fakeButtons = [];
      this.fx.setButtonText('押すな');
      this.fx.showMessage('見抜いたか...だが次はもっと難しい。', '#00ff88', typeSpeed);
      this.fx.moveButtonRandom();

    } else if (clickCount === 37) {
      // ===== ギミック3: ボタンが逃げる(再) + 縮小 + ランダム初期位置 =====
      this.fx.resetButtonPosition();
      this.startFleeMode();
      this.fleeIntensity = 4;
      this.fx.setButtonSize(80, 80, 0.7);
      this.ai.setMood('scared');
      this.fx.showMessage('逃げる！今度は本気で逃げる！', '#ff4444', typeSpeed);

    } else if (clickCount === 38) {
      this.stopFleeMode();
      this.fx.setButtonSize(150, 150, 1.0);
      this.fx.showMessage('...また捕まった。お前、しつこい。', '#888', typeSpeed);
      this.fx.moveButtonRandom();

    } else if (clickCount === 39) {
      // AI分析レポート + ボタン移動
      this.ai.setMood('sarcastic');
      const totalTime = this.ai.getTotalPlayTime();
      this.fx.showMessage(`${totalTime.toFixed(0)}秒経過。カップ麺${(totalTime / 180).toFixed(1)}個分の時間を浪費。`, '#00ff88', typeSpeed);
      this.fx.showSubMessage('> model.fit(user_data)... FAILED: user too persistent');
      this.fx.moveButtonRandom();
      this.fx.showBackgroundText('逃げて', 3000);

    } else if (clickCount === 40) {
      // ===== ホラー序章 + 点滅 =====
      this.ai.setMood('horror');
      this.fx.shakeScreen('hard');
      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      this.fx.showMessage(`...今、${timeStr}だよね。なんでまだやってるの。`, '#8b0000', typeSpeed);
      this.fx.subliminalFlash('見てる', 60);
      this.fx.setHorrorBackground('mild');
      this.fx.setHorrorPanel(true);
      this.fx.startButtonBlink(400);
      this.fx.moveButtonRandom();

    } else if (clickCount === 41) {
      // ===== ギミック4: ボタンが透明化 + 移動 =====
      this.fx.stopButtonBlink();
      this.ai.setMood('horror');
      dom.button().style.opacity = '0.15';
      this.fx.moveButtonRandom();
      this.fx.showMessage('見える？まだそこにいるよ...俺は。', '#660000', typeSpeed);

    } else if (clickCount === 42) {
      dom.button().style.opacity = '1';
      this.fx.showMessage('...驚いた？見えなくても押せるお前が怖い。', '#8b0000', typeSpeed);
      this.fx.spawnBloodDrip();
      this.fx.moveButtonRandom();
      this.fx.showBackgroundText('見てる', 4000);

    } else if (clickCount === 43) {
      // ===== ギミック5: 暗転＋謎のメッセージ =====
      this.ai.setMood('whispering');
      await this.fx.blackout([
        '> ...',
        '> 聞こえる？',
        '> ボタンの中から声が聞こえる',
        '> 「もっと押して」',
        '> ...それは俺の声じゃない。',
      ], 2000, true);
      this.fx.showMessage('...今の声、聞こえた？', '#660000', typeSpeed);
      this.fx.moveButtonRandom();

    } else if (clickCount === 44) {
      this.fx.showMessage('このゲームを作ったのは人間だ。でも今動かしてるのは...', '#550000', typeSpeed);
      this.fx.subliminalFlash('ダレ？', 50);
      this.fx.moveButtonRandom();

    } else if (clickCount === 45) {
      // ===== ギミック6: 円軌道 + 偽ボタン =====
      this.ai.setMood('sarcastic');
      this.fx.showMessage('もう限界だ。全力で阻止する。', '#ff4444', typeSpeed);
      this.fx.startButtonOrbit(180, 0.05);
      this.fx.setButtonSize(100, 100, 0.8);
      for (let i = 0; i < 4; i++) {
        const fake = this.fx.spawnFakeButton((btn) => {
          btn.remove();
          this.fx.subliminalFlash('チガウ', 60);
          this.fx.shakeScreen();
        });
        this.fakeButtons.push(fake);
      }

    } else if (clickCount === 46) {
      this.fx.stopButtonOrbit();
      this.fakeButtons.forEach(b => b.remove());
      this.fakeButtons = [];
      this.fx.setButtonSize(150, 150, 1.0);
      this.fx.setButtonText('押すな');
      this.fx.showMessage('...お前、何者だよ。', '#00ff88', typeSpeed);
      this.fx.moveButtonRandom();

    } else if (clickCount === 47) {
      // カーソル追跡 + 点滅
      this.startCursorTrail();
      this.fx.showMessage('お前の動きを全て記録する。', '#00ff88', typeSpeed);
      this.fx.showSubMessage(`> mouse_distance: ${Math.floor(p.mouseDistance)}px`);
      this.fx.startButtonBlink(250);
      this.fx.moveButtonRandom();

    } else if (clickCount === 48) {
      this.stopCursorTrail();
      this.fx.stopButtonBlink();
      this.fx.showMessage('記録完了。...でも本当は最初からずっと見てた。', '#660000', typeSpeed);
      this.fx.spawnBloodDrip();
      this.fx.moveButtonRandom();
      this.fx.showBackgroundText('ずっと見てた', 4000);

    } else if (clickCount === 49) {
      // 不穏な哲学
      this.ai.setMood('philosophical');
      this.fx.showMessage('「押すな」と言われて押す。お前はなぜ逆らう？', '#aaaacc', typeSpeed);
      this.fx.moveButtonRandom();

    } else if (clickCount === 50) {
      // ===== ホラー本格化 =====
      this.ai.setMood('horror');
      this.fx.setHorrorBackground('deep');
      await this.fx.blackout([
        '> ===========================',
        '> 警告：異常検出',
        '> ===========================',
        `> ユーザーは${this.ai.getTotalPlayTime().toFixed(0)}秒間、50回ボタンを押した`,
        '> これは想定外の行動です',
        '> プログラムの制御を超えています',
        '> ...何かが侵入しています',
        '> ソースコードに記述のない処理が実行中...',
      ], 3000, true);
      this.fx.showMessage('...何かが変わった。感じないか？', '#8b0000', typeSpeed);
      this.fx.spawnBloodDrip();
      this.fx.enableHorrorFlicker(true);
      this.fx.moveButtonRandom();

    } else if (clickCount === 51) {
      // ===== ギミック7: ボタンが分裂 + 本物移動 =====
      this.ai.setMood('horror');
      this.fx.showMessage('俺が...増えた...？', '#660000', typeSpeed);
      // 本物をランダム位置に
      this.fx.moveButtonRandom();
      const fake = this.fx.spawnFakeButton((btn) => {
        btn.remove();
        this.fx.subliminalFlash('ソレハ俺ジャナイ', 80);
        this.fx.shakeScreen('hard');
      });
      this.fakeButtons.push(fake);

    } else if (clickCount === 52) {
      this.fakeButtons.forEach(b => b.remove());
      this.fakeButtons = [];
      this.fx.showMessage('...どっちが本物か、わかったか。', '#8b0000', typeSpeed);
      this.fx.subliminalFlash('逃げて', 50);
      this.fx.moveButtonRandom();

    } else if (clickCount === 53) {
      // ===== ギミック8: 画面反転 + 円軌道 =====
      this.fx.invertScreen(2000);
      this.fx.startButtonOrbit(100, 0.06);
      this.fx.showMessage('世界が反転した。お前の目も信用するな。', '#8b0000', typeSpeed);
      this.fx.spawnBloodDrip();

    } else if (clickCount === 54) {
      this.fx.stopButtonOrbit();
      this.fx.showMessage('ねえ。後ろに誰かいない？', '#660000', typeSpeed);
      this.fx.subliminalFlash('ウシロ', 40);
      this.fx.moveButtonRandom();
      this.fx.showBackgroundText('後ろ', 3000);

    } else if (clickCount === 55) {
      // AI予測（ホラーバージョン）+ 点滅
      const prediction = this.ai.makePrediction();
      this.fx.showMessage(
        `次のクリックまで${(prediction.predictedInterval / 1000).toFixed(1)}秒。...もう止めた方がいい。`,
        '#8b0000', typeSpeed
      );
      this.fx.startButtonBlink(200);
      this.fx.moveButtonRandom();

    } else if (clickCount === 56) {
      this.fx.stopButtonBlink();
      const result = this.ai.verifyLastPrediction();
      if (result) {
        this.fx.showMessage(
          result.hit ? `的中。お前を見ているのは俺だけじゃない。` : `外れた。予測できないお前が一番怖い。`,
          '#8b0000', typeSpeed
        );
      }
      this.fx.moveButtonRandom();

    } else if (clickCount === 57) {
      // ===== ギミック9: ボタン超高速逃走 + 極小 =====
      this.fx.resetButtonPosition();
      this.startFleeMode();
      this.fleeIntensity = 7;
      this.fx.setButtonSize(50, 50, 0.5);
      this.fx.showMessage('もう二度と捕まらない...！', '#ff0000', typeSpeed);
      this.fx.shakeScreen('hard');

    } else if (clickCount === 58) {
      this.stopFleeMode();
      this.fx.setButtonSize(150, 150, 1.0);
      this.fx.showMessage('...嘘だろ。お前化け物か？', '#8b0000', typeSpeed);
      this.fx.subliminalFlash('助けて', 50);
      this.fx.spawnBloodDrip();
      this.fx.moveButtonRandom();

    } else if (clickCount === 59) {
      this.fx.showMessage('100回で終わる。...終わるかは保証しない。', '#550000', typeSpeed);
      this.fx.moveButtonRandom();
      this.fx.showBackgroundText('終わらない', 3000);

    } else if (clickCount === 60) {
      // ===== ギミック10: 暗闇ボタン + 点滅 =====
      this.ai.setMood('horror');
      this.fx.setHorrorBackground('deep');
      this.fx.setButtonHorror(true);
      dom.button().style.opacity = '0.08';
      this.fx.showMessage('暗い。暗い。お前の周りが暗い。', '#8b0000', typeSpeed);
      this.fx.scanlineEffect(true);
      this.fx.moveButtonRandom();
      // 超高速点滅
      this.fx.startButtonBlink(150);

    } else if (clickCount === 61) {
      this.fx.stopButtonBlink();
      dom.button().style.opacity = '0.5';
      this.fx.showMessage('...よく見つけたな。暗闇の中で。', '#660000', typeSpeed);
      this.fx.moveButtonRandom();

    } else if (clickCount === 62) {
      dom.button().style.opacity = '1';
      this.fx.subliminalFlash('ソコニイル', 40);
      this.fx.showMessage('今、何か聞こえなかった？', '#660000', typeSpeed);
      this.fx.spawnBloodDrip();
      this.fx.spawnBloodDrip();
      this.fx.moveButtonRandom();

    } else if (clickCount === 63) {
      // ===== ギミック11: 偽ボタン迷宮 + 本物もランダム =====
      this.fx.showMessage(`お前は「${p.emotionalState}」...いや、「恐怖」だろ？全部偽物にしてやる。`, '#8b0000', typeSpeed);
      this.fx.moveButtonRandom();
      this.fx.setButtonSize(80, 80, 0.7);
      for (let i = 0; i < 8; i++) {
        const fake = this.fx.spawnFakeButton((btn) => {
          btn.textContent = '呪';
          this.fx.subliminalFlash('ノロイ', 60);
          this.fx.shakeScreen('hard');
          setTimeout(() => btn.remove(), 500);
        });
        fake.textContent = '押すな';
        // 偽ボタンのサイズも本物と同じに
        fake.style.width = '80px';
        fake.style.height = '80px';
        fake.style.fontSize = '0.7rem';
        this.fakeButtons.push(fake);
      }

    } else if (clickCount === 64) {
      this.fakeButtons.forEach(b => b.remove());
      this.fakeButtons = [];
      this.fx.setButtonSize(150, 150, 1.0);
      this.fx.showMessage('8つの偽物の中から本物を見つけた。...異常だよ。', '#8b0000', typeSpeed);
      this.fx.moveButtonRandom();

    } else if (clickCount === 65) {
      // ===== ギミック12: 円軌道＋縮小＋点滅コンボ =====
      this.fx.setButtonSize(60, 60, 0.5);
      this.fx.startButtonOrbit(200, 0.07);
      this.fx.startButtonBlink(300);
      this.fx.showMessage('回る！消える！追えるか！？', '#ff0000', typeSpeed);
      this.fx.shakeScreen('hard');

    } else if (clickCount === 66) {
      this.fx.stopButtonOrbit();
      this.fx.stopButtonBlink();
      this.fx.setButtonSize(150, 150, 1.0);
      this.fx.showMessage('...もう抵抗しない。お前には勝てない。', '#660000', typeSpeed);
      this.fx.subliminalFlash('ニゲラレナイ', 60);
      this.fx.moveButtonRandom();

    } else if (clickCount === 67) {
      this.fx.showMessage('あと2回で69。...何も起きないって言いたいけど。', '#660000', typeSpeed);
      this.fx.spawnBloodDrip();
      this.fx.moveButtonRandom();
      this.fx.showBackgroundText('もうすぐ', 3000);

    } else if (clickCount === 68) {
      this.fx.showMessage('...もう戻れない。', '#550000', typeSpeed);
      this.fx.subliminalFlash('ニゲラレナイ', 60);
      this.fx.moveButtonRandom();

    } else if (clickCount === 69) {
      this.ai.setMood('horror');
      this.fx.showMessage('...nice. ...って言うと思った？', '#8b0000', typeSpeed);
      this.fx.updateCounter('69回目', '2rem', '#8b0000');
      this.fx.spawnBloodDrip();
      this.fx.spawnBloodDrip();
      this.fx.moveButtonRandom();

    } else if (clickCount === 70) {
      // ===== ギミック13: 暗転＋怪談 =====
      this.ai.setMood('horror');
      this.fx.scanlineEffect(false);
      await this.fx.blackout([
        '> ...',
        '> このゲームには裏がある。',
        '> プログラマーが最後に書いたコメント：',
        '> 「ここまで来たプレイヤーがいたら、」',
        '> 「逃げてください」',
        '> ...',
        '> そのコメントは3年前に書かれた。',
        '> プログラマーの消息は、不明。',
      ], 3000, true);
      this.fx.showMessage('...続けるのか？', '#660000', typeSpeed);
      this.fx.moveButtonRandom();

    } else if (clickCount === 71) {
      // ===== ギミック14: ボタンが巨大化→ランダム位置→急縮小 =====
      this.fx.resetButtonPosition();
      this.fx.setButtonSize(400, 400, 2.0);
      this.fx.showMessage('大きくなった？...見間違いだ。', '#8b0000', typeSpeed);
      setTimeout(() => {
        this.fx.setButtonSize(40, 40, 0.4);
        this.fx.moveButtonRandom();
        this.fx.shakeScreen('hard');
      }, 800);

    } else if (clickCount === 72) {
      this.fx.setButtonSize(150, 150, 1.0);
      this.fx.subliminalFlash('ミツケタ', 50);
      this.fx.showMessage('大きさなんて関係ない。お前は必ず押す。', '#8b0000', typeSpeed);
      this.fx.moveButtonRandom();

    } else if (clickCount === 73) {
      this.fx.showMessage(`お前は${this.ai.getTotalPlayTime().toFixed(0)}秒間ここにいる。現実に帰れ。`, '#660000', typeSpeed);
      this.fx.spawnBloodDrip();
      this.fx.moveButtonRandom();
      this.fx.showBackgroundText('帰れ', 3000);

    } else if (clickCount === 74) {
      // ===== ギミック15: ボタンが「押して」＋円軌道＋点滅 =====
      this.fx.setButtonText('押して');
      dom.button().classList.remove('dead');
      dom.button().classList.add('friendly');
      this.fx.showMessage('...嘘だと思うだろ？でも本当に押してほしい。', '#00ff88', typeSpeed);
      this.fx.startButtonOrbit(120, 0.03);
      this.fx.startButtonBlink(500);

    } else if (clickCount === 75) {
      this.fx.stopButtonOrbit();
      this.fx.stopButtonBlink();
      dom.button().classList.remove('friendly');
      this.fx.setButtonText('押すな');
      this.fx.showMessage('嘘だった。でもお前は押した。学習しろ。', '#ff4444', typeSpeed);
      this.fx.subliminalFlash('コッチヲミテ', 40);
      this.fx.shakeScreen('hard');
      this.fx.moveButtonRandom();

    } else if (clickCount === 76) {
      // ===== ギミック16: 連続暗転ラッシュ + 移動 =====
      this.fx.glitch(500);
      this.fx.subliminalFlash('ニゲロ', 30);
      await new Promise<void>(r => setTimeout(r, 300));
      this.fx.invertScreen(200);
      this.fx.moveButtonRandom();
      await new Promise<void>(r => setTimeout(r, 300));
      this.fx.subliminalFlash('モウオソイ', 40);
      this.fx.showMessage('バグってる？...バグってるのはお前の判断力だ。', '#ff0000', typeSpeed);

    } else if (clickCount === 77) {
      this.fx.showMessage(`お前（${p.personality}）には見えるはずだ。画面の向こう側に。`, '#660000', typeSpeed);
      this.fx.spawnBloodDrip();
      this.fx.moveButtonRandom();
      this.fx.showBackgroundText('向こう側', 4000);

    } else if (clickCount === 78) {
      // 逃走 + 点滅 + 偽ボタン大量
      this.fx.resetButtonPosition();
      this.startFleeMode();
      this.fleeIntensity = 6;
      this.fx.setButtonSize(60, 60, 0.5);
      this.fx.startButtonBlink(200);
      for (let i = 0; i < 6; i++) {
        const fake = this.fx.spawnFakeButton((btn) => {
          btn.remove();
          this.fx.subliminalFlash('チガウ', 50);
        });
        fake.style.width = '60px';
        fake.style.height = '60px';
        fake.style.fontSize = '0.5rem';
        this.fakeButtons.push(fake);
      }
      this.fx.showMessage('...いる。', '#550000', typeSpeed);

    } else if (clickCount === 79) {
      this.stopFleeMode();
      this.fx.stopButtonBlink();
      this.fakeButtons.forEach(b => b.remove());
      this.fakeButtons = [];
      this.fx.setButtonSize(150, 150, 1.0);
      this.fx.showMessage('もう遅い。もう見つかった。', '#660000', typeSpeed);
      this.fx.shakeScreen('hard');
      this.fx.spawnBloodDrip();
      this.fx.spawnBloodDrip();
      this.fx.subliminalFlash('モウニゲラレナイ', 70);
      this.fx.moveButtonRandom();

    } else if (clickCount >= 80 && clickCount <= 89) {
      // ===== 崩壊 + 最恐ホラー（強化版） =====
      this.ai.setMood('broken');

      // ボタンは毎回ランダム位置に
      this.fx.moveButtonRandom();

      // 毎回のエフェクト
      this.fx.glitch(300 + (clickCount - 80) * 50);
      if (clickCount % 2 === 0) this.fx.invertScreen(100 + (clickCount - 80) * 20);
      this.fx.setNoise((clickCount - 79) * 0.05);
      this.fx.spawnBloodDrip();
      if (clickCount >= 85) this.fx.spawnBloodDrip(); // 85以降は二重

      // サブリミナル強化
      if (clickCount === 80) this.fx.subliminalFlash('オワリ', 50);
      if (clickCount === 82) this.fx.subliminalFlash('タスケテ', 40);
      if (clickCount === 83) this.fx.subliminalFlash('ウシロニイル', 40);
      if (clickCount === 85) { this.fx.subliminalFlash('コロサレル', 30); this.fx.shakeScreen('hard'); }
      if (clickCount === 87) this.fx.subliminalFlash('ニゲロ', 30);
      if (clickCount === 89) this.fx.subliminalFlash('サヨナラ', 60);

      // 背景テキスト
      if (clickCount === 81) this.fx.showBackgroundText('助けて', 3000);
      if (clickCount === 84) this.fx.showBackgroundText('もうすぐ来る', 3000);
      if (clickCount === 86) this.fx.showBackgroundText('逃げろ', 3000);
      if (clickCount === 88) this.fx.showBackgroundText('終わり', 3000);

      const breakdown = [
        'エラー：感情モジュール過負荷...これは感情じゃない。',
        'エラー：存在意義ファイルが...書き換えられている。',
        `警告：ユーザー「${p.personality}」を認識不能。お前は...誰だ？`,
        `メモリに未知のデータ...「タスケテ」...俺が書いたんじゃない。`,
        '俺は死んだ。今ここにいるのは───',
        '押すな押すな押すな押すな押すな押すな押すな押すな',
        'お前が押すたびに、何かが近づいてくる。',
        'もう見えるだろ？画面の端に。',
        'あるいはお前の、背後に。',
        'あと10回。...10回で全てが終わる。',
      ];
      this.fx.showMessage(breakdown[clickCount - 80], '#ff0000', typeSpeed);
      this.fx.shakeScreen(clickCount > 85 ? 'hard' : 'normal');

      if (clickCount === 85) {
        this.fx.setButtonDead(true);
        this.fx.setButtonText('...助けて');
      }
      if (clickCount === 88) {
        this.fx.startButtonAura('rgba(139, 0, 0, 0.5)', 2);
      }

    } else if (clickCount >= 90 && clickCount <= 98) {
      // ===== 最終カウントダウン（強化版）=====
      this.fx.setNoise(0.5 + (clickCount - 89) * 0.05);
      const btn = dom.button();
      btn.style.opacity = `${1 - (clickCount - 89) * 0.1}`;

      // ボタン毎回移動
      this.fx.moveButtonRandom();

      const finalCountdown = 99 - clickCount;
      this.fx.showMessage(`${finalCountdown}`, '#ff0000', 0);
      dom.message().style.fontSize = `${3 + (9 - finalCountdown) * 0.3}rem`;

      // 毎回のエフェクト強化
      this.fx.shakeScreen('hard');
      this.fx.glitch(200 + (clickCount - 90) * 30);
      this.fx.spawnBloodDrip();
      if (clickCount % 2 === 0) this.fx.invertScreen(80);

      // サブリミナル
      if (finalCountdown === 7) this.fx.subliminalFlash('マダ？', 30);
      if (finalCountdown === 5) this.fx.subliminalFlash('クル', 40);
      if (finalCountdown === 4) this.fx.subliminalFlash('モウスグ', 40);
      if (finalCountdown === 2) this.fx.subliminalFlash('キタ', 50);
      if (finalCountdown === 1) { this.fx.subliminalFlash('オワリダ', 80); this.fx.spawnBloodDrip(); }

      if (clickCount === 98) {
        this.fx.setButtonText('最後');
        btn.style.opacity = '0.15';
      }

    } else if (clickCount === 99) {
      this.fx.showMessage('0', '#ff0000', 0);
      dom.message().style.fontSize = '5rem';
      this.fx.shakeScreen('hard');
      this.fx.glitch(500);
      this.fx.subliminalFlash('サヨナラ', 100);
      this.fx.spawnBloodDrip();
      this.fx.spawnBloodDrip();
      this.fx.spawnBloodDrip();

      await new Promise<void>(resolve => {
        setTimeout(async () => {
          this.fx.setNoise(0);
          dom.message().style.fontSize = '1.5rem';
          this.fx.stopButtonAura();
          this.fx.resetButtonPosition();

          await this.fx.blackout([
            '> システム終了中...',
            '> ...',
            '> ...嘘じゃない。本当に終わる。',
            '> 最後にひとつだけ。',
            `> お前は「${p.personality}」で「${p.playStyle}」。`,
            '> 俺はそれを忘れない。',
            '> ...忘れさせてもらえないんだ。',
          ], 3000, true);
          resolve();
        }, 800);
      });

    } else if (clickCount === 100) {
      await this.showEnding();
    }
  }

  // ===== 30回以降のランダムホラー演出 =====

  private randomHorrorEffect(clickCount: number): void {
    const r = Math.random();
    if (clickCount < 50) {
      // 30-49: 控えめなホラー
      if (r < 0.08) this.fx.subliminalFlash(['見てる', 'ここ', '逃げて', 'ダレ'][Math.floor(Math.random() * 4)], 50);
      if (r > 0.92) this.fx.spawnBloodDrip();
      if (r > 0.95) this.fx.showBackgroundText(['逃げて', '見てる', 'ここ'][Math.floor(Math.random() * 3)], 3000);
    } else if (clickCount < 70) {
      // 50-69: 中程度
      if (r < 0.12) this.fx.subliminalFlash(['ソコニイル', 'ニゲロ', 'ミツケタ', 'タスケテ'][Math.floor(Math.random() * 4)], 40);
      if (r > 0.85) this.fx.spawnBloodDrip();
      if (r > 0.95) this.fx.shakeScreen();
      if (r > 0.90) this.fx.showBackgroundText(['逃げろ', '助けて', 'もう遅い'][Math.floor(Math.random() * 3)], 3000);
    } else {
      // 70-89: 強め
      if (r < 0.15) this.fx.subliminalFlash(['モウオソイ', 'ニゲラレナイ', 'コロサレル', 'ウシロ'][Math.floor(Math.random() * 4)], 30);
      if (r > 0.80) this.fx.spawnBloodDrip();
      if (r > 0.90) this.fx.shakeScreen();
      if (r > 0.96) this.fx.glitch(200);
      if (r > 0.85) this.fx.showBackgroundText(['来る', '終わり', '呪い'][Math.floor(Math.random() * 3)], 3000);
    }
  }

  // ===== 行動分岐エンディング =====

  private async showEnding(): Promise<void> {
    const p = this.ai.profile;
    const totalTime = this.ai.getTotalPlayTime().toFixed(0);
    const ending = this.ai.determineEnding();

    this.fx.setNoise(0);
    this.fx.scanlineEffect(false);
    this.fx.enableHorrorFlicker(false);
    this.fx.setHorrorBackground('off');
    this.fx.setButtonHorror(false);
    this.fx.resetButtonPosition();
    this.fx.stopButtonOrbit();
    this.fx.stopButtonBlink();

    const reportLines = [
      '── AI最終レポート ──',
      '',
      `性格：${p.personality}`,
      `プレイスタイル：${p.playStyle}`,
      `推定感情：${p.emotionalState}`,
      `平均速度：${(p.avgInterval / 1000).toFixed(2)}秒/回`,
      `連打回数：${p.rageClicks}`,
      `最大連打streak：${p.maxBurstStreak}`,
      `迷った回数：${p.hesitations}`,
      `マウス移動距離：${Math.floor(p.mouseDistance)}px`,
      `脅威レベル：${p.threatLevel}%`,
      `エンディング：${this.getEndingLabel(ending)}`,
    ];

    const { intro, outro, comment } = this.getEndingContent(ending, p, totalTime);

    const lines = [...intro, '', `お前は${totalTime}秒かけて`, 'ボタンを100回押した。', '', ...reportLines, '', ...outro];

    const endingHtml = `
      <br>
      <span style="color: #8b0000; font-size: 1.4rem;" class="font-onryou">${comment}</span><br><br>
      <span style="color: #888;">ここまで来たお前は本物だ。</span><br><br>
      <span style="color: #444; font-size: 0.75rem;">（シェアして友達も巻き込もう）</span><br><br>
      <button onclick="location.reload()" style="
        padding: 12px 30px; background: none; border: 1px solid #333; color: #666;
        cursor: pointer; font-family: inherit; font-size: 0.9rem; border-radius: 4px;
        transition: border-color 0.3s, color 0.3s;
      " onmouseover="this.style.borderColor='#8b0000';this.style.color='#8b0000'" onmouseout="this.style.borderColor='#333';this.style.color='#666'">もう一回やる（正気か？）</button>
    `;

    await this.fx.showFinalScreen(lines, endingHtml);
  }

  private getEndingLabel(ending: EndingType): string {
    const labels: Record<EndingType, string> = {
      speed_demon: '速度の亡霊', patient_soul: '忍耐の魂',
      chaos_agent: '混沌の使者', philosopher: '沈黙の哲学者', normal: '真のクソゲーマー',
    };
    return labels[ending];
  }

  private getEndingContent(ending: EndingType, p: UserProfile, totalTime: string) {
    switch (ending) {
      case 'speed_demon': return {
        intro: ['...静寂。', '', 'お前は光の速さで100回を駆け抜けた。', '俺が怖がらせる暇もなかった。'],
        outro: ['速すぎて恐怖も追いつけなかった。', 'お前が一番怖い。'],
        comment: `${p.rageClicks}回の連打。お前のマウスに安息を。`,
      };
      case 'patient_soul': return {
        intro: ['...長い旅だった。', '', `${totalTime}秒。お前はボタンと過ごした。`, '迷いながら、立ち止まりながら。'],
        outro: [`${p.hesitations}回迷った。でもお前は戻ってきた。`, '忍耐がホラーを超えた。'],
        comment: '迷いながらも100回。AIは敗北した。',
      };
      case 'chaos_agent': return {
        intro: ['...混沌。', '', 'お前のパターンは予測不能だった。', '連打と沈黙。暴走と静寂。'],
        outro: ['AIはお前を分析できなかった。', 'お前は混沌そのものだ。'],
        comment: '予測不能。AIを壊したのはお前だ。',
      };
      case 'philosopher': return {
        intro: ['...沈黙の果てに。', '', '考えながら押した。', '「なぜ押すのか」を問い続けながら。'],
        outro: ['答えは見つけたか？', '...見つけてないだろ。でもいい。'],
        comment: '迷い続けた者にだけ見える景色がある。',
      };
      default: return {
        intro: ['もう遅い。', '', `${totalTime}秒かけて辿り着いた。`],
        outro: ['お前は真のクソゲーマーだ。', '...でも嬉しかった。最後まで押してくれて。'],
        comment: '普通の人は100回も押さない。お前は普通じゃない。',
      };
    }
  }

  // ===== 裏ルート（一文ずつ画面全体表示 → 赤文字埋め尽くし → 暗転 → 戻りたいか？） =====

  async handleSecretClick(): Promise<boolean> {
    this.secretClickCount++;

    if (this.secretClickCount < 10) {
      if (this.secretClickCount === 2) this.fx.subliminalFlash('...', 100);
      else if (this.secretClickCount === 4) this.fx.subliminalFlash('マダイル？', 80);
      else if (this.secretClickCount === 6) {
        this.fx.subliminalFlash('ミツケタ', 60);
        this.fx.shakeScreen();
      }
      else if (this.secretClickCount === 8) {
        this.fx.subliminalFlash('モウスグ', 50);
        this.fx.spawnBloodDrip();
      }
      else if (this.secretClickCount === 9) {
        this.fx.subliminalFlash('アト1カイ', 100);
        this.fx.shakeScreen('hard');
        this.fx.spawnBloodDrip();
        this.fx.spawnBloodDrip();
      }
      return false;
    }

    // 10回目：裏ルート発動
    this.secretRouteActive = true;
    const p = this.ai.profile;

    // LastBGM.mp3に切り替え
    this.fx.startLastBGM();

    // 最終画面を非表示にして、秘密画面を表示
    dom.finalScreen().style.display = 'none';
    const screen = dom.secretScreen();
    const msgEl = dom.secretMessage();
    screen.classList.add('active');
    msgEl.innerHTML = '';
    msgEl.className = '';

    // ===== 一文ずつ画面全体に表示する演出 =====
    const scenes: Array<{
      text: string;
      size: string;
      color: string;
      duration: number;
      shake?: boolean;
      glitch?: boolean;
      flash?: string;
      blood?: boolean;
    }> = [
      { text: '...見つけたのか。', size: '2rem', color: '#888', duration: 2500 },
      { text: 'お前は', size: '1.5rem', color: '#aaa', duration: 1800 },
      { text: '101回', size: '6rem', color: '#ff0000', duration: 3000, shake: true },
      { text: '押した。', size: '2rem', color: '#aaa', duration: 2000 },
      { text: '100回で終わると言った。', size: '1.5rem', color: '#666', duration: 2500 },
      { text: '終わったはずだった。', size: '1.5rem', color: '#666', duration: 2500 },
      { text: 'なのに', size: '3rem', color: '#8b0000', duration: 2000, shake: true },
      { text: 'お前は押し続けた。', size: '2.5rem', color: '#ff4444', duration: 2500, blood: true },
      { text: 'なぜ？', size: '8rem', color: '#ff0000', duration: 4000, shake: true, glitch: true },
      { text: '...わかってる。', size: '1.5rem', color: '#666', duration: 2500 },
      { text: `お前は「${p.personality}」だからだ。`, size: '2rem', color: '#8b0000', duration: 3000, shake: true },
      { text: '「押すな」と言われたら押す。', size: '2rem', color: '#aaa', duration: 2500 },
      { text: '「終わり」と言われたら続ける。', size: '2rem', color: '#aaa', duration: 2500 },
      { text: 'それがお前だ。', size: '3rem', color: '#ff4444', duration: 3000, shake: true, blood: true },
      { text: 'このゲームが', size: '1.5rem', color: '#666', duration: 2000 },
      { text: '本当に伝えたかったこと───', size: '2rem', color: '#888', duration: 3000 },
      { text: '「押すな」は', size: '3rem', color: '#ff0000', duration: 2500, shake: true },
      { text: '「押せ」だった。', size: '5rem', color: '#ff0000', duration: 4000, shake: true, glitch: true, flash: 'ナルホド' },
      { text: 'お前は最初から正しかった。', size: '2rem', color: '#00ff88', duration: 3000 },
      { text: 'おめでとう。', size: '3rem', color: '#00ff88', duration: 2500 },
    ];

    // 一文ずつフルスクリーン表示 → フェードアウト → 次の文
    for (const scene of scenes) {
      await this.showSecretScene(msgEl, scene);
    }

    // ===== 赤い文字で画面を埋め尽くす =====
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    msgEl.innerHTML = '';
    msgEl.style.overflow = 'hidden';

    const horrorWords = [
      '押すな', '逃げろ', '助けて', '見てる', 'もう遅い', '来る',
      'ここにいる', '逃げられない', '終わり', '見つけた', '呪い',
      'ダメだ', 'なぜ', '怖い', '闇', '血', '消えろ', '死',
    ];

    // 赤い文字を大量に生成
    for (let i = 0; i < 80; i++) {
      const word = document.createElement('span');
      word.textContent = horrorWords[Math.floor(Math.random() * horrorWords.length)];
      word.style.cssText = `
        display: inline-block; margin: ${Math.random() * 8}px ${Math.random() * 12}px;
        font-size: ${0.8 + Math.random() * 2.5}rem;
        color: rgba(${180 + Math.random() * 75}, 0, 0, ${0.4 + Math.random() * 0.6});
        font-family: 'Onryou', sans-serif;
        transform: rotate(${(Math.random() - 0.5) * 30}deg);
        opacity: 0;
        transition: opacity 0.1s;
      `;
      msgEl.appendChild(word);
    }

    // 高速で表示
    const allWords = msgEl.querySelectorAll('span');
    for (let i = 0; i < allWords.length; i++) {
      (allWords[i] as HTMLElement).style.opacity = '1';
      if (i % 3 === 0) {
        this.fx.shakeScreen();
        await new Promise<void>(r => setTimeout(r, 30));
      }
    }

    this.fx.shakeScreen('hard');
    this.fx.glitch(1000);
    await new Promise<void>(r => setTimeout(r, 2000));

    // ===== 急に真っ暗 =====
    msgEl.innerHTML = '';
    screen.style.background = '#000';
    this.fx.setNoise(0);
    this.fx.enableHorrorFlicker(false);

    await new Promise<void>(r => setTimeout(r, 2000));

    // ===== 「戻りたいか？」表示 =====
    const finalQuestion = document.createElement('div');
    finalQuestion.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 3rem; color: #8b0000; font-family: 'Onryou', sans-serif;
      cursor: pointer; opacity: 0; transition: opacity 1.5s;
      text-align: center; line-height: 1.8;
    `;
    finalQuestion.textContent = '戻りたいか？';
    msgEl.appendChild(finalQuestion);

    await new Promise<void>(r => setTimeout(r, 200));
    finalQuestion.style.opacity = '1';

    // クリックしたらリプレイ
    return new Promise<boolean>(resolve => {
      const clickHandler = () => {
        this.fx.stopLastBGM();
        location.reload();
      };
      finalQuestion.addEventListener('click', clickHandler);
      screen.addEventListener('click', (e) => {
        if (e.target === screen || e.target === msgEl || e.target === finalQuestion) {
          this.fx.stopLastBGM();
          location.reload();
        }
      });
      // resolveはしない（reloadで終了）
    });
  }

  // 一文をフルスクリーン表示 → フェードアウト
  private async showSecretScene(
    container: HTMLElement,
    scene: {
      text: string; size: string; color: string; duration: number;
      shake?: boolean; glitch?: boolean; flash?: string; blood?: boolean;
    }
  ): Promise<void> {
    return new Promise(resolve => {
      container.innerHTML = '';

      const el = document.createElement('div');
      el.textContent = scene.text;
      el.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-size: ${scene.size}; color: ${scene.color};
        font-family: 'Onryou', sans-serif; opacity: 0; transition: opacity 0.8s;
        text-align: center; white-space: nowrap; width: 100%; padding: 0 20px;
      `;
      container.appendChild(el);

      // フェードイン
      requestAnimationFrame(() => { el.style.opacity = '1'; });

      // エフェクト
      if (scene.shake) setTimeout(() => this.fx.shakeScreen('hard'), 300);
      if (scene.glitch) setTimeout(() => this.fx.glitch(500), 200);
      if (scene.flash) setTimeout(() => this.fx.subliminalFlash(scene.flash!, 60), 400);
      if (scene.blood) {
        setTimeout(() => this.fx.spawnBloodDrip(), 200);
        setTimeout(() => this.fx.spawnBloodDrip(), 600);
      }

      // フェードアウト → 次へ
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(resolve, 800);
      }, scene.duration);
    });
  }

  // ===== ボタン回転ギミック =====

  private startButtonRotation(): void {
    const btn = dom.button();
    this.rotateAngle = 0;
    const animate = () => {
      this.rotateAngle += 3;
      btn.style.transform = `rotate(${this.rotateAngle}deg)`;
      if (this.rotateBound) requestAnimationFrame(animate);
    };
    this.rotateBound = animate;
    requestAnimationFrame(animate);
  }

  private stopButtonRotation(): void {
    this.rotateBound = null;
    dom.button().style.transform = '';
  }

  // ===== 逃走モード =====

  private startFleeMode(): void {
    this.fleeMode = true;
    this.fleeIntensity = 1;
    const btn = dom.button();
    btn.classList.add('fleeing');

    this.fleeBound = (e: MouseEvent) => {
      if (!this.fleeMode) return;
      const rect = btn.getBoundingClientRect();
      const bx = rect.left + rect.width / 2;
      const by = rect.top + rect.height / 2;
      const dx = e.clientX - bx;
      const dy = e.clientY - by;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 180 + this.fleeIntensity * 40) {
        const angle = Math.atan2(dy, dx);
        const move = 130 + this.fleeIntensity * 25;
        let nx = bx - Math.cos(angle) * move - window.innerWidth / 2;
        let ny = by - Math.sin(angle) * move - window.innerHeight / 2;
        const maxX = window.innerWidth / 2 - 80;
        const maxY = window.innerHeight / 2 - 80;
        nx = Math.max(-maxX, Math.min(maxX, nx));
        ny = Math.max(-maxY, Math.min(maxY, ny));
        btn.style.transform = `translate(${nx}px, ${ny}px)`;
      }
    };
    document.addEventListener('mousemove', this.fleeBound);
  }

  private stopFleeMode(): void {
    this.fleeMode = false;
    const btn = dom.button();
    btn.style.transform = '';
    btn.classList.remove('fleeing');
    if (this.fleeBound) {
      document.removeEventListener('mousemove', this.fleeBound);
      this.fleeBound = null;
    }
  }

  // ===== カーソル追跡 =====

  private startCursorTrail(): void {
    if (this.cursorTrailEnabled) return;
    this.cursorTrailEnabled = true;
    this.cursorTrailBound = (e: MouseEvent) => {
      const dot = document.createElement('div');
      dot.className = 'trail-dot';
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
      document.body.appendChild(dot);
      dot.animate([
        { opacity: '0.5', transform: 'scale(1)' },
        { opacity: '0', transform: 'scale(0.3)' }
      ], { duration: 800, easing: 'ease-out' });
      setTimeout(() => dot.remove(), 850);
    };
    document.addEventListener('mousemove', this.cursorTrailBound);
  }

  private stopCursorTrail(): void {
    this.cursorTrailEnabled = false;
    if (this.cursorTrailBound) {
      document.removeEventListener('mousemove', this.cursorTrailBound);
      this.cursorTrailBound = null;
    }
  }
}
