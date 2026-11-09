// Botón "Movilizar Recursos": despacha el recurso elegido a la casa seleccionada.
import { state, subscribe, selectedHouse, selectedResource } from '../core/state.js';

export class MobilizeButton {
  constructor(engine) {
    this.button = document.getElementById('mobilize');
    this.last = '';
    this.button.addEventListener('click', () => engine.dispatch());
    subscribe(() => this.render());
    this.render();
  }

  render() {
    const res = selectedResource();
    const house = selectedHouse();
    let detail = 'Elige un recurso';
    if (res?.kind === 'shelter') detail = `Abrir refugio (+${res.capacity} cupos)`;
    else if (res && house) detail = `${res.name} → Casa ${house.id}`;
    else if (res) detail = `${res.name} → selecciona una casa`;

    const html = `<span>Movilizar Recursos</span><small>${detail}</small>`;
    this.button.disabled = !state.running;
    if (html === this.last) return;
    this.last = html;
    this.button.innerHTML = html;
  }
}
