import { MICKEY_STATES } from '../config/constants.js';
import { wait } from '../utils/typewriter.js';
import { debugLog } from '../utils/debugLog.js';

/**
 * FinaleScene — "Sky of Memories"
 * -------------------------------
 * The last scene. The game is over and nothing is asked of the player
 * again: a golden route draws itself across the night sky, and each star
 * it reaches turns into a photograph of the people this was made for.
 * All four stay lit together, the dedication is written by hand right
 * over them, and once it's read the four photos join with thin golden
 * rays for a moment — the constellation the whole game built toward,
 * made of the memories themselves rather than abstract geometry.
 *
 * There is no button and no exit. The scene simply plays, and then the
 * island is left there.
 */
export class FinaleScene {
  /** The pause after each photo lands, before the route moves on. */
  static STEP_PAUSE_MS = 2000;

  /** How long the joined constellation of photos is held before the end. */
  static JOINED_HOLD_MS = 5000;

  /** The dedication, written out by hand, over the photographs. */
  static DEDICATION =
    'Дорогі мандрівниці, пригоди ніколи не закінчуються. Вони лише змінюють сторінку. ' +
    'Нехай ваш компас завжди веде до місць, де народжуються найтепліші спогади, ' +
    'а кожна нова дорога відкриває ще одну маленьку мрію. До нових пригод!';

  constructor(sceneEl, audio, mickey = null) {
    this.sceneEl = sceneEl;
    this.audio = audio;
    this.mickey = mickey;

    this.worldEl = sceneEl.querySelector('#finale-world');
    this.starfieldEl = sceneEl.querySelector('#finale-starfield');
    this.routeLineEl = sceneEl.querySelector('#finale-route-line');
    this.linksLineEl = sceneEl.querySelector('#finale-links-line');
    this.letterEl = sceneEl.querySelector('#finale-letter');
    this.letterTextEl = sceneEl.querySelector('#finale-letter-text');
    this.penEl = sceneEl.querySelector('#finale-pen');
    this.flourishEl = sceneEl.querySelector('#finale-flourish');
    this.mickeyEl = sceneEl.querySelector('#finale-mickey');

    this.slotEls = [1, 2, 3, 4].map((n) => sceneEl.querySelector(`#memory-slot-${n}`));

    this._runToken = 0;
  }

  async enter() {
    try {
      await this._enterInner();
    } catch (err) {
      // Nothing follows this scene, so a failure can't strand anyone —
      // but it should still be visible rather than vanishing as an
      // unhandled rejection.
      console.error('FinaleScene.enter() failed partway through:', err);
    }
  }

  async _enterInner() {
    const token = ++this._runToken;
    this._resetVisualState();
    this._scatterStars(70);

    // A moment of real darkness: the player has just closed the journal,
    // and the sky should feel like it's arriving, not already waiting.
    await wait(1600);
    if (token !== this._runToken) return;
    this.worldEl.classList.add('is-visible');
    await wait(2200);
    if (token !== this._runToken) return;

    // The first star flares — the route has to begin somewhere.
    this.slotEls[0]?.classList.add('is-star');
    this.audio.crystalTone(523);
    await wait(1400);
    if (token !== this._runToken) return;

    // Star -> photo -> a short pause, four times over. Nothing else
    // happens in between: the sequence IS the four memories arriving,
    // one at a time, with room to actually look at each.
    for (let i = 0; i < this.slotEls.length; i++) {
      if (token !== this._runToken) return;

      this._drawRouteThrough(i + 1);
      this.audio.crystalTone(392 + i * 55);
      await wait(i === 0 ? 900 : 1400); // the first star is already lit
      if (token !== this._runToken) return;

      if (i > 0) {
        this.slotEls[i].classList.add('is-star');
        await wait(900);
        if (token !== this._runToken) return;
      }

      await this._becomeMemory(this.slotEls[i], token);
      if (token !== this._runToken) return;

      this._playMickey(MICKEY_STATES.TELESCOPE); // looking at whichever just arrived

      // The 2s pause sits BETWEEN photos, per the brief — not after the
      // fourth, where the dedication is meant to begin right away.
      if (i < this.slotEls.length - 1) {
        await wait(FinaleScene.STEP_PAUSE_MS);
        if (token !== this._runToken) return;
      }
    }

    // All four stay exactly as they are — the dedication is written
    // right over them, not after they've gone.
    this._playMickey(MICKEY_STATES.READING);
    await this._writeDedication(token);
    if (token !== this._runToken) return;

    // Text done and gone — Mickey has read it, and smiles before he
    // looks back at the player.
    this._playMickey(MICKEY_STATES.HAPPY);

    // Now, and only now, the four join: thin golden rays for a moment,
    // the constellation the memories make of themselves.
    await this._joinAllFour(token);
    if (token !== this._runToken) return;

    await wait(FinaleScene.JOINED_HOLD_MS);
    if (token !== this._runToken) return;

    // Everything fades, and the sky is just a sky again.
    this.slotEls.forEach((el) => el.classList.remove('is-photo'));
    this.linksLineEl?.classList.remove('is-visible');
    this.routeLineEl?.classList.add('is-fading');
    await wait(1400);
    if (token !== this._runToken) return;

    this.mickeyEl?.classList.add('is-waving');
    this._playMickey(MICKEY_STATES.WAVE);
    await wait(1600);
    if (token !== this._runToken) return;

    // The compass answers once, and goes quiet.
    this.mickeyEl?.classList.add('is-compass-glowing');
    this.audio.islandChord();
    await wait(2600);
    if (token !== this._runToken) return;
    this.mickeyEl?.classList.remove('is-compass-glowing');
    this._playMickey(MICKEY_STATES.IDLE);

    debugLog('[Finale] the sky is the player\'s to sit with');
  }

