<script setup lang="ts">
import { computed } from 'vue';
import type { WorkLog, Shift } from '../types';
import { Flame, TrendingUp, Star, Smile, Meh, Frown, Heart, Calendar, Award } from 'lucide-vue-next';

const props = defineProps<{
  streak: number;
  logs: WorkLog[];
  todayShift: Shift | null;
}>();

// ─── Días Lun–Vie de la semana actual ────────────────────────────────────────
const weekDays = computed(() => {
  const today = new Date();
  const dow = today.getDay(); // 0=Dom
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return {
      dateStr,
      label: d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '').toUpperCase(),
      dayNum: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
      isFuture: d.getTime() > today.setHours(23, 59, 59, 999),
    };
  });
});

// ─── Helpers de logs ──────────────────────────────────────────────────────────
const logsForDay = (dateStr: string) => props.logs.filter(l => l.date === dateStr);

const entryTime = (dateStr: string) => {
  const l = logsForDay(dateStr).find(l => l.type === 'ENTRADA');
  return l ? new Date(l.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null;
};

const exitTime = (dateStr: string) => {
  const l = logsForDay(dateStr).find(l => l.type === 'SALIDA');
  return l ? new Date(l.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null;
};

const workedSeconds = (dateStr: string) => {
  const dayLogs = logsForDay(dateStr);
  const entry = dayLogs.find(l => l.type === 'ENTRADA');
  const exit  = dayLogs.find(l => l.type === 'SALIDA');
  if (!entry || !exit) return null;
  return Math.round((new Date(exit.timestamp).getTime() - new Date(entry.timestamp).getTime()) / 1000);
};

const fmtHM = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

const isPunctual = (dateStr: string): boolean | null => {
  if (!props.todayShift) return null;
  const e = logsForDay(dateStr).find(l => l.type === 'ENTRADA');
  if (!e) return null;
  const [sh, sm] = props.todayShift.startTime.split(':').map(Number);
  const limit = new Date(e.timestamp);
  limit.setHours(sh, sm + 10, 0, 0); // 10 min de gracia
  return new Date(e.timestamp) <= limit;
};

const moodForDay = (dateStr: string) => {
  const l = logsForDay(dateStr).find(l => l.type === 'SALIDA' && l.satisfaction);
  return l?.satisfaction ?? null;
};

// ─── Mood semanal ─────────────────────────────────────────────────────────────
const weekMoodScore = computed(() => {
  const scores = weekDays.value
    .map(d => moodForDay(d.dateStr))
    .filter(Boolean)
    .map(m => ({ BAD: 1, NEUTRAL: 2, GOOD: 3, EXCELLENT: 4 }[m!] ?? 2));
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
});

// ─── Mensaje de feedback personalizado ───────────────────────────────────────
const feedback = computed(() => {
  const s = props.streak;
  const mood = weekMoodScore.value;

  if (s >= 15) return { icon: 'star',   color: 'text-yellow-400', bg: 'bg-yellow-500/8 border-yellow-500/15',
    text: `¡Racha histórica de ${s} días! Eres el referente de puntualidad del equipo.` };
  if (s >= 10) return { icon: 'star',   color: 'text-yellow-400', bg: 'bg-yellow-500/8 border-yellow-500/15',
    text: `${s} días seguidos llegando a tiempo. El equipo lo valora más de lo que crees.` };
  if (s >= 5)  return { icon: 'flame',  color: 'text-orange-400', bg: 'bg-orange-500/8 border-orange-500/15',
    text: `¡Racha de ${s} días! Semana muy sólida. Sigue marcando el ritmo.` };
  if (s === 3 || s === 4) return { icon: 'flame', color: 'text-orange-400', bg: 'bg-orange-500/8 border-orange-500/15',
    text: `${s} días puntual seguidos. ¡Vas a por la racha de 5!` };

  if (mood !== null && mood >= 3.5) return { icon: 'heart', color: 'text-pink-400', bg: 'bg-pink-500/8 border-pink-500/15',
    text: '¡Qué semana tan positiva! Tu estado de ánimo esta semana ha sido excelente.' };
  if (mood !== null && mood >= 2.5) return { icon: 'smile', color: 'text-green-400', bg: 'bg-green-500/8 border-green-500/15',
    text: 'Buena semana en términos de bienestar. El equipo crece con personas así.' };

  const todayEntry = entryTime(new Date().toISOString().split('T')[0]);
  if (todayEntry && props.todayShift) {
    const [sh, sm] = props.todayShift.startTime.split(':').map(Number);
    const [eh, em] = todayEntry.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm + 5)
      return { icon: 'trending', color: 'text-blue-400', bg: 'bg-blue-500/8 border-blue-500/15',
        text: 'Hoy has llegado puntual. Pequeños hábitos, grandes resultados.' };
  }

  return { icon: 'smile', color: 'text-gray-400', bg: 'bg-white/5 border-white/8',
    text: 'Cada jornada cuenta. ¡Que sea un gran día de trabajo!' };
});

// ─── Color / estado de día ────────────────────────────────────────────────────
const dayState = (d: { dateStr: string; isToday: boolean; isFuture: boolean }) => {
  if (d.isFuture)           return 'future';
  if (!entryTime(d.dateStr)) return d.isToday ? 'today-empty' : 'absent';
  if (isPunctual(d.dateStr) === false) return 'late';
  return 'ok';
};
</script>

<template>
  <div class="p-5 flex flex-col gap-4 bg-black/40 rounded-[2rem] border border-white/5">

    <!-- Cabecera -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Calendar class="w-4 h-4 text-blue-500" />
        <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Esta semana</span>
      </div>
      <div v-if="streak > 0" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
        <Flame class="w-3 h-3 text-orange-400" />
        <span class="text-[8px] font-bold text-orange-400 uppercase tracking-widest">{{ streak }} días</span>
      </div>
      <div v-else class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
        <Award class="w-3 h-3 text-gray-500" />
        <span class="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Sin racha</span>
      </div>
    </div>

    <!-- Grid Lun–Vie -->
    <div class="grid grid-cols-5 gap-2">
      <div
        v-for="day in weekDays"
        :key="day.dateStr"
        :class="[
          'flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border transition-all',
          day.isToday ? 'bg-blue-500/10 border-blue-500/25' :
          dayState(day) === 'ok'      ? 'bg-green-500/5 border-green-500/15' :
          dayState(day) === 'late'    ? 'bg-orange-500/5 border-orange-500/15' :
          dayState(day) === 'future'  ? 'bg-white/2 border-white/5 opacity-35' :
          'bg-white/3 border-white/5'
        ]"
      >
        <!-- Nombre día -->
        <span :class="['text-[7px] font-black uppercase tracking-widest', day.isToday ? 'text-blue-400' : 'text-gray-600']">
          {{ day.label }}
        </span>

        <!-- Número día -->
        <span :class="['text-xs font-black leading-none', day.isToday ? 'text-blue-300' : 'text-gray-400']">
          {{ day.dayNum }}
        </span>

        <!-- Icono estado -->
        <div class="flex items-center justify-center w-5 h-5">
          <div v-if="dayState(day) === 'ok'" class="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
            <span class="text-[9px] text-green-400 font-black">✓</span>
          </div>
          <div v-else-if="dayState(day) === 'late'" class="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
            <span class="text-[8px] text-orange-400 font-black">!</span>
          </div>
          <div v-else-if="dayState(day) === 'today-empty'" class="w-3 h-3 rounded-full bg-blue-500/60 animate-pulse" />
          <div v-else class="w-2 h-2 rounded-full bg-white/10" />
        </div>

        <!-- Hora entrada -->
        <span v-if="entryTime(day.dateStr)" class="text-[7px] font-mono text-gray-500 leading-none">
          {{ entryTime(day.dateStr) }}
        </span>
        <span v-else class="text-[7px] text-gray-700 leading-none">—</span>

        <!-- Horas trabajadas -->
        <span v-if="workedSeconds(day.dateStr)" class="text-[6px] font-bold text-gray-600 leading-none">
          {{ fmtHM(workedSeconds(day.dateStr)!) }}
        </span>

        <!-- Mood icon -->
        <Heart  v-if="moodForDay(day.dateStr) === 'EXCELLENT'" class="w-2.5 h-2.5 text-pink-400" />
        <Smile  v-else-if="moodForDay(day.dateStr) === 'GOOD'"     class="w-2.5 h-2.5 text-green-400" />
        <Meh    v-else-if="moodForDay(day.dateStr) === 'NEUTRAL'"   class="w-2.5 h-2.5 text-yellow-400" />
        <Frown  v-else-if="moodForDay(day.dateStr) === 'BAD'"       class="w-2.5 h-2.5 text-red-400" />
      </div>
    </div>

    <!-- Leyenda compacta -->
    <div class="flex items-center gap-4 text-[7px] uppercase tracking-widest font-bold text-gray-700">
      <span class="flex items-center gap-1"><span class="text-green-500">✓</span> Puntual</span>
      <span class="flex items-center gap-1"><span class="text-orange-400">!</span> Tarde</span>
      <span class="flex items-center gap-1"><Heart class="w-2 h-2 text-pink-400" /> Estado ánimo</span>
    </div>

    <!-- Feedback personalizado -->
    <div :class="['flex items-start gap-3 p-3 rounded-2xl border', feedback.bg]">
      <Flame       v-if="feedback.icon === 'flame'"   :class="['w-4 h-4 flex-shrink-0 mt-0.5', feedback.color]" />
      <Star        v-else-if="feedback.icon === 'star'"    :class="['w-4 h-4 flex-shrink-0 mt-0.5', feedback.color]" />
      <Heart       v-else-if="feedback.icon === 'heart'"   :class="['w-4 h-4 flex-shrink-0 mt-0.5', feedback.color]" />
      <Smile       v-else-if="feedback.icon === 'smile'"   :class="['w-4 h-4 flex-shrink-0 mt-0.5', feedback.color]" />
      <TrendingUp  v-else                                   :class="['w-4 h-4 flex-shrink-0 mt-0.5', feedback.color]" />
      <p :class="['text-[10px] font-medium leading-relaxed', feedback.color]">
        {{ feedback.text }}
      </p>
    </div>

  </div>
</template>
