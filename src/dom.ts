// ===== DOM Helper =====

export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

export function $canvas(id: string): HTMLCanvasElement {
  return $(id) as HTMLCanvasElement;
}

export function $btn(id: string): HTMLButtonElement {
  return $(id) as HTMLButtonElement;
}

export const dom = {
  button: () => $btn('the-button'),
  warning: () => $('warning'),
  message: () => $('message'),
  subMessage: () => $('sub-message'),
  counter: () => $('counter'),
  aiPanel: () => $('ai-panel'),
  aiPanelHeader: () => $('ai-panel-header'),
  aiPanelBody: () => $('ai-panel-body'),
  aiGraph: () => $canvas('ai-graph'),
  pleaBubble: () => $('plea-bubble'),
  noise: () => $('noise'),
  emotion: () => $('emotion'),
  speedMeter: () => $('speed-meter'),
  blackout: () => $('blackout'),
  blackoutText: () => $('blackout-text'),
  analysisBar: () => $('analysis-bar'),
  finalScreen: () => $('final-screen'),
  finalMessage: () => $('final-message'),
  buttonAura: () => $canvas('button-aura'),
  achievementPopup: () => $('achievement-popup'),
  horrorOverlay: () => $('horror-overlay'),
  subliminal: () => $('subliminal'),
  secretScreen: () => $('secret-screen'),
  secretMessage: () => $('secret-message'),
  nameOverlay: () => $('name-overlay'),
  namePrompt: () => $('name-prompt'),
  nameInput: () => $('name-input') as HTMLInputElement,
  nameSubmit: () => $btn('name-submit'),
  rankingOverlay: () => $('ranking-overlay'),
  rankingList: () => $('ranking-list'),
  rankingClose: () => $btn('ranking-close'),
};
