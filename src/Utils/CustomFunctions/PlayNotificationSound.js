/**
 * Plays a distinct, highly noticeable siren alert sound using the Web Audio API.
 * Frequency sweeps up and down to create a siren tone that catches attention.
 * Uses a singleton AudioContext and unlocks on initial user interaction.
 */

let sharedAudioCtx = null;
let unlockListenerAttached = false;

export const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
};

export const unlockAudioContext = async () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (err) {
      console.warn("Could not resume AudioContext:", err);
    }
  }
};

// Automatically attach unlock listeners once in the browser
if (typeof window !== "undefined" && !unlockListenerAttached) {
  const handleInteraction = () => {
    unlockAudioContext();
    ["click", "keydown", "pointerdown", "touchstart"].forEach((evt) => {
      window.removeEventListener(evt, handleInteraction);
    });
  };

  ["click", "keydown", "pointerdown", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, handleInteraction, { once: true, passive: true });
  });
  unlockListenerAttached = true;
}

export const playNotificationSound = async () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Square wave has maximum harmonic energy, making it the loudest wave type
    osc.type = "square";

    const startTime = ctx.currentTime;
    const duration = 2.4; // Total duration of the siren (seconds)
    const cycleTime = 0.6; // Time for one full up-down sweep cycle (0.6s)

    // Set starting frequency (500Hz)
    osc.frequency.setValueAtTime(500, startTime);

    // Create rising and falling frequency sweeps
    for (let t = 0; t < duration; t += cycleTime) {
      if (startTime + t + cycleTime / 2 < startTime + duration) {
        osc.frequency.linearRampToValueAtTime(900, startTime + t + cycleTime / 2);
      }
      if (startTime + t + cycleTime < startTime + duration) {
        osc.frequency.linearRampToValueAtTime(500, startTime + t + cycleTime);
      }
    }

    // Set extreme gain (50.0) for maximum hardware output volume with digital distortion
    gainNode.gain.setValueAtTime(50.0, startTime);
    gainNode.gain.setValueAtTime(50.0, startTime + duration - 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(startTime + duration);
  } catch (error) {
    console.warn("Failed to play notification siren sound:", error);
  }
};

