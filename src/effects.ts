// ===== Effects Engine =====
// 視覚エフェクト・ホラー演出管理

import { dom } from './dom';

const ALL_FONTS = [
  'font-comic-light', 'font-round', 'font-onryou',
];

export class EffectsEngine {
  private typewriterTimer: ReturnType<typeof setInterval> | null = null;
  private auraCtx: CanvasRenderingContext2D | null = null;
  private auraAnimId: number | null = null;
  private graphCtx: CanvasRenderingContext2D | null = null;
  private horrorFlicker: HTMLElement | null = null;
  private bgm: HTMLAudioElement | null = null;
  randomFontPerChar = false;

  init(): void {
    this.auraCtx = dom.buttonAura().getContext('2d');
    this.graphCtx = dom.aiGraph().getContext('2d');
  }

  // ===== BGM =====

  startBGM(): void {
    if (this.bgm) return;
    this.bgm = new Audio('BGM.mp3');
    this.bgm.loop = true;
    this.bgm.volume = 0.5;
    this.bgm.play().catch(() => {
      // autoplay blocked - will retry on next click
      this.bgm = null;
    });
  }

  retryBGM(): void {
    if (this.bgm) return;
    this.bgm = new Audio('BGM.mp3');
    this.bgm.loop = true;
    this.bgm.volume = 0.5;
    this.bgm.play().catch(() => {});
  }

  // BGM途切れ演出（ミュート/アンミュートを繰り返す。再生位置はそのまま）
  private bgmGlitchId: ReturnType<typeof setInterval> | null = null;
  startBGMGlitch(intensity: 'mild' | 'heavy' = 'mild'): void {
    this.stopBGMGlitch();
    if (!this.bgm) return;
    const minOn = intensity === 'heavy' ? 200 : 500;
    const maxOn = intensity === 'heavy' ? 800 : 2000;
    const minOff = intensity === 'heavy' ? 100 : 200;
    const maxOff = intensity === 'heavy' ? 600 : 800;

    const toggle = () => {
      if (!this.bgm) return;
      this.bgm.muted = !this.bgm.muted;
      const min = this.bgm.muted ? minOff : minOn;
      const max = this.bgm.muted ? maxOff : maxOn;
      const next = min + Math.random() * (max - min);
      this.bgmGlitchId = setTimeout(toggle, next) as unknown as ReturnType<typeof setInterval>;
    };
    toggle();
  }

  stopBGMGlitch(): void {
    if (this.bgmGlitchId) { clearTimeout(this.bgmGlitchId as unknown as number); this.bgmGlitchId = null; }
    if (this.bgm) this.bgm.muted = false;
  }

  // ===== メッセージ =====

  showMessage(text: string, color = '#fff', speed = 30, fontClass?: string): void {
    const el = dom.message();
    el.style.color = color;
    el.innerHTML = '';
    el.style.fontSize = '1.5rem';
    el.className = 'visible';

    if (this.typewriterTimer) clearInterval(this.typewriterTimer);

    if (this.randomFontPerChar) {
      // 1文字ずつランダムフォントで表示（ホラー演出）
      let i = 0;
      this.typewriterTimer = setInterval(() => {
        if (i < text.length) {
          const span = document.createElement('span');
          span.textContent = text[i];
          span.className = ALL_FONTS[Math.floor(Math.random() * ALL_FONTS.length)];
          el.appendChild(span);
          i++;
        } else {
          if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        }
      }, speed);
    } else if (fontClass) {
      // 全体に1つのフォントクラス
      el.classList.add(fontClass);
      let i = 0;
      this.typewriterTimer = setInterval(() => {
        if (i < text.length) { el.textContent = (el.textContent || '') + text[i]; i++; }
        else { if (this.typewriterTimer) clearInterval(this.typewriterTimer); }
      }, speed);
    } else {
      // 通常テキスト
      let i = 0;
      this.typewriterTimer = setInterval(() => {
        if (i < text.length) { el.textContent = (el.textContent || '') + text[i]; i++; }
        else { if (this.typewriterTimer) clearInterval(this.typewriterTimer); }
      }, speed);
    }
  }

  showSubMessage(text: string): void {
    const el = dom.subMessage();
    el.textContent = text;
    el.classList.add('visible');
  }

