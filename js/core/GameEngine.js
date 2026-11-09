// Motor de la simulación: tick, despacho de recursos, victoria/derrota.
import { state, notify, emit, formatClock, saveResult, selectedHouse, selectedResource } from './state.js';
import { DISASTERS, MAX_LEVEL, getLevelConfig } from './levels.js';
import { EventSystem } from './EventSystem.js';
import { audio } from './audio.js';
import { Flood } from '../scene/disasters/Flood.js';
import { Fire } from '../scene/disasters/Fire.js';
import { Earthquake } from '../scene/disasters/Earthquake.js';

const CONTROLLERS = { flood: Flood, fire: Fire, quake: Earthquake };
const UI_REFRESH = 0.2;
const TEMP_SHELTER_DELAY = 12;
const TEMP_SHELTER_CAPACITY = 14;

export class GameEngine {
  constructor({ sceneManager, town, units }) {
    this.sceneManager = sceneManager;
    this.town = town;
    this.units = units;
    this.disaster = null;
    this.events = null;
    this.def = null;
    this.cfg = null;
    this.uiTimer = 0;
    this.shelterTimer = 0;
    this.slowTimer = 0;
  }

  get waterY() {
    return this.disaster?.waterY ?? null;
  }

  start(disasterId, level) {
    this.stop();
    this.def = DISASTERS[disasterId];
    this.cfg = getLevelConfig(disasterId, level);
    this.uiTimer = 0;
    this.shelterTimer = 0;
    this.slowTimer = 0;

    Object.assign(state, {
      screen: 'game',
      disaster: disasterId,
      level,
      running: true,
      paused: false,
      speed: 1,
      time: 0,
      saved: 0,
      lost: 0,
      dispatches: 0,
      unitSpeedMul: 1,
      wind: null,
      result: null,
      selectedHouseId: null,
    });
    state.resources = this.def.resources.map((r) => ({ ...r, total: this.cfg.counts[r.id], busy: 0 }));
    state.selectedResourceId = state.resources[0].id;
    state.shelter = { capacity: this.cfg.shelterCap, used: 0 };
    state.houses = this.town.build();

    emit('start');
    this.log(`Centro de mando activo: ${this.def.name}, nivel ${level}.`);
    this.disaster = new CONTROLLERS[disasterId]({
      engine: this,
      town: this.town,
      sceneManager: this.sceneManager,
      cfg: this.cfg,
    });
    this.events = new EventSystem(this, this.cfg);
    this.sceneManager.overview();
    audio.siren();
    notify();
  }

  stop() {
    state.running = false;
    this.disaster?.dispose();
    this.disaster = null;
    this.events = null;
    this.units.clear();
  }

  restart() {
    this.start(state.disaster, state.level);
  }

  toMenu() {
    this.stop();
    state.screen = 'start';
    emit('menu');
    notify();
  }

  togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
    this.log(state.paused ? 'Simulación en pausa.' : 'Simulación reanudada.');
    notify();
  }

  setSpeed(speed) {
    state.speed = speed;
    notify();
  }

  select(houseId) {
    state.selectedHouseId = houseId;
    const house = selectedHouse();
    if (house) {
      this.sceneManager.focusOn(house.x, house.y + 0.6, house.z);
      audio.click();
    }
    notify();
  }

  update(dt) {
    if (!state.running || state.paused) return;
    const sdt = dt * state.speed;
    state.time += sdt;

    this.disaster.update(sdt);
    this.updateHouses(sdt);
    this.units.update(sdt, this.waterY);
    this.events.update(sdt);
    this.updateShelter(sdt);

    if (this.slowTimer > 0) {
      this.slowTimer -= sdt;
      if (this.slowTimer <= 0) {
        state.unitSpeedMul = 1;
        this.log('Vías despejadas: las unidades recuperan velocidad.', 'good');
      }
    }

    this.uiTimer += dt;
    if (this.uiTimer >= UI_REFRESH) {
      this.uiTimer = 0;
      notify();
    }
    this.checkEnd();
  }

  updateHouses(dt) {
    for (const h of state.houses) {
      // El contador se detiene mientras una unidad trabaja en la casa.
      if (!h.threatened || h.ops > 0) continue;
      h.timer -= dt;
      if (h.people > 0) h.status = h.timer / h.maxTimer > 0.4 ? 'risk' : 'critical';
      if (h.timer > 0) continue;

      h.timer = 0;
      h.threatened = false;
      h.destroyed = true;
      if (h.people > 0) {
        state.lost += h.people;
        this.log(`Casa ${h.id} perdida: ${h.people} víctimas.`, 'bad');
        h.people = 0;
        h.status = 'lost';
        audio.fail();
      }
      this.disaster.onHouseDown?.(h);
      notify();
    }
  }

  // Sin refugios como recurso, protección civil habilita un albergue temporal al llenarse.
  updateShelter(dt) {
    const hasShelterResource = state.resources.some((r) => r.kind === 'shelter');
    const full = state.shelter.used >= state.shelter.capacity;
    if (hasShelterResource || !full) {
      this.shelterTimer = 0;
      return;
    }
    if (this.shelterTimer === 0) this.log('Refugio lleno: habilitando albergue temporal…', 'warn');
    this.shelterTimer += dt;
    if (this.shelterTimer >= TEMP_SHELTER_DELAY) {
      this.shelterTimer = 0;
      state.shelter.capacity += TEMP_SHELTER_CAPACITY;
      this.alert('Albergue temporal habilitado', `+${TEMP_SHELTER_CAPACITY} cupos de refugio.`, 'good');
    }
  }

  threaten(house) {
    if (house.touched) return false;
    house.touched = true;
    house.threatened = true;
    house.maxTimer = this.cfg.timer * (0.85 + Math.random() * 0.3);
    house.timer = house.maxTimer;
    house.status = 'risk';
    this.log(`Casa ${house.id} en riesgo: ${house.people} personas.`, 'warn');
    notify();
    return true;
  }

  dispatch() {
    if (!state.running) return false;
    if (state.paused) return this.warn('Simulación en pausa', 'Reanuda para movilizar recursos.');
    const res = selectedResource();
    if (!res) return false;
    const available = res.total - res.busy;

    if (res.kind === 'shelter') {
      if (available <= 0) return this.warn('Sin refugios', 'No quedan refugios por abrir.');
      res.total -= 1;
      state.shelter.capacity += res.capacity;
      state.dispatches += 1;
      this.log(`Refugio abierto: +${res.capacity} cupos.`, 'good');
      audio.success();
      notify();
      return true;
    }

    const house = selectedHouse();
    if (!house) return this.warn('Selecciona una casa', 'Haz clic en una casa del mapa.');
    if (!house.threatened) return this.warn('Casa sin emergencia', `La casa ${house.id} no necesita atención.`);
    if (available <= 0) return this.warn('Sin unidades', `${res.name}: todas las unidades están ocupadas.`);
    if (!res.mitigate && house.people === 0) return this.warn('Casa evacuada', 'Ya no quedan personas dentro.');
    if (res.rescue && !res.mitigate && state.shelter.used >= state.shelter.capacity) {
      return this.warn('Refugios llenos', 'Abre otro refugio antes de evacuar más personas.');
    }

    res.busy += 1;
    state.dispatches += 1;
    house.incoming += 1;
    this.log(`${res.name} en camino a casa ${house.id}.`);
    audio.dispatch();

    this.units.send({
      res,
      house,
      onArrive: () => {
        if (house.threatened) {
          house.ops += 1;
          return true;
        }
        house.incoming -= 1;
        const late = house.destroyed || house.status === 'lost';
        this.log(
          late ? `${res.name} llegó tarde a casa ${house.id}.` : `${res.name} regresa: casa ${house.id} ya atendida.`,
          late ? 'bad' : 'info',
        );
        notify();
        return false;
      },
      onDone: () => {
        house.incoming -= 1;
        this.complete(res, house);
      },
      onReturn: () => {
        res.busy = Math.max(0, res.busy - 1);
        notify();
      },
    });
    notify();
    return true;
  }

  complete(res, house) {
    house.ops = Math.max(0, house.ops - 1);
    if (house.destroyed) return;

    if (res.mitigate === 'extinguish') {
      const out = this.disaster.extinguish(house, res.radius || 0);
      out.forEach((h) => this.protect(h));
      const extra = out.length > 1 ? ` y ${out.length - 1} vecina(s)` : '';
      this.log(`${res.name}: fuego controlado en casa ${house.id}${extra}.`, 'good');
      audio.success();
    }
    if (res.mitigate === 'stabilize') {
      house.stabilized = true;
      house.timer = Math.min(house.maxTimer, house.timer + house.maxTimer * 0.5);
      this.log(`${res.name}: casa ${house.id} estabilizada.`, 'good');
    }
    if (res.cool && house.threatened) house.timer = Math.min(house.maxTimer, house.timer + res.cool);

    if (res.rescue && house.people > 0) {
      const free = state.shelter.capacity - state.shelter.used;
      const n = Math.min(res.rescue, house.people, free);
      if (n <= 0) {
        this.warn('Refugios llenos', `No hubo cupo para la casa ${house.id}.`);
      } else {
        house.people -= n;
        state.shelter.used += n;
        state.saved += n;
        this.log(`${res.name} evacuó ${n} personas de casa ${house.id}.`, 'good');
        audio.success();
        if (house.people === 0) {
          house.status = 'evacuated';
          if (!house.burning) house.threatened = false;
        }
      }
    }
    notify();
  }

  // Casa fuera de peligro sin evacuar: sus ocupantes cuentan como salvados.
  protect(house) {
    house.threatened = false;
    if (house.people > 0) {
      state.saved += house.people;
      house.status = 'protected';
    } else {
      house.status = 'evacuated';
    }
  }

  reinforce() {
    const res = state.resources[Math.floor(Math.random() * state.resources.length)];
    res.total += 1;
    this.alert('Llegan refuerzos', `+1 ${res.name}.`, 'good');
  }

  blockRoads() {
    state.unitSpeedMul = 0.55;
    this.slowTimer = 16;
    this.alert('Vías bloqueadas', 'Escombros en las calles: las unidades avanzan más lento.', 'warn');
  }

  checkEnd() {
    if (!this.disaster.isOver()) return;
    if (state.houses.some((h) => h.threatened && (h.people > 0 || h.burning))) return;
    this.finish();
  }

  finish() {
    state.running = false;
    const { saved, lost, dispatches, time, level, disaster } = state;
    const affected = saved + lost;
    const efficiency = affected ? saved / affected : 1;
    const stars = efficiency >= 0.95 ? 3 : efficiency >= 0.8 ? 2 : efficiency >= 0.6 ? 1 : 0;
    const perDispatch = dispatches ? saved / dispatches : 0;
    const raw = saved * 100 - lost * 60 + Math.max(0, 240 - time) * 2 + perDispatch * 40;
    const score = Math.max(0, Math.round(raw * (1 + (level - 1) * 0.25)));
    const record = saveResult(disaster, level, score, stars);

    state.result = {
      won: stars > 0,
      stars,
      score,
      saved,
      lost,
      time,
      efficiency,
      perDispatch,
      dispatches,
      level,
      disaster,
      hasNext: stars > 0 && level < MAX_LEVEL,
      ...record,
    };
    this.log(stars > 0 ? 'Emergencia controlada.' : 'Operación fallida: demasiadas pérdidas.', stars > 0 ? 'good' : 'bad');
    if (stars > 0) audio.success();
    else audio.fail();
    emit('gameover', state.result);
    notify();
  }

  log(text, type = 'info') {
    emit('log', { time: formatClock(state.time), text, type });
  }

  alert(title, text, type = 'warn') {
    emit('alert', { title, text, type });
    this.log(`${title}. ${text}`, type);
    audio.alert();
    notify();
  }

  warn(title, text) {
    emit('alert', { title, text, type: 'warn' });
    return false;
  }
}
