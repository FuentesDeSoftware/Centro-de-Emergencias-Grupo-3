// Tarjeta de portada: elegir desastre y nivel e iniciar la simulación.
import { on, loadProgress } from '../core/state.js';
import { DISASTERS, MAX_LEVEL } from '../core/levels.js';
import { audio } from '../core/audio.js';

const SIREN_SVG = `
<svg class="siren" viewBox="0 0 120 110" aria-hidden="true">
  <g class="siren-rays" stroke="#ffd166" stroke-width="5" stroke-linecap="round">
    <line x1="60" y1="4" x2="60" y2="18"/>
    <line x1="18" y1="20" x2="28" y2="30"/>
    <line x1="102" y1="20" x2="92" y2="30"/>
    <line x1="4" y1="58" x2="18" y2="58"/>
    <line x1="116" y1="58" x2="102" y2="58"/>
  </g>
  <path d="M32 84V60a28 28 0 0 1 56 0v24z" fill="#ff4d4d"/>
  <path d="M44 84V62a16 16 0 0 1 16-16" fill="none" stroke="#ffb3b3" stroke-width="5" stroke-linecap="round"/>
  <rect x="22" y="84" width="76" height="16" rx="5" fill="#f5f5f5"/>
  <rect x="34" y="89" width="52" height="6" rx="3" fill="#c9c9c9"/>
</svg>`;

export class StartScreen {
  constructor(engine) {
    this.engine = engine;
    this.root = document.getElementById('start-screen');
    this.disaster = 'flood';
    this.level = 1;

    this.root.addEventListener('click', (e) => {
      const target = e.target.closest('[data-disaster], [data-level], [data-start]');
      if (!target || target.disabled) return;
      audio.unlock();
      if (target.dataset.disaster) {
        this.disaster = target.dataset.disaster;
        this.level = Math.min(this.level, this.unlocked());
        this.render();
      } else if (target.dataset.level) {
        this.level = Number(target.dataset.level);
        this.render();
      } else {
        this.engine.start(this.disaster, this.level);
      }
    });
    on('menu', () => this.render());
    this.render();
  }

  unlocked() {
    return loadProgress()[this.disaster]?.unlocked || 1;
  }

  render() {
    const progress = loadProgress()[this.disaster] || {};
    const unlocked = progress.unlocked || 1;
    this.level = Math.min(this.level, unlocked);

    const disasters = Object.values(DISASTERS)
      .map(
        (d) => `
        <button type="button" class="choice${d.id === this.disaster ? ' active' : ''}" data-disaster="${d.id}">
          <span class="choice-icon">${d.icon}</span>
          <span>${d.name}</span>
        </button>`,
      )
      .join('');

    let levels = '';
    for (let n = 1; n <= MAX_LEVEL; n++) {
      const locked = n > unlocked;
      const stars = progress.best?.[n]?.stars || 0;
      levels += `
        <button type="button" class="level${n === this.level ? ' active' : ''}" data-level="${n}" ${locked ? 'disabled' : ''}>
          <b>${locked ? '🔒' : n}</b>
          <small>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</small>
        </button>`;
    }

    this.root.innerHTML = `
      <article class="card">
        <header class="card-head">
          <span class="badge">7</span>
          <div>
            <h1>Centro de Emergencias</h1>
            <p class="subtitle">Simulador de Desastres</p>
          </div>
        </header>
        <div class="card-hero">
          ${SIREN_SVG}
          <p>Toma decisiones para atender una inundación, incendio o terremoto y proteger la población.</p>
        </div>
        <h2>Tipo de desastre</h2>
        <div class="choices">${disasters}</div>
        <p class="brief">${DISASTERS[this.disaster].brief}</p>
        <h2>Nivel</h2>
        <div class="levels">${levels}</div>
        <button type="button" class="btn-primary" data-start>Iniciar simulación</button>
      </article>`;
  }
}