  clearSubMessage(): void {
    const el = dom.subMessage();
    el.textContent = '';
    el.classList.remove('visible');
  }

  // ===== 画面エフェクト =====

  shakeScreen(intensity: 'normal' | 'hard' = 'normal'): void {
    document.body.classList.remove('shake', 'shake-hard');
    void document.body.offsetWidth;
    document.body.classList.add(intensity === 'hard' ? 'shake-hard' : 'shake');
  }

  glitch(duration = 200): void {
    document.body.classList.add('glitch');
    setTimeout(() => document.body.classList.remove('glitch'), duration);
  }

  setNoise(opacity: number): void { dom.noise().style.opacity = `${opacity}`; }

  invertScreen(duration = 200): void {
    document.body.classList.add('inverted');
    setTimeout(() => document.body.classList.remove('inverted'), duration);
  }

  scanlineEffect(enable: boolean): void {
    document.body.classList.toggle('scanline-effect', enable);
  }

  // ===== ホラー演出 =====

  setHorrorBackground(level: 'mild' | 'deep' | 'off'): void {
    document.body.classList.remove('horror-bg', 'deep-horror');
    if (level === 'mild') document.body.classList.add('horror-bg');
    else if (level === 'deep') document.body.classList.add('deep-horror');
  }

  enableHorrorFlicker(enable: boolean): void {
    if (enable && !this.horrorFlicker) {
      this.horrorFlicker = document.createElement('div');
      this.horrorFlicker.className = 'horror-flicker';
      document.body.appendChild(this.horrorFlicker);
    } else if (!enable && this.horrorFlicker) {
      this.horrorFlicker.remove();
      this.horrorFlicker = null;
    }
  }

  enableVignette(enable: boolean): void {
    document.body.classList.toggle('vignette', enable);
  }

  setHorrorPanel(enable: boolean): void {
    dom.aiPanel().classList.toggle('horror-panel', enable);
  }

  setButtonHorror(enable: boolean): void {
    dom.button().classList.toggle('horror-pulse', enable);
  }

