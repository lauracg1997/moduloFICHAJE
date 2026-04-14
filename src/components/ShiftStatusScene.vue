<script setup lang="ts">
import { computed } from 'vue';
import type { EmployeeStatus } from '../types';
import { LogIn, LogOut, Coffee, AlertTriangle } from 'lucide-vue-next';

const props = defineProps<{
  status: EmployeeStatus;
  workedTime: number;   // segundos
  breakTime: number;    // segundos
  shiftStart: string | null; // "HH:mm"
  shiftEnd: string | null;   // "HH:mm"
}>();

const emit = defineEmits<{
  action: [value: 'ENTRADA' | 'SALIDA' | 'DESCANSO' | 'PARAR_DESCANSO'];
}>();

// ─── Turno ────────────────────────────────────────────────────────────────────
const shiftTotalSeconds = computed(() => {
  if (!props.shiftStart || !props.shiftEnd) return 8 * 3600;
  const [sh, sm] = props.shiftStart.split(':').map(Number);
  const [eh, em] = props.shiftEnd.split(':').map(Number);
  return Math.max(1, (eh * 60 + em - sh * 60 - sm) * 60);
});

const remainingSeconds = computed(() =>
  Math.max(0, shiftTotalSeconds.value - props.workedTime - props.breakTime)
);

// ─── Retraso ──────────────────────────────────────────────────────────────────
const isLate = computed(() => {
  if (props.status !== 'SIN_FICHAJE' || !props.shiftStart) return false;
  const now = new Date();
  const [h, m] = props.shiftStart.split(':').map(Number);
  const deadline = new Date();
  deadline.setHours(h, m + 10, 0, 0);
  return now > deadline;
});

// ─── Config visual por estado ─────────────────────────
const cfg = computed(() => {
  if (isLate.value) return {
    arcColor: '#f97316',
    breakColor: '#fbbf24',
    glowColor: 'rgba(249,115,22,0.22)',
    labelBg: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
    label: 'RETRASO',
    btnPrimary: 'from-orange-600/25 via-orange-500/10 to-rose-500/5 border-orange-500/30 hover:border-orange-400/60 hover:from-orange-600/40',
    btnPrimaryText: 'text-orange-400',
    btnPrimaryIcon: AlertTriangle,
    btnPrimaryLabel: 'Fichar Entrada (tarde)',
    btnPrimaryDesc: 'Tu turno comenzó hace un momento',
    primaryAction: 'ENTRADA' as const,
  };
  switch (props.status) {
    case 'EN_TURNO': return {
      arcColor: '#22c55e',
      breakColor: '#eab308',
      glowColor: 'rgba(34,197,94,0.18)',
      labelBg: 'bg-green-500/10 text-green-400 border-green-500/25',
      label: 'EN TURNO',
      btnPrimary: 'from-red-600/20 via-red-500/10 to-rose-500/5 border-red-500/30 hover:border-red-400/60 hover:from-red-600/35',
      btnPrimaryText: 'text-red-400',
      btnPrimaryIcon: LogOut,
      btnPrimaryLabel: 'Fichar Salida',
      btnPrimaryDesc: 'Finaliza tu jornada de trabajo',
      primaryAction: 'SALIDA' as const,
    };
    case 'EN_DESCANSO': return {
      arcColor: '#eab308',
      breakColor: '#f59e0b',
      glowColor: 'rgba(234,179,8,0.18)',
      labelBg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
      label: 'EN DESCANSO',
      btnPrimary: 'from-yellow-600/25 via-yellow-500/10 to-amber-500/5 border-yellow-500/30 hover:border-yellow-400/60 hover:from-yellow-600/40',
      btnPrimaryText: 'text-yellow-400',
      btnPrimaryIcon: Coffee,
      btnPrimaryLabel: 'Volver al trabajo',
      btnPrimaryDesc: 'Reanuda tu turno activo',
      primaryAction: 'PARAR_DESCANSO' as const,
    };
    default: return {
      arcColor: '#3b82f6',
      breakColor: '#60a5fa',
      glowColor: 'rgba(59,130,246,0.16)',
      labelBg: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
      label: 'SIN FICHAR',
      btnPrimary: 'from-green-600/20 via-green-500/10 to-emerald-500/5 border-green-500/30 hover:border-green-400/60 hover:from-green-600/35',
      btnPrimaryText: 'text-green-400',
      btnPrimaryIcon: LogIn,
      btnPrimaryLabel: 'Fichar Entrada',
      btnPrimaryDesc: 'Registra el inicio de tu jornada',
      primaryAction: 'ENTRADA' as const,
    };
  }
});

// ─── Arco SVG ─────────────────────────────────────────────────────────────────
const R = 110;
const CX = 140;
const CY = 140;
const CIRC = 2 * Math.PI * R;

