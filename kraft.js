/* ═══════════════════════════════════════════════════════════════
   МЕБЕЛЬ КРАФТ — 3D-кухня на чистом CSS 3D + сцена «сборка».
   Кухня собирается из коробок (6 граней у каждой). При скролле:
   01 корпуса → 02 столешница → 03 фасады → 04 ящики и двери Blum.
   ═══════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const { SCENES, range, lerp, clamp } = window.Kit;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeBack = t => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/* ─────────── конструктор коробки ───────────
   центр (x,y,z), размеры w×h×d; ось y вниз (как в CSS), пол — y=0 */
function box(w, h, d, mat, cls = '') {
  const b = document.createElement('div');
  b.className = `box ${mat} ${cls}`;
  const F = [
    ['f-f', w, h, `translateZ(${d / 2}px)`],
    ['f-k', w, h, `rotateY(180deg) translateZ(${d / 2}px)`],
    ['f-r', d, h, `rotateY(90deg) translateZ(${w / 2}px)`],
    ['f-l', d, h, `rotateY(-90deg) translateZ(${w / 2}px)`],
    ['f-t', w, d, `rotateX(90deg) translateZ(${h / 2}px)`],
    ['f-b', w, d, `rotateX(-90deg) translateZ(${h / 2}px)`],
  ];
  F.forEach(([c, fw, fh, tr]) => {
    const i = document.createElement('i');
    i.className = c;
    i.style.cssText = `width:${fw}px;height:${fh}px;margin:${-fh / 2}px 0 0 ${-fw / 2}px;transform:${tr}`;
    b.append(i);
  });
  return b;
}

const model = $('#model');
const parts = [];   // {el, x,y,z, t0,t1, from:{x,y,z,rx,ry}, hinge?, act?}
function add(el, x, y, z, t0, t1, from = {}, extra = {}) {
  model.append(el);
  parts.push({ el, x, y, z, t0, t1, from, h: 0, ...extra });
  return parts[parts.length - 1];
}

if (model) {
  // тень на полу
  const sh = document.createElement('div'); sh.className = 'floor-shadow'; model.append(sh);

  /* размеры кухни (px): ширина 600, база 170, столешница 12, верх 110 */
  const L = -300, COL = 120, MOD = 120, N = 4;
  const D = 115, BASE_H = 160, PLINTH = 10, TOP_H = 12;
  const WALL_Y0 = -290, WALL_H = 110, WALL_D = 70;
  const zBack = -D / 2;

  // ── 01 · корпуса ──
  add(box(COL, 440, D, 'm-graphite'), L + COL / 2, -220, 0, .02, .14, { y: 500 });
  for (let i = 0; i < N; i++) {
    const x = L + COL + MOD * i + MOD / 2;
    add(box(MOD - 2, BASE_H, D, 'm-corpus'), x, -(PLINTH + BASE_H / 2), 0, .04 + i * .03, .16 + i * .03, { y: 420, rx: 30 });
    add(box(MOD - 2, WALL_H, WALL_D, 'm-corpus'), x, WALL_Y0 - WALL_H / 2, zBack + WALL_D / 2, .1 + i * .03, .22 + i * .03, { y: -420, rx: -30 });
  }
  add(box(MOD * N, PLINTH, D - 10, 'm-stone'), L + COL + MOD * N / 2, -PLINTH / 2, -5, .02, .12, { y: 200 });

  // ── 02 · столешница, фартук, подсветка ──
  const runX = L + COL + MOD * N / 2, runW = MOD * N;
  add(box(runW + 4, TOP_H, D + 10, 'm-stone'), runX, -(PLINTH + BASE_H + TOP_H / 2), 5, .27, .4, { y: -380, rx: 18 });
  add(box(runW, 106, 4, 'm-marble'), runX, -(PLINTH + BASE_H + TOP_H) - 53, zBack + 2, .33, .46, { z: -260 });
  add(box(runW - 10, 3, 8, 'm-enamel', 'glow'), runX, WALL_Y0 + 2, zBack + WALL_D - 8, .44, .48, { z: 0, y: 0 }, { glow: true });

  // ── 03 · фасады ──
  // колонна: шкаф + стекло духовки
  add(box(COL - 4, 180, 4, 'm-graphite', 'door up'), L + COL / 2, -350, D / 2 + 2, .52, .64, { z: 500, ry: -60 });
  add(box(COL - 14, 80, 4, 'm-glass'), L + COL / 2, -210, D / 2 + 2, .55, .66, { z: 500, ry: 60 });
  add(box(COL - 4, 150, 4, 'm-graphite', 'door'), L + COL / 2, -85, D / 2 + 2, .56, .68, { z: 500, ry: -60 });
  for (let i = 0; i < N; i++) {
    const x = L + COL + MOD * i + MOD / 2;
    // нижние фасады — ящики (выдвигаются в шаге 04)
    add(box(MOD - 4, 74, 4, 'm-graphite', 'door'), x, -(PLINTH + BASE_H) + 39, D / 2 + 2, .54 + i * .025, .66 + i * .025, { z: 520, rx: -50 }, { drawer: i, dz: 0 });
    add(box(MOD - 4, 78, 4, 'm-graphite', 'door'), x, -PLINTH - 40, D / 2 + 2, .56 + i * .025, .68 + i * .025, { z: 520, rx: 50 }, { drawer: i, dz: 0, low: true });
    // верхние фасады — эмаль/рифлёные, открываются вверх (подъёмник Blum)
    add(box(MOD - 4, WALL_H - 4, 4, i % 2 ? 'm-fluted' : 'm-enamel', 'door up'), x, WALL_Y0 - WALL_H / 2, zBack + WALL_D + 2, .58 + i * .025, .7 + i * .025, { y: -300, z: 300, rx: 70 }, { lift: i, hh: (WALL_H - 4) / 2 });
  }
  model._shadow = sh;
}

