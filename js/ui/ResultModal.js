// Resumen final: estrellas, puntaje y siguiente paso.
import { state, on, formatDuration } from '../core/state.js';
import { DISASTERS } from '../core/levels.js';

export class ResultModal {
  constructor(engine) {
    this.engine = engine;
    this.root = document.getElementById('result-modal');

    this.root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      this.root.hidden = true;
      if (act === 'retry') engine.restart();
      else if (act === 'next') engine.start(state.disaster, state.level + 1);
      else engine.toMenu();
    });
    on('gameover', (result) => this.show(result));
    on('start', () => (this.root.hidden = true));
    on('menu', () => (this.root.hidden = true));
  }

  show(r) {
    const def = DISASTERS[r.disaster];
    const stars = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
    this.root.innerHTML = `
      <div class="modal-card ${r.won ? 'won' : 'lost'}" role="dialog" aria-modal="true">
        <p class="modal-kicker">${def.icon} ${def.name} – Nivel ${r.level}</p>
        <h2>${r.won ? 'Emergencia controlada' : 'Operación fallida'}</h2>
        <p class="stars" aria-label="${r.stars} de 3 estrellas">${stars}</p>
        <dl class="summary">
          <div><dt>Salvados</dt><dd class="good">${r.saved}</dd></div>
          <div><dt>Perdidos</dt><dd class="bad">${r.lost}</dd></div>
          <div><dt>Eficiencia</dt><dd>${Math.round(r.efficiency * 100)}%</dd></div>
          <div><dt>Duración</dt><dd>${formatDuration(r.time)}</dd></div>
          <div><dt>Despachos</dt><dd>${r.dispatches}</dd></div>
          <div><dt>Salvados por despacho</dt><dd>${r.perDispatch.toFixed(1)}</dd></div>
        </dl>
        <p class="score">Puntaje <b>${r.score}</b>${r.isRecord ? ' <span class="record">¡Nuevo récord!</span>' : ''}</p>
        ${r.best !== null && !r.isRecord ? `<p class="best">Mejor puntaje: ${r.best}</p>` : ''}
        ${r.won ? '' : '<p class="best">Necesitas salvar al menos al 60% de los afectados.</p>'}
        <div class="modal-actions">
          ${r.hasNext ? '<button type="button" class="btn-primary" data-act="next">Siguiente nivel</button>' : ''}
          <button type="button" class="btn-ghost" data-act="retry">Reintentar</button>
          <button type="button" class="btn-ghost" data-act="menu">Menú</button>
        </div>
      </div>`;
    this.root.hidden = false;
  }
}