const workedArc = computed(() =>
  Math.min(props.workedTime / shiftTotalSeconds.value, 1) * CIRC
);
const breakArcLen = computed(() =>
  Math.min(props.breakTime / shiftTotalSeconds.value, 1) * CIRC
);

// Posición del marcador de hora actual sobre el arco
const nowMarker = computed(() => {
  if (!props.shiftStart || !props.shiftEnd) return null;
  const now = new Date();
  const [sh, sm] = props.shiftStart.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const elapsed = Math.max(0, nowMin - startMin) * 60;
  const fraction = Math.min(elapsed / shiftTotalSeconds.value, 1);
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return {
    x: CX + R * Math.cos(angle),
    y: CY + R * Math.sin(angle),
  };
});

// ─── Bloques de tiempo ────────────────────────────────────────────────────────
const total = computed(() =>
  Math.max(props.workedTime + props.breakTime + remainingSeconds.value, 1)
);
const workedPct = computed(() => (props.workedTime / total.value) * 100);
const breakPct  = computed(() => (props.breakTime  / total.value) * 100);

// ─── Formato tiempo ───────────────────────────────────────────────────────────
const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};
const fmtFull = (s: number) => {
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
};
</script>

<template>
  <div class="flex flex-col items-center gap-6 w-full">

    <!-- ── Arco SVG centrado ──────────────────────────────────────────────────── -->
    <div class="relative flex items-center justify-center">
      <!-- Glow radial detrás del arco -->
      <div
        class="absolute rounded-full pointer-events-none transition-all duration-1000"
        :style="{
          width: '200px', height: '200px',
          background: `radial-gradient(circle, ${cfg.glowColor} 0%, transparent 70%)`
        }"
      />

      <svg width="280" height="280" viewBox="0 0 280 280" class="overflow-visible -rotate-90">
        <!-- Track -->
        <circle :cx="CX" :cy="CY" :r="R" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="10" stroke-linecap="round" />
        <!-- Worked arc -->
        <circle
          :cx="CX" :cy="CY" :r="R" fill="none" :stroke="cfg.arcColor" stroke-width="10" stroke-linecap="round"
          :stroke-dasharray="`${workedArc} ${CIRC}`" :stroke-dashoffset="0"
          style="transition: stroke-dasharray 1s ease, stroke 1s ease; filter: drop-shadow(0 0 6px currentColor);"
          :style="{ color: cfg.arcColor }"
        />
        <!-- Break arc -->
        <circle
          v-if="breakArcLen > 0"
          :cx="CX" :cy="CY" :r="R" fill="none" :stroke="cfg.breakColor" stroke-width="10" stroke-linecap="round"
          :stroke-dasharray="`${breakArcLen} ${CIRC}`" :stroke-dashoffset="-workedArc"
          style="transition: stroke-dasharray 1s ease, stroke-dashoffset 1s ease"
        />
        <!-- Now marker -->
        <circle v-if="nowMarker" :cx="nowMarker.x" :cy="nowMarker.y" r="5" fill="white" opacity="0.55"
          style="transform-origin: 140px 140px; transform: rotate(90deg)" />
      </svg>

      <!-- Info central -->
      <div class="absolute flex flex-col items-center justify-center text-center pointer-events-none gap-1.5">
        <span :class="['px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest', cfg.labelBg]">
          {{ cfg.label }}
        </span>
        <p class="text-5xl font-bold tracking-tighter leading-none font-mono mt-1" :style="{ color: cfg.arcColor }">
          {{ fmtFull(workedTime) }}
        </p>
        <p class="text-[11px] text-gray-600 uppercase tracking-widest font-bold">trabajado</p>
      </div>
    </div>

    <!-- ── Barra de progreso + leyenda ────────────────────────────────────────── -->
    <div class="w-full flex flex-col gap-2">
      <div class="flex h-2 w-full rounded-full overflow-hidden bg-white/5">
        <div class="h-full transition-all duration-1000 ease-in-out rounded-l-full" :style="{ width: `${workedPct}%`, backgroundColor: cfg.arcColor }" />
        <div class="h-full transition-all duration-1000 ease-in-out" :style="{ width: `${breakPct}%`, backgroundColor: cfg.breakColor }" />
      </div>
      <div class="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-600">
        <span :style="{ color: cfg.arcColor + 'cc' }">{{ fmt(workedTime) }} trab.</span>
        <span v-if="breakTime > 0" :style="{ color: cfg.breakColor + 'cc' }">{{ fmt(breakTime) }} desc.</span>
        <span>{{ fmt(remainingSeconds) }} rest.</span>
      </div>
    </div>

    <!-- ── Botones de acción ───────────────────────────────────────────────────── -->

    <!-- SIN_FICHAJE / tarde: botón grande único -->
    <button
      v-if="status === 'SIN_FICHAJE' || isLate"
      @click="emit('action', cfg.primaryAction)"
      :class="[
        'w-full h-28 rounded-3xl border transition-all duration-200 active:scale-[0.97]',
        'bg-gradient-to-br flex items-center justify-center gap-5 group',
        cfg.btnPrimary
      ]"
      :style="{ boxShadow: `0 8px 40px ${cfg.arcColor}18` }"
    >
      <div class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
           :style="{ backgroundColor: cfg.arcColor + '18', border: `1.5px solid ${cfg.arcColor}35` }">
        <component :is="cfg.btnPrimaryIcon" class="w-8 h-8 flex-shrink-0" :style="{ color: cfg.arcColor }" />
      </div>
      <div class="flex flex-col items-start">
        <span class="text-2xl font-bold tracking-tighter" :style="{ color: cfg.arcColor }">{{ cfg.btnPrimaryLabel }}</span>
        <span class="text-sm text-gray-500 font-medium mt-0.5">{{ cfg.btnPrimaryDesc }}</span>
      </div>
    </button>

    <!-- EN_TURNO: Salida + Descanso en grid 2 columnas -->
    <div v-else-if="status === 'EN_TURNO'" class="w-full grid grid-cols-2 gap-4">
      <!-- Fichar Salida (más grande, span completo en mobile no; en desktop 1 col) -->
      <button
        @click="emit('action', 'SALIDA')"
        class="h-28 rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-600/20 via-red-500/8 to-rose-500/5
               hover:border-red-400/55 hover:from-red-600/32 active:scale-[0.97] transition-all duration-200
               flex items-center justify-center gap-4 group"
        style="box-shadow: 0 8px 40px rgba(239,68,68,0.12)"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-500/15 border border-red-500/30 transition-transform group-hover:scale-110">
          <LogOut class="w-7 h-7 text-red-400" />
        </div>
        <div class="flex flex-col items-start">
          <span class="text-xl font-bold tracking-tighter text-red-400">Fichar Salida</span>
          <span class="text-xs text-gray-500 font-medium mt-0.5">Fin de jornada</span>
        </div>
      </button>

      <!-- Iniciar Descanso -->
      <button
        @click="emit('action', 'DESCANSO')"
        class="h-28 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-600/20 via-amber-500/8 to-yellow-500/5
               hover:border-amber-400/55 hover:from-amber-600/32 active:scale-[0.97] transition-all duration-200
               flex items-center justify-center gap-4 group"
        style="box-shadow: 0 8px 40px rgba(245,158,11,0.12)"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-500/15 border border-amber-500/30 transition-transform group-hover:scale-110">
          <Coffee class="w-7 h-7 text-amber-400" />
        </div>
        <div class="flex flex-col items-start">
          <span class="text-xl font-bold tracking-tighter text-amber-400">Descanso</span>
          <span class="text-xs text-gray-500 font-medium mt-0.5">Pausa de turno</span>
        </div>
      </button>
    </div>

    <!-- EN_DESCANSO: Volver (grande) + Salida -->
    <div v-else-if="status === 'EN_DESCANSO'" class="w-full flex flex-col gap-4">
      <!-- Volver al trabajo — botón principal grande -->
      <button
        @click="emit('action', 'PARAR_DESCANSO')"
        class="w-full h-28 rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-600/22 via-yellow-500/8 to-amber-500/5
               hover:border-yellow-400/55 hover:from-yellow-600/36 active:scale-[0.97] transition-all duration-200
               flex items-center justify-center gap-5 group"
        style="box-shadow: 0 8px 40px rgba(234,179,8,0.14)"
      >
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-yellow-500/15 border border-yellow-500/30 transition-transform group-hover:scale-110">
          <Coffee class="w-8 h-8 text-yellow-400" />
        </div>
        <div class="flex flex-col items-start">
          <span class="text-2xl font-bold tracking-tighter text-yellow-400">Volver al Trabajo</span>
          <span class="text-sm text-gray-500 font-medium mt-0.5">Reanuda tu turno activo</span>
        </div>
      </button>

      <!-- Salida directa desde descanso — botón secundario más pequeño -->
      <button
        @click="emit('action', 'SALIDA')"
        class="w-full h-16 rounded-2xl border border-red-500/20 bg-red-500/5
               hover:border-red-500/40 hover:bg-red-500/10 active:scale-[0.98] transition-all duration-200
               flex items-center justify-center gap-3 group"
      >
        <LogOut class="w-5 h-5 text-red-400/70 group-hover:text-red-400 transition-colors" />
        <span class="text-base font-bold tracking-tighter text-red-400/70 group-hover:text-red-400 transition-colors">Fichar Salida directamente</span>
      </button>
    </div>

  </div>
</template>