/* ─────────── кадр модели ─────────── */
let mx = 0, my = 0, smx = 0, smy = 0;
addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

function renderModel(p) {
  if (!model) return;
  // шаг 04: ящики выдвигаются по очереди и мягко закрываются (доводчик)
  parts.forEach(pt => {
    let k = RM ? 1 : easeOut(range(p, pt.t0, pt.t1));
    if (k <= 0) { pt.el.style.visibility = 'hidden'; return; }
    pt.el.style.visibility = '';
    if (pt.from.rx || pt.from.ry) k = RM ? 1 : easeBack(range(p, pt.t0, pt.t1));
    const f = pt.from, inv = 1 - k;
    let x = pt.x + (f.x || 0) * inv, y = pt.y + (f.y || 0) * inv, z = pt.z + (f.z || 0) * inv;
    let rx = (f.rx || 0) * inv, ry = (f.ry || 0) * inv;
    let extra = '';
    if (pt.drawer !== undefined) {
      const a = .78 + pt.drawer * .025 + (pt.low ? .012 : 0);
      const open = range(p, a, a + .06) - range(p, a + .1, a + .17);
      z += 70 * easeOut(clamp(open, 0, 1));
    }
    if (pt.lift !== undefined) {
      const a = .8 + pt.lift * .03;
      const open = clamp(range(p, a, a + .06) - range(p, a + .1, a + .17), 0, 1);
      // поворот вокруг верхней кромки
      extra = `translate3d(0,${-pt.hh}px,0) rotateX(${easeOut(open) * 75}deg) translate3d(0,${pt.hh}px,0)`;
    }
    if (pt.glow) pt.el.style.filter = `brightness(${1 + range(p, .44, .5) * .6})`;
    pt.el.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateX(${rx}deg) rotateY(${ry}deg) ${extra}`;
  });
  smx = lerp(smx, mx, .06); smy = lerp(smy, my, .06);
  const stage = model.parentElement, sw = stage.clientWidth, shh = stage.clientHeight;
  const s = clamp(Math.min(sw / 860, shh / 760), .36, 1);
  const ry = -38 + p * 62 + smx * 12, rx = -16 - smy * 6;
  model.style.transform = `scale(${s.toFixed(3)}) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(0,${(1 - easeOut(range(p, 0, .1))) * 60}px,0)`;
  model._shadow.style.setProperty('--fs', range(p, .02, .15).toFixed(2));
}

/* ─────────── сцена «сборка»: текст глав + модель ─────────── */
SCENES.build = (el, p) => {
  const steps = el._steps || (el._steps = $$('.bstep', el));
  const n = steps.length, k = Math.min(n - 1, Math.floor(p * n));
  if (el._k !== k) {
    el._k = k;
    steps.forEach((s, i) => s.classList.toggle('on', i === k));
    const num = $('.steps-num', el); if (num) num.textContent = String(k + 1).padStart(2, '0');
  }
  el._lastP = p;
};
// модель рисуем каждый кадр (мышь-параллакс), но только когда сцена на экране
const buildSec = $('[data-scene="build"]');
(function loop() {
  if (buildSec) {
    const r = buildSec.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      const p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
      renderModel(p);
      if (buildSec._k === undefined) SCENES.build(buildSec, p);
    }
  }
  requestAnimationFrame(loop);
})();

/* ─────────── круг «эмаль»: центр под курсором ─────────── */
const circ = $('[data-scene="circle"]');
if (circ && matchMedia('(hover:hover)').matches) circ.addEventListener('pointermove', e => {
  circ.style.setProperty('--cx', (e.clientX / innerWidth * 100).toFixed(1) + '%');
  circ.style.setProperty('--cy', (e.clientY / innerHeight * 100).toFixed(1) + '%');
});

/* ─────────── форма (демо, без сервера) ─────────── */
const form = $('.c-form');
if (form) {
  const phone = form.elements.phone;
  phone.addEventListener('input', () => {
    let d = phone.value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (d && !d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    const m = d.match(/^7(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
    if (!m) { phone.value = d ? '+' + d : ''; return; }
    let s = '+7';
    if (m[1]) s += ` (${m[1]}`; if (m[1].length === 3) s += ')';
    if (m[2]) s += ` ${m[2]}`; if (m[3]) s += `-${m[3]}`; if (m[4]) s += `-${m[4]}`;
    phone.value = s; phone.classList.remove('err');
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (phone.value.replace(/\D/g, '').length < 11) { phone.classList.add('err'); phone.focus(); return; }
    // TODO: отправка заявки (Telegram-бот / почта / CRM) — см. README
    form.classList.add('sent');
    $('button', form).textContent = 'Заявка принята ✓';
    $('.c-note', form).textContent = 'Спасибо! Перезвоним в рабочее время, с 9:00 до 21:00.';
  });
}
})();