  subliminalFlash(text: string, duration = 100): void {
    const el = dom.subliminal();
    el.textContent = text;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, duration);
  }

  spawnBloodDrip(): void {
    const drip = document.createElement('div');
    drip.className = 'blood-drip';
    drip.style.left = `${Math.random() * 100}%`;
    drip.style.height = `${30 + Math.random() * 80}px`;
    document.body.appendChild(drip);

    drip.animate([
      { top: '-20px', opacity: '0' },
      { top: '10px', opacity: '1' },
      { top: `${window.innerHeight + 20}px`, opacity: '0.5' },
    ], { duration: 2000 + Math.random() * 2000, easing: 'ease-in' });

    setTimeout(() => drip.remove(), 4500);
  }

  // ===== パーティクル =====

  spawnParticles(x: number, y: number, count = 6, color = '#ff0000'): void {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.background = color;
      document.body.appendChild(p);

      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = 50 + Math.random() * 120;
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;

      p.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: '1' },
        { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: '0' }
      ], { duration: 600 + Math.random() * 400, easing: 'ease-out' });
      setTimeout(() => p.remove(), 1100);
    }
  }

  spawnTextParticle(x: number, y: number, text: string, color = '#ff0000'): void {
    const el = document.createElement('div');
    el.className = 'text-particle';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    document.body.appendChild(el);

    const dx = (Math.random() - 0.5) * 100;
    el.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: '1' },
      { transform: `translate(${dx}px, -80px) scale(0.5)`, opacity: '0' }
    ], { duration: 1200, easing: 'ease-out' });
    setTimeout(() => el.remove(), 1300);
  }

  // ===== 暗転 =====

  async blackout(lines: string[], holdDuration = 2000, horror = false): Promise<void> {
    return new Promise(resolve => {
      const overlay = dom.blackout();
      const textEl = dom.blackoutText();
      overlay.classList.add('active');
      if (horror) textEl.classList.add('horror-text');
      else textEl.classList.remove('horror-text');
      textEl.innerHTML = '';

      let idx = 0;
      const show = () => {
        if (idx < lines.length) {
          const line = document.createElement('div');
          line.textContent = lines[idx];
          line.style.opacity = '0';
          line.style.transition = 'opacity 0.3s';
          textEl.appendChild(line);
          requestAnimationFrame(() => { line.style.opacity = '1'; });
          idx++;
          setTimeout(show, 700);
        } else {
          setTimeout(() => { overlay.classList.remove('active'); resolve(); }, holdDuration);
        }
      };
      show();
    });
  }

  async blackoutWithProgress(lines: string[], holdDuration = 2000): Promise<void> {
    const bar = dom.analysisBar();
    const fill = bar.querySelector('.fill') as HTMLElement;
    bar.classList.add('visible');
    fill.style.width = '0%';

    return new Promise(resolve => {
      const overlay = dom.blackout();
      const textEl = dom.blackoutText();
      overlay.classList.add('active');
      textEl.innerHTML = '';
      let idx = 0;
      const total = lines.length;
      const show = () => {
        if (idx < total) {
          const line = document.createElement('div');
          line.textContent = lines[idx];
          line.style.opacity = '0';
          line.style.transition = 'opacity 0.3s';
          textEl.appendChild(line);
          requestAnimationFrame(() => { line.style.opacity = '1'; });
          fill.style.width = `${((idx + 1) / total) * 100}%`;
          idx++;
          setTimeout(show, 700);
        } else {
          fill.style.width = '100%';
          setTimeout(() => {
            overlay.classList.remove('active');
            bar.classList.remove('visible');
            fill.style.width = '0%';
            resolve();
          }, holdDuration);
        }
      };
      show();
    });
  }

  // ===== 吹き出し =====

  showPlea(text: string, duration = 2000): void {
    const bubble = dom.pleaBubble();
    bubble.textContent = text;
    bubble.classList.add('visible');
    setTimeout(() => bubble.classList.remove('visible'), duration);
  }

  // ===== ボタン =====

  buttonPulse(): void {
    const btn = dom.button();
    btn.classList.remove('pulse-red');
    void btn.offsetWidth;
    btn.classList.add('pulse-red');
  }

  setButtonSize(w: number, h: number, fs: number): void {
    const btn = dom.button();
    btn.style.width = `${w}px`;
    btn.style.height = `${h}px`;
    btn.style.fontSize = `${fs}rem`;
  }

  setButtonText(text: string): void { dom.button().textContent = text; }

  setButtonFriendly(on: boolean): void {
    const btn = dom.button();
    btn.classList.toggle('friendly', on);
    if (on) btn.classList.remove('dead');
  }

  setButtonDead(on: boolean): void {
    const btn = dom.button();
    btn.classList.toggle('dead', on);
    if (on) btn.classList.remove('friendly');
  }

  // ===== オーラ =====

  startButtonAura(color = 'rgba(255, 0, 0, 0.3)', intensity = 1): void {
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

  stopButtonAura(): void {
    if (this.auraAnimId) { cancelAnimationFrame(this.auraAnimId); this.auraAnimId = null; }
    if (this.auraCtx) this.auraCtx.clearRect(0, 0, dom.buttonAura().width, dom.buttonAura().height);
  }

  // ===== AIパネル =====

  updateAIPanel(rows: Array<{ label: string; value: string; type?: 'danger' | 'warn' }>, headerText?: string): void {
    dom.aiPanel().classList.add('visible');
    if (headerText) dom.aiPanelHeader().textContent = headerText;
    dom.aiPanelBody().innerHTML = rows.map(r => {
      const cls = r.type ? `value ${r.type}` : 'value';
      return `<div class="row"><span class="label">${r.label}</span><span class="${cls}">${r.value}</span></div>`;
    }).join('');
  }

  // ===== グラフ =====

  drawGraph(data: number[]): void {
    if (!this.graphCtx || data.length < 2) return;
    const canvas = dom.aiGraph();
    const ctx = this.graphCtx;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 15) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    data.forEach((val, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((val - min) / range) * (h - 10) - 5;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const lx = w, ly = h - ((data[data.length - 1] - min) / range) * (h - 10) - 5;
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fillStyle = '#00ff88'; ctx.fill();
  }

  // ===== UI更新 =====

  updateEmotion(text: string, color: string): void {
    const el = dom.emotion(); el.textContent = text; el.style.color = color;
  }

  updateCounter(text: string, fontSize?: string, color?: string): void {
    const el = dom.counter(); el.textContent = text;
    if (fontSize) el.style.fontSize = fontSize;
    if (color) el.style.color = color;
  }

  updateSpeedMeter(lines: string[]): void { dom.speedMeter().innerHTML = lines.join('<br>'); }

  showAchievement(title: string): void {
    const popup = dom.achievementPopup();
    popup.textContent = `>> ${title} <<`;
    popup.classList.add('show');
    setTimeout(() => popup.classList.remove('show'), 3000);
  }

  // ===== 偽ボタン =====

  spawnFakeButton(onClick: (btn: HTMLElement) => void): HTMLElement {
    const fake = document.createElement('button');
    fake.textContent = '本物';
    fake.style.cssText = `
      position:fixed; width:90px; height:90px; border-radius:50%;
      border:3px solid #ff0000; background:radial-gradient(circle at 35% 35%,#ff3333,#990000);
      color:white; font-size:0.9rem; font-weight:900; cursor:pointer; font-family:inherit;
      box-shadow:0 0 30px rgba(255,0,0,0.3); z-index:10;
      top:${15+Math.random()*60}%; left:${10+Math.random()*70}%; transition:all 0.3s;
    `;
    fake.addEventListener('click', () => onClick(fake));
    document.body.appendChild(fake);
    return fake;
  }

  // ===== 最終画面 =====

  async showFinalScreen(lines: string[], endingHtml: string): Promise<void> {
    dom.button().style.display = 'none';
    dom.warning().style.display = 'none';
    dom.message().classList.remove('visible');
    dom.subMessage().classList.remove('visible');
    dom.counter().style.display = 'none';
    dom.aiPanel().style.display = 'none';
    dom.emotion().style.display = 'none';
    dom.pleaBubble().style.display = 'none';
    dom.speedMeter().style.display = 'none';
    this.enableHorrorFlicker(false);
    this.enableVignette(false);
    this.setNoise(0);
    this.scanlineEffect(false);

    const screen = dom.finalScreen();
    const msgEl = dom.finalMessage();
    screen.classList.add('active');
    msgEl.innerHTML = '';

    return new Promise(resolve => {
      let idx = 0;
      const show = () => {
        if (idx < lines.length) {
          if (lines[idx] === '') { msgEl.appendChild(document.createElement('br')); }
          else {
            const span = document.createElement('span');
            span.style.opacity = '0';
            span.style.transition = 'opacity 0.5s';
            span.textContent = lines[idx];
            msgEl.appendChild(span);
            msgEl.appendChild(document.createElement('br'));
            requestAnimationFrame(() => { span.style.opacity = '1'; });
          }
          idx++;
          setTimeout(show, 800);
        } else {
          setTimeout(() => {
            const ending = document.createElement('div');
            ending.style.marginTop = '30px';
            ending.style.opacity = '0';
            ending.style.transition = 'opacity 1s';
            ending.innerHTML = endingHtml;
            msgEl.appendChild(ending);
            requestAnimationFrame(() => { ending.style.opacity = '1'; });
            resolve();
          }, 2000);
        }
      };
      setTimeout(show, 1000);
    });
  }

  // ===== 裏ルート画面 =====

  async showSecretScreen(lines: string[], fontClass?: string): Promise<void> {
    dom.finalScreen().style.display = 'none';
    const screen = dom.secretScreen();
    const msgEl = dom.secretMessage();
    screen.classList.add('active');
    msgEl.innerHTML = '';
    if (fontClass) msgEl.className = fontClass;

    return new Promise(resolve => {
      let idx = 0;
      const show = () => {
        if (idx < lines.length) {
          const line = document.createElement('div');
          line.className = 'secret-text-line';
          line.textContent = lines[idx];
          msgEl.appendChild(line);
          requestAnimationFrame(() => { line.classList.add('visible'); });
          idx++;
          setTimeout(show, 1200);
        } else {
          setTimeout(resolve, 2000);
        }
      };
      setTimeout(show, 500);
    });
  }

  // ===== 名前入力 =====

  showNameInput(promptText: string): Promise<string> {
    return new Promise(resolve => {
      const overlay = dom.nameOverlay();
      dom.namePrompt().textContent = promptText;
      const input = dom.nameInput();
      input.value = '';
      overlay.classList.add('active');
      input.focus();

      const submit = () => {
        const name = input.value.trim() || '名無し';
        overlay.classList.remove('active');
        resolve(name);
      };

      dom.nameSubmit().onclick = submit;
      input.onkeydown = (e: KeyboardEvent) => { if (e.key === 'Enter') submit(); };
    });
  }

  // ===== ランキング表示 =====

  showRanking(entries: Array<{name: string; totalClicks: number; totalTime: number; personality: string; date: string}>, currentName?: string): Promise<void> {
    return new Promise(resolve => {
      const overlay = dom.rankingOverlay();
      const list = dom.rankingList();
      overlay.classList.add('active');

      list.innerHTML = entries.slice(0, 10).map((e, i) => {
        const isCurrent = e.name === currentName;
        return `<div class="rank-row ${isCurrent ? 'current' : ''}">
          <span class="rank-num">${i + 1}.</span>
          <span class="rank-name">${e.name}</span>
          <span class="rank-score">${e.totalClicks}回 / ${e.totalTime.toFixed(0)}秒 / ${e.personality}</span>
        </div>`;
      }).join('');

      dom.rankingClose().onclick = () => { overlay.classList.remove('active'); resolve(); };
    });
  }

  // ===== ボタン位置操作 =====

  moveButtonTo(xPercent: number, yPercent: number): void {
    const btn = dom.button();
    const bw = btn.offsetWidth;
    const bh = btn.offsetHeight;
    const nx = (window.innerWidth * xPercent / 100) - window.innerWidth / 2;
    const ny = (window.innerHeight * yPercent / 100) - window.innerHeight / 2;
    const maxX = window.innerWidth / 2 - bw / 2 - 10;
    const maxY = window.innerHeight / 2 - bh / 2 - 10;
    btn.style.transform = `translate(${Math.max(-maxX, Math.min(maxX, nx))}px, ${Math.max(-maxY, Math.min(maxY, ny))}px)`;
  }

  moveButtonRandom(): void {
    this.moveButtonTo(15 + Math.random() * 70, 15 + Math.random() * 70);
  }

  resetButtonPosition(): void {
    dom.button().style.transform = '';
  }

  // ボタン円軌道移動
  private orbitId: number | null = null;
  private orbitAngle = 0;
  startButtonOrbit(radius = 120, speed = 0.03): void {
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

  stopButtonOrbit(): void {
    if (this.orbitId) { cancelAnimationFrame(this.orbitId); this.orbitId = null; }
    dom.button().style.transform = '';
  }

  // ボタン点滅
  private blinkId: ReturnType<typeof setInterval> | null = null;
  startButtonBlink(intervalMs = 300): void {
    this.stopButtonBlink();
    const btn = dom.button();
    let visible = true;
    this.blinkId = setInterval(() => {
      visible = !visible;
      btn.style.opacity = visible ? '1' : '0';
    }, intervalMs);
  }

  stopButtonBlink(): void {
    if (this.blinkId) { clearInterval(this.blinkId); this.blinkId = null; }
    dom.button().style.opacity = '1';
  }

  // ===== 裏ルートBGM =====

  private lastBgm: HTMLAudioElement | null = null;
  startLastBGM(): void {
    // 通常BGMを停止
    if (this.bgm) { this.bgm.pause(); this.bgm = null; }
    if (this.lastBgm) return;
    this.lastBgm = new Audio('LastBGM.mp3');
    this.lastBgm.loop = true;
    this.lastBgm.volume = 0.6;
    this.lastBgm.play().catch(() => {});
  }

  stopLastBGM(): void {
    if (this.lastBgm) { this.lastBgm.pause(); this.lastBgm = null; }
  }

  // ===== 背景テキスト（薄く表示）=====

  showBackgroundText(text: string, duration = 3000): void {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      font-size:8rem; color:rgba(139,0,0,0.06); pointer-events:none;
      z-index:3; font-family:'Onryou',sans-serif; white-space:nowrap;
      transition: opacity 1s;
    `;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, duration - 1000);
    setTimeout(() => el.remove(), duration);
  }

  cleanup(): void {
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);
    this.stopButtonAura();
    this.enableHorrorFlicker(false);
    this.stopButtonOrbit();
    this.stopButtonBlink();
  }
}
