// Panel "Recursos Disponibles": unidades libres/en uso y selección del recurso.
import { state, subscribe, notify } from '../core/state.js';
import { audio } from '../core/audio.js';

export class ResourcePanel {
  constructor() {
    this.root = document.getElementById('resource-panel');
    this.last = '';
    this.root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-resource]');
      if (!btn) return;
      state.selectedResourceId = btn.dataset.resource;
      audio.click();
      notify();
    });
    subscribe(() => this.render());
    this.render();
  }

  render() {
    const rows = state.resources
      .map((r, i) => {
        const available = r.total - r.busy;
        const isShelter = r.kind === 'shelter';
        const count = isShelter ? `×${available}` : `${available}/${r.total}`;
        const pips = isShelter
          ? ''
          : `<span class="pips">${'<i class="on"></i>'.repeat(Math.max(0, available))}${'<i></i>'.repeat(r.busy)}</span>`;
        const classes = ['resource'];
        if (r.id === state.selectedResourceId) classes.push('active');
        if (available <= 0) classes.push('empty');
        return `
          <button type="button" class="${classes.join(' ')}" data-resource="${r.id}" title="Tecla ${i + 1}">
            <span class="res-icon">${r.icon}</span>
            <span class="res-text"><b>${r.name}</b><small>${r.hint}</small>${pips}</span>
            <span class="res-count">${count}</span>
          </button>`;
      })
      .join('');
    const html = `<h3>Recursos Disponibles</h3>${rows}`;
    if (html === this.last) return;
    this.last = html;
    this.root.innerHTML = html;
  }
}
