// Browser sound only. No vendor, media file or automatic permission prompt.
export function createOrderSound() {
  let context: AudioContext | null = null;
  return {
    async enable() {
      if (!context || context.state === 'closed') context = new AudioContext();
      await context.resume();
      return context.state === 'running';
    },
    running: () => context?.state === 'running',
    play() {
      if (!context || context.state !== 'running') return false;
      const at = context.currentTime;
      [740, 990, 740, 1175].forEach((frequency, index) => {
        const oscillator = context!.createOscillator(), gain = context!.createGain(), start = at + index * .24;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.28, start + .025);
        gain.gain.setValueAtTime(.28, start + .15); gain.gain.linearRampToValueAtTime(0, start + .21);
        oscillator.connect(gain).connect(context!.destination); oscillator.start(start); oscillator.stop(start + .23);
      });
      return true;
    },
    async pause() { await context?.suspend(); },
    async close() { await context?.close(); context = null; },
  };
}
