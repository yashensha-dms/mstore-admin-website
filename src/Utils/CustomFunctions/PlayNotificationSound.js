/**
 * Plays a distinct, highly noticeable siren alert sound using the Web Audio API.
 * Frequency sweeps up and down to create a siren tone that catches attention.
 * This runs natively in the browser without requiring external audio file downloads.
 */
export const playNotificationSound = () => {
  try {
    if (typeof window === "undefined") return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Triangle wave has a brighter, more alarm-like tone than a sine wave
    osc.type = "triangle";
    
    const startTime = ctx.currentTime;
    const duration = 2.4;    // Total duration of the siren (seconds)
    const cycleTime = 0.6;   // Time for one full up-down sweep cycle (0.6s)
    
    // Set starting frequency (500Hz)
    osc.frequency.setValueAtTime(500, startTime);
    
    // Create rising and falling frequency sweeps
    for (let t = 0; t < duration; t += cycleTime) {
      if (startTime + t + (cycleTime / 2) < startTime + duration) {
        osc.frequency.linearRampToValueAtTime(900, startTime + t + (cycleTime / 2));
      }
      if (startTime + t + cycleTime < startTime + duration) {
        osc.frequency.linearRampToValueAtTime(500, startTime + t + cycleTime);
      }
    }
    
    // Set a steady volume and fade out smoothly at the end
    gainNode.gain.setValueAtTime(0.12, startTime);
    gainNode.gain.setValueAtTime(0.12, startTime + duration - 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(startTime + duration);
  } catch (error) {
    console.warn("Failed to play notification siren sound:", error);
  }
};