  async exit() {
    this._runToken += 1;
  }

  _resetVisualState() {
    this.worldEl.classList.remove('is-visible');
    this.letterEl.classList.remove('is-visible');
    this.letterTextEl.textContent = '';
    this.penEl?.classList.remove('is-writing');
    this.flourishEl?.classList.remove('is-visible');
    this.linksLineEl?.classList.remove('is-visible');
    this.linksLineEl?.setAttribute('d', '');
    this.routeLineEl?.setAttribute('d', '');
    this.mickeyEl?.classList.remove('is-waving');
    this.starfieldEl.innerHTML = '';
    this.slotEls.forEach((el) => el?.classList.remove('is-star', 'is-becoming', 'is-photo'));
  }

  _scatterStars(count) {
    this.starfieldEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'finale-star';
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 80}%`;
      el.style.animationDelay = `${Math.random() * 5}s`;
      el.style.animationDuration = `${3 + Math.random() * 4}s`;
      this.starfieldEl.appendChild(el);
    }
  }

  /**
   * The memory positions in the same 0-100 space the route SVG uses, so
   * the line and the photos can't drift apart. These mirror the CSS
   * `left`/`top` of each .memory-slot.
   */
  static POINTS = [
    { x: 24, y: 17 },
    { x: 71, y: 30 },
    { x: 27, y: 52 },
    { x: 70, y: 64 },
  ];

  /** Extends the route so it reaches the first `count` memories. */
  _drawRouteThrough(count) {
    if (!this.routeLineEl) return;
    const pts = FinaleScene.POINTS.slice(0, Math.max(count, 1));
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    this.routeLineEl.setAttribute('d', d);

    // Retreating the dash offset is what makes it read as light
    // travelling. Setting it per segment keeps each leg's draw visible
    // rather than redrawing the whole route each time.
    this.routeLineEl.style.strokeDashoffset = `${Math.max(400 - count * 100, 0)}`;
  }

  /** A star flares and leaves a photograph behind. */
  async _becomeMemory(slotEl, token) {
    if (!slotEl) return;
    slotEl.classList.add('is-becoming');
    this.audio.crystalTone(659);
    await wait(450);
    if (token !== this._runToken) return;
    slotEl.classList.add('is-photo');
    await wait(900);
  }

  /**
   * For one moment the four photos are joined by thin golden rays. This
   * is the constellation idea from the secret quest, made personal: the
   * shape in the sky is now the memories themselves. Happens once the
   * dedication has been read, not right after the fourth photo lands.
   */
  async _joinAllFour(token) {
    if (!this.linksLineEl) return;
    const p = FinaleScene.POINTS;
    this.linksLineEl.setAttribute(
      'd',
      `M ${p[0].x} ${p[0].y} L ${p[1].x} ${p[1].y} L ${p[3].x} ${p[3].y} L ${p[2].x} ${p[2].y} Z`,
    );
    this.linksLineEl.classList.add('is-visible');
    this.audio.islandChord();
    await wait(900);
  }

  /**
   * Writes the dedication by hand, centred over the photographs. The pen
   * is an inline element sitting after the text, so it advances with the
   * writing on its own — no position tracking, and it follows the text
   * onto the next line exactly the way a real hand would.
   */
  async _writeDedication(token) {
    this.letterEl.classList.add('is-visible');
    this.penEl?.classList.add('is-writing');
    await wait(600);

    const text = FinaleScene.DEDICATION;
    for (let i = 0; i < text.length; i++) {
      if (token !== this._runToken) return;
      this.letterTextEl.textContent = text.slice(0, i + 1);
      // Slower than the game's usual typing, and slower still after a
      // comma or a full stop — it should read as someone writing, not a
      // machine printing.
      const ch = text[i];
      await wait(ch === ' ' ? 34 : ch === ',' ? 220 : ch === '.' || ch === '!' ? 300 : 52);
    }

    if (token !== this._runToken) return;
    await wait(500);

    // The little curl at the end, then the pen is gone.
    this.flourishEl?.classList.add('is-visible');
    await wait(900);
    if (token !== this._runToken) return;
    this.penEl?.classList.remove('is-writing');

    // The whole letter fades — pen's curl, then the text itself, per the
    // brief: "перо зникає" then "текст зникає" as two distinct beats.
    await wait(700);
    if (token !== this._runToken) return;
    this.letterEl.classList.remove('is-visible');
    this.flourishEl?.classList.remove('is-visible');
    await wait(1000);
  }

  /**
   * Drives THIS scene's own Mickey element.
   *
   * The shared Mickey instance can't be used here: `#finale-mickey` is a
   * separate element with its own copy of the sprite, and the roaming
   * Mickey is still parented to the previous scene. Calling
   * `mickey.play()` would animate an off-screen character while the one
   * the player is actually looking at stood perfectly still.
   */
  _playMickey(state) {
    if (!this.mickeyEl) return;
    Object.values(MICKEY_STATES).forEach((s) => this.mickeyEl.classList.remove(`mickey--${s}`));
    this.mickeyEl.classList.add(`mickey--${state}`);
  }
}
