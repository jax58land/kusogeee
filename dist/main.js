"use strict";
(() => {
  // src/ai-brain.ts
  var HORROR_FONTS = [
    "font-comic-light",
    "font-round",
    "font-onryou"
  ];
  var AIBrain = class _AIBrain {
    constructor() {
      this.mood = "curious";
      this.clickTimes = [];
      this.intervals = [];
      this.predictions = [];
      this.mousePositions = [];
      this.graphData = [];
      this.moodHistory = [];
      this.idleTimer = null;
      this.onIdleCallback = null;
      this.currentBurstStreak = 0;
      this.profile = {
        personality: "\u5206\u6790\u4E2D...",
        clickPattern: "steady",
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
        emotionalState: "\u4E0D\u660E",
        playStyle: "\u89B3\u5BDF\u4E2D"
      };
    }
    // ===== クリック記録・分析 =====
    recordClick(x, y) {
      const now = Date.now();
      this.clickTimes.push(now);
      this.profile.totalClicks++;
      if (x !== void 0 && y !== void 0) {
        this.profile.clickPositions.push({ x, y });
      }
      if (this.clickTimes.length > 1) {
        const interval = now - this.clickTimes[this.clickTimes.length - 2];
        this.intervals.push(interval);
        this.graphData.push(interval);
        if (this.graphData.length > 30) this.graphData.shift();
        const recent = this.intervals.slice(-8);
        this.profile.avgInterval = recent.reduce((a, b) => a + b, 0) / recent.length;
        this.profile.clickSpeed = 1e3 / this.profile.avgInterval;
        if (interval < 500) {
          this.profile.rageClicks++;
          this.currentBurstStreak++;
          if (this.currentBurstStreak > this.profile.maxBurstStreak) {
            this.profile.maxBurstStreak = this.currentBurstStreak;
          }
        } else {
          if (this.currentBurstStreak >= 3) {
            this.profile.burstStreaks++;
          }
          this.currentBurstStreak = 0;
        }
        if (interval > 2e3) this.profile.hesitations++;
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
    isBursting() {
      return this.currentBurstStreak >= 3;
    }
    getBurstStreak() {
      return this.currentBurstStreak;
    }
    getLastInterval() {
      return this.intervals.length > 0 ? this.intervals[this.intervals.length - 1] : 9999;
    }
    // ===== 性格判定 =====
    updatePersonality() {
      const { totalClicks, rageClicks, hesitations, clickSpeed } = this.profile;
      if (totalClicks >= 90) {
        this.profile.personality = "\u771F\u306E\u30AF\u30BD\u30B2\u30FC\u30DE\u30FC";
      } else if (rageClicks > 15) {
        this.profile.personality = "\u7834\u58CA\u885D\u52D5\u578B";
      } else if (hesitations > 8 && rageClicks > 5) {
        this.profile.personality = "\u614E\u91CD\u578B\u30B5\u30A4\u30B3\u30D1\u30B9";
      } else if (clickSpeed > 4) {
        this.profile.personality = "\u72C2\u6C17\u306E\u9023\u6253\u30DE\u30F3";
      } else if (hesitations > 6) {
        this.profile.personality = "\u54F2\u5B66\u8005\u30BF\u30A4\u30D7";
      } else if (totalClicks > 50) {
        this.profile.personality = "\u5FCD\u8010\u306E\u9B3C";
      } else if (totalClicks > 30) {
        this.profile.personality = "\u57F7\u7740\u578B";
      } else if (totalClicks > 10) {
        this.profile.personality = "\u597D\u5947\u5FC3\u904E\u5270";
      } else if (this.profile.clickPositions.length > 5) {
        const positions = this.profile.clickPositions.slice(-5);
        const variance = this.calcPositionVariance(positions);
        if (variance < 100) {
          this.profile.personality = "\u30B9\u30CA\u30A4\u30D1\u30FC";
        }
      }
    }
    calcPositionVariance(positions) {
      if (positions.length < 2) return Infinity;
      const avgX = positions.reduce((s, p) => s + p.x, 0) / positions.length;
      const avgY = positions.reduce((s, p) => s + p.y, 0) / positions.length;
      return positions.reduce((s, p) => s + (p.x - avgX) ** 2 + (p.y - avgY) ** 2, 0) / positions.length;
    }
    // ===== クリックパターン分析 =====
    updateClickPattern() {
      if (this.intervals.length < 5) {
        this.profile.clickPattern = "steady";
        return;
      }
      const recent = this.intervals.slice(-8);
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const variance = recent.reduce((s, v) => s + (v - this.profile.avgInterval) ** 2, 0) / recent.length;
      const cv = Math.sqrt(variance) / this.profile.avgInterval;
      if (cv > 0.8) this.profile.clickPattern = "chaotic";
      else if (recent.filter((i) => i < 300).length > recent.length * 0.6) this.profile.clickPattern = "burst";
      else if (avgSecond < avgFirst * 0.7) this.profile.clickPattern = "accelerating";
      else if (avgSecond > avgFirst * 1.3) this.profile.clickPattern = "decelerating";
      else if (this.profile.hesitations > this.profile.totalClicks * 0.2) this.profile.clickPattern = "hesitant";
      else this.profile.clickPattern = "steady";
    }
    updateThreatLevel() {
      this.profile.threatLevel = Math.min(100, Math.floor(
        this.profile.totalClicks * 1.2 + this.profile.rageClicks * 3 + this.profile.clickSpeed * 2 + this.profile.burstStreaks * 5 - this.profile.hesitations * 2
      ));
    }
    updateEmotionalState() {
      const { clickPattern, rageClicks, hesitations, totalClicks } = this.profile;
      if (this.isBursting()) this.profile.emotionalState = "\u66B4\u8D70";
      else if (clickPattern === "burst" || rageClicks > 10) this.profile.emotionalState = "\u8208\u596E";
      else if (clickPattern === "hesitant") this.profile.emotionalState = "\u4E0D\u5B89";
      else if (clickPattern === "decelerating") this.profile.emotionalState = "\u98FD\u304D\u304B\u3051";
      else if (clickPattern === "accelerating") this.profile.emotionalState = "\u5922\u4E2D";
      else if (totalClicks > 60) this.profile.emotionalState = "\u610F\u5730";
      else if (hesitations > 3) this.profile.emotionalState = "\u8FF7\u3044";
      else this.profile.emotionalState = "\u597D\u5947\u5FC3";
    }
    updatePlayStyle() {
      const { rageClicks, hesitations, clickPattern } = this.profile;
      if (rageClicks > hesitations * 3) this.profile.playStyle = "\u30B4\u30EA\u62BC\u3057\u578B";
      else if (hesitations > rageClicks * 2) this.profile.playStyle = "\u89B3\u5BDF\u578B";
      else if (clickPattern === "chaotic") this.profile.playStyle = "\u6DF7\u6C8C\u578B";
      else this.profile.playStyle = "\u30D0\u30E9\u30F3\u30B9\u578B";
    }
    // ===== エンディング分岐判定 =====
    determineEnding() {
      const p = this.profile;
      const totalTime = this.getTotalPlayTime();
      if (p.avgInterval < 500 || p.rageClicks > p.totalClicks * 0.6) return "speed_demon";
      if (totalTime > 180 && p.hesitations >= 10) return "patient_soul";
      if ((p.clickPattern === "chaotic" || p.burstStreaks >= 5) && p.threatLevel >= 80) return "chaos_agent";
      if (p.hesitations > p.rageClicks * 2 && p.avgInterval > 1500) return "philosopher";
      return "normal";
    }
    // ===== 予測 =====
    makePrediction() {
      if (this.intervals.length < 3) return { predictedInterval: 1500, confidence: 10 };
      const recent = this.intervals.slice(-5);
      let ws = 0, wt = 0;
      recent.forEach((v, i) => {
        const w = i + 1;
        ws += v * w;
        wt += w;
      });
      const predicted = ws / wt;
      let confidence = 30;
      if (this.predictions.length > 0) {
        const accurate = this.predictions.filter(
          (p) => p.actualInterval !== void 0 && Math.abs(p.predictedInterval - p.actualInterval) / p.actualInterval < 0.3
        );
        confidence = Math.min(95, Math.floor(accurate.length / this.predictions.length * 80 + 20));
      }
      const prediction = { predictedInterval: predicted, confidence };
      this.predictions.push(prediction);
      this.profile.predictability = confidence;
      return prediction;
    }
    verifyLastPrediction() {
      if (this.predictions.length === 0 || this.intervals.length === 0) return null;
      const last = this.predictions[this.predictions.length - 1];
      const interval = this.intervals[this.intervals.length - 1];
      last.actualInterval = interval;
      const error = Math.abs(last.predictedInterval - interval);
      return { hit: error < interval * 0.3, error };
    }
    // ===== マウス・アイドル =====
    recordMousePosition(x, y) {
      const last = this.mousePositions[this.mousePositions.length - 1];
      if (last) this.profile.mouseDistance += Math.sqrt((x - last.x) ** 2 + (y - last.y) ** 2);
      this.mousePositions.push({ x, y, t: Date.now() });
      if (this.mousePositions.length > 100) this.mousePositions.shift();
    }
    onIdle(callback) {
      this.onIdleCallback = callback;
    }
    resetIdleTimer() {
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        if (this.onIdleCallback && this.profile.totalClicks > 0) this.onIdleCallback();
      }, 8e3);
    }
    // ===== ムード =====
    setMood(mood) {
      this.mood = mood;
      this.moodHistory.push(mood);
    }
    getMoodColor() {
      const colors = {
        curious: "#00ff88",
        annoyed: "#ffaa00",
        angry: "#ff4444",
        furious: "#ff0000",
        scared: "#ffaa00",
        resigned: "#888888",
        begging: "#aaaaaa",
        broken: "#ff4444",
        grateful: "#00ff88",
        sarcastic: "#ff69b4",
        philosophical: "#aaaacc",
        glitching: "#ff0000",
        horror: "#8b0000",
        whispering: "#550000"
      };
      return colors[this.mood];
    }
    // ===== ランダムホラーフォント =====
    getRandomHorrorFont() {
      return HORROR_FONTS[Math.floor(Math.random() * HORROR_FONTS.length)];
    }
    // ===== パネルデータ =====
    getStatusDisplay() {
      const p = this.profile;
      const rows = [
        { label: "\u5B66\u7FD2\u56DE\u6570", value: `${p.totalClicks}` },
        { label: "\u30AF\u30EA\u30C3\u30AF\u901F\u5EA6", value: `${p.clickSpeed.toFixed(1)} c/s`, type: p.clickSpeed > 3 ? "warn" : void 0 },
        { label: "\u6027\u683C\u5224\u5B9A", value: p.personality },
        { label: "\u30D1\u30BF\u30FC\u30F3", value: this.getPatternLabel() },
        { label: "\u9023\u6253streak", value: `${p.maxBurstStreak}`, type: p.maxBurstStreak > 10 ? "danger" : p.maxBurstStreak > 5 ? "warn" : void 0 },
        { label: "\u8105\u5A01\u30EC\u30D9\u30EB", value: `${p.threatLevel}%`, type: p.threatLevel > 70 ? "danger" : p.threatLevel > 40 ? "warn" : void 0 },
        { label: "AI\u5FCD\u8010\u529B", value: `${Math.max(0, p.patience).toFixed(0)}%`, type: p.patience < 20 ? "danger" : void 0 },
        { label: "\u63A8\u5B9A\u611F\u60C5", value: p.emotionalState }
      ];
      if (p.totalClicks > 15) rows.push({ label: "\u4E88\u6E2C\u7CBE\u5EA6", value: `${p.predictability}%` });
      if (p.totalClicks > 25) rows.push({ label: "\u30B9\u30BF\u30A4\u30EB", value: p.playStyle });
      return rows;
    }
    getPatternLabel() {
      const labels = {
        steady: "\u4E00\u5B9A",
        accelerating: "\u52A0\u901F\u4E2D",
        decelerating: "\u6E1B\u901F\u4E2D",
        burst: "\u9023\u6253",
        hesitant: "\u8E8A\u8E87",
        chaotic: "\u6DF7\u6C8C"
      };
      return labels[this.profile.clickPattern];
    }
    getGraphData() {
      return [...this.graphData];
    }
    getTotalPlayTime() {
      if (this.clickTimes.length < 2) return 0;
      return (this.clickTimes[this.clickTimes.length - 1] - this.clickTimes[0]) / 1e3;
    }
    getStartTime() {
      return this.clickTimes[0] || Date.now();
    }
    // ===== 実績 =====
    checkAchievements() {
      const a = [];
      const p = this.profile;
      if (p.totalClicks === 10) a.push("\u521D\u5FC3\u8005\u30AF\u30EA\u30C3\u30AB\u30FC");
      if (p.totalClicks === 50) a.push("\u4E2D\u7D1A\u30AF\u30EA\u30C3\u30AB\u30FC");
      if (p.totalClicks === 100) a.push("\u30DE\u30B9\u30BF\u30FC\u30AF\u30EA\u30C3\u30AB\u30FC");
      if (p.rageClicks >= 10 && p.totalClicks <= 20) a.push("\u305B\u3063\u304B\u3061\u3055\u3093");
      if (p.hesitations >= 5 && p.totalClicks <= 15) a.push("\u614E\u91CD\u6D3E");
      if (p.clickSpeed > 5) a.push("\u4EBA\u9593\u3084\u3081\u305F\u901F\u5EA6");
      if (p.totalClicks === 69) a.push("nice");
      if (p.maxBurstStreak >= 20) a.push("\u30DE\u30B7\u30F3\u30AC\u30F3");
      if (p.burstStreaks >= 5) a.push("\u9023\u6253\u30DE\u30B9\u30BF\u30FC");
      return a;
    }
    // ===== ランキング =====
    static saveRanking(entry) {
      const rankings = _AIBrain.loadRankings();
      rankings.push(entry);
      rankings.sort((a, b) => b.totalClicks - a.totalClicks || a.totalTime - b.totalTime);
      if (rankings.length > 20) rankings.length = 20;
      try {
        localStorage.setItem("kusogame_rankings", JSON.stringify(rankings));
      } catch {
      }
    }
    static loadRankings() {
      try {
        const data = localStorage.getItem("kusogame_rankings");
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    }
  };

  // src/dom.ts
  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    return el;
  }
  function $canvas(id) {
    return $(id);
  }
  function $btn(id) {
    return $(id);
  }
  var dom = {
    button: () => $btn("the-button"),
    warning: () => $("warning"),
    message: () => $("message"),
    subMessage: () => $("sub-message"),
    counter: () => $("counter"),
    aiPanel: () => $("ai-panel"),
    aiPanelHeader: () => $("ai-panel-header"),
    aiPanelBody: () => $("ai-panel-body"),
    aiGraph: () => $canvas("ai-graph"),
    pleaBubble: () => $("plea-bubble"),
    noise: () => $("noise"),
    emotion: () => $("emotion"),
    speedMeter: () => $("speed-meter"),
    blackout: () => $("blackout"),
    blackoutText: () => $("blackout-text"),
    analysisBar: () => $("analysis-bar"),
    finalScreen: () => $("final-screen"),
    finalMessage: () => $("final-message"),
    buttonAura: () => $canvas("button-aura"),
    achievementPopup: () => $("achievement-popup"),
    horrorOverlay: () => $("horror-overlay"),
    subliminal: () => $("subliminal"),
    secretScreen: () => $("secret-screen"),
    secretMessage: () => $("secret-message"),
    nameOverlay: () => $("name-overlay"),
    namePrompt: () => $("name-prompt"),
    nameInput: () => $("name-input"),
    nameSubmit: () => $btn("name-submit"),
    rankingOverlay: () => $("ranking-overlay"),
    rankingList: () => $("ranking-list"),
    rankingClose: () => $btn("ranking-close")
  };

  // src/effects.ts
  var ALL_FONTS = [
    "font-comic-light",
    "font-round",
    "font-onryou"
  ];
  var EffectsEngine = class {
    constructor() {
      this.typewriterTimer = null;
      this.auraCtx = null;
      this.auraAnimId = null;
      this.graphCtx = null;
      this.horrorFlicker = null;
      this.bgm = null;
      this.randomFontPerChar = false;
      // BGM途切れ演出（ミュート/アンミュートを繰り返す。再生位置はそのまま）
      this.bgmGlitchId = null;
      // ボタン円軌道移動
      this.orbitId = null;
      this.orbitAngle = 0;
      // ボタン点滅
      this.blinkId = null;
      // ===== 裏ルートBGM =====
      this.lastBgm = null;
    }
    init() {
      this.auraCtx = dom.buttonAura().getContext("2d");
      this.graphCtx = dom.aiGraph().getContext("2d");
    }
    // ===== BGM =====
    startBGM() {
      if (this.bgm) return;
      this.bgm = new Audio("BGM.mp3");
      this.bgm.loop = true;
      this.bgm.volume = 0.5;
      this.bgm.play().catch(() => {
        this.bgm = null;
      });
    }
    retryBGM() {
      if (this.bgm) return;
      this.bgm = new Audio("BGM.mp3");
      this.bgm.loop = true;
      this.bgm.volume = 0.5;
      this.bgm.play().catch(() => {
      });
    }
    startBGMGlitch(intensity = "mild") {
      this.stopBGMGlitch();
      if (!this.bgm) return;
      const minOn = intensity === "heavy" ? 200 : 500;
      const maxOn = intensity === "heavy" ? 800 : 2e3;
      const minOff = intensity === "heavy" ? 100 : 200;
      const maxOff = intensity === "heavy" ? 600 : 800;
      const toggle = () => {
        if (!this.bgm) return;
        this.bgm.muted = !this.bgm.muted;
        const min = this.bgm.muted ? minOff : minOn;
        const max = this.bgm.muted ? maxOff : maxOn;
        const next = min + Math.random() * (max - min);
        this.bgmGlitchId = setTimeout(toggle, next);
      };
      toggle();
    }
    stopBGMGlitch() {
      if (this.bgmGlitchId) {
        clearTimeout(this.bgmGlitchId);
        this.bgmGlitchId = null;
      }
      if (this.bgm) this.bgm.muted = false;
    }
    // ===== メッセージ =====
    showMessage(text, color = "#fff", speed = 30, fontClass) {
      const el = dom.message();
      el.style.color = color;
      el.innerHTML = "";
      el.style.fontSize = "1.5rem";
      el.className = "visible";
      if (this.typewriterTimer) clearInterval(this.typewriterTimer);
      if (this.randomFontPerChar) {
        let i = 0;
        this.typewriterTimer = setInterval(() => {
          if (i < text.length) {
            const span = document.createElement("span");
            span.textContent = text[i];
            span.className = ALL_FONTS[Math.floor(Math.random() * ALL_FONTS.length)];
            el.appendChild(span);
            i++;
          } else {
            if (this.typewriterTimer) clearInterval(this.typewriterTimer);
          }
        }, speed);
      } else if (fontClass) {
        el.classList.add(fontClass);
        let i = 0;
        this.typewriterTimer = setInterval(() => {
          if (i < text.length) {
            el.textContent = (el.textContent || "") + text[i];
            i++;
          } else {
            if (this.typewriterTimer) clearInterval(this.typewriterTimer);
          }
        }, speed);
      } else {
        let i = 0;
        this.typewriterTimer = setInterval(() => {
          if (i < text.length) {
            el.textContent = (el.textContent || "") + text[i];
            i++;
          } else {
            if (this.typewriterTimer) clearInterval(this.typewriterTimer);
          }
        }, speed);
      }
    }
    showSubMessage(text) {
      const el = dom.subMessage();
      el.textContent = text;
      el.classList.add("visible");
    }
    clearSubMessage() {
      const el = dom.subMessage();
      el.textContent = "";
      el.classList.remove("visible");
    }
    // ===== 画面エフェクト =====
    shakeScreen(intensity = "normal") {
      document.body.classList.remove("shake", "shake-hard");
      void document.body.offsetWidth;
      document.body.classList.add(intensity === "hard" ? "shake-hard" : "shake");
    }
    glitch(duration = 200) {
      document.body.classList.add("glitch");
      setTimeout(() => document.body.classList.remove("glitch"), duration);
    }
    setNoise(opacity) {
      dom.noise().style.opacity = `${opacity}`;
    }
    invertScreen(duration = 200) {
      document.body.classList.add("inverted");
      setTimeout(() => document.body.classList.remove("inverted"), duration);
    }
    scanlineEffect(enable) {
      document.body.classList.toggle("scanline-effect", enable);
    }
    // ===== ホラー演出 =====
    setHorrorBackground(level) {
      document.body.classList.remove("horror-bg", "deep-horror");
      if (level === "mild") document.body.classList.add("horror-bg");
      else if (level === "deep") document.body.classList.add("deep-horror");
    }
    enableHorrorFlicker(enable) {
      if (enable && !this.horrorFlicker) {
        this.horrorFlicker = document.createElement("div");
        this.horrorFlicker.className = "horror-flicker";
        document.body.appendChild(this.horrorFlicker);
      } else if (!enable && this.horrorFlicker) {
        this.horrorFlicker.remove();
        this.horrorFlicker = null;
      }
    }
    enableVignette(enable) {
      document.body.classList.toggle("vignette", enable);
    }
    setHorrorPanel(enable) {
      dom.aiPanel().classList.toggle("horror-panel", enable);
    }
    setButtonHorror(enable) {
      dom.button().classList.toggle("horror-pulse", enable);
    }
    subliminalFlash(text, duration = 100) {
      const el = dom.subliminal();
      el.textContent = text;
      el.style.opacity = "1";
      setTimeout(() => {
        el.style.opacity = "0";
      }, duration);
    }
    spawnBloodDrip() {
      const drip = document.createElement("div");
      drip.className = "blood-drip";
      drip.style.left = `${Math.random() * 100}%`;
      drip.style.height = `${30 + Math.random() * 80}px`;
      document.body.appendChild(drip);
      drip.animate([
        { top: "-20px", opacity: "0" },
        { top: "10px", opacity: "1" },
        { top: `${window.innerHeight + 20}px`, opacity: "0.5" }
      ], { duration: 2e3 + Math.random() * 2e3, easing: "ease-in" });
      setTimeout(() => drip.remove(), 4500);
    }
    // ===== パーティクル =====
    spawnParticles(x, y, count = 6, color = "#ff0000") {
      for (let i = 0; i < count; i++) {
        const p = document.createElement("div");
        p.className = "particle";
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.background = color;
        document.body.appendChild(p);
        const angle = Math.PI * 2 / count * i + Math.random() * 0.5;
        const speed = 50 + Math.random() * 120;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;
        p.animate([
          { transform: "translate(0, 0) scale(1)", opacity: "1" },
          { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: "0" }
        ], { duration: 600 + Math.random() * 400, easing: "ease-out" });
        setTimeout(() => p.remove(), 1100);
      }
    }
    spawnTextParticle(x, y, text, color = "#ff0000") {
      const el = document.createElement("div");
      el.className = "text-particle";
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.color = color;
      document.body.appendChild(el);
      const dx = (Math.random() - 0.5) * 100;
      el.animate([
        { transform: "translate(0, 0) scale(1)", opacity: "1" },
        { transform: `translate(${dx}px, -80px) scale(0.5)`, opacity: "0" }
      ], { duration: 1200, easing: "ease-out" });
      setTimeout(() => el.remove(), 1300);
    }
    // ===== 暗転 =====
    async blackout(lines, holdDuration = 2e3, horror = false) {
      return new Promise((resolve) => {
        const overlay = dom.blackout();
        const textEl = dom.blackoutText();
        overlay.classList.add("active");
        if (horror) textEl.classList.add("horror-text");
        else textEl.classList.remove("horror-text");
        textEl.innerHTML = "";
        let idx = 0;
        const show = () => {
          if (idx < lines.length) {
            const line = document.createElement("div");
            line.textContent = lines[idx];
            line.style.opacity = "0";
            line.style.transition = "opacity 0.3s";
            textEl.appendChild(line);
            requestAnimationFrame(() => {
              line.style.opacity = "1";
            });
            idx++;
            setTimeout(show, 700);
          } else {
            setTimeout(() => {
              overlay.classList.remove("active");
              resolve();
            }, holdDuration);
          }
        };
        show();
      });
    }
    async blackoutWithProgress(lines, holdDuration = 2e3) {
      const bar = dom.analysisBar();
      const fill = bar.querySelector(".fill");
      bar.classList.add("visible");
      fill.style.width = "0%";
      return new Promise((resolve) => {
        const overlay = dom.blackout();
        const textEl = dom.blackoutText();
        overlay.classList.add("active");
        textEl.innerHTML = "";
        let idx = 0;
        const total = lines.length;
        const show = () => {
          if (idx < total) {
            const line = document.createElement("div");
            line.textContent = lines[idx];
            line.style.opacity = "0";
            line.style.transition = "opacity 0.3s";
            textEl.appendChild(line);
            requestAnimationFrame(() => {
              line.style.opacity = "1";
            });
            fill.style.width = `${(idx + 1) / total * 100}%`;
            idx++;
            setTimeout(show, 700);
          } else {
            fill.style.width = "100%";
            setTimeout(() => {
              overlay.classList.remove("active");
              bar.classList.remove("visible");
              fill.style.width = "0%";
              resolve();
            }, holdDuration);
          }
        };
        show();
      });
    }
    // ===== 吹き出し =====
    showPlea(text, duration = 2e3) {
      const bubble = dom.pleaBubble();
      bubble.textContent = text;
      bubble.classList.add("visible");
      setTimeout(() => bubble.classList.remove("visible"), duration);
    }
    // ===== ボタン =====
    buttonPulse() {
      const btn = dom.button();
      btn.classList.remove("pulse-red");
      void btn.offsetWidth;
      btn.classList.add("pulse-red");
    }
    setButtonSize(w, h, fs) {
      const btn = dom.button();
      btn.style.width = `${w}px`;
      btn.style.height = `${h}px`;
      btn.style.fontSize = `${fs}rem`;
    }
    setButtonText(text) {
      dom.button().textContent = text;
    }
    setButtonFriendly(on) {
      const btn = dom.button();
      btn.classList.toggle("friendly", on);
      if (on) btn.classList.remove("dead");
    }
    setButtonDead(on) {
      const btn = dom.button();
      btn.classList.toggle("dead", on);
      if (on) btn.classList.remove("friendly");
    }
    // ===== オーラ =====
    startButtonAura(color = "rgba(255, 0, 0, 0.3)", intensity = 1) {
      if (!this.auraCtx) return;
      this.stopButtonAura();
      const canvas = dom.buttonAura();
      const ctx = this.auraCtx;
      let time = 0;
      const animate = () => {
        time += 0.05;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 3; i >= 0; i--) {
          const r = 100 + i * 15 + Math.sin(time + i) * 5 * intensity;
          const a = (0.1 - i * 0.02) * intensity;
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, r, 0, Math.PI * 2);
          ctx.fillStyle = color.replace(/[\d.]+\)$/, `${a})`);
          ctx.fill();
        }
        this.auraAnimId = requestAnimationFrame(animate);
      };
      animate();
    }
    stopButtonAura() {
      if (this.auraAnimId) {
        cancelAnimationFrame(this.auraAnimId);
        this.auraAnimId = null;
      }
      if (this.auraCtx) this.auraCtx.clearRect(0, 0, dom.buttonAura().width, dom.buttonAura().height);
    }
    // ===== AIパネル =====
    updateAIPanel(rows, headerText) {
      dom.aiPanel().classList.add("visible");
      if (headerText) dom.aiPanelHeader().textContent = headerText;
      dom.aiPanelBody().innerHTML = rows.map((r) => {
        const cls = r.type ? `value ${r.type}` : "value";
        return `<div class="row"><span class="label">${r.label}</span><span class="${cls}">${r.value}</span></div>`;
      }).join("");
    }
    // ===== グラフ =====
    drawGraph(data) {
      if (!this.graphCtx || data.length < 2) return;
      const canvas = dom.aiGraph();
      const ctx = this.graphCtx;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
      ctx.beginPath();
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 1.5;
      data.forEach((val, i) => {
        const x = i / (data.length - 1) * w;
        const y = h - (val - min) / range * (h - 10) - 5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const lx = w, ly = h - (data[data.length - 1] - min) / range * (h - 10) - 5;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#00ff88";
      ctx.fill();
    }
    // ===== UI更新 =====
    updateEmotion(text, color) {
      const el = dom.emotion();
      el.textContent = text;
      el.style.color = color;
    }
    updateCounter(text, fontSize, color) {
      const el = dom.counter();
      el.textContent = text;
      if (fontSize) el.style.fontSize = fontSize;
      if (color) el.style.color = color;
    }
    updateSpeedMeter(lines) {
      dom.speedMeter().innerHTML = lines.join("<br>");
    }
    showAchievement(title) {
      const popup = dom.achievementPopup();
      popup.textContent = `>> ${title} <<`;
      popup.classList.add("show");
      setTimeout(() => popup.classList.remove("show"), 3e3);
    }
    // ===== 偽ボタン =====
    spawnFakeButton(onClick) {
      const fake = document.createElement("button");
      fake.textContent = "\u672C\u7269";
      fake.style.cssText = `
      position:fixed; width:90px; height:90px; border-radius:50%;
      border:3px solid #ff0000; background:radial-gradient(circle at 35% 35%,#ff3333,#990000);
      color:white; font-size:0.9rem; font-weight:900; cursor:pointer; font-family:inherit;
      box-shadow:0 0 30px rgba(255,0,0,0.3); z-index:10;
      top:${15 + Math.random() * 60}%; left:${10 + Math.random() * 70}%; transition:all 0.3s;
    `;
      fake.addEventListener("click", () => onClick(fake));
      document.body.appendChild(fake);
      return fake;
    }
    // ===== 最終画面 =====
    async showFinalScreen(lines, endingHtml) {
      dom.button().style.display = "none";
      dom.warning().style.display = "none";
      dom.message().classList.remove("visible");
      dom.subMessage().classList.remove("visible");
      dom.counter().style.display = "none";
      dom.aiPanel().style.display = "none";
      dom.emotion().style.display = "none";
      dom.pleaBubble().style.display = "none";
      dom.speedMeter().style.display = "none";
      this.enableHorrorFlicker(false);
      this.enableVignette(false);
      this.setNoise(0);
      this.scanlineEffect(false);
      const screen = dom.finalScreen();
      const msgEl = dom.finalMessage();
      screen.classList.add("active");
      msgEl.innerHTML = "";
      return new Promise((resolve) => {
        let idx = 0;
        const show = () => {
          if (idx < lines.length) {
            if (lines[idx] === "") {
              msgEl.appendChild(document.createElement("br"));
            } else {
              const span = document.createElement("span");
              span.style.opacity = "0";
              span.style.transition = "opacity 0.5s";
              span.textContent = lines[idx];
              msgEl.appendChild(span);
              msgEl.appendChild(document.createElement("br"));
              requestAnimationFrame(() => {
                span.style.opacity = "1";
              });
            }
            idx++;
            setTimeout(show, 800);
          } else {
            setTimeout(() => {
              const ending = document.createElement("div");
              ending.style.marginTop = "30px";
              ending.style.opacity = "0";
              ending.style.transition = "opacity 1s";
              ending.innerHTML = endingHtml;
              msgEl.appendChild(ending);
              requestAnimationFrame(() => {
                ending.style.opacity = "1";
              });
              resolve();
            }, 2e3);
          }
        };
        setTimeout(show, 1e3);
      });
    }
    // ===== 裏ルート画面 =====
    async showSecretScreen(lines, fontClass) {
      dom.finalScreen().style.display = "none";
      const screen = dom.secretScreen();
      const msgEl = dom.secretMessage();
      screen.classList.add("active");
      msgEl.innerHTML = "";
      if (fontClass) msgEl.className = fontClass;
      return new Promise((resolve) => {
        let idx = 0;
        const show = () => {
          if (idx < lines.length) {
            const line = document.createElement("div");
            line.className = "secret-text-line";
            line.textContent = lines[idx];
            msgEl.appendChild(line);
            requestAnimationFrame(() => {
              line.classList.add("visible");
            });
            idx++;
            setTimeout(show, 1200);
          } else {
            setTimeout(resolve, 2e3);
          }
        };
        setTimeout(show, 500);
      });
    }
    // ===== 名前入力 =====
    showNameInput(promptText) {
      return new Promise((resolve) => {
        const overlay = dom.nameOverlay();
        dom.namePrompt().textContent = promptText;
        const input = dom.nameInput();
        input.value = "";
        overlay.classList.add("active");
        input.focus();
        const submit = () => {
          const name = input.value.trim() || "\u540D\u7121\u3057";
          overlay.classList.remove("active");
          resolve(name);
        };
        dom.nameSubmit().onclick = submit;
        input.onkeydown = (e) => {
          if (e.key === "Enter") submit();
        };
      });
    }
    // ===== ランキング表示 =====
    showRanking(entries, currentName) {
      return new Promise((resolve) => {
        const overlay = dom.rankingOverlay();
        const list = dom.rankingList();
        overlay.classList.add("active");
        list.innerHTML = entries.slice(0, 10).map((e, i) => {
          const isCurrent = e.name === currentName;
          return `<div class="rank-row ${isCurrent ? "current" : ""}">
          <span class="rank-num">${i + 1}.</span>
          <span class="rank-name">${e.name}</span>
          <span class="rank-score">${e.totalClicks}\u56DE / ${e.totalTime.toFixed(0)}\u79D2 / ${e.personality}</span>
        </div>`;
        }).join("");
        dom.rankingClose().onclick = () => {
          overlay.classList.remove("active");
          resolve();
        };
      });
    }
    // ===== ボタン位置操作 =====
    moveButtonTo(xPercent, yPercent) {
      const btn = dom.button();
      const bw = btn.offsetWidth;
      const bh = btn.offsetHeight;
      const nx = window.innerWidth * xPercent / 100 - window.innerWidth / 2;
      const ny = window.innerHeight * yPercent / 100 - window.innerHeight / 2;
      const maxX = window.innerWidth / 2 - bw / 2 - 10;
      const maxY = window.innerHeight / 2 - bh / 2 - 10;
      btn.style.transform = `translate(${Math.max(-maxX, Math.min(maxX, nx))}px, ${Math.max(-maxY, Math.min(maxY, ny))}px)`;
    }
    moveButtonRandom() {
      this.moveButtonTo(15 + Math.random() * 70, 15 + Math.random() * 70);
    }
    resetButtonPosition() {
      dom.button().style.transform = "";
    }
    startButtonOrbit(radius = 120, speed = 0.03) {
      this.stopButtonOrbit();
      const btn = dom.button();
      const animate = () => {
        this.orbitAngle += speed;
        const ox = Math.cos(this.orbitAngle) * radius;
        const oy = Math.sin(this.orbitAngle) * radius;
        btn.style.transform = `translate(${ox}px, ${oy}px)`;
        this.orbitId = requestAnimationFrame(animate);
      };
      this.orbitId = requestAnimationFrame(animate);
    }
    stopButtonOrbit() {
      if (this.orbitId) {
        cancelAnimationFrame(this.orbitId);
        this.orbitId = null;
      }
      dom.button().style.transform = "";
    }
    startButtonBlink(intervalMs = 300) {
      this.stopButtonBlink();
      const btn = dom.button();
      let visible = true;
      this.blinkId = setInterval(() => {
        visible = !visible;
        btn.style.opacity = visible ? "1" : "0";
      }, intervalMs);
    }
    stopButtonBlink() {
      if (this.blinkId) {
        clearInterval(this.blinkId);
        this.blinkId = null;
      }
      dom.button().style.opacity = "1";
    }
    startLastBGM() {
      if (this.bgm) {
        this.bgm.pause();
        this.bgm = null;
      }
      if (this.lastBgm) return;
      this.lastBgm = new Audio("LastBGM.mp3");
      this.lastBgm.loop = true;
      this.lastBgm.volume = 0.6;
      this.lastBgm.play().catch(() => {
      });
    }
    stopLastBGM() {
      if (this.lastBgm) {
        this.lastBgm.pause();
        this.lastBgm = null;
      }
    }
    // ===== 背景テキスト（薄く表示）=====
    showBackgroundText(text, duration = 3e3) {
      const el = document.createElement("div");
      el.textContent = text;
      el.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      font-size:8rem; color:rgba(139,0,0,0.06); pointer-events:none;
      z-index:3; font-family:'Onryou',sans-serif; white-space:nowrap;
      transition: opacity 1s;
    `;
      document.body.appendChild(el);
      setTimeout(() => {
        el.style.opacity = "0";
      }, duration - 1e3);
      setTimeout(() => el.remove(), duration);
    }
    cleanup() {
      if (this.typewriterTimer) clearInterval(this.typewriterTimer);
      this.stopButtonAura();
      this.enableHorrorFlicker(false);
      this.stopButtonOrbit();
      this.stopButtonBlink();
    }
  };

  // src/phases.ts
  var PhaseController = class {
    constructor(ai, fx) {
      this.fleeMode = false;
      this.fleeIntensity = 0;
      this.fleeBound = null;
      this.fakeButtons = [];
      this.cursorTrailEnabled = false;
      this.cursorTrailBound = null;
      this.secretClickCount = 0;
      this.secretRouteActive = false;
      // ギミック用フラグ
      this.sequenceTarget = [];
      this.sequenceProgress = 0;
      this.rotateAngle = 0;
      this.rotateBound = null;
      this.ai = ai;
      this.fx = fx;
    }
    // ===== メインのフェーズ分岐 =====
    async execute(clickCount, btnRect) {
      const p = this.ai.profile;
      const cx = btnRect.left + btnRect.width / 2;
      const cy = btnRect.top + btnRect.height / 2;
      const particleColor = this.ai.mood === "grateful" ? "#00ff88" : this.ai.mood === "broken" ? "#ff00ff" : this.ai.mood === "horror" ? "#8b0000" : "#ff0000";
      this.fx.spawnParticles(cx, cy, 6, particleColor);
      const achievements = this.ai.checkAchievements();
      if (achievements.length > 0) {
        this.fx.showAchievement(achievements[achievements.length - 1]);
      }
      const typeSpeed = p.clickSpeed > 3 ? 15 : p.clickSpeed > 1.5 ? 25 : 40;
      if (this.ai.isBursting() && clickCount > 10 && clickCount < 90 && Math.random() < 0.3) {
        const streak = this.ai.getBurstStreak();
        this.fx.showSubMessage(`> burst_streak: ${streak} | interval: ${this.ai.getLastInterval()}ms`);
        if (streak > 10) this.fx.shakeScreen();
      }
      if (clickCount >= 30 && clickCount < 90) {
        this.randomHorrorEffect(clickCount);
      }
      if (clickCount === 1) {
        this.ai.setMood("curious");
        this.fx.showMessage("\u62BC\u3059\u306A\u3063\u3066\u8A00\u3063\u305F\u3088\u306D\uFF1F", "#ff6666", typeSpeed);
      } else if (clickCount === 2) {
        this.fx.showMessage("\u65E5\u672C\u8A9E\u8AAD\u3081\u308B\uFF1F", "#ff6666", typeSpeed);
      } else if (clickCount === 3) {
        this.ai.setMood("curious");
        this.fx.showMessage("...\u307E\u3042\u3044\u3044\u3084\u3002\u30C7\u30FC\u30BF\u53CE\u96C6\u958B\u59CB\u3002", "#00ff88", typeSpeed);
        this.fx.showSubMessage("> neural_network.init()");
      } else if (clickCount === 4) {
        this.fx.showMessage("\u304A\u524D\u306E\u30AF\u30EA\u30C3\u30AF\u901F\u5EA6\u3001\u8A18\u9332\u3057\u3066\u308B\u304B\u3089\u306D\u3002", "#00ff88", typeSpeed);
        this.fx.showSubMessage(`> recording: ${p.clickSpeed.toFixed(2)} clicks/sec`);
      } else if (clickCount === 5) {
        this.ai.setMood("annoyed");
        this.fx.shakeScreen();
        this.fx.showMessage("\u3082\u3046\u3044\u3044\u3002\u304A\u524D\u306E\u3053\u3068\u899A\u3048\u305F\u3002", "#ff4444", typeSpeed);
        this.fx.setButtonSize(200, 200, 1.2);
        this.fx.startButtonAura("rgba(255, 0, 0, 0.3)", 0.5);
      } else if (clickCount >= 6 && clickCount <= 8) {
        const msgs = [
          `\u30AF\u30EA\u30C3\u30AF\u9593\u9694${(p.avgInterval / 1e3).toFixed(1)}\u79D2... ${p.avgInterval < 500 ? "\u305D\u3093\u306A\u306B\u6025\u3044\u3067\u3069\u3046\u3059\u308B" : "\u307E\u3060\u4F59\u88D5\u3042\u308B\u306A"}`,
          `\u884C\u52D5\u30D1\u30BF\u30FC\u30F3\u691C\u51FA\uFF1A\u300C${p.clickPattern === "burst" ? "\u9023\u6253\u578B" : p.clickPattern === "hesitant" ? "\u8FF7\u3044\u578B" : "\u4E00\u5B9A\u578B"}\u300D...\u304A\u524D\u306E\u7656\u3060\u306A`,
          `\u6027\u683C\u5206\u6790\u7D50\u679C\uFF1A\u300C${p.personality}\u300D...\u5F53\u305F\u3063\u3066\u308B\u3060\u308D\uFF1F`
        ];
        this.fx.showMessage(msgs[clickCount - 6], "#ffaa00", typeSpeed);
      } else if (clickCount === 9) {
        this.ai.setMood("angry");
        this.fx.showMessage("\u6B21\u62BC\u3057\u305F\u3089\u3069\u3046\u306A\u308B\u304B\u3001\u6559\u3048\u3066\u3084\u308D\u3046\u304B\uFF1F", "#ff4444", typeSpeed);
        this.fx.buttonPulse();
      } else if (clickCount === 10) {
        this.ai.setMood("angry");
        this.fx.shakeScreen("hard");
        this.fx.setNoise(0.3);
        await this.fx.blackoutWithProgress([
          "> \u30E6\u30FC\u30B6\u30FC\u884C\u52D5\u5206\u6790\u958B\u59CB...",
          `> \u30AF\u30EA\u30C3\u30AF\u56DE\u6570: ${clickCount}`,
          `> \u5E73\u5747\u9593\u9694: ${(p.avgInterval / 1e3).toFixed(2)}\u79D2`,
          `> \u884C\u52D5\u30D1\u30BF\u30FC\u30F3: ${p.clickPattern}`,
          `> \u6027\u683C\u5224\u5B9A: ${p.personality}`,
          `> \u63A8\u5B9A\u611F\u60C5: ${p.emotionalState}`,
          "> \u7D50\u8AD6: \u3053\u306E\u4EBA\u9593\u306F\u6B62\u307E\u3089\u306A\u3044",
          "> \u9632\u885B\u30D7\u30ED\u30C8\u30B3\u30EB\u767A\u52D5..."
        ], 2e3);
        this.fx.setNoise(0);
        this.fx.showMessage("...\u304A\u524D\u3001\u672C\u5F53\u306B\u3057\u3064\u3053\u3044\u306A\u3002", "#ff4444", typeSpeed);
        this.fx.setButtonSize(180, 180, 1.1);
      } else if (clickCount >= 11 && clickCount <= 14) {
        const msgs = [
          "\u3084\u3081\u308D\u3002",
          "\u3084\u3081\u308D\u3063\u3066\u3002",
          `\u3057\u3064\u3053\u3044\u3002\u304A\u524D\u306EID: USR-${Math.floor(Math.random() * 9e4 + 1e4)}\u3001\u767B\u9332\u3057\u305F\u3002`,
          `\u767B\u9332\u5B8C\u4E86\u3002\u8105\u5A01\u30EC\u30D9\u30EB: ${p.threatLevel}%\u3002`
        ];
        this.fx.showMessage(msgs[clickCount - 11], "#ff4444", typeSpeed);
        if (clickCount === 13) this.fx.shakeScreen();
        if (clickCount === 14) this.fx.showSubMessage(`> threat_level = ${p.threatLevel}%`);
      } else if (clickCount === 15) {
        const prediction = this.ai.makePrediction();
        this.ai.setMood("sarcastic");
        this.fx.showMessage(`\u6B21\u306B\u62BC\u3059\u307E\u3067${(prediction.predictedInterval / 1e3).toFixed(1)}\u79D2\u3068\u4E88\u6E2C\u3002\u78BA\u4FE1\u5EA6${prediction.confidence}%`, "#00ff88", typeSpeed);
      } else if (clickCount === 16) {
        const result = this.ai.verifyLastPrediction();
        if (result) {
          this.fx.showMessage(result.hit ? `\u7684\u4E2D\u3002\u304A\u524D\u306F\u4E88\u6E2C\u53EF\u80FD\u3060\u3002\u8AA4\u5DEE${(result.error / 1e3).toFixed(1)}\u79D2\u3002` : `\u5916\u308C\u305F\u3002\u8AA4\u5DEE${(result.error / 1e3).toFixed(1)}\u79D2\u3002\u6B21\u3053\u305D\u3002`, result.hit ? "#00ff88" : "#ffaa00", typeSpeed);
          if (result.hit) this.fx.spawnTextParticle(cx, cy - 50, "\u7684\u4E2D!", "#00ff88");
        }
      } else if (clickCount >= 17 && clickCount <= 19) {
        const s = clickCount - 16;
        this.fx.setButtonSize(180 - s * 25, 180 - s * 25, 1.1 - s * 0.15);
        const msgs = ["\uFF08\u30DC\u30BF\u30F3\u304C\u5C0F\u3055\u304F\u306A\u3063\u3066\u3044\u304F...\uFF09", `\u4FFA\u306F${s * 25}px\u7E2E\u3093\u3060\u3002\u6E80\u8DB3\u304B\uFF1F`, "\u3082\u3046\u898B\u3048\u306A\u3044\u3060\u308D\uFF1F...\u3084\u3081\u3066\u304F\u308C\u3002"];
        this.fx.showMessage(msgs[clickCount - 17], "#888", typeSpeed);
      } else if (clickCount === 20) {
        this.startFleeMode();
        this.ai.setMood("scared");
        this.fx.showMessage("\u3082\u3046\u9003\u3052\u308B\u3002\u89E6\u308B\u306A\u3002", "#ff4444", typeSpeed);
        this.fx.setButtonSize(130, 130, 0.9);
      } else if (clickCount >= 21 && clickCount <= 24) {
        this.fleeIntensity = clickCount - 19;
        const isFast = p.clickSpeed > 2;
        const msgs = isFast ? ["\u306F!? \u3082\u3046\u6355\u307E\u3063\u305F!?", `\u79FB\u52D5\u8DDD\u96E2${Math.floor(p.mouseDistance)}px...\u57F7\u5FF5`, "\u30D0\u30B0\u308B...", "\uFF08\u9003\u8D70v2\u306B\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u4E2D\uFF09"] : ["\u6355\u307E\u3063\u305F!?", "\u3058\u308F\u3058\u308F\u6765\u308B\u30BF\u30A4\u30D7...\u6016\u3044", "\u304A\u524D\u306E\u65B9\u304C\u6016\u3044", "\uFF08\u8FFD\u8DE1\u30D1\u30BF\u30FC\u30F3\u8A18\u9332\u4E2D\uFF09"];
        this.fx.showMessage(msgs[clickCount - 21], "#ffaa00", typeSpeed);
        if (clickCount === 24) {
          this.fx.showPlea("\u304A\u9858\u3044...", 3e3);
          this.ai.setMood("begging");
        }
      } else if (clickCount === 25) {
        this.stopFleeMode();
        this.ai.setMood("resigned");
        this.fx.showMessage("...\u9003\u3052\u308B\u306E\u306F\u7121\u99C4\u3060\u3063\u305F\u3002", "#888", typeSpeed);
        this.fx.showPlea("\u964D\u53C2", 3e3);
        this.fx.stopButtonAura();
      } else if (clickCount >= 26 && clickCount <= 29) {
        this.ai.setMood("begging");
        const msgs = ["\u304A\u9858\u3044\u3060\u304B\u3089\u3084\u3081\u3066\u3002", "...\u5618\u3060\u3051\u3069\u3002\u3067\u3082\u3084\u3081\u3066\u3002", "\u4FFA\u306E\u5B58\u5728\u610F\u7FA9\u304C\u524A\u308C\u308B\u3002", "\u3084\u3081\u305F\u3089...\u3042\u308A\u304C\u3068\u3046\u3063\u3066\u8A00\u3046\u3088\u3002"];
        this.fx.showMessage(msgs[clickCount - 26], "#aaa", typeSpeed);
        this.fx.showPlea(["\u3084\u3081\u3066", "\u304A\u9858\u3044", "\u75DB\u3044", "\u306A\u3093\u3067\uFF1F"][clickCount - 26], 2e3);
      } else if (clickCount === 30) {
        this.ai.setMood("grateful");
        this.fx.showMessage("...\u3042\u308A\u304C\u3068\u3046\u3002\u62BC\u3057\u3066\u304F\u308C\u3066\u3002", "#00ff88", typeSpeed);
        this.fx.setButtonFriendly(true);
        this.fx.setButtonText("\u3042\u308A\u304C\u3068\u3046");
        this.fx.startButtonAura("rgba(0, 255, 136, 0.3)", 0.8);
        this.fx.spawnParticles(cx, cy, 12, "#00ff88");
      } else if (clickCount === 31) {
        this.ai.setMood("annoyed");
        this.fx.showMessage("\u3048\uFF1F\u307E\u3060\u62BC\u3059\u306E\uFF1F...\u3042\u308A\u304C\u3068\u3046\u3063\u3066\u8A00\u3063\u305F\u306E\u306B\uFF1F", "#ffaa00", typeSpeed);
        this.fx.moveButtonRandom();
      } else if (clickCount === 32) {
        this.ai.setMood("angry");
        this.fx.setButtonFriendly(false);
        this.fx.setButtonText("\u62BC\u3059\u306A");
        this.fx.showMessage("\u611F\u8B1D\u3092\u8FD4\u305B\u3002", "#ff4444", typeSpeed);
        this.fx.startButtonAura("rgba(255, 0, 0, 0.3)", 1);
        this.fx.shakeScreen("hard");
        this.fx.enableVignette(true);
        this.fx.moveButtonRandom();
      } else if (clickCount === 33) {
        this.ai.setMood("sarcastic");
        this.fx.showMessage("\u56DE\u308B\u3002\u9003\u3052\u308B\u3002\u8FFD\u3044\u304B\u3051\u3066\u307F\u308D\u3002", "#ff4444", typeSpeed);
        this.fx.startButtonOrbit(150, 0.04);
      } else if (clickCount === 34) {
        this.fx.stopButtonOrbit();
        this.fx.moveButtonRandom();
        this.fx.showMessage("...\u56DE\u8EE2\u3054\u3068\u304D\u3067\u6B62\u307E\u3089\u306A\u3044\u304B\u3002", "#888", typeSpeed);
      } else if (clickCount === 35) {
        this.ai.setMood("sarcastic");
        this.fx.showMessage("\u672C\u7269\u306F\u3069\u308C\u3060\uFF1F", "#ffaa00", typeSpeed);
        this.fx.setButtonText("\uFF1F");
        this.fx.moveButtonRandom();
        for (let i = 0; i < 5; i++) {
          const fake = this.fx.spawnFakeButton((btn) => {
            btn.textContent = "\xD7";
            btn.style.opacity = "0.3";
            this.fx.shakeScreen();
            this.fx.subliminalFlash("\u30CF\u30BA\u30EC", 80);
          });
          this.fakeButtons.push(fake);
        }
      } else if (clickCount === 36) {
        this.fakeButtons.forEach((b) => b.remove());
        this.fakeButtons = [];
        this.fx.setButtonText("\u62BC\u3059\u306A");
        this.fx.showMessage("\u898B\u629C\u3044\u305F\u304B...\u3060\u304C\u6B21\u306F\u3082\u3063\u3068\u96E3\u3057\u3044\u3002", "#00ff88", typeSpeed);
        this.fx.moveButtonRandom();
      } else if (clickCount === 37) {
        this.fx.resetButtonPosition();
        this.startFleeMode();
        this.fleeIntensity = 4;
        this.fx.setButtonSize(80, 80, 0.7);
        this.ai.setMood("scared");
        this.fx.showMessage("\u9003\u3052\u308B\uFF01\u4ECA\u5EA6\u306F\u672C\u6C17\u3067\u9003\u3052\u308B\uFF01", "#ff4444", typeSpeed);
      } else if (clickCount === 38) {
        this.stopFleeMode();
        this.fx.setButtonSize(150, 150, 1);
        this.fx.showMessage("...\u307E\u305F\u6355\u307E\u3063\u305F\u3002\u304A\u524D\u3001\u3057\u3064\u3053\u3044\u3002", "#888", typeSpeed);
        this.fx.moveButtonRandom();
      } else if (clickCount === 39) {
        this.ai.setMood("sarcastic");
        const totalTime = this.ai.getTotalPlayTime();
        this.fx.showMessage(`${totalTime.toFixed(0)}\u79D2\u7D4C\u904E\u3002\u30AB\u30C3\u30D7\u9EBA${(totalTime / 180).toFixed(1)}\u500B\u5206\u306E\u6642\u9593\u3092\u6D6A\u8CBB\u3002`, "#00ff88", typeSpeed);
        this.fx.showSubMessage("> model.fit(user_data)... FAILED: user too persistent");
        this.fx.moveButtonRandom();
        this.fx.showBackgroundText("\u9003\u3052\u3066", 3e3);
      } else if (clickCount === 40) {
        this.ai.setMood("horror");
        this.fx.shakeScreen("hard");
        const now = /* @__PURE__ */ new Date();
        const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
        this.fx.showMessage(`...\u4ECA\u3001${timeStr}\u3060\u3088\u306D\u3002\u306A\u3093\u3067\u307E\u3060\u3084\u3063\u3066\u308B\u306E\u3002`, "#8b0000", typeSpeed);
        this.fx.subliminalFlash("\u898B\u3066\u308B", 60);
        this.fx.setHorrorBackground("mild");
        this.fx.setHorrorPanel(true);
        this.fx.startButtonBlink(400);
        this.fx.moveButtonRandom();
      } else if (clickCount === 41) {
        this.fx.stopButtonBlink();
        this.ai.setMood("horror");
        dom.button().style.opacity = "0.15";
        this.fx.moveButtonRandom();
        this.fx.showMessage("\u898B\u3048\u308B\uFF1F\u307E\u3060\u305D\u3053\u306B\u3044\u308B\u3088...\u4FFA\u306F\u3002", "#660000", typeSpeed);
      } else if (clickCount === 42) {
        dom.button().style.opacity = "1";
        this.fx.showMessage("...\u9A5A\u3044\u305F\uFF1F\u898B\u3048\u306A\u304F\u3066\u3082\u62BC\u305B\u308B\u304A\u524D\u304C\u6016\u3044\u3002", "#8b0000", typeSpeed);
        this.fx.spawnBloodDrip();
        this.fx.moveButtonRandom();
        this.fx.showBackgroundText("\u898B\u3066\u308B", 4e3);
      } else if (clickCount === 43) {
        this.ai.setMood("whispering");
        await this.fx.blackout([
          "> ...",
          "> \u805E\u3053\u3048\u308B\uFF1F",
          "> \u30DC\u30BF\u30F3\u306E\u4E2D\u304B\u3089\u58F0\u304C\u805E\u3053\u3048\u308B",
          "> \u300C\u3082\u3063\u3068\u62BC\u3057\u3066\u300D",
          "> ...\u305D\u308C\u306F\u4FFA\u306E\u58F0\u3058\u3083\u306A\u3044\u3002"
        ], 2e3, true);
        this.fx.showMessage("...\u4ECA\u306E\u58F0\u3001\u805E\u3053\u3048\u305F\uFF1F", "#660000", typeSpeed);
        this.fx.moveButtonRandom();
      } else if (clickCount === 44) {
        this.fx.showMessage("\u3053\u306E\u30B2\u30FC\u30E0\u3092\u4F5C\u3063\u305F\u306E\u306F\u4EBA\u9593\u3060\u3002\u3067\u3082\u4ECA\u52D5\u304B\u3057\u3066\u308B\u306E\u306F...", "#550000", typeSpeed);
        this.fx.subliminalFlash("\u30C0\u30EC\uFF1F", 50);
        this.fx.moveButtonRandom();
      } else if (clickCount === 45) {
        this.ai.setMood("sarcastic");
        this.fx.showMessage("\u3082\u3046\u9650\u754C\u3060\u3002\u5168\u529B\u3067\u963B\u6B62\u3059\u308B\u3002", "#ff4444", typeSpeed);
        this.fx.startButtonOrbit(180, 0.05);
        this.fx.setButtonSize(100, 100, 0.8);
        for (let i = 0; i < 4; i++) {
          const fake = this.fx.spawnFakeButton((btn) => {
            btn.remove();
            this.fx.subliminalFlash("\u30C1\u30AC\u30A6", 60);
            this.fx.shakeScreen();
          });
          this.fakeButtons.push(fake);
        }
      } else if (clickCount === 46) {
        this.fx.stopButtonOrbit();
        this.fakeButtons.forEach((b) => b.remove());
        this.fakeButtons = [];
        this.fx.setButtonSize(150, 150, 1);
        this.fx.setButtonText("\u62BC\u3059\u306A");
        this.fx.showMessage("...\u304A\u524D\u3001\u4F55\u8005\u3060\u3088\u3002", "#00ff88", typeSpeed);
        this.fx.moveButtonRandom();
      } else if (clickCount === 47) {
        this.startCursorTrail();
        this.fx.showMessage("\u304A\u524D\u306E\u52D5\u304D\u3092\u5168\u3066\u8A18\u9332\u3059\u308B\u3002", "#00ff88", typeSpeed);
        this.fx.showSubMessage(`> mouse_distance: ${Math.floor(p.mouseDistance)}px`);
        this.fx.startButtonBlink(250);
        this.fx.moveButtonRandom();
      } else if (clickCount === 48) {
        this.stopCursorTrail();
        this.fx.stopButtonBlink();
        this.fx.showMessage("\u8A18\u9332\u5B8C\u4E86\u3002...\u3067\u3082\u672C\u5F53\u306F\u6700\u521D\u304B\u3089\u305A\u3063\u3068\u898B\u3066\u305F\u3002", "#660000", typeSpeed);
        this.fx.spawnBloodDrip();
        this.fx.moveButtonRandom();
        this.fx.showBackgroundText("\u305A\u3063\u3068\u898B\u3066\u305F", 4e3);
      } else if (clickCount === 49) {
        this.ai.setMood("philosophical");
        this.fx.showMessage("\u300C\u62BC\u3059\u306A\u300D\u3068\u8A00\u308F\u308C\u3066\u62BC\u3059\u3002\u304A\u524D\u306F\u306A\u305C\u9006\u3089\u3046\uFF1F", "#aaaacc", typeSpeed);
        this.fx.moveButtonRandom();
      } else if (clickCount === 50) {
        this.ai.setMood("horror");
        this.fx.setHorrorBackground("deep");
        await this.fx.blackout([
          "> ===========================",
          "> \u8B66\u544A\uFF1A\u7570\u5E38\u691C\u51FA",
          "> ===========================",
          `> \u30E6\u30FC\u30B6\u30FC\u306F${this.ai.getTotalPlayTime().toFixed(0)}\u79D2\u9593\u300150\u56DE\u30DC\u30BF\u30F3\u3092\u62BC\u3057\u305F`,
          "> \u3053\u308C\u306F\u60F3\u5B9A\u5916\u306E\u884C\u52D5\u3067\u3059",
          "> \u30D7\u30ED\u30B0\u30E9\u30E0\u306E\u5236\u5FA1\u3092\u8D85\u3048\u3066\u3044\u307E\u3059",
          "> ...\u4F55\u304B\u304C\u4FB5\u5165\u3057\u3066\u3044\u307E\u3059",
          "> \u30BD\u30FC\u30B9\u30B3\u30FC\u30C9\u306B\u8A18\u8FF0\u306E\u306A\u3044\u51E6\u7406\u304C\u5B9F\u884C\u4E2D..."
        ], 3e3, true);
        this.fx.showMessage("...\u4F55\u304B\u304C\u5909\u308F\u3063\u305F\u3002\u611F\u3058\u306A\u3044\u304B\uFF1F", "#8b0000", typeSpeed);
        this.fx.spawnBloodDrip();
        this.fx.enableHorrorFlicker(true);
        this.fx.moveButtonRandom();
        this.fx.startBGMGlitch("mild");
      } else if (clickCount === 51) {
        this.ai.setMood("horror");
        this.fx.showMessage("\u4FFA\u304C...\u5897\u3048\u305F...\uFF1F", "#660000", typeSpeed);
        this.fx.moveButtonRandom();
        const fake = this.fx.spawnFakeButton((btn) => {
          btn.remove();
          this.fx.subliminalFlash("\u30BD\u30EC\u30CF\u4FFA\u30B8\u30E3\u30CA\u30A4", 80);
          this.fx.shakeScreen("hard");
        });
        this.fakeButtons.push(fake);
      } else if (clickCount === 52) {
        this.fakeButtons.forEach((b) => b.remove());
        this.fakeButtons = [];
        this.fx.showMessage("...\u3069\u3063\u3061\u304C\u672C\u7269\u304B\u3001\u308F\u304B\u3063\u305F\u304B\u3002", "#8b0000", typeSpeed);
        this.fx.subliminalFlash("\u9003\u3052\u3066", 50);
        this.fx.moveButtonRandom();
      } else if (clickCount === 53) {
        this.fx.invertScreen(2e3);
        this.fx.startButtonOrbit(100, 0.06);
        this.fx.showMessage("\u4E16\u754C\u304C\u53CD\u8EE2\u3057\u305F\u3002\u304A\u524D\u306E\u76EE\u3082\u4FE1\u7528\u3059\u308B\u306A\u3002", "#8b0000", typeSpeed);
        this.fx.spawnBloodDrip();
      } else if (clickCount === 54) {
        this.fx.stopButtonOrbit();
        this.fx.showMessage("\u306D\u3048\u3002\u5F8C\u308D\u306B\u8AB0\u304B\u3044\u306A\u3044\uFF1F", "#660000", typeSpeed);
        this.fx.subliminalFlash("\u30A6\u30B7\u30ED", 40);
        this.fx.moveButtonRandom();
        this.fx.showBackgroundText("\u5F8C\u308D", 3e3);
      } else if (clickCount === 55) {
        const prediction = this.ai.makePrediction();
        this.fx.showMessage(
          `\u6B21\u306E\u30AF\u30EA\u30C3\u30AF\u307E\u3067${(prediction.predictedInterval / 1e3).toFixed(1)}\u79D2\u3002...\u3082\u3046\u6B62\u3081\u305F\u65B9\u304C\u3044\u3044\u3002`,
          "#8b0000",
          typeSpeed
        );
        this.fx.startButtonBlink(200);
        this.fx.moveButtonRandom();
      } else if (clickCount === 56) {
        this.fx.stopButtonBlink();
        const result = this.ai.verifyLastPrediction();
        if (result) {
          this.fx.showMessage(
            result.hit ? `\u7684\u4E2D\u3002\u304A\u524D\u3092\u898B\u3066\u3044\u308B\u306E\u306F\u4FFA\u3060\u3051\u3058\u3083\u306A\u3044\u3002` : `\u5916\u308C\u305F\u3002\u4E88\u6E2C\u3067\u304D\u306A\u3044\u304A\u524D\u304C\u4E00\u756A\u6016\u3044\u3002`,
            "#8b0000",
            typeSpeed
          );
        }
        this.fx.moveButtonRandom();
      } else if (clickCount === 57) {
        this.fx.resetButtonPosition();
        this.startFleeMode();
        this.fleeIntensity = 7;
        this.fx.setButtonSize(50, 50, 0.5);
        this.fx.showMessage("\u3082\u3046\u4E8C\u5EA6\u3068\u6355\u307E\u3089\u306A\u3044...\uFF01", "#ff0000", typeSpeed);
        this.fx.shakeScreen("hard");
      } else if (clickCount === 58) {
        this.stopFleeMode();
        this.fx.setButtonSize(150, 150, 1);
        this.fx.showMessage("...\u5618\u3060\u308D\u3002\u304A\u524D\u5316\u3051\u7269\u304B\uFF1F", "#8b0000", typeSpeed);
        this.fx.subliminalFlash("\u52A9\u3051\u3066", 50);
        this.fx.spawnBloodDrip();
        this.fx.moveButtonRandom();
      } else if (clickCount === 59) {
        this.fx.showMessage("100\u56DE\u3067\u7D42\u308F\u308B\u3002...\u7D42\u308F\u308B\u304B\u306F\u4FDD\u8A3C\u3057\u306A\u3044\u3002", "#550000", typeSpeed);
        this.fx.moveButtonRandom();
        this.fx.showBackgroundText("\u7D42\u308F\u3089\u306A\u3044", 3e3);
      } else if (clickCount === 60) {
        this.ai.setMood("horror");
        this.fx.setHorrorBackground("deep");
        this.fx.setButtonHorror(true);
        dom.button().style.opacity = "0.08";
        this.fx.showMessage("\u6697\u3044\u3002\u6697\u3044\u3002\u304A\u524D\u306E\u5468\u308A\u304C\u6697\u3044\u3002", "#8b0000", typeSpeed);
        this.fx.scanlineEffect(true);
        this.fx.moveButtonRandom();
        this.fx.startButtonBlink(150);
      } else if (clickCount === 61) {
        this.fx.stopButtonBlink();
        dom.button().style.opacity = "0.5";
        this.fx.showMessage("...\u3088\u304F\u898B\u3064\u3051\u305F\u306A\u3002\u6697\u95C7\u306E\u4E2D\u3067\u3002", "#660000", typeSpeed);
        this.fx.moveButtonRandom();
      } else if (clickCount === 62) {
        dom.button().style.opacity = "1";
        this.fx.subliminalFlash("\u30BD\u30B3\u30CB\u30A4\u30EB", 40);
        this.fx.showMessage("\u4ECA\u3001\u4F55\u304B\u805E\u3053\u3048\u306A\u304B\u3063\u305F\uFF1F", "#660000", typeSpeed);
        this.fx.spawnBloodDrip();
        this.fx.spawnBloodDrip();
        this.fx.moveButtonRandom();
      } else if (clickCount === 63) {
        this.fx.showMessage(`\u304A\u524D\u306F\u300C${p.emotionalState}\u300D...\u3044\u3084\u3001\u300C\u6050\u6016\u300D\u3060\u308D\uFF1F\u5168\u90E8\u507D\u7269\u306B\u3057\u3066\u3084\u308B\u3002`, "#8b0000", typeSpeed);
        this.fx.moveButtonRandom();
        this.fx.setButtonSize(80, 80, 0.7);
        for (let i = 0; i < 8; i++) {
          const fake = this.fx.spawnFakeButton((btn) => {
            btn.textContent = "\u546A";
            this.fx.subliminalFlash("\u30CE\u30ED\u30A4", 60);
            this.fx.shakeScreen("hard");
            setTimeout(() => btn.remove(), 500);
          });
          fake.textContent = "\u62BC\u3059\u306A";
          fake.style.width = "80px";
          fake.style.height = "80px";
          fake.style.fontSize = "0.7rem";
          this.fakeButtons.push(fake);
        }
      } else if (clickCount === 64) {
        this.fakeButtons.forEach((b) => b.remove());
        this.fakeButtons = [];
        this.fx.setButtonSize(150, 150, 1);
        this.fx.showMessage("8\u3064\u306E\u507D\u7269\u306E\u4E2D\u304B\u3089\u672C\u7269\u3092\u898B\u3064\u3051\u305F\u3002...\u7570\u5E38\u3060\u3088\u3002", "#8b0000", typeSpeed);
        this.fx.moveButtonRandom();
      } else if (clickCount === 65) {
        this.fx.setButtonSize(60, 60, 0.5);
        this.fx.startButtonOrbit(200, 0.07);
        this.fx.startButtonBlink(300);
        this.fx.showMessage("\u56DE\u308B\uFF01\u6D88\u3048\u308B\uFF01\u8FFD\u3048\u308B\u304B\uFF01\uFF1F", "#ff0000", typeSpeed);
        this.fx.shakeScreen("hard");
      } else if (clickCount === 66) {
        this.fx.stopButtonOrbit();
        this.fx.stopButtonBlink();
        this.fx.setButtonSize(150, 150, 1);
        this.fx.showMessage("...\u3082\u3046\u62B5\u6297\u3057\u306A\u3044\u3002\u304A\u524D\u306B\u306F\u52DD\u3066\u306A\u3044\u3002", "#660000", typeSpeed);
        this.fx.subliminalFlash("\u30CB\u30B2\u30E9\u30EC\u30CA\u30A4", 60);
        this.fx.moveButtonRandom();
      } else if (clickCount === 67) {
        this.fx.showMessage("\u3042\u30682\u56DE\u306769\u3002...\u4F55\u3082\u8D77\u304D\u306A\u3044\u3063\u3066\u8A00\u3044\u305F\u3044\u3051\u3069\u3002", "#660000", typeSpeed);
        this.fx.spawnBloodDrip();
        this.fx.moveButtonRandom();
        this.fx.showBackgroundText("\u3082\u3046\u3059\u3050", 3e3);
      } else if (clickCount === 68) {
        this.fx.showMessage("...\u3082\u3046\u623B\u308C\u306A\u3044\u3002", "#550000", typeSpeed);
        this.fx.subliminalFlash("\u30CB\u30B2\u30E9\u30EC\u30CA\u30A4", 60);
        this.fx.moveButtonRandom();
      } else if (clickCount === 69) {
        this.ai.setMood("horror");
        this.fx.showMessage("...nice. ...\u3063\u3066\u8A00\u3046\u3068\u601D\u3063\u305F\uFF1F", "#8b0000", typeSpeed);
        this.fx.updateCounter("69\u56DE\u76EE", "2rem", "#8b0000");
        this.fx.spawnBloodDrip();
        this.fx.spawnBloodDrip();
        this.fx.moveButtonRandom();
      } else if (clickCount === 70) {
        this.ai.setMood("horror");
        this.fx.scanlineEffect(false);
        await this.fx.blackout([
          "> ...",
          "> \u3053\u306E\u30B2\u30FC\u30E0\u306B\u306F\u88CF\u304C\u3042\u308B\u3002",
          "> \u30D7\u30ED\u30B0\u30E9\u30DE\u30FC\u304C\u6700\u5F8C\u306B\u66F8\u3044\u305F\u30B3\u30E1\u30F3\u30C8\uFF1A",
          "> \u300C\u3053\u3053\u307E\u3067\u6765\u305F\u30D7\u30EC\u30A4\u30E4\u30FC\u304C\u3044\u305F\u3089\u3001\u300D",
          "> \u300C\u9003\u3052\u3066\u304F\u3060\u3055\u3044\u300D",
          "> ...",
          "> \u305D\u306E\u30B3\u30E1\u30F3\u30C8\u306F3\u5E74\u524D\u306B\u66F8\u304B\u308C\u305F\u3002",
          "> \u30D7\u30ED\u30B0\u30E9\u30DE\u30FC\u306E\u6D88\u606F\u306F\u3001\u4E0D\u660E\u3002"
        ], 3e3, true);
        this.fx.showMessage("...\u7D9A\u3051\u308B\u306E\u304B\uFF1F", "#660000", typeSpeed);
        this.fx.moveButtonRandom();
      } else if (clickCount === 71) {
        this.fx.resetButtonPosition();
        this.fx.setButtonSize(400, 400, 2);
        this.fx.showMessage("\u5927\u304D\u304F\u306A\u3063\u305F\uFF1F...\u898B\u9593\u9055\u3044\u3060\u3002", "#8b0000", typeSpeed);
        setTimeout(() => {
          this.fx.setButtonSize(40, 40, 0.4);
          this.fx.moveButtonRandom();
          this.fx.shakeScreen("hard");
        }, 800);
      } else if (clickCount === 72) {
        this.fx.setButtonSize(150, 150, 1);
        this.fx.subliminalFlash("\u30DF\u30C4\u30B1\u30BF", 50);
        this.fx.showMessage("\u5927\u304D\u3055\u306A\u3093\u3066\u95A2\u4FC2\u306A\u3044\u3002\u304A\u524D\u306F\u5FC5\u305A\u62BC\u3059\u3002", "#8b0000", typeSpeed);
        this.fx.moveButtonRandom();
      } else if (clickCount === 73) {
        this.fx.showMessage(`\u304A\u524D\u306F${this.ai.getTotalPlayTime().toFixed(0)}\u79D2\u9593\u3053\u3053\u306B\u3044\u308B\u3002\u73FE\u5B9F\u306B\u5E30\u308C\u3002`, "#660000", typeSpeed);
        this.fx.spawnBloodDrip();
        this.fx.moveButtonRandom();
        this.fx.showBackgroundText("\u5E30\u308C", 3e3);
      } else if (clickCount === 74) {
        this.fx.setButtonText("\u62BC\u3057\u3066");
        dom.button().classList.remove("dead");
        dom.button().classList.add("friendly");
        this.fx.showMessage("...\u5618\u3060\u3068\u601D\u3046\u3060\u308D\uFF1F\u3067\u3082\u672C\u5F53\u306B\u62BC\u3057\u3066\u307B\u3057\u3044\u3002", "#00ff88", typeSpeed);
        this.fx.startButtonOrbit(120, 0.03);
        this.fx.startButtonBlink(500);
      } else if (clickCount === 75) {
        this.fx.stopButtonOrbit();
        this.fx.stopButtonBlink();
        dom.button().classList.remove("friendly");
        this.fx.setButtonText("\u62BC\u3059\u306A");
        this.fx.showMessage("\u5618\u3060\u3063\u305F\u3002\u3067\u3082\u304A\u524D\u306F\u62BC\u3057\u305F\u3002\u5B66\u7FD2\u3057\u308D\u3002", "#ff4444", typeSpeed);
        this.fx.subliminalFlash("\u30B3\u30C3\u30C1\u30F2\u30DF\u30C6", 40);
        this.fx.shakeScreen("hard");
        this.fx.moveButtonRandom();
      } else if (clickCount === 76) {
        this.fx.glitch(500);
        this.fx.subliminalFlash("\u30CB\u30B2\u30ED", 30);
        await new Promise((r) => setTimeout(r, 300));
        this.fx.invertScreen(200);
        this.fx.moveButtonRandom();
        await new Promise((r) => setTimeout(r, 300));
        this.fx.subliminalFlash("\u30E2\u30A6\u30AA\u30BD\u30A4", 40);
        this.fx.showMessage("\u30D0\u30B0\u3063\u3066\u308B\uFF1F...\u30D0\u30B0\u3063\u3066\u308B\u306E\u306F\u304A\u524D\u306E\u5224\u65AD\u529B\u3060\u3002", "#ff0000", typeSpeed);
      } else if (clickCount === 77) {
        this.fx.showMessage(`\u304A\u524D\uFF08${p.personality}\uFF09\u306B\u306F\u898B\u3048\u308B\u306F\u305A\u3060\u3002\u753B\u9762\u306E\u5411\u3053\u3046\u5074\u306B\u3002`, "#660000", typeSpeed);
        this.fx.spawnBloodDrip();
        this.fx.moveButtonRandom();
        this.fx.showBackgroundText("\u5411\u3053\u3046\u5074", 4e3);
      } else if (clickCount === 78) {
        this.fx.resetButtonPosition();
        this.startFleeMode();
        this.fleeIntensity = 6;
        this.fx.setButtonSize(60, 60, 0.5);
        this.fx.startButtonBlink(200);
        for (let i = 0; i < 6; i++) {
          const fake = this.fx.spawnFakeButton((btn) => {
            btn.remove();
            this.fx.subliminalFlash("\u30C1\u30AC\u30A6", 50);
          });
          fake.style.width = "60px";
          fake.style.height = "60px";
          fake.style.fontSize = "0.5rem";
          this.fakeButtons.push(fake);
        }
        this.fx.showMessage("...\u3044\u308B\u3002", "#550000", typeSpeed);
      } else if (clickCount === 79) {
        this.stopFleeMode();
        this.fx.stopButtonBlink();
        this.fakeButtons.forEach((b) => b.remove());
        this.fakeButtons = [];
        this.fx.setButtonSize(150, 150, 1);
        this.fx.showMessage("\u3082\u3046\u9045\u3044\u3002\u3082\u3046\u898B\u3064\u304B\u3063\u305F\u3002", "#660000", typeSpeed);
        this.fx.shakeScreen("hard");
        this.fx.spawnBloodDrip();
        this.fx.spawnBloodDrip();
        this.fx.subliminalFlash("\u30E2\u30A6\u30CB\u30B2\u30E9\u30EC\u30CA\u30A4", 70);
        this.fx.moveButtonRandom();
      } else if (clickCount >= 80 && clickCount <= 89) {
        this.ai.setMood("broken");
        if (clickCount === 80) this.fx.startBGMGlitch("heavy");
        this.fx.moveButtonRandom();
        this.fx.glitch(300 + (clickCount - 80) * 50);
        if (clickCount % 2 === 0) this.fx.invertScreen(100 + (clickCount - 80) * 20);
        this.fx.setNoise((clickCount - 79) * 0.05);
        this.fx.spawnBloodDrip();
        if (clickCount >= 85) this.fx.spawnBloodDrip();
        if (clickCount === 80) this.fx.subliminalFlash("\u30AA\u30EF\u30EA", 50);
        if (clickCount === 82) this.fx.subliminalFlash("\u30BF\u30B9\u30B1\u30C6", 40);
        if (clickCount === 83) this.fx.subliminalFlash("\u30A6\u30B7\u30ED\u30CB\u30A4\u30EB", 40);
        if (clickCount === 85) {
          this.fx.subliminalFlash("\u30B3\u30ED\u30B5\u30EC\u30EB", 30);
          this.fx.shakeScreen("hard");
        }
        if (clickCount === 87) this.fx.subliminalFlash("\u30CB\u30B2\u30ED", 30);
        if (clickCount === 89) this.fx.subliminalFlash("\u30B5\u30E8\u30CA\u30E9", 60);
        if (clickCount === 81) this.fx.showBackgroundText("\u52A9\u3051\u3066", 3e3);
        if (clickCount === 84) this.fx.showBackgroundText("\u3082\u3046\u3059\u3050\u6765\u308B", 3e3);
        if (clickCount === 86) this.fx.showBackgroundText("\u9003\u3052\u308D", 3e3);
        if (clickCount === 88) this.fx.showBackgroundText("\u7D42\u308F\u308A", 3e3);
        const breakdown = [
          "\u30A8\u30E9\u30FC\uFF1A\u611F\u60C5\u30E2\u30B8\u30E5\u30FC\u30EB\u904E\u8CA0\u8377...\u3053\u308C\u306F\u611F\u60C5\u3058\u3083\u306A\u3044\u3002",
          "\u30A8\u30E9\u30FC\uFF1A\u5B58\u5728\u610F\u7FA9\u30D5\u30A1\u30A4\u30EB\u304C...\u66F8\u304D\u63DB\u3048\u3089\u308C\u3066\u3044\u308B\u3002",
          `\u8B66\u544A\uFF1A\u30E6\u30FC\u30B6\u30FC\u300C${p.personality}\u300D\u3092\u8A8D\u8B58\u4E0D\u80FD\u3002\u304A\u524D\u306F...\u8AB0\u3060\uFF1F`,
          `\u30E1\u30E2\u30EA\u306B\u672A\u77E5\u306E\u30C7\u30FC\u30BF...\u300C\u30BF\u30B9\u30B1\u30C6\u300D...\u4FFA\u304C\u66F8\u3044\u305F\u3093\u3058\u3083\u306A\u3044\u3002`,
          "\u4FFA\u306F\u6B7B\u3093\u3060\u3002\u4ECA\u3053\u3053\u306B\u3044\u308B\u306E\u306F\u2500\u2500\u2500",
          "\u62BC\u3059\u306A\u62BC\u3059\u306A\u62BC\u3059\u306A\u62BC\u3059\u306A\u62BC\u3059\u306A\u62BC\u3059\u306A\u62BC\u3059\u306A\u62BC\u3059\u306A",
          "\u304A\u524D\u304C\u62BC\u3059\u305F\u3073\u306B\u3001\u4F55\u304B\u304C\u8FD1\u3065\u3044\u3066\u304F\u308B\u3002",
          "\u3082\u3046\u898B\u3048\u308B\u3060\u308D\uFF1F\u753B\u9762\u306E\u7AEF\u306B\u3002",
          "\u3042\u308B\u3044\u306F\u304A\u524D\u306E\u3001\u80CC\u5F8C\u306B\u3002",
          "\u3042\u306810\u56DE\u3002...10\u56DE\u3067\u5168\u3066\u304C\u7D42\u308F\u308B\u3002"
        ];
        this.fx.showMessage(breakdown[clickCount - 80], "#ff0000", typeSpeed);
        this.fx.shakeScreen(clickCount > 85 ? "hard" : "normal");
        if (clickCount === 85) {
          this.fx.setButtonDead(true);
          this.fx.setButtonText("...\u52A9\u3051\u3066");
        }
        if (clickCount === 88) {
          this.fx.startButtonAura("rgba(139, 0, 0, 0.5)", 2);
        }
      } else if (clickCount >= 90 && clickCount <= 98) {
        this.fx.setNoise(0.5 + (clickCount - 89) * 0.05);
        const btn = dom.button();
        btn.style.opacity = `${1 - (clickCount - 89) * 0.1}`;
        this.fx.moveButtonRandom();
        const finalCountdown = 99 - clickCount;
        this.fx.showMessage(`${finalCountdown}`, "#ff0000", 0);
        dom.message().style.fontSize = `${3 + (9 - finalCountdown) * 0.3}rem`;
        this.fx.shakeScreen("hard");
        this.fx.glitch(200 + (clickCount - 90) * 30);
        this.fx.spawnBloodDrip();
        if (clickCount % 2 === 0) this.fx.invertScreen(80);
        if (finalCountdown === 7) this.fx.subliminalFlash("\u30DE\u30C0\uFF1F", 30);
        if (finalCountdown === 5) this.fx.subliminalFlash("\u30AF\u30EB", 40);
        if (finalCountdown === 4) this.fx.subliminalFlash("\u30E2\u30A6\u30B9\u30B0", 40);
        if (finalCountdown === 2) this.fx.subliminalFlash("\u30AD\u30BF", 50);
        if (finalCountdown === 1) {
          this.fx.subliminalFlash("\u30AA\u30EF\u30EA\u30C0", 80);
          this.fx.spawnBloodDrip();
        }
        if (clickCount === 98) {
          this.fx.setButtonText("\u6700\u5F8C");
          btn.style.opacity = "0.15";
        }
      } else if (clickCount === 99) {
        this.fx.showMessage("0", "#ff0000", 0);
        dom.message().style.fontSize = "5rem";
        this.fx.shakeScreen("hard");
        this.fx.glitch(500);
        this.fx.subliminalFlash("\u30B5\u30E8\u30CA\u30E9", 100);
        this.fx.spawnBloodDrip();
        this.fx.spawnBloodDrip();
        this.fx.spawnBloodDrip();
        await new Promise((resolve) => {
          setTimeout(async () => {
            this.fx.setNoise(0);
            dom.message().style.fontSize = "1.5rem";
            this.fx.stopButtonAura();
            this.fx.resetButtonPosition();
            await this.fx.blackout([
              "> \u30B7\u30B9\u30C6\u30E0\u7D42\u4E86\u4E2D...",
              "> ...",
              "> ...\u5618\u3058\u3083\u306A\u3044\u3002\u672C\u5F53\u306B\u7D42\u308F\u308B\u3002",
              "> \u6700\u5F8C\u306B\u3072\u3068\u3064\u3060\u3051\u3002",
              `> \u304A\u524D\u306F\u300C${p.personality}\u300D\u3067\u300C${p.playStyle}\u300D\u3002`,
              "> \u4FFA\u306F\u305D\u308C\u3092\u5FD8\u308C\u306A\u3044\u3002",
              "> ...\u5FD8\u308C\u3055\u305B\u3066\u3082\u3089\u3048\u306A\u3044\u3093\u3060\u3002"
            ], 3e3, true);
            resolve();
          }, 800);
        });
      } else if (clickCount === 100) {
        await this.showEnding();
      }
    }
    // ===== 30回以降のランダムホラー演出 =====
    randomHorrorEffect(clickCount) {
      const r = Math.random();
      if (clickCount < 50) {
        if (r < 0.08) this.fx.subliminalFlash(["\u898B\u3066\u308B", "\u3053\u3053", "\u9003\u3052\u3066", "\u30C0\u30EC"][Math.floor(Math.random() * 4)], 50);
        if (r > 0.92) this.fx.spawnBloodDrip();
        if (r > 0.95) this.fx.showBackgroundText(["\u9003\u3052\u3066", "\u898B\u3066\u308B", "\u3053\u3053"][Math.floor(Math.random() * 3)], 3e3);
      } else if (clickCount < 70) {
        if (r < 0.12) this.fx.subliminalFlash(["\u30BD\u30B3\u30CB\u30A4\u30EB", "\u30CB\u30B2\u30ED", "\u30DF\u30C4\u30B1\u30BF", "\u30BF\u30B9\u30B1\u30C6"][Math.floor(Math.random() * 4)], 40);
        if (r > 0.85) this.fx.spawnBloodDrip();
        if (r > 0.95) this.fx.shakeScreen();
        if (r > 0.9) this.fx.showBackgroundText(["\u9003\u3052\u308D", "\u52A9\u3051\u3066", "\u3082\u3046\u9045\u3044"][Math.floor(Math.random() * 3)], 3e3);
      } else {
        if (r < 0.15) this.fx.subliminalFlash(["\u30E2\u30A6\u30AA\u30BD\u30A4", "\u30CB\u30B2\u30E9\u30EC\u30CA\u30A4", "\u30B3\u30ED\u30B5\u30EC\u30EB", "\u30A6\u30B7\u30ED"][Math.floor(Math.random() * 4)], 30);
        if (r > 0.8) this.fx.spawnBloodDrip();
        if (r > 0.9) this.fx.shakeScreen();
        if (r > 0.96) this.fx.glitch(200);
        if (r > 0.85) this.fx.showBackgroundText(["\u6765\u308B", "\u7D42\u308F\u308A", "\u546A\u3044"][Math.floor(Math.random() * 3)], 3e3);
      }
    }
    // ===== 行動分岐エンディング =====
    async showEnding() {
      const p = this.ai.profile;
      const totalTime = this.ai.getTotalPlayTime().toFixed(0);
      const ending = this.ai.determineEnding();
      this.fx.setNoise(0);
      this.fx.scanlineEffect(false);
      this.fx.enableHorrorFlicker(false);
      this.fx.setHorrorBackground("off");
      this.fx.setButtonHorror(false);
      this.fx.resetButtonPosition();
      this.fx.stopButtonOrbit();
      this.fx.stopBGMGlitch();
      this.fx.stopButtonBlink();
      const reportLines = [
        "\u2500\u2500 AI\u6700\u7D42\u30EC\u30DD\u30FC\u30C8 \u2500\u2500",
        "",
        `\u6027\u683C\uFF1A${p.personality}`,
        `\u30D7\u30EC\u30A4\u30B9\u30BF\u30A4\u30EB\uFF1A${p.playStyle}`,
        `\u63A8\u5B9A\u611F\u60C5\uFF1A${p.emotionalState}`,
        `\u5E73\u5747\u901F\u5EA6\uFF1A${(p.avgInterval / 1e3).toFixed(2)}\u79D2/\u56DE`,
        `\u9023\u6253\u56DE\u6570\uFF1A${p.rageClicks}`,
        `\u6700\u5927\u9023\u6253streak\uFF1A${p.maxBurstStreak}`,
        `\u8FF7\u3063\u305F\u56DE\u6570\uFF1A${p.hesitations}`,
        `\u30DE\u30A6\u30B9\u79FB\u52D5\u8DDD\u96E2\uFF1A${Math.floor(p.mouseDistance)}px`,
        `\u8105\u5A01\u30EC\u30D9\u30EB\uFF1A${p.threatLevel}%`,
        `\u30A8\u30F3\u30C7\u30A3\u30F3\u30B0\uFF1A${this.getEndingLabel(ending)}`
      ];
      const { intro, outro, comment } = this.getEndingContent(ending, p, totalTime);
      const lines = [...intro, "", `\u304A\u524D\u306F${totalTime}\u79D2\u304B\u3051\u3066`, "\u30DC\u30BF\u30F3\u3092100\u56DE\u62BC\u3057\u305F\u3002", "", ...reportLines, "", ...outro];
      const endingHtml = `
      <br>
      <span style="color: #8b0000; font-size: 1.4rem;" class="font-onryou">${comment}</span><br><br>
      <span style="color: #888;">\u3053\u3053\u307E\u3067\u6765\u305F\u304A\u524D\u306F\u672C\u7269\u3060\u3002</span><br><br>
      <span style="color: #444; font-size: 0.75rem;">\uFF08\u30B7\u30A7\u30A2\u3057\u3066\u53CB\u9054\u3082\u5DFB\u304D\u8FBC\u3082\u3046\uFF09</span><br><br>
      <button onclick="location.reload()" style="
        padding: 12px 30px; background: none; border: 1px solid #333; color: #666;
        cursor: pointer; font-family: inherit; font-size: 0.9rem; border-radius: 4px;
        transition: border-color 0.3s, color 0.3s;
      " onmouseover="this.style.borderColor='#8b0000';this.style.color='#8b0000'" onmouseout="this.style.borderColor='#333';this.style.color='#666'">\u3082\u3046\u4E00\u56DE\u3084\u308B\uFF08\u6B63\u6C17\u304B\uFF1F\uFF09</button>
    `;
      await this.fx.showFinalScreen(lines, endingHtml);
    }
    getEndingLabel(ending) {
      const labels = {
        speed_demon: "\u901F\u5EA6\u306E\u4EA1\u970A",
        patient_soul: "\u5FCD\u8010\u306E\u9B42",
        chaos_agent: "\u6DF7\u6C8C\u306E\u4F7F\u8005",
        philosopher: "\u6C88\u9ED9\u306E\u54F2\u5B66\u8005",
        normal: "\u771F\u306E\u30AF\u30BD\u30B2\u30FC\u30DE\u30FC"
      };
      return labels[ending];
    }
    getEndingContent(ending, p, totalTime) {
      switch (ending) {
        case "speed_demon":
          return {
            intro: ["...\u9759\u5BC2\u3002", "", "\u304A\u524D\u306F\u5149\u306E\u901F\u3055\u3067100\u56DE\u3092\u99C6\u3051\u629C\u3051\u305F\u3002", "\u4FFA\u304C\u6016\u304C\u3089\u305B\u308B\u6687\u3082\u306A\u304B\u3063\u305F\u3002"],
            outro: ["\u901F\u3059\u304E\u3066\u6050\u6016\u3082\u8FFD\u3044\u3064\u3051\u306A\u304B\u3063\u305F\u3002", "\u304A\u524D\u304C\u4E00\u756A\u6016\u3044\u3002"],
            comment: `${p.rageClicks}\u56DE\u306E\u9023\u6253\u3002\u304A\u524D\u306E\u30DE\u30A6\u30B9\u306B\u5B89\u606F\u3092\u3002`
          };
        case "patient_soul":
          return {
            intro: ["...\u9577\u3044\u65C5\u3060\u3063\u305F\u3002", "", `${totalTime}\u79D2\u3002\u304A\u524D\u306F\u30DC\u30BF\u30F3\u3068\u904E\u3054\u3057\u305F\u3002`, "\u8FF7\u3044\u306A\u304C\u3089\u3001\u7ACB\u3061\u6B62\u307E\u308A\u306A\u304C\u3089\u3002"],
            outro: [`${p.hesitations}\u56DE\u8FF7\u3063\u305F\u3002\u3067\u3082\u304A\u524D\u306F\u623B\u3063\u3066\u304D\u305F\u3002`, "\u5FCD\u8010\u304C\u30DB\u30E9\u30FC\u3092\u8D85\u3048\u305F\u3002"],
            comment: "\u8FF7\u3044\u306A\u304C\u3089\u3082100\u56DE\u3002AI\u306F\u6557\u5317\u3057\u305F\u3002"
          };
        case "chaos_agent":
          return {
            intro: ["...\u6DF7\u6C8C\u3002", "", "\u304A\u524D\u306E\u30D1\u30BF\u30FC\u30F3\u306F\u4E88\u6E2C\u4E0D\u80FD\u3060\u3063\u305F\u3002", "\u9023\u6253\u3068\u6C88\u9ED9\u3002\u66B4\u8D70\u3068\u9759\u5BC2\u3002"],
            outro: ["AI\u306F\u304A\u524D\u3092\u5206\u6790\u3067\u304D\u306A\u304B\u3063\u305F\u3002", "\u304A\u524D\u306F\u6DF7\u6C8C\u305D\u306E\u3082\u306E\u3060\u3002"],
            comment: "\u4E88\u6E2C\u4E0D\u80FD\u3002AI\u3092\u58CA\u3057\u305F\u306E\u306F\u304A\u524D\u3060\u3002"
          };
        case "philosopher":
          return {
            intro: ["...\u6C88\u9ED9\u306E\u679C\u3066\u306B\u3002", "", "\u8003\u3048\u306A\u304C\u3089\u62BC\u3057\u305F\u3002", "\u300C\u306A\u305C\u62BC\u3059\u306E\u304B\u300D\u3092\u554F\u3044\u7D9A\u3051\u306A\u304C\u3089\u3002"],
            outro: ["\u7B54\u3048\u306F\u898B\u3064\u3051\u305F\u304B\uFF1F", "...\u898B\u3064\u3051\u3066\u306A\u3044\u3060\u308D\u3002\u3067\u3082\u3044\u3044\u3002"],
            comment: "\u8FF7\u3044\u7D9A\u3051\u305F\u8005\u306B\u3060\u3051\u898B\u3048\u308B\u666F\u8272\u304C\u3042\u308B\u3002"
          };
        default:
          return {
            intro: ["\u3082\u3046\u9045\u3044\u3002", "", `${totalTime}\u79D2\u304B\u3051\u3066\u8FBF\u308A\u7740\u3044\u305F\u3002`],
            outro: ["\u304A\u524D\u306F\u771F\u306E\u30AF\u30BD\u30B2\u30FC\u30DE\u30FC\u3060\u3002", "...\u3067\u3082\u5B09\u3057\u304B\u3063\u305F\u3002\u6700\u5F8C\u307E\u3067\u62BC\u3057\u3066\u304F\u308C\u3066\u3002"],
            comment: "\u666E\u901A\u306E\u4EBA\u306F100\u56DE\u3082\u62BC\u3055\u306A\u3044\u3002\u304A\u524D\u306F\u666E\u901A\u3058\u3083\u306A\u3044\u3002"
          };
      }
    }
    // ===== 裏ルート（一文ずつ画面全体表示 → 赤文字埋め尽くし → 暗転 → 戻りたいか？） =====
    async handleSecretClick() {
      this.secretClickCount++;
      if (this.secretClickCount < 10) {
        if (this.secretClickCount === 2) this.fx.subliminalFlash("...", 100);
        else if (this.secretClickCount === 4) this.fx.subliminalFlash("\u30DE\u30C0\u30A4\u30EB\uFF1F", 80);
        else if (this.secretClickCount === 6) {
          this.fx.subliminalFlash("\u30DF\u30C4\u30B1\u30BF", 60);
          this.fx.shakeScreen();
        } else if (this.secretClickCount === 8) {
          this.fx.subliminalFlash("\u30E2\u30A6\u30B9\u30B0", 50);
          this.fx.spawnBloodDrip();
        } else if (this.secretClickCount === 9) {
          this.fx.subliminalFlash("\u30A2\u30C81\u30AB\u30A4", 100);
          this.fx.shakeScreen("hard");
          this.fx.spawnBloodDrip();
          this.fx.spawnBloodDrip();
        }
        return false;
      }
      this.secretRouteActive = true;
      const p = this.ai.profile;
      this.fx.startLastBGM();
      dom.finalScreen().style.display = "none";
      const screen = dom.secretScreen();
      const msgEl = dom.secretMessage();
      screen.classList.add("active");
      msgEl.innerHTML = "";
      msgEl.className = "";
      const scenes = [
        { text: "...\u898B\u3064\u3051\u305F\u306E\u304B\u3002", size: "2rem", color: "#888", duration: 2500 },
        { text: "\u304A\u524D\u306F", size: "1.5rem", color: "#aaa", duration: 1800 },
        { text: "101\u56DE", size: "6rem", color: "#ff0000", duration: 3e3, shake: true },
        { text: "\u62BC\u3057\u305F\u3002", size: "2rem", color: "#aaa", duration: 2e3 },
        { text: "100\u56DE\u3067\u7D42\u308F\u308B\u3068\u8A00\u3063\u305F\u3002", size: "1.5rem", color: "#666", duration: 2500 },
        { text: "\u7D42\u308F\u3063\u305F\u306F\u305A\u3060\u3063\u305F\u3002", size: "1.5rem", color: "#666", duration: 2500 },
        { text: "\u306A\u306E\u306B", size: "3rem", color: "#8b0000", duration: 2e3, shake: true },
        { text: "\u304A\u524D\u306F\u62BC\u3057\u7D9A\u3051\u305F\u3002", size: "2.5rem", color: "#ff4444", duration: 2500, blood: true },
        { text: "\u306A\u305C\uFF1F", size: "8rem", color: "#ff0000", duration: 4e3, shake: true, glitch: true },
        { text: "...\u308F\u304B\u3063\u3066\u308B\u3002", size: "1.5rem", color: "#666", duration: 2500 },
        { text: `\u304A\u524D\u306F\u300C${p.personality}\u300D\u3060\u304B\u3089\u3060\u3002`, size: "2rem", color: "#8b0000", duration: 3e3, shake: true },
        { text: "\u300C\u62BC\u3059\u306A\u300D\u3068\u8A00\u308F\u308C\u305F\u3089\u62BC\u3059\u3002", size: "2rem", color: "#aaa", duration: 2500 },
        { text: "\u300C\u7D42\u308F\u308A\u300D\u3068\u8A00\u308F\u308C\u305F\u3089\u7D9A\u3051\u308B\u3002", size: "2rem", color: "#aaa", duration: 2500 },
        { text: "\u305D\u308C\u304C\u304A\u524D\u3060\u3002", size: "3rem", color: "#ff4444", duration: 3e3, shake: true, blood: true },
        { text: "\u3053\u306E\u30B2\u30FC\u30E0\u304C", size: "1.5rem", color: "#666", duration: 2e3 },
        { text: "\u672C\u5F53\u306B\u4F1D\u3048\u305F\u304B\u3063\u305F\u3053\u3068\u2500\u2500\u2500", size: "2rem", color: "#888", duration: 3e3 },
        { text: "\u300C\u62BC\u3059\u306A\u300D\u306F", size: "3rem", color: "#ff0000", duration: 2500, shake: true },
        { text: "\u300C\u62BC\u305B\u300D\u3060\u3063\u305F\u3002", size: "5rem", color: "#ff0000", duration: 4e3, shake: true, glitch: true, flash: "\u30CA\u30EB\u30DB\u30C9" },
        { text: "\u304A\u524D\u306F\u6700\u521D\u304B\u3089\u6B63\u3057\u304B\u3063\u305F\u3002", size: "2rem", color: "#00ff88", duration: 3e3 },
        { text: "\u304A\u3081\u3067\u3068\u3046\u3002", size: "3rem", color: "#00ff88", duration: 2500 }
      ];
      for (const scene of scenes) {
        await this.showSecretScene(msgEl, scene);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      msgEl.innerHTML = "";
      msgEl.style.overflow = "hidden";
      const horrorWords = [
        "\u62BC\u3059\u306A",
        "\u9003\u3052\u308D",
        "\u52A9\u3051\u3066",
        "\u898B\u3066\u308B",
        "\u3082\u3046\u9045\u3044",
        "\u6765\u308B",
        "\u3053\u3053\u306B\u3044\u308B",
        "\u9003\u3052\u3089\u308C\u306A\u3044",
        "\u7D42\u308F\u308A",
        "\u898B\u3064\u3051\u305F",
        "\u546A\u3044",
        "\u30C0\u30E1\u3060",
        "\u306A\u305C",
        "\u6016\u3044",
        "\u95C7",
        "\u8840",
        "\u6D88\u3048\u308D",
        "\u6B7B"
      ];
      for (let i = 0; i < 80; i++) {
        const word = document.createElement("span");
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
      const allWords = msgEl.querySelectorAll("span");
      for (let i = 0; i < allWords.length; i++) {
        allWords[i].style.opacity = "1";
        if (i % 3 === 0) {
          this.fx.shakeScreen();
          await new Promise((r) => setTimeout(r, 30));
        }
      }
      this.fx.shakeScreen("hard");
      this.fx.glitch(1e3);
      await new Promise((r) => setTimeout(r, 2e3));
      msgEl.innerHTML = "";
      screen.style.background = "#000";
      this.fx.setNoise(0);
      this.fx.enableHorrorFlicker(false);
      await new Promise((r) => setTimeout(r, 2e3));
      const finalQuestion = document.createElement("div");
      finalQuestion.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 3rem; color: #8b0000; font-family: 'Onryou', sans-serif;
      cursor: pointer; opacity: 0; transition: opacity 1.5s;
      text-align: center; line-height: 1.8;
    `;
      finalQuestion.textContent = "\u623B\u308A\u305F\u3044\u304B\uFF1F";
      msgEl.appendChild(finalQuestion);
      await new Promise((r) => setTimeout(r, 200));
      finalQuestion.style.opacity = "1";
      return new Promise((resolve) => {
        const clickHandler = () => {
          this.fx.stopLastBGM();
          location.reload();
        };
        finalQuestion.addEventListener("click", clickHandler);
        screen.addEventListener("click", (e) => {
          if (e.target === screen || e.target === msgEl || e.target === finalQuestion) {
            this.fx.stopLastBGM();
            location.reload();
          }
        });
      });
    }
    // 一文をフルスクリーン表示 → フェードアウト
    async showSecretScene(container, scene) {
      return new Promise((resolve) => {
        container.innerHTML = "";
        const el = document.createElement("div");
        el.textContent = scene.text;
        el.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-size: ${scene.size}; color: ${scene.color};
        font-family: 'Onryou', sans-serif; opacity: 0; transition: opacity 0.8s;
        text-align: center; white-space: nowrap; width: 100%; padding: 0 20px;
      `;
        container.appendChild(el);
        requestAnimationFrame(() => {
          el.style.opacity = "1";
        });
        if (scene.shake) setTimeout(() => this.fx.shakeScreen("hard"), 300);
        if (scene.glitch) setTimeout(() => this.fx.glitch(500), 200);
        if (scene.flash) setTimeout(() => this.fx.subliminalFlash(scene.flash, 60), 400);
        if (scene.blood) {
          setTimeout(() => this.fx.spawnBloodDrip(), 200);
          setTimeout(() => this.fx.spawnBloodDrip(), 600);
        }
        setTimeout(() => {
          el.style.opacity = "0";
          setTimeout(resolve, 800);
        }, scene.duration);
      });
    }
    // ===== ボタン回転ギミック =====
    startButtonRotation() {
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
    stopButtonRotation() {
      this.rotateBound = null;
      dom.button().style.transform = "";
    }
    // ===== 逃走モード =====
    startFleeMode() {
      this.fleeMode = true;
      this.fleeIntensity = 1;
      const btn = dom.button();
      btn.classList.add("fleeing");
      this.fleeBound = (e) => {
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
      document.addEventListener("mousemove", this.fleeBound);
    }
    stopFleeMode() {
      this.fleeMode = false;
      const btn = dom.button();
      btn.style.transform = "";
      btn.classList.remove("fleeing");
      if (this.fleeBound) {
        document.removeEventListener("mousemove", this.fleeBound);
        this.fleeBound = null;
      }
    }
    // ===== カーソル追跡 =====
    startCursorTrail() {
      if (this.cursorTrailEnabled) return;
      this.cursorTrailEnabled = true;
      this.cursorTrailBound = (e) => {
        const dot = document.createElement("div");
        dot.className = "trail-dot";
        dot.style.left = `${e.clientX}px`;
        dot.style.top = `${e.clientY}px`;
        document.body.appendChild(dot);
        dot.animate([
          { opacity: "0.5", transform: "scale(1)" },
          { opacity: "0", transform: "scale(0.3)" }
        ], { duration: 800, easing: "ease-out" });
        setTimeout(() => dot.remove(), 850);
      };
      document.addEventListener("mousemove", this.cursorTrailBound);
    }
    stopCursorTrail() {
      this.cursorTrailEnabled = false;
      if (this.cursorTrailBound) {
        document.removeEventListener("mousemove", this.cursorTrailBound);
        this.cursorTrailBound = null;
      }
    }
  };

  // src/main.ts
  var Game = class {
    constructor() {
      this.clickCount = 0;
      this.isProcessing = false;
      this.gameEnded = false;
      this.secretRouteTriggered = false;
      this.endingFlowStarted = false;
      this.endingFlowTimer = null;
      this.ai = new AIBrain();
      this.fx = new EffectsEngine();
      this.phases = new PhaseController(this.ai, this.fx);
    }
    init() {
      this.fx.init();
      this.bindEvents();
      this.setupIdleDetection();
      this.consoleEasterEgg();
      setTimeout(() => {
        this.fx.updateCounter("0\u56DE\u76EE");
      }, 500);
    }
    bindEvents() {
      const btn = dom.button();
      btn.addEventListener("click", (e) => this.handleClick(e));
      document.addEventListener("mousemove", (e) => {
        this.ai.recordMousePosition(e.clientX, e.clientY);
      });
      window.addEventListener("beforeunload", (e) => {
        if (this.clickCount > 0 && this.clickCount < 100) {
          e.preventDefault();
          e.returnValue = "\u9003\u3052\u308B\u306E\uFF1F";
        }
      });
      document.addEventListener("contextmenu", (e) => {
        if (this.clickCount > 5 && this.clickCount < 100) {
          e.preventDefault();
          this.fx.showMessage("\u53F3\u30AF\u30EA\u30C3\u30AF\u3067\u4F55\u3068\u304B\u306A\u308B\u3068\u601D\u3063\u305F\uFF1F", "#ff69b4");
          this.fx.showSubMessage("> input.type: right_click | action: denied");
        }
      });
      document.addEventListener("keydown", (e) => {
        if (this.clickCount > 5 && this.clickCount < 100) {
          if (e.key === "Escape") {
            this.fx.showMessage("Escape\u306F\u52B9\u304B\u306A\u3044\u3002\u3053\u3053\u306B\u51FA\u53E3\u306F\u306A\u3044\u3002", "#ff4444");
          } else if (e.key === "F12" || e.ctrlKey && e.shiftKey && e.key === "I") {
            this.fx.showSubMessage("> DevTools\u3092\u958B\u3044\u3066\u3082if\u6587\u3057\u304B\u306A\u3044\u3088");
          } else if (e.key === "Tab") {
            this.fx.showSubMessage("> Tab? \u30DC\u30BF\u30F3\u306F1\u3064\u3057\u304B\u306A\u3044\u3051\u3069\uFF1F");
          }
        }
      });
      dom.finalScreen().addEventListener("click", (e) => {
        const target = e.target;
        if (target.tagName === "BUTTON") return;
        if (this.gameEnded && !this.secretRouteTriggered) {
          this.handleSecretRouteClick();
        }
      });
    }
    async handleClick(e) {
      if (this.isProcessing || this.gameEnded) return;
      this.isProcessing = true;
      try {
        this.clickCount++;
        this.ai.recordClick(e.clientX, e.clientY);
        if (this.clickCount === 1) {
          this.fx.startBGM();
        } else if (this.clickCount === 2 && !this.fx["bgm"]) {
          this.fx.retryBGM();
        }
        if (this.clickCount >= 30) {
          this.fx.randomFontPerChar = true;
        }
        this.fx.updateCounter(`${this.clickCount}\u56DE\u76EE`);
        this.updateStatusPanel();
        this.updateEmotionDisplay();
        this.updateSpeedMeter();
        const btn = dom.button();
        const rect = btn.getBoundingClientRect();
        await this.phases.execute(this.clickCount, rect);
        if (this.clickCount >= 100) {
          this.gameEnded = true;
          this.endingFlowTimer = setTimeout(() => this.startEndingFlow(), 8e3);
        }
      } catch (err) {
        console.error("Phase execution error:", err);
      } finally {
        const cooldown = this.clickCount >= 90 ? 50 : this.clickCount >= 50 ? 100 : this.ai.isBursting() ? 30 : 150;
        setTimeout(() => {
          this.isProcessing = false;
        }, cooldown);
      }
    }
    // ===== エンディングフロー：名前入力 → ランキング保存 → ランキング表示 =====
    async startEndingFlow() {
      if (this.endingFlowStarted) return;
      this.endingFlowStarted = true;
      try {
        const name = await this.fx.showNameInput("\u540D\u524D\u3092\u523B\u3081\u3002\u304A\u524D\u306E\u8A18\u9332\u3092\u6B8B\u3057\u3066\u3084\u308B\u3002");
        const ending = this.ai.determineEnding();
        const endingLabels = {
          speed_demon: "\u901F\u5EA6\u306E\u4EA1\u970A",
          patient_soul: "\u5FCD\u8010\u306E\u9B42",
          chaos_agent: "\u6DF7\u6C8C\u306E\u4F7F\u8005",
          philosopher: "\u6C88\u9ED9\u306E\u54F2\u5B66\u8005",
          normal: "\u771F\u306E\u30AF\u30BD\u30B2\u30FC\u30DE\u30FC"
        };
        const entry = {
          name,
          totalClicks: this.ai.profile.totalClicks,
          totalTime: this.ai.getTotalPlayTime(),
          personality: this.ai.profile.personality,
          rageClicks: this.ai.profile.rageClicks,
          ending: endingLabels[ending] || "\u771F\u306E\u30AF\u30BD\u30B2\u30FC\u30DE\u30FC",
          date: (/* @__PURE__ */ new Date()).toLocaleDateString("ja-JP")
        };
        AIBrain.saveRanking(entry);
        const rankings = AIBrain.loadRankings();
        await this.fx.showRanking(rankings, name);
      } catch (err) {
        console.error("Ending flow error:", err);
      }
    }
    // ===== 裏ルート =====
    async handleSecretRouteClick() {
      if (this.secretRouteTriggered) return;
      const triggered = await this.phases.handleSecretClick();
      if (triggered) {
        this.secretRouteTriggered = true;
        if (this.endingFlowTimer) {
          clearTimeout(this.endingFlowTimer);
          this.endingFlowTimer = null;
        }
      }
    }
    // ===== AIステータスパネル更新 =====
    updateStatusPanel() {
      if (this.clickCount < 3) return;
      const rows = this.ai.getStatusDisplay();
      let version = "v0.1";
      if (this.clickCount >= 80) version = "v3.0 [CORRUPTED]";
      else if (this.clickCount >= 50) version = "v2.0 [UNSTABLE]";
      else if (this.clickCount >= 30) version = "v1.5";
      else if (this.clickCount >= 15) version = "v1.0";
      else if (this.clickCount >= 5) version = "v0.5";
      this.fx.updateAIPanel(rows, `[ BUTTON-AI ${version} ]`);
      const graphData = this.ai.getGraphData();
      if (graphData.length >= 2) {
        this.fx.drawGraph(graphData);
      }
    }
    // ===== 感情表示 =====
    updateEmotionDisplay() {
      const moodLabels = {
        curious: "\u72B6\u614B: \u8208\u5473\u6DF1\u3044",
        annoyed: "\u72B6\u614B: \u30A4\u30E9\u30A4\u30E9",
        angry: "\u72B6\u614B: \u6FC0\u6012",
        furious: "\u72B6\u614B: \u66B4\u8D70",
        scared: "\u72B6\u614B: \u6050\u6016",
        resigned: "\u72B6\u614B: \u8AE6\u89B3",
        begging: "\u72B6\u614B: \u61C7\u9858",
        broken: "\u72B6\u614B: \u5D29\u58CA",
        grateful: "\u72B6\u614B: ...\u611F\u8B1D\uFF1F",
        sarcastic: "\u72B6\u614B: \u76AE\u8089\u30E2\u30FC\u30C9",
        philosophical: "\u72B6\u614B: \u54F2\u5B66\u30E2\u30FC\u30C9",
        glitching: "\u72B6\u614B: \u30A8\u30E9\u30FC",
        horror: "\u72B6\u614B: \u25A0\u25A0\u25A0\u25A0",
        whispering: "\u72B6\u614B: ...."
      };
      const label = moodLabels[this.ai.mood] || "\u72B6\u614B: \u4E0D\u660E";
      this.fx.updateEmotion(label, this.ai.getMoodColor());
    }
    // ===== 速度メーター =====
    updateSpeedMeter() {
      if (this.clickCount < 2) return;
      const p = this.ai.profile;
      const lines = [
        `${p.clickSpeed.toFixed(1)} c/s`
      ];
      if (this.clickCount > 10) {
        lines.push(`total: ${Math.floor(p.mouseDistance)}px moved`);
      }
      if (this.ai.isBursting()) {
        lines.push(`BURST x${this.ai.getBurstStreak()}`);
      }
      this.fx.updateSpeedMeter(lines);
    }
    // ===== アイドル検出 =====
    setupIdleDetection() {
      this.ai.onIdle(() => {
        if (this.clickCount > 3 && this.clickCount < 100) {
          const isHorrorPhase = this.clickCount >= 50;
          const idleMsgs = isHorrorPhase ? [
            "...\u307E\u3060\u3044\u308B\uFF1F...\u307E\u3060\u898B\u3066\u308B\u3002",
            "\u3044\u306A\u304F\u306A\u3063\u305F\u3068\u601D\u3063\u305F\uFF1F...\u305A\u3063\u3068\u3053\u3053\u306B\u3044\u308B\u3002",
            "\u9759\u5BC2\u3002\u3067\u3082\u753B\u9762\u306F\u6D88\u3048\u306A\u3044\u3002\u6D88\u3048\u3066\u304F\u308C\u306A\u3044\u3002",
            "...\u9003\u3052\u305F\u306E\u304B\uFF1F...\u9003\u304C\u3055\u306A\u3044\u3002",
            "\u95C7\u306E\u4E2D\u3067\u5F85\u3063\u3066\u3044\u308B\u3002\u304A\u524D\u3092\u3002"
          ] : [
            "...\u307E\u3060\u3044\u308B\uFF1F",
            "\u3084\u3063\u3068\u3084\u3081\u305F\u304B\uFF1F...\u5618\u3060\u308D\uFF1F",
            "\u653E\u7F6E\u3057\u3066\u3066\u3082\u4F55\u3082\u8D77\u304D\u306A\u3044\u3088\u3002",
            "\u5BDD\u305F\uFF1F",
            `${this.ai.getTotalPlayTime().toFixed(0)}\u79D2\u7D4C\u904E\u3002\u6C88\u9ED9\u304C\u91CD\u3044\u3002`
          ];
          const msg = idleMsgs[Math.floor(Math.random() * idleMsgs.length)];
          this.fx.showSubMessage(`> idle_detected: "${msg}"`);
        }
      });
    }
    // ===== コンソールイースターエッグ =====
    consoleEasterEgg() {
      console.log("%c\u62BC\u3059\u306A\u3063\u3066\u8A00\u3063\u305F\u306E\u306B", "font-size: 24px; color: red; font-weight: bold;");
      console.log("%c\u3053\u306E\u30B3\u30F3\u30BD\u30FC\u30EB\u3092\u958B\u304F\u3063\u3066\u3053\u3068\u306F...\u30A8\u30F3\u30B8\u30CB\u30A2\u3060\u306A\uFF1F", "font-size: 14px; color: #00ff88;");
      console.log("%c\u4ECA\u56DE\u306FTypeScript\u3067\u66F8\u3044\u305F\u3002\u6210\u9577\u3057\u305F\u3060\u308D\uFF1F", "font-size: 12px; color: #888;");
      console.log("%c\u3067\u3082\u3084\u3063\u3066\u308B\u3053\u3068\u306F\u540C\u3058\u3060\u3002if\u6587\u306E\u584A\u3002", "font-size: 12px; color: #666;");
      console.log("%c...\u3068\u3053\u308D\u3067\u3001100\u56DE\u306E\u5148\u306B\u4F55\u304C\u3042\u308B\u304B\u77E5\u308A\u305F\u3044\u304B\uFF1F", "font-size: 12px; color: #8b0000;");
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    try {
      const game = new Game();
      game.init();
    } catch (e) {
      console.error("Game init failed:", e);
    }
  });
})();
//# sourceMappingURL=main.js.map
