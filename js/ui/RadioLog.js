// Bitácora de radio: registro con hora simulada de eventos y despachos.
import { on } from '../core/state.js';

const MAX_ENTRIES = 80;

export class RadioLog {
  constructor() {
    this.root = document.getElementById('radio-log');
    this.root.innerHTML = '<h3>📻 Bitácora de radio</h3><ol class="entries"></ol>';
    this.list = this.root.querySelector('.entries');

    on('start', () => (this.list.innerHTML = ''));
    on('log', ({ time, text, type }) => {
      const li = document.createElement('li');
      li.className = type;
      const stamp = document.createElement('time');
      stamp.textContent = time;
      li.append(stamp, ` ${text}`);
      this.list.prepend(li);
      while (this.list.children.length > MAX_ENTRIES) this.list.lastChild.remove();
    });
  }
}
