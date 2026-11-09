// Barra superior (reloj, controles) y capa sobre el mapa (etiqueta, contadores).
import { state, subscribe, notify, formatClock } from '../core/state.js';
import { DISASTERS } from '../core/levels.js';
import { audio } from '../core/audio.js';

export class HUD {
  constructor(engine, sceneManager) {
    this.engine = engine;
    this.sceneManager = sceneManager;
    this.top = document.getElementById('hud');
    this.stage = document.getElementById('stage-hud');

    this.top.innerHTML = `
      <div class="brand"><span>🚨</span><span>Centro de Emergencias</span></div>
      <div class="clock" title="Hora simulada">🕒 <b data-clock>06:00</b></div>
      <div class="controls">
        <button type="button" data-act="pause" title="Pausa (P)">⏸</button>
        <div class="speed">
          <button type="button" data-speed="1">x1</button>
          <button type="button" data-speed="2">x2</button>
          <button type="button" data-speed="3">x3</button>
        </div>
        <button type="button" data-act="restart" title="Reiniciar">↻</button>
        <button type="button" data-act="mute" title="Sonido">🔊</button>
        <button type="button" data-act="menu" title="Menú">☰</button>
      </div>`;

    this.stage.innerHTML = `
      <div class="tag" data-tag></div>
      <div class="stats">
        <span class="chip good">✔ <b data-saved>0</b> salvados</span>
        <span class="chip bad">✖ <b data-lost>0</b> perdidos</span>
        <span class="chip" data-shelter-chip>⛺ <b data-shelter>0/0</b></span>
        <span class="chip" data-wind hidden></span>
      </div>
      <button type="button" class="overview" data-act="overview">🗺 Vista general</button>`;

    const find = (root, sel) => root.querySelector(sel);
    this.el = {
      clock: find(this.top, '[data-clock]'),
      pause: find(this.top, '[data-act="pause"]'),
      mute: find(this.top, '[data-act="mute"]'),
      speeds: [...this.top.querySelectorAll('[data-speed]')],
      tag: find(this.stage, '[data-tag]'),
      saved: find(this.stage, '[data-saved]'),
      lost: find(this.stage, '[data-lost]'),
      shelter: find(this.stage, '[data-shelter]'),
      shelterChip: find(this.stage, '[data-shelter-chip]'),
      wind: find(this.stage, '[data-wind]'),
    };

    const onClick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      audio.click();
      if (btn.dataset.speed) return engine.setSpeed(Number(btn.dataset.speed));
      switch (btn.dataset.act) {
        case 'pause': return engine.togglePause();
        case 'restart': return engine.restart();
        case 'menu': return engine.toMenu();
        case 'overview': return sceneManager.overview();
        case 'mute':
          state.muted = !state.muted;
          return notify();
      }
    };
    this.top.addEventListener('click', onClick);
    this.stage.addEventListener('click', onClick);

    subscribe(() => this.render());
    this.render();
  }

  render() {
    const { el } = this;
    const def = DISASTERS[state.disaster];
    el.clock.textContent = formatClock(state.time);
    el.pause.textContent = state.paused ? '▶' : '⏸';
    el.pause.classList.toggle('active', state.paused);
    el.mute.textContent = state.muted ? '🔇' : '🔊';
    el.speeds.forEach((b) => b.classList.toggle('active', Number(b.dataset.speed) === state.speed));
    el.tag.textContent = `${def.icon} ${def.name} – Nivel ${state.level}`;
    el.saved.textContent = state.saved;
    el.lost.textContent = state.lost;
    el.shelter.textContent = `${state.shelter.used}/${state.shelter.capacity}`;
    el.shelterChip.classList.toggle('bad', state.shelter.used >= state.shelter.capacity);
    el.wind.hidden = !state.wind;
    if (state.wind) el.wind.textContent = `💨 Viento hacia ${state.wind}`;
  }
}
