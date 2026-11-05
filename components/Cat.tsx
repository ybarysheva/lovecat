"use client";

import { useEffect, useRef } from "react";
import "./cat.css";

type Props = {
  /** The recipient's name; null for the demo cat, which just says "pet the cat". */
  to: string | null;
  from: string | null;
  notes: string[];
  /** Shown at the bottom of the scene: "make your own" on a cat page, "back to editing" in preview. */
  footer?: React.ReactNode;
};

// The cat from the original lil cat page. The markup is JSX; the behaviour is the
// original script, scoped to this component's root and cleaned up on unmount.
export default function Cat({ to, from, notes, footer }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return startCat(root, () => notesRef.current);
  }, []);

  return (
    <div ref={rootRef} className="cat-scene">
      {/* LASER POINTER — fixed top-right, below treat bag */}
      <div className="laser-btn" data-laser role="button" aria-label="Play with the laser pointer">
        <div className="laser-body"></div>
        <div className="laser-tip"></div>
        <div className="laser-emitter"></div>
        <span className="laser-hint">[ play ]</span>
      </div>

      {/* TREAT BAG — fixed top-right corner */}
      <div className="treat-bag" data-treat role="button" aria-label="Give the cat a treat">
        <div className="bag-knot"></div>
        <div className="bag-body">
          <span className="bag-icon">★</span>
          <span className="bag-label-text">TREATS</span>
        </div>
        <span className="bag-hint">[ treat ]</span>
      </div>

      <div className="stage">
        <div className="bubble-area">
          <div className="bubble" data-bubble aria-live="polite">
            <span data-bubble-text></span>
          </div>
        </div>

        <div className="cat-hover">
          <div className="cat-float">
            <div className="cat-squish" data-squish role="button" aria-label="Pet the cat">
              <div className="css-cat">
                <div className="cat-cloud"></div>

                <div className="cat-tail">
                  <div className="cat-tail-tip"></div>
                </div>

                <div className="cat-body">
                  <div className="cat-stripe cat-stripe--1"></div>
                  <div className="cat-stripe cat-stripe--2"></div>
                  <div className="cat-stripe cat-stripe--3"></div>
                  <div className="cat-stripe cat-stripe--4"></div>
                  <div className="cat-belly"></div>
                </div>

                <div className="cat-paw cat-paw--l"></div>
                <div className="cat-paw cat-paw--r"></div>

                {/* Face group: ears + head animate together on treat catch */}
                <div className="cat-face-group">
                  <div className="cat-ear cat-ear--l"><div className="cat-ear-inner"></div></div>
                  <div className="cat-ear cat-ear--r"><div className="cat-ear-inner"></div></div>

                  <div className="cat-head">
                    <div className="cat-head-stripe cat-head-stripe--c"></div>
                    <div className="cat-head-stripe cat-head-stripe--l"></div>
                    <div className="cat-head-stripe cat-head-stripe--r"></div>
                    <div className="cat-blush cat-blush--l"></div>
                    <div className="cat-blush cat-blush--r"></div>
                    {/* Eye bg rings (painted before eyes = behind eyes) */}
                    <div className="cat-eye-bg cat-eye-bg--l"></div>
                    <div className="cat-eye-bg cat-eye-bg--r"></div>
                    <div className="cat-eye-l"></div>
                    <div className="cat-eye-r"></div>
                    {/* Muzzle patch behind nose/mouth */}
                    <div className="cat-muzzle"></div>
                    <div className="cat-nose"></div>
                    <div className="cat-mouth"></div>
                    <div className="cat-whisker cat-whisker--l1"></div>
                    <div className="cat-whisker cat-whisker--l2"></div>
                    <div className="cat-whisker cat-whisker--l3"></div>
                    <div className="cat-whisker cat-whisker--r1"></div>
                    <div className="cat-whisker cat-whisker--r2"></div>
                    <div className="cat-whisker cat-whisker--r3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="cat-label">{to ? `[ pet the cat to receive love, ${to} ]` : "[ pet the cat to receive love ]"}</p>
        {from && <p className="cat-from">with love from {from}</p>}
      </div>

      {footer && <div className="cat-footer">{footer}</div>}
    </div>
  );
}

