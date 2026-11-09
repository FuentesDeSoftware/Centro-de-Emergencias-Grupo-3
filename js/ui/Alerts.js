// Toasts de eventos sobre el mapa.
import { on } from '../core/state.js';

const LIFETIME = 4200;
const MAX_VISIBLE = 3;

export class Alerts {
  constructor() {
    this.root = document.getElementById('alerts');
    on('start', () => (this.root.innerHTML = ''));
    on('alert', ({ title, text, type }) => this.show(title, text, type));
  }

  show(title, text, type = 'warn') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = text;
    toast.append(strong, span);
    this.root.prepend(toast);
    while (this.root.children.length > MAX_VISIBLE) this.root.lastChild.remove();
    setTimeout(() => toast.classList.add('out'), LIFETIME - 400);
    setTimeout(() => toast.remove(), LIFETIME);
  }
}
