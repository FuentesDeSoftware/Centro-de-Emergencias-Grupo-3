// Arranque: crea los componentes, los conecta y corre el loop de animación.
import { state, on, flush, notify } from './core/state.js';
import { GameEngine } from './core/GameEngine.js';
import { SceneManager } from './scene/SceneManager.js';
import { Town } from './scene/Town.js';
import { Units } from './scene/Units.js';
import { Picker } from './scene/Picker.js';
import { Labels } from './scene/Labels.js';
import { StartScreen } from './ui/StartScreen.js';
import { HUD } from './ui/HUD.js';
import { ResourcePanel } from './ui/ResourcePanel.js';
import { HouseInfo } from './ui/HouseInfo.js';
import { MobilizeButton } from './ui/MobilizeButton.js';
import { RadioLog } from './ui/RadioLog.js';
import { Alerts } from './ui/Alerts.js';
import { ResultModal } from './ui/ResultModal.js';

const startEl = document.getElementById('start-screen');
const gameEl = document.getElementById('game');

const sceneManager = new SceneManager(document.getElementById('scene'));
const town = new Town(sceneManager.scene);
const units = new Units(sceneManager.scene);
const engine = new GameEngine({ sceneManager, town, units });
const labels = new Labels(document.getElementById('labels'), sceneManager);

new Picker(sceneManager, town, (id) => engine.select(id));
new StartScreen(engine);
new HUD(engine, sceneManager);
new ResourcePanel();
new HouseInfo();
new MobilizeButton(engine);
new RadioLog();
new Alerts();
new ResultModal(engine);

function showScreen() {
  startEl.hidden = state.screen !== 'start';
  gameEl.hidden = state.screen !== 'game';
}

on('start', () => {
  showScreen();
  sceneManager.resize();
  labels.reset();
});
on('menu', showScreen);

window.addEventListener('keydown', (e) => {
  if (state.screen !== 'game' || e.repeat) return;
  if (e.code === 'Space') {
    e.preventDefault();
    engine.dispatch();
  } else if (e.key === 'p' || e.key === 'P') {
    engine.togglePause();
  } else if (['1', '2', '3'].includes(e.key)) {
    const res = state.resources[Number(e.key) - 1];
    if (res) {
      state.selectedResourceId = res.id;
      notify();
    }
  }
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.screen === 'game') {
    engine.update(dt);
    town.update(now / 1000, state.selectedHouseId, engine.waterY);
    sceneManager.update(dt);
    sceneManager.render();
    labels.update();
  }
  flush();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
