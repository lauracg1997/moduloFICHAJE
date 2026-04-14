import { computed } from 'vue';

export function useWelcomeMessage(getName: () => string) {
  const now = new Date();
  const hour = now.getHours();

  const greeting = computed(() => {
    const name = getName();
    if (hour >= 6 && hour < 12) return `Buenos días, ${name}`;
    if (hour >= 12 && hour < 18) return `Buenas tardes, ${name}`;
    return `Buenas noches, ${name}, buen turno`;
  });

  const culturePhrases = [
    "Hoy: prioriza tu seguridad en planta.",
    "Recuerda tomarte tus descansos.",
    "Gracias por tu trabajo, marca la diferencia.",
    "La calidad es responsabilidad de todos.",
    "Tu bienestar es nuestra prioridad."
  ];

  const subPhrase = computed(() => {
    const name = getName();
    // We use a simple hash of the name + date to keep the same phrase for the whole day for a specific person
    const day = now.getDate();
    const index = (name.length + day) % culturePhrases.length;
    return culturePhrases[index];
  });

  return {
    greeting,
    subPhrase
  };
}
