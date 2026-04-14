type NoteEvent = { freq: number; start: number; dur: number };

const playSequence = (
  notes: NoteEvent[],
  volume = 0.06,
  type: OscillatorType = 'sine'
) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.setValueAtTime(volume, ctx.currentTime);
    master.connect(ctx.destination);

    const last = notes[notes.length - 1];
    master.gain.setValueAtTime(volume, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + last.start + last.dur + 0.08);

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(master);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    });

    setTimeout(() => ctx.close(), (last.start + last.dur + 0.3) * 1000);
  } catch {
    // Silently ignore if AudioContext not available
  }
};

export const useKioskAudio = () => {
  // Entrada: acorde ascendente C5 → E5 → G5 (alegre)
  const playEntrada = () => playSequence([
    { freq: 523, start: 0,    dur: 0.14 },
    { freq: 659, start: 0.11, dur: 0.14 },
    { freq: 784, start: 0.22, dur: 0.32 },
  ], 0.07);

  // Salida: acorde descendente G5 → E5 → C5 (suave conclusión)
  const playSalida = () => playSequence([
    { freq: 784, start: 0,    dur: 0.12 },
    { freq: 659, start: 0.10, dur: 0.12 },
    { freq: 523, start: 0.20, dur: 0.36 },
  ], 0.06);

  // Inicio descanso: dos notas suaves descendentes (relajado)
  const playDescanso = () => playSequence([
    { freq: 659, start: 0,    dur: 0.22 },
    { freq: 494, start: 0.20, dur: 0.38 },
  ], 0.05);

  // Fin descanso: dos notas ascendentes (vuelta a la acción)
  const playReanudar = () => playSequence([
    { freq: 523, start: 0,    dur: 0.12 },
    { freq: 784, start: 0.10, dur: 0.28 },
  ], 0.06);

  // Error PIN: dos pitidos cortos graves (aviso discreto)
  const playError = () => playSequence([
    { freq: 220, start: 0,    dur: 0.07 },
    { freq: 180, start: 0.09, dur: 0.10 },
  ], 0.05, 'square');

  // Objetivo semanal / racha: arpeggio ascendente de 4 notas (celebración)
  const playGoal = () => playSequence([
    { freq: 523,  start: 0,    dur: 0.10 },
    { freq: 659,  start: 0.09, dur: 0.10 },
    { freq: 784,  start: 0.18, dur: 0.10 },
    { freq: 1047, start: 0.27, dur: 0.45 },
  ], 0.08);

  return { playEntrada, playSalida, playDescanso, playReanudar, playError, playGoal };
};