type AudioCtor = typeof AudioContext;

function newAudioContext(): AudioContext {
  const Ctor: AudioCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext: AudioCtor }).webkitAudioContext;
  return new Ctor();
}

/** Wires up the cat inside `root`. Returns a cleanup function. */
function startCat(root: HTMLElement, getNotes: () => string[]): () => void {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;

  const bubble = $("[data-bubble]");
  const bubbleText = $("[data-bubble-text]");
  const squish = $("[data-squish]");
  const treatBag = $("[data-treat]");
  const laserBtn = $("[data-laser]");
  const cssCat = $(".css-cat");
  const catFaceGroup = $(".cat-face-group");
  const mouth = $(".cat-mouth");
  const eyeL = $(".cat-eye-l");
  const eyeR = $(".cat-eye-r");
  const pawL = $(".cat-paw--l");
  const pawR = $(".cat-paw--r");

  // Every timer and element made here is tracked, so unmounting (e.g. closing the
  // builder's preview) leaves nothing running or floating on the page.
  let disposed = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!disposed) fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const cancel = (t: ReturnType<typeof setTimeout> | null) => {
    if (t === null) return;
    clearTimeout(t);
    timers.delete(t);
  };
  const audio = new Set<AudioContext>();
  const closeAudioLater = (ctx: AudioContext, ms: number) => {
    audio.add(ctx);
    setTimeout(() => {
      audio.delete(ctx);
      ctx.close().catch(() => {});
    }, ms);
  };

  // ---- NOTES: shuffle-bag, depleted before refilling ----
  let queue: string[] = [];
  let lastShown: string | null = null;

  function nextNote(): string {
    const notes = getNotes();
    queue = queue.filter((n) => notes.includes(n)); // drop notes removed while previewing
    if (queue.length === 0) {
      queue = [...notes];
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      // Don't repeat the last note right after a refill.
      if (queue.length > 1 && queue[queue.length - 1] === lastShown) {
        [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
      }
    }
    lastShown = queue.pop() ?? "";
    return lastShown;
  }

  // ---- BUBBLE ----
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let isVisible = false;

  function showBubble(text: string) {
    bubbleText.textContent = text;
    bubble.className = text.length > 90 ? "bubble bubble--long" : "bubble";
    void bubble.offsetWidth;
    bubble.classList.add("show");
    isVisible = true;
    cancel(hideTimeout);
    hideTimeout = later(hideBubble, 5500);
  }

  function hideBubble() {
    cancel(hideTimeout);
    hideTimeout = null;
    bubble.classList.remove("show");
    bubble.classList.add("hide");
    isVisible = false;
    later(() => {
      bubble.classList.remove("hide");
    }, 220);
  }

  function handlePet() {
    playMew();
    squish.classList.remove("squishing");
    void squish.offsetWidth;
    squish.classList.add("squishing");
    squish.addEventListener("animationend", () => squish.classList.remove("squishing"), { once: true });
    showBubble(nextNote());
  }

  function playMew() {
    try {
      const ctx = newAudioContext();
      const osc = ctx.createOscillator();
      // Pre-filter tames the harshest highs before formant shaping
      const precut = ctx.createBiquadFilter();
      // Two formant filters: F1 (low vowel resonance) + F2 (high vowel resonance)
      const f1 = ctx.createBiquadFilter();
      const f2 = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      // Natural cat-voice wobble
      const vib = ctx.createOscillator();
      const vibG = ctx.createGain();

      osc.type = "sawtooth"; // harmonics needed for formants to work
      precut.type = "lowpass";
      precut.frequency.value = 5000; // cut only the very harsh top
      f1.type = "bandpass";
      f1.Q.value = 10; // narrow, resonant
      f2.type = "bandpass";
      f2.Q.value = 8;
      vib.type = "sine";
      vib.frequency.value = 7;
      vibG.gain.value = 15;

      vib.connect(vibG);
      vibG.connect(osc.frequency);
      osc.connect(precut);
      precut.connect(f1);
      precut.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(ctx.destination);

      const t = ctx.currentTime;

      // Fundamental pitch arc: rise to "ee", brief hold, fall to "ow"
      osc.frequency.setValueAtTime(390, t);
      osc.frequency.linearRampToValueAtTime(640, t + 0.16);
      osc.frequency.linearRampToValueAtTime(660, t + 0.28);
      osc.frequency.exponentialRampToValueAtTime(330, t + 0.58);

      // F1: "ee" resonance (~380 Hz) → "ow" resonance (~700 Hz)
      f1.frequency.setValueAtTime(380, t);
      f1.frequency.linearRampToValueAtTime(380, t + 0.24);
      f1.frequency.linearRampToValueAtTime(700, t + 0.54);

      // F2: "ee" resonance (~3200 Hz) → "ow" resonance (~1100 Hz)
      f2.frequency.setValueAtTime(3200, t);
      f2.frequency.linearRampToValueAtTime(3200, t + 0.24);
      f2.frequency.linearRampToValueAtTime(1100, t + 0.54);

      // Amplitude envelope
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.07);
      gain.gain.setValueAtTime(0.18, t + 0.38);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.62);

      osc.start(t);
      vib.start(t);
      osc.stop(t + 0.64);
      vib.stop(t + 0.64);
      closeAudioLater(ctx, 1100);
    } catch {}
  }

  // ---- TREAT BAG ----
  function throwTreat() {
    if (treatBag.classList.contains("throwing")) return; // already in flight
    treatBag.classList.add("throwing");

    const bagRect = treatBag.getBoundingClientRect();
    const mouthRect = mouth.getBoundingClientRect();

    const startX = bagRect.left + bagRect.width / 2;
    const startY = bagRect.top + bagRect.height / 2;
    const dx = mouthRect.left + mouthRect.width / 2 - startX;
    const dy = mouthRect.top + mouthRect.height / 2 - startY;

    const treat = document.createElement("div");
    treat.className = "treat-flying";
    treat.style.left = startX + "px";
    treat.style.top = startY + "px";
    root.appendChild(treat);

    // Parabolic arc: ease-out to peak, ease-in to mouth
    const flight = treat.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1, easing: "ease-out" },
        {
          transform: `translate(calc(-50% + ${dx * 0.42}px), calc(-50% - 68px)) scale(1.35)`,
          offset: 0.35,
          opacity: 1,
          easing: "ease-in",
        },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.65)`, opacity: 0.85 },
      ],
      { duration: 720, fill: "forwards" },
    );

    // Mouth opens just before treat arrives
    later(openMouthForCatch, Math.round(720 * 0.68));

    flight.finished
      .then(() => {
        treat.remove();
        treatBag.classList.remove("throwing");
        if (!disposed) startHappyState();
      })
      .catch(() => treat.remove());
  }

  function openMouthForCatch() {
    mouth.classList.remove("open");
    void mouth.offsetWidth;
    mouth.classList.add("open");
    mouth.addEventListener("animationend", () => mouth.classList.remove("open"), { once: true });
  }

  // ---- HAPPY / PURR STATE ----
  let happyStateTimeout: ReturnType<typeof setTimeout> | null = null;

  function startHappyState() {
    // If already in happy state, restart it cleanly
    if (happyStateTimeout) {
      cancel(happyStateTimeout);
      endHappyState();
    }

    // Eyes: soft squint held for 4s
    eyeL.classList.remove("happy", "eyes-purring");
    eyeR.classList.remove("happy", "eyes-purring");
    void eyeL.offsetWidth;
    eyeL.classList.add("eyes-purring");
    eyeR.classList.add("eyes-purring");

    // Body: purr micro-vibration
    cssCat.classList.add("cat-purring");

    spawnHeartWaves(cssCat.getBoundingClientRect());
    playPurr(3800);

    happyStateTimeout = later(() => {
      endHappyState();
      happyStateTimeout = null;
    }, 4000);
  }

  function endHappyState() {
    cssCat.classList.remove("cat-purring");
    eyeL.classList.remove("eyes-purring");
    eyeR.classList.remove("eyes-purring");
  }

  function spawnHeartWaves(catRect: DOMRect) {
    // 4 waves, gently tapering off
    [
      { delay: 0, count: 8 },
      { delay: 900, count: 7 },
      { delay: 1800, count: 5 },
      { delay: 2700, count: 4 },
    ].forEach(({ delay, count }) => {
      later(() => {
        for (let i = 0; i < count; i++) later(() => spawnOneHeart(catRect), i * 85);
      }, delay);
    });
  }

  function spawnOneHeart(catRect: DOMRect) {
    const heart = document.createElement("div");
    heart.className = "heart-particle";
    heart.textContent = Math.random() > 0.38 ? "♥" : "♡";

    // Spawn from around the cat's upper body / head area
    const cx = catRect.left + catRect.width * 0.5;
    const cy = catRect.top + catRect.height * 0.38;
    heart.style.left = cx + (Math.random() - 0.5) * catRect.width * 0.75 + "px";
    heart.style.top = cy + (Math.random() - 0.5) * catRect.height * 0.38 + "px";
    heart.style.fontSize = 10 + Math.random() * 18 + "px";
    root.appendChild(heart);

    const spread = (Math.random() - 0.5) * 170;
    const rise = 55 + Math.random() * 85;
    const rot = (Math.random() - 0.5) * 38;
    const dur = 950 + Math.random() * 650;

    heart
      .animate(
        [
          { transform: "translate(-50%,-50%) scale(0) rotate(0deg)", opacity: 0, easing: "ease-out" },
          {
            transform: `translate(-50%,-50%) scale(1.4) rotate(${rot * 0.3}deg)`,
            opacity: 1,
            offset: 0.18,
            easing: "ease-in",
          },
          {
            transform: `translate(calc(-50% + ${spread}px), calc(-50% - ${rise}px)) scale(0.7) rotate(${rot}deg)`,
            opacity: 0,
          },
        ],
        { duration: dur, fill: "forwards" },
      )
      .finished.then(() => heart.remove())
      .catch(() => heart.remove());
  }

  function playPurr(duration: number) {
    try {
      const ctx = newAudioContext();
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.value = 38; // low rumble fundamental
      filter.type = "lowpass";
      filter.frequency.value = 380; // keep it warm, cut harsh highs
      filter.Q.value = 1.0;
      lfo.type = "sine";
      lfo.frequency.value = 26; // purr rhythm ~26 Hz
      lfoGain.gain.value = 0.035;

      osc.connect(filter);
      filter.connect(env);
      env.connect(ctx.destination);
      lfo.connect(lfoGain);
      lfoGain.connect(env.gain);

      const t = ctx.currentTime;
      const dur = duration / 1000;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.08, t + 0.45); // fade in
      env.gain.setValueAtTime(0.08, t + dur - 0.55);
      env.gain.linearRampToValueAtTime(0, t + dur); // fade out

      osc.start(t);
      lfo.start(t);
      osc.stop(t + dur);
      lfo.stop(t + dur);
      closeAudioLater(ctx, duration + 600);
    } catch {}
  }

  // ---- LASER POINTER ----
  // Tapping the laser turns it on: the dot follows the mouse or finger until the laser
  // is tapped again. On touch screens the dot stays where the finger was lifted.
  const eyeBgL = $(".cat-eye-bg--l");
  const eyeBgR = $(".cat-eye-bg--r");
  let laserDot: HTMLElement | null = null;
  let lastSample: { x: number; y: number; t: number } | null = null;

  const SWIPE_SPEED = 1.2; // px per ms; faster dot movement than this makes the cat swipe
  const SWIPES_TO_CATCH = 8; // after this many swipes, the cat catches the dot once it comes near the paws
  let swipes = 0;
  let catching = false;
  const PUPIL_TRAVEL = 3; // px the pupils can move inside their light rings

  function catCenterX() {
    const r = cssCat.getBoundingClientRect();
    return r.left + r.width / 2;
  }

  function tiltHead(dotX: number) {
    // Tilt toward dot: left = negative rotate, right = positive, capped at ±9deg
    const tilt = Math.max(-9, Math.min(9, (dotX - catCenterX()) * 0.04));
    catFaceGroup.style.transform = `rotate(${tilt}deg)`;
  }

  function lookAt(x: number, y: number) {
    for (const [eye, ring] of [
      [eyeL, eyeBgL],
      [eyeR, eyeBgR],
    ] as const) {
      const r = ring.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) {
        eye.style.translate = "";
        continue;
      }
      // Full travel once the dot is a little way off; less when it's right in front.
      const reach = Math.min(1, dist / 60) * PUPIL_TRAVEL;
      eye.style.translate = `${((dx / dist) * reach).toFixed(2)}px ${((dy / dist) * reach).toFixed(2)}px`;
    }
  }

  function triggerPawSwipe(dotX: number) {
    const paw = dotX < catCenterX() ? pawL : pawR;
    if (paw.classList.contains("swiping")) return;
    swipes++;
    paw.classList.add("swiping");
    paw.addEventListener("animationend", () => paw.classList.remove("swiping"), { once: true });
  }

  function startLaserReactions() {
    cssCat.classList.add("tail-alert");
    catFaceGroup.classList.add("ears-alert");
  }

  function stopLaserReactions() {
    cssCat.classList.remove("tail-alert");
    catFaceGroup.classList.remove("ears-alert");
    catFaceGroup.style.transform = "";
    pawL.classList.remove("swiping", "pouncing");
    pawR.classList.remove("swiping", "pouncing");
    eyeL.style.translate = "";
    eyeR.style.translate = "";
  }

  function moveDot(x: number, y: number) {
    if (!laserDot) return;
    laserDot.style.left = x + "px";
    laserDot.style.top = y + "px";
    tiltHead(x);
    lookAt(x, y);

    // Paw swipes on fast movement, measured over at least 40ms so jittery events don't count.
    const t = performance.now();
    if (!lastSample) {
      lastSample = { x, y, t };
    } else if (t - lastSample.t >= 40) {
      const speed = Math.hypot(x - lastSample.x, y - lastSample.y) / (t - lastSample.t);
      if (speed > SWIPE_SPEED) triggerPawSwipe(x);
      lastSample = { x, y, t };
    }

    if (swipes >= SWIPES_TO_CATCH && nearPaws(x, y)) catchDot();
  }

  /** Converts a point in the cat's own 300×340 drawing to screen coordinates. */
  function catPoint(cx: number, cy: number) {
    const r = cssCat.getBoundingClientRect();
    const scale = r.width / 300; // the cat is shrunk on short screens
    return { x: r.left + cx * scale, y: r.top + cy * scale, scale };
  }

  // The catch zone: just around and in front of the two front paws.
  function nearPaws(x: number, y: number) {
    const topLeft = catPoint(56, 212);
    const bottomRight = catPoint(244, 304);
    return x >= topLeft.x && x <= bottomRight.x && y >= topLeft.y && y <= bottomRight.y;
  }

  // ---- CATCH: the reward after enough swipes ----
  const POUNCE_MS = 550;
  const IMPACT_AT = 0.62; // fraction of the pounce when the paws land

  function catchDot() {
    const dot = laserDot;
    if (!dot || catching) return;
    catching = true;
    document.removeEventListener("pointermove", onPointer);
    document.removeEventListener("pointerdown", onPointer);

    // The dot slides under the spot where the paws will meet.
    const landing = catPoint(150, 273);
    tiltHead(landing.x);
    lookAt(landing.x, landing.y);
    const impactMs = Math.round(POUNCE_MS * IMPACT_AT);
    dot.style.transition = `left ${impactMs}ms ease-in, top ${impactMs}ms ease-in`;
    dot.style.left = landing.x + "px";
    dot.style.top = landing.y + "px";

    for (const paw of [pawL, pawR]) {
      paw.classList.remove("swiping", "pouncing");
      void paw.offsetWidth;
      paw.classList.add("pouncing");
      paw.addEventListener("animationend", () => paw.classList.remove("pouncing"), { once: true });
    }

    later(() => {
      // Paws land: the dot is gone, stars burst, purr.
      dot.style.transition = "transform 0.08s ease-in, opacity 0.08s ease-in";
      dot.style.transform = "translate(-50%, -50%) scale(0)";
      dot.style.opacity = "0";
      spawnStarBurst(landing.x, landing.y, landing.scale);
      playPurr(3800);
      purrVibration(4000); // same body vibration as the treat reward
    }, impactMs);

    later(() => {
      catching = false;
      stopLaser();
    }, POUNCE_MS + 150);
  }

  let vibrationTimeout: ReturnType<typeof setTimeout> | null = null;

  function purrVibration(ms: number) {
    cancel(vibrationTimeout);
    cssCat.classList.add("cat-purring");
    vibrationTimeout = later(() => {
      vibrationTimeout = null;
      cssCat.classList.remove("cat-purring");
    }, ms);
  }

  function spawnStarBurst(x: number, y: number, scale: number) {
    const glyphs = ["✦", "✧", "★", "✶"];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const star = document.createElement("div");
      star.className = "star-particle";
      star.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      star.style.left = x + "px";
      star.style.top = y + "px";
      star.style.fontSize = (12 + Math.random() * 14) * scale + "px";
      root.appendChild(star);

      // Evenly spread around the circle, with a little jitter, mostly upward.
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = (45 + Math.random() * 55) * scale;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist * 0.75 - 20 * scale;
      const rot = (Math.random() - 0.5) * 120;
      star
        .animate(
          [
            { transform: "translate(-50%,-50%) scale(0) rotate(0deg)", opacity: 1, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" },
            {
              transform: `translate(calc(-50% + ${dx * 0.8}px), calc(-50% + ${dy * 0.8}px)) scale(1.2) rotate(${rot * 0.7}deg)`,
              opacity: 1,
              offset: 0.55,
            },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6) rotate(${rot}deg)`, opacity: 0 },
          ],
          { duration: 700 + Math.random() * 300, fill: "forwards" },
        )
        .finished.then(() => star.remove())
        .catch(() => star.remove());
    }
  }

  const onPointer = (e: PointerEvent) => moveDot(e.clientX, e.clientY);

  function startLaser(x: number, y: number) {
    laserBtn.classList.add("active");
    root.classList.add("laser-on"); // stops touch drags from scrolling the page
    startLaserReactions();

    laserDot = document.createElement("div");
    laserDot.className = "laser-dot";
    root.appendChild(laserDot);
    lastSample = null;
    swipes = 0;
    moveDot(x, y); // starts where the laser was tapped

    document.addEventListener("pointermove", onPointer);
    document.addEventListener("pointerdown", onPointer);
  }

  function stopLaser() {
    document.removeEventListener("pointermove", onPointer);
    document.removeEventListener("pointerdown", onPointer);
    stopLaserReactions();
    root.classList.remove("laser-on");
    laserBtn.classList.remove("active");

    const dot = laserDot;
    laserDot = null;
    if (!dot) return;
    dot.style.transition = "opacity 0.3s";
    dot.style.opacity = "0";
    later(() => dot.remove(), 300);
  }

  const onLaserClick = (e: MouseEvent) => {
    if (catching) return; // let the catch finish; it turns the laser off itself
    if (laserDot) stopLaser();
    else startLaser(e.clientX, e.clientY);
  };

  // ---- EVENTS ----
  const onDocClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    if (isVisible && !target?.closest("[data-squish], [data-bubble], [data-treat]")) hideBubble();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isVisible) hideBubble();
  };

  squish.addEventListener("click", handlePet);
  treatBag.addEventListener("click", throwTreat);
  laserBtn.addEventListener("click", onLaserClick);
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKey);

  return () => {
    disposed = true;
    timers.forEach(clearTimeout);
    timers.clear();
    audio.forEach((ctx) => ctx.close().catch(() => {}));
    squish.removeEventListener("click", handlePet);
    treatBag.removeEventListener("click", throwTreat);
    laserBtn.removeEventListener("click", onLaserClick);
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("pointermove", onPointer);
    document.removeEventListener("pointerdown", onPointer);
    root.querySelectorAll(".treat-flying, .heart-particle, .star-particle, .laser-dot").forEach((el) => el.remove());
  };
}
