// @ts-check

export class Birdsong {

	/**
	 * @type {AudioContext}
	 */
	audioContext;

	chirp() {
		if (!this.audioContext) {
			this.audioContext = new AudioContext();
		}

		const TIMES = [0, 0.06, 0.10, 0.15];
		const FREQUENCIES = [2200,
			3500 + Math.random() * 600,
			2100 + Math.random() * 200,
			1600 + Math.random() * 400];
		const VOLUMES = [0.0001, 0.3, 0.3, 0.0001];

		const oscillator = this.audioContext.createOscillator();
		oscillator.type = "sine";
		const gain = this.audioContext.createGain();
		oscillator.connect(gain);
		gain.connect(this.audioContext.destination);

		const now = this.audioContext.currentTime;
		for (let i = 0; i < TIMES.length; i++) {
			const time = TIMES[i] + now;
			if (i === 0) {
				oscillator.frequency.setValueAtTime(FREQUENCIES[i], time);
				gain.gain.setValueAtTime(VOLUMES[i], time);
			} else {
				oscillator.frequency.exponentialRampToValueAtTime(FREQUENCIES[i], time);
				gain.gain.exponentialRampToValueAtTime(VOLUMES[i], time);
			}
		}

		oscillator.start(now);
		oscillator.stop(now + TIMES[TIMES.length - 1]);
	}
}