// Ficha de la casa seleccionada: personas, estado y tiempo restante.
import { state, subscribe, selectedHouse } from '../core/state.js';

const STATUS_TEXT = {
  safe: 'Segura',
  risk: 'En riesgo',
  critical: 'Crítica',
  lost: 'Perdida',
  evacuated: 'Evacuada',
  protected: 'Protegida',
};

export class HouseInfo {
  constructor() {
    this.root = document.getElementById('house-info');
    this.last = '';
    subscribe(() => this.render());
    this.render();
  }

  render() {
    const h = selectedHouse();
    let html;
    if (!h) {
      html = '<h3>Casa seleccionada</h3><p class="empty-note">Haz clic en una casa del mapa para ver su estado.</p>';
    } else {
      const active = h.threatened && h.maxTimer > 0;
      const pct = active ? Math.max(0, Math.round((h.timer / h.maxTimer) * 100)) : 0;
      const notes = [];
      if (h.burning) notes.push('🔥 En llamas');
      if (h.stabilized) notes.push('🛠 Estabilizada');
      if (h.incoming > 0) notes.push(`🚨 ${h.incoming} unidad(es) asignada(s)`);
      html = `
        <h3>Casa ${h.id} <span class="status ${h.status}">${STATUS_TEXT[h.status]}</span></h3>
        <dl class="facts">
          <div><dt>Personas dentro</dt><dd>👥 ${h.people} <small>de ${h.initialPeople}</small></dd></div>
          <div><dt>Tiempo restante</dt><dd>${active ? `${Math.ceil(h.timer)} min` : '—'}</dd></div>
        </dl>
        <div class="timebar ${h.status}"><i style="width:${pct}%"></i></div>
        ${notes.length ? `<p class="notes">${notes.join(' · ')}</p>` : ''}`;
    }
    if (html === this.last) return;
    this.last = html;
    this.root.innerHTML = html;
  }
}
