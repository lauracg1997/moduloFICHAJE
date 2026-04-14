<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import { useEmployeesStore } from '../stores/employees';
import { useWorkLogsStore } from '../stores/workLogs';
import { useCalendarsStore } from '../stores/calendars';
import { useKioskAudio } from '../composables/useKioskAudio';
import { checkGeofence } from '../composables/useGeofence';
import GlassCard from '../components/GlassCard.vue';
import GlassButton from '../components/GlassButton.vue';
import Header from '../components/Header.vue';
import Keyboard from '../components/Keyboard.vue';
import ShiftStatusScene from '../components/ShiftStatusScene.vue';
import WeeklyPanel from '../components/WeeklyPanel.vue';
import {
  User, Coffee, LogIn, LogOut,
  CheckCircle2, Camera, ShieldCheck, X,
  Smile, Meh, Frown, Heart, Building2
} from 'lucide-vue-next';

const kioskStore = useKioskStore();
const employeesStore = useEmployeesStore();
const workLogsStore = useWorkLogsStore();
const calendarsStore = useCalendarsStore();
const { playEntrada, playSalida, playDescanso, playReanudar, playError, playGoal } = useKioskAudio();

const employeeDni = ref('');
const pin = ref('');
const activeField = ref<'dni' | 'pin'>('dni');
const keyboard = ref<{ resetToNumeric: () => void; setAlpha: () => void } | null>(null);
const isPhotoVerifying = ref(false);
const showDashboard = ref(false);
const showEmployeeCard = ref(false);
const showWelcome = ref(false);
const isCardFlipping = ref(false);
const isCheckingGeofence = ref(false);
let welcomeTimer: ReturnType<typeof setTimeout> | null = null;
const showWeeklyPanel = ref(false);
const showErrorModal = ref(false);
const errorModalMessage = ref('');
let errorModalTimer: ReturnType<typeof setTimeout> | null = null;
const showKioskError = (msg: string) => {
  if (errorModalTimer) clearTimeout(errorModalTimer);
  errorModalMessage.value = msg;
  showErrorModal.value = true;
  errorModalTimer = setTimeout(() => { showErrorModal.value = false; }, 3500);
};
const showSatisfactionSurvey = ref(false);
const showConfirmation = ref(false);
const showExitMessage = ref(false);
const showTopToast = ref(false);
const topToastMessage = ref('');
const inactivityTimer = ref<any>(null);

// Confirmation state
const confirmationData = ref<{
  action: string;
  countdown: number;
  employeeName: string;
  message: string;
} | null>(null);
let confirmationTimer: ReturnType<typeof setTimeout> | null = null;
let countdownInterval: ReturnType<typeof setInterval> | null = null;
let exitMessageTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// Mensaje guardado al iniciar salida
const exitMessageText = ref('');
const exitEmployeeName = ref('');

// ─── Modo Noche / Día ─────────────────────────────────────────────────────────
const currentHour = ref(new Date().getHours());
let hourInterval: ReturnType<typeof setInterval> | null = null;
const isNightMode = computed(() => currentHour.value >= 22 || currentHour.value < 6);

// ─── Cola Rápida ─────────────────────────────────────────────────────────────
const QUICK_MODE_WINDOW_MS = 3 * 60 * 1000; // ventana de 3 minutos
const QUICK_MODE_THRESHOLD = 4;             // N fichajes para activar
const isQuickMode = computed(() => {
  const now = Date.now();
  const recent = workLogsStore.logs.filter(l =>
    new Date(l.timestamp).getTime() > now - QUICK_MODE_WINDOW_MS
  );
  return recent.length >= QUICK_MODE_THRESHOLD;
});

// ─── Micro-interacciones ──────────────────────────────────────────────────────
const pinError = ref(false);
const showScanLine = ref(false);
const showReadyGlow = ref(false);

// Filtered Employees by Center
const employeesInCenter = computed(() => {
  return employeesStore.employees.filter(emp => emp.center === kioskStore.deviceState.center);
});

// Identified Employee
const selectedEmployee = computed(() =>
  employeesStore.employees.find(e => e.id === kioskStore.selectedEmployeeId)
);

// Shift and Leave Info
const todayShift = computed(() =>
  kioskStore.selectedEmployeeId ? calendarsStore.getTodayShift(kioskStore.selectedEmployeeId) : null
);
const activeLeave = computed(() =>
  kioskStore.selectedEmployeeId ? calendarsStore.getActiveLeave(kioskStore.selectedEmployeeId) : null
);


// ─── Mensajes variados por acción ────────────────────────────────────────────
const entryMessages = [
  '¡Qué bueno tenerte aquí! Hoy va a ser un gran día.',
  'El equipo está completo contigo. ¡A por ello!',
  'Cada jornada cuenta. ¡Empieza con energía!',
  '¡Tu presencia marca la diferencia hoy!',
  'El mejor momento para brillar es ahora. ¡Vamos!',
  '¡Bienvenido! Este turno va a ser increíble.',
];
const exitMessages = [
  '¡Gran turno! Te lo has ganado, descansa bien.',
  'Gracias por tu trabajo de hoy. ¡Hasta pronto!',
  '¡Turno completado! El descanso también es productividad.',
  '¡Hasta mañana! Hoy has dado lo mejor de ti.',
  'El equipo crece gracias a personas como tú.',
  '¡Otro día increíble! Nos vemos en el próximo turno.',
];
const breakStartMessages = [
  '¡Merecido descanso! Recarga energías y vuelve con todo.',
  'Pausa activada. Descansa, que luego quedan fuerzas.',
  'El descanso también es productividad. ¡Aprovéchalo!',
];
const breakEndMessages = [
  '¡De vuelta al trabajo! El equipo te esperaba.',
  '¡Recargado y listo! A por el resto del turno.',
  '¡Vamos a ello! Queda lo mejor del turno.',
];

const pickMessage = (messages: string[]) =>
  messages[Math.floor(Math.random() * messages.length)];

const getActionBadge = (action: string) => {
  const map: Record<string, string> = {
    ENTRADA: '✓ Fichaje de entrada registrado',
    SALIDA: '✓ Fichaje de salida registrado',
    DESCANSO: '✓ Inicio de descanso registrado',
    PARAR_DESCANSO: '✓ Fin de descanso registrado',
  };
  return map[action] ?? action;
};

const triggerConfirmation = (action: string, employeeName: string, message: string) => {
  if (confirmationTimer) clearTimeout(confirmationTimer);
  if (countdownInterval) clearInterval(countdownInterval);

  showDashboard.value = false;
  showSatisfactionSurvey.value = false;
  showExitMessage.value = false;
  kioskStore.resetSelection();

  showConfirmation.value = true;
  confirmationData.value = { action, countdown: 4, employeeName, message };

  // Scan line y glow
  showScanLine.value = true;
  setTimeout(() => { showScanLine.value = false; }, 450);

  countdownInterval = setInterval(() => {
    if (confirmationData.value && confirmationData.value.countdown > 0) {
      confirmationData.value.countdown--;
    }
  }, 1000);

  confirmationTimer = setTimeout(() => {
    showConfirmation.value = false;
    confirmationData.value = null;
    employeeDni.value = '';
    pin.value = '';
    activeField.value = 'dni';
    if (countdownInterval) clearInterval(countdownInterval);
    nextTick(() => { keyboard.value?.resetToNumeric(); });
    // Glow "listo para siguiente fichaje"
    showReadyGlow.value = true;
    setTimeout(() => { showReadyGlow.value = false; }, 3000);
  }, 4000);
};

const triggerToast = (msg: string) => {
  if (toastTimer) clearTimeout(toastTimer);
  topToastMessage.value = msg;
  showTopToast.value = true;
  toastTimer = setTimeout(() => { showTopToast.value = false; }, 4000);
};

// ─── Inactivity timer (login form: 45s) ──────────────────────────────────────
const resetInactivityTimer = () => {
  if (inactivityTimer.value) clearTimeout(inactivityTimer.value);
  inactivityTimer.value = setTimeout(() => {
    kioskStore.resetSelection();
    employeeDni.value = '';
    pin.value = '';
    showDashboard.value = false;
    showEmployeeCard.value = false;
    showWeeklyPanel.value = false;
    isPhotoVerifying.value = false;
    showSatisfactionSurvey.value = false;
    showExitMessage.value = false;
    showConfirmation.value = false;
    confirmationData.value = null;
    activeField.value = 'dni';
    nextTick(() => { keyboard.value?.resetToNumeric(); });
  }, 45000);
};

// ─── Auto-logout sesión empleado (8 s de inactividad) ────────────────────────
const EMPLOYEE_SESSION_TIMEOUT = 8000;
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
const sessionCountdown = ref(0);
let sessionCountdownInterval: ReturnType<typeof setInterval> | null = null;

const closeEmployeeSession = () => {
  if (sessionCountdownInterval) clearInterval(sessionCountdownInterval);
  if (welcomeTimer) clearTimeout(welcomeTimer);
  sessionCountdownInterval = null;
  sessionTimer = null;
  sessionCountdown.value = 0;

  showDashboard.value = false;
  showEmployeeCard.value = false;
  showWelcome.value = false;
  showWeeklyPanel.value = false;
  showColorPicker.value = false;
  isPhotoVerifying.value = false;
  showSatisfactionSurvey.value = false;
  showExitMessage.value = false;
  kioskStore.resetSelection();
  employeeDni.value = '';
  pin.value = '';
  activeField.value = 'dni';
  nextTick(() => { keyboard.value?.resetToNumeric(); });
};

const resetSessionTimer = () => {
  if (!showDashboard.value && !showEmployeeCard.value) return;
  if (sessionTimer) clearTimeout(sessionTimer);
  if (sessionCountdownInterval) clearInterval(sessionCountdownInterval);

  sessionCountdown.value = Math.round(EMPLOYEE_SESSION_TIMEOUT / 1000);
  sessionCountdownInterval = setInterval(() => {
    sessionCountdown.value = Math.max(0, sessionCountdown.value - 1);
  }, 1000);

  sessionTimer = setTimeout(closeEmployeeSession, EMPLOYEE_SESSION_TIMEOUT);
};

const onSessionActivity = () => { resetSessionTimer(); };

watch([showDashboard, showEmployeeCard, showWelcome], ([dash, card, welcome]) => {
  if (dash || card || welcome) {
    window.addEventListener('pointerdown', onSessionActivity);
    window.addEventListener('keydown',     onSessionActivity);
    resetSessionTimer();
  } else {
    window.removeEventListener('pointerdown', onSessionActivity);
    window.removeEventListener('keydown',     onSessionActivity);
    if (sessionTimer) clearTimeout(sessionTimer);
    if (sessionCountdownInterval) clearInterval(sessionCountdownInterval);
    sessionCountdown.value = 0;
  }
});

watch([pin, employeeDni, () => kioskStore.selectedEmployeeId, showDashboard], () => {
  resetInactivityTimer();
});

onMounted(() => {
  showDashboard.value = false;
  isPhotoVerifying.value = false;
  showSatisfactionSurvey.value = false;
  showConfirmation.value = false;
  employeeDni.value = '';
  pin.value = '';
  activeField.value = 'dni';
  nextTick(() => { keyboard.value?.resetToNumeric(); });
  resetInactivityTimer();
  window.addEventListener('keydown', handlePhysicalKey);
  startCounters();
  hourInterval = setInterval(() => { currentHour.value = new Date().getHours(); }, 60000);
});

onUnmounted(() => {
  if (inactivityTimer.value) clearTimeout(inactivityTimer.value);
  if (sessionTimer) clearTimeout(sessionTimer);
  if (sessionCountdownInterval) clearInterval(sessionCountdownInterval);
  if (confirmationTimer) clearTimeout(confirmationTimer);
  if (countdownInterval) clearInterval(countdownInterval);
  if (exitMessageTimer) clearTimeout(exitMessageTimer);
  if (toastTimer) clearTimeout(toastTimer);
  if (welcomeTimer) clearTimeout(welcomeTimer);
  if (errorModalTimer) clearTimeout(errorModalTimer);
  if (hourInterval) clearInterval(hourInterval);
  window.removeEventListener('keydown', handlePhysicalKey);
  window.removeEventListener('pointerdown', onSessionActivity);
  window.removeEventListener('keydown',     onSessionActivity);
});

const handlePhysicalKey = (e: KeyboardEvent) => {
  if (showDashboard.value || isPhotoVerifying.value || showSatisfactionSurvey.value || showConfirmation.value) return;
  if (e.key === 'Backspace') {
    if (activeField.value === 'pin') pin.value = pin.value.slice(0, -1);
    else employeeDni.value = employeeDni.value.slice(0, -1);
  } else if (e.key === 'Enter') {
    handleLogin();
  } else if (activeField.value === 'pin' && /^[0-9]$/.test(e.key) && pin.value.length < 5) {
    pin.value += e.key;
  } else if (activeField.value === 'dni' && /^[a-zA-Z0-9]$/.test(e.key)) {
    employeeDni.value += e.key.toUpperCase();
  }
};

const handleKeyPress = (key: string) => {
  if (activeField.value === 'dni') {
    employeeDni.value += key;
  } else {
    if (pin.value.length < 5) pin.value += key;
  }
};

const handleClear = () => {
  if (activeField.value === 'dni') {
    employeeDni.value = employeeDni.value.slice(0, -1);
  } else {
    pin.value = pin.value.slice(0, -1);
  }
};

const handleLogin = async () => {
  // Si estamos en el paso DNI, avanzar al PIN
  if (activeField.value === 'dni') {
    if (!employeeDni.value) {
      showKioskError('Introduce tu DNI o NIE para continuar.');
      return;
    }
    activeField.value = 'pin';
    pin.value = '';
    keyboard.value?.resetToNumeric();
    return;
  }

  if (!employeeDni.value || pin.value.length < 5) {
    showKioskError('Introduce tu DNI y PIN completo para continuar.');
    return;
  }

  const emp = employeesInCenter.value.find(e => e.dni.toUpperCase() === employeeDni.value.toUpperCase());

  if (!emp) {
    showKioskError('Empleado no encontrado en este centro. Revisa tu DNI.');
    employeeDni.value = '';
    pin.value = '';
    activeField.value = 'dni';
    return;
  }

  if (emp.pin !== pin.value) {
    pin.value = '';
    activeField.value = 'pin';
    pinError.value = true;
    playError();
    setTimeout(() => { pinError.value = false; }, 600);
    return;
  }

  kioskStore.selectEmployee(emp.id);

  if (activeLeave.value) {
    pin.value = '';
    activeField.value = 'pin';
    pinError.value = true;
    setTimeout(() => { pinError.value = false; }, 600);
    kioskStore.resetSelection();
    return;
  }

  if (kioskStore.deviceState.requirePhoto) {
    isPhotoVerifying.value = true;
    return;
  }

  // Cola rápida: si el empleado no ha fichado aún, ENTRADA directa sin pasar por dashboard
  if (isQuickMode.value && emp.status === 'SIN_FICHAJE') {
    const { geofenceEnabled, kioskLatitude, kioskLongitude, radiusKm } = kioskStore.deviceState;
    if (geofenceEnabled && kioskLatitude !== null && kioskLongitude !== null) {
      isCheckingGeofence.value = true;
      const result = await checkGeofence(kioskLatitude, kioskLongitude, radiusKm, geofenceEnabled);
      isCheckingGeofence.value = false;
      if (!result.allowed) {
        showKioskError(result.errorMessage ?? 'Fuera del área de fichaje permitida.');
        kioskStore.resetSelection();
        employeeDni.value = '';
        pin.value = '';
        activeField.value = 'dni';
        return;
      }
    }
    handleAction('ENTRADA');
    return;
  }

  showEmployeeCard.value = true;
};

const skipWelcome = () => {
  if (welcomeTimer) clearTimeout(welcomeTimer);
  showWelcome.value = false;
  showDashboard.value = true;
};

const proceedAfterGeofence = () => {
  showWelcome.value = true;
  if (welcomeTimer) clearTimeout(welcomeTimer);
  welcomeTimer = setTimeout(() => {
    showWelcome.value = false;
    showDashboard.value = true;
  }, 2200);
};

const openDashboardFromCard = async () => {
  if (isCardFlipping.value) return;
  isCardFlipping.value = true;

  await new Promise(r => setTimeout(r, 650)); // card flip animation
  isCardFlipping.value = false;
  showEmployeeCard.value = false;

  // ── Geofence check (saltado para teletrabajo y movilidad) ─────────────────
  const empWorkMode = selectedEmployee.value?.workMode ?? 'presencial';
  const { geofenceEnabled, kioskLatitude, kioskLongitude, radiusKm } = kioskStore.deviceState;
  if (geofenceEnabled && kioskLatitude !== null && kioskLongitude !== null && empWorkMode === 'presencial') {
    isCheckingGeofence.value = true;
    const result = await checkGeofence(kioskLatitude, kioskLongitude, radiusKm, geofenceEnabled);
    isCheckingGeofence.value = false;

    if (!result.allowed) {
      showKioskError(result.errorMessage ?? 'Fuera del área de fichaje permitida.');
      kioskStore.resetSelection();
      employeeDni.value = '';
      pin.value = '';
      activeField.value = 'dni';
      return;
    }
  }

  proceedAfterGeofence();
};

const confirmPhoto = () => {
  isPhotoVerifying.value = false;
  showEmployeeCard.value = true;
};

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316'];
const showColorPicker = ref(false);

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (emp: { id: string; avatarColor?: string }) => {
  if (emp.avatarColor) return emp.avatarColor;
  const idx = parseInt(emp.id, 10);
  return AVATAR_COLORS[isNaN(idx) ? 0 : idx % AVATAR_COLORS.length];
};

// ─── Real-time counters ───────────────────────────────────────────────────────
const activeCounters = ref<Record<string, ReturnType<typeof setInterval>>>({});

// Starts a single employee's counter (idempotent — safe to call multiple times)
const startCounter = (empId: string) => {
  if (activeCounters.value[empId]) return;
  activeCounters.value[empId] = setInterval(() => {
    const emp = employeesStore.employees.find(e => e.id === empId);
    if (!emp || emp.status === 'SIN_FICHAJE') {
      clearInterval(activeCounters.value[empId]);
      delete activeCounters.value[empId];
      return;
    }
    if (emp.status === 'EN_TURNO') employeesStore.incrementTime(empId, 'work');
    else if (emp.status === 'EN_DESCANSO') employeesStore.incrementTime(empId, 'break');
  }, 1000);
};

const stopCounter = (empId: string) => {
  if (activeCounters.value[empId]) {
    clearInterval(activeCounters.value[empId]);
    delete activeCounters.value[empId];
  }
};

// Boots counters for all currently active employees (called on mount)
const startCounters = () => {
  employeesStore.employees.forEach(emp => {
    if (emp.status !== 'SIN_FICHAJE') startCounter(emp.id);
  });
};

const handleAction = (action: 'ENTRADA' | 'SALIDA' | 'DESCANSO' | 'PARAR_DESCANSO') => {
  if (!selectedEmployee.value) return;

  const emp = selectedEmployee.value;
  const id = emp.id;
  const name = emp.name;
  const deviceId = kioskStore.deviceState.deviceCode || 'PUNTO-01';

  switch (action) {
    case 'ENTRADA': {
      let isGoal = false;
      if (todayShift.value) {
        const now = new Date();
        const [shiftH, shiftM] = todayShift.value.startTime.split(':').map(Number);
        const shiftDate = new Date();
        shiftDate.setHours(shiftH, shiftM, 0, 0);
        const diffMinutes = (now.getTime() - shiftDate.getTime()) / 60000;
        const isPunctual = diffMinutes >= -10 && diffMinutes <= 5;
        employeesStore.updateStreak(id, isPunctual);
        const newStreak = employeesStore.employees.find(e => e.id === id)?.streakPuntualidad ?? 0;
        isGoal = isPunctual && newStreak > 0 && newStreak % 5 === 0;
      }
      employeesStore.updateEmployeeStatus(id, 'EN_TURNO');
      workLogsStore.addLog(id, 'ENTRADA', deviceId);
      startCounter(id);
      isGoal ? playGoal() : playEntrada();
      triggerConfirmation('ENTRADA', name, pickMessage(entryMessages));
      break;
    }

    case 'SALIDA':
      playSalida();
      exitMessageText.value = pickMessage(exitMessages);
      exitEmployeeName.value = name;
      showDashboard.value = false;
      showExitMessage.value = true;
      if (exitMessageTimer) clearTimeout(exitMessageTimer);
      exitMessageTimer = setTimeout(() => {
        showSatisfactionSurvey.value = true;
      }, 3000);
      break;

    case 'DESCANSO':
      playDescanso();
      employeesStore.updateEmployeeStatus(id, 'EN_DESCANSO');
      workLogsStore.addLog(id, 'DESCANSO_INICIO', deviceId);
      triggerConfirmation('DESCANSO', name, pickMessage(breakStartMessages));
      break;

    case 'PARAR_DESCANSO':
      playReanudar();
      employeesStore.updateEmployeeStatus(id, 'EN_TURNO');
      workLogsStore.addLog(id, 'DESCANSO_FIN', deviceId);
      triggerConfirmation('PARAR_DESCANSO', name, pickMessage(breakEndMessages));
      break;
  }
};

const submitSatisfaction = (_level: 'BAD' | 'NEUTRAL' | 'GOOD' | 'EXCELLENT') => {
  if (!selectedEmployee.value) return;
  const emp = selectedEmployee.value;
  const id = emp.id;
  const name = emp.name;
  const deviceId = kioskStore.deviceState.deviceCode || 'PUNTO-01';

  employeesStore.updateEmployeeStatus(id, 'SIN_FICHAJE');
  workLogsStore.addLog(id, 'SALIDA', deviceId);
  employeesStore.resetTimes(id);
  stopCounter(id);

  showSatisfactionSurvey.value = false;
  showExitMessage.value = false;
  triggerToast('Fichaje de salida registrado correctamente');
  triggerConfirmation('SALIDA', name, exitMessageText.value || pickMessage(exitMessages));
};


const getStatusColor = (status: string) => {
  switch (status) {
    case 'EN_TURNO': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'EN_DESCANSO': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'EN_TURNO': return 'En turno';
    case 'EN_DESCANSO': return 'En descanso';
    default: return 'Sin fichar';
  }
};
</script>

<template>
  <div :class="['h-screen flex flex-col overflow-hidden transition-colors duration-[2000ms]', isNightMode ? 'bg-black/40' : 'bg-transparent']">
    <Header />

    <!-- ── Toast cuenta atrás de sesión ─────────────────────────────────────── -->
    <Transition name="toast-slide">
      <div
        v-if="sessionCountdown > 0 && sessionCountdown <= 5 && (showDashboard || showEmployeeCard)"
        class="fixed top-0 left-0 right-0 z-[201] flex justify-center pt-4 px-4 pointer-events-none"
      >
        <div class="flex items-center gap-3 px-6 py-3 bg-orange-500/15 border border-orange-500/30 rounded-2xl backdrop-blur-xl shadow-xl shadow-orange-500/10">
          <span class="text-orange-400 font-mono font-bold text-lg leading-none w-5 text-center">{{ sessionCountdown }}</span>
          <span class="text-orange-300 font-bold text-sm tracking-wide">Sesión cerrándose por inactividad</span>
        </div>
      </div>
    </Transition>

    <!-- ── Toast de fichaje correcto ───────────────────────────────────────── -->
    <Transition name="toast-slide">
      <div
        v-if="showTopToast"
        class="fixed top-0 left-0 right-0 z-[200] flex justify-center pt-4 px-4 pointer-events-none"
      >
        <div class="flex items-center gap-3 px-6 py-3 bg-green-500/15 border border-green-500/30 rounded-2xl backdrop-blur-xl shadow-xl shadow-green-500/10">
          <CheckCircle2 class="w-5 h-5 text-green-400 flex-shrink-0" />
          <span class="text-green-300 font-bold text-sm tracking-wide">{{ topToastMessage }}</span>
        </div>
      </div>
    </Transition>

    <main class="flex-1 px-4 py-6 sm:p-8 flex flex-col items-center justify-center overflow-hidden relative">


      <!-- ── Pantalla de Confirmación ──────────────────────────────────────── -->
      <template v-if="showConfirmation && confirmationData">
        <div class="relative flex flex-col items-center justify-center text-center animate-in zoom-in duration-300 px-8 max-w-lg w-full overflow-hidden">
          <!-- Scan line -->
          <div v-if="showScanLine" class="scan-line" />

          <!-- Icono + badge de acción -->
          <div class="relative mb-8">
            <!-- Círculo exterior pulsante -->
            <div :class="[
              'absolute inset-0 rounded-full animate-ping opacity-20',
              confirmationData.action === 'ENTRADA' ? 'bg-green-500' :
              confirmationData.action === 'SALIDA' ? 'bg-orange-500' :
              confirmationData.action === 'DESCANSO' ? 'bg-yellow-500' : 'bg-blue-500'
            ]" style="animation-duration:1.8s" />
            <div :class="[
              'w-28 h-28 rounded-full flex items-center justify-center shadow-2xl',
              confirmationData.action === 'ENTRADA' ? 'bg-green-500/20 shadow-green-500/20' :
              confirmationData.action === 'SALIDA' ? 'bg-orange-500/20 shadow-orange-500/20' :
              confirmationData.action === 'DESCANSO' ? 'bg-yellow-500/20 shadow-yellow-500/20' : 'bg-blue-500/20 shadow-blue-500/20'
            ]">
              <LogIn  v-if="confirmationData.action === 'ENTRADA'"      class="w-14 h-14 text-green-400" />
              <LogOut v-else-if="confirmationData.action === 'SALIDA'"  class="w-14 h-14 text-orange-400" />
              <Coffee v-else-if="confirmationData.action === 'DESCANSO'" class="w-14 h-14 text-yellow-400" />
              <CheckCircle2 v-else                                       class="w-14 h-14 text-blue-400" />
            </div>
          </div>

          <!-- Badge de acción -->
          <div :class="[
            'px-5 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest mb-6',
            confirmationData.action === 'ENTRADA' ? 'bg-green-500/10 border-green-500/25 text-green-400' :
            confirmationData.action === 'SALIDA' ? 'bg-orange-500/10 border-orange-500/25 text-orange-400' :
            confirmationData.action === 'DESCANSO' ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400' :
            'bg-blue-500/10 border-blue-500/25 text-blue-400'
          ]">{{ getActionBadge(confirmationData.action) }}</div>

          <!-- Nombre + mensaje variado -->
          <h2 class="text-4xl font-bold mb-3 tracking-tight">
            {{ confirmationData.action === 'SALIDA' ? `¡Hasta pronto, ${confirmationData.employeeName}!` :
               confirmationData.action === 'ENTRADA' ? `¡Hola, ${confirmationData.employeeName}!` :
               confirmationData.action === 'DESCANSO' ? `¡Descansa, ${confirmationData.employeeName}!` :
               `¡Bienvenido de vuelta, ${confirmationData.employeeName}!` }}
          </h2>
          <p class="text-gray-400 text-base mb-10 max-w-sm">{{ confirmationData.message }}</p>

          <!-- Barra de cuenta atrás -->
          <div class="w-48">
            <div class="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
              <div
                :class="[
                  'h-full rounded-full transition-all duration-1000 ease-linear',
                  confirmationData.action === 'ENTRADA' ? 'bg-green-500' :
                  confirmationData.action === 'SALIDA' ? 'bg-orange-500' :
                  confirmationData.action === 'DESCANSO' ? 'bg-yellow-500' : 'bg-blue-500'
                ]"
                :style="{ width: `${(confirmationData.countdown / 4) * 100}%` }"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- ── Pantalla de Despedida (antes del estado de ánimo) ──────────────── -->
      <template v-else-if="showExitMessage">
        <div class="flex flex-col items-center justify-center text-center animate-in zoom-in duration-300 px-8 max-w-md w-full">
          <!-- Icono -->
          <div class="relative mb-8">
            <div class="absolute inset-0 rounded-full bg-orange-500/10 animate-ping" style="animation-duration:2s" />
            <div class="w-28 h-28 rounded-full bg-orange-500/15 flex items-center justify-center shadow-2xl shadow-orange-500/15">
              <LogOut class="w-14 h-14 text-orange-400" />
            </div>
          </div>
          <h2 class="text-4xl font-bold mb-3 tracking-tight">¡Hasta pronto, {{ exitEmployeeName }}!</h2>
          <p class="text-gray-400 text-base mb-10 max-w-sm">{{ exitMessageText }}</p>
          <!-- Progreso hacia la encuesta -->
          <div class="flex flex-col items-center gap-2 w-48">
            <div class="w-full h-1 bg-white/8 rounded-full overflow-hidden">
              <div class="h-full bg-orange-500 rounded-full animate-[shrink_3s_linear_forwards]" />
            </div>
            <span class="text-gray-600 text-[9px] uppercase tracking-widest font-bold">Un momento más…</span>
          </div>
        </div>
      </template>

      <!-- ── Dashboard Personal ────────────────────────────────────────────── -->
      <template v-else-if="showDashboard && selectedEmployee">

        <!-- Fondo geométrico sutil -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden dashboard-geo-bg" aria-hidden="true" />

        <div class="relative w-full max-w-2xl flex flex-col items-center gap-6 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar animate-in fade-in duration-500 py-4">

          <!-- ── Identidad del empleado ─────────────────────────────────── -->
          <div class="w-full flex items-center gap-6 px-2">
            <!-- Avatar -->
            <div
              class="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 select-none shadow-2xl"
              :style="{ backgroundColor: getAvatarColor(selectedEmployee) + '22', border: `2px solid ${getAvatarColor(selectedEmployee)}44`, color: getAvatarColor(selectedEmployee), boxShadow: `0 0 40px ${getAvatarColor(selectedEmployee)}22` }"
              @click="showColorPicker = !showColorPicker"
            >{{ getInitials(selectedEmployee.name) }}</div>

            <!-- Nombre + estado -->
            <div class="flex-1 min-w-0 relative">
              <h2 class="text-4xl font-bold tracking-tighter leading-tight truncate">{{ selectedEmployee.name }}</h2>
              <div class="flex items-center gap-3 mt-2 flex-wrap">
                <span :class="['px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-widest', getStatusColor(selectedEmployee.status)]">
                  {{ getStatusText(selectedEmployee.status) }}
                </span>
                <span v-if="todayShift" class="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">
                  {{ todayShift.startTime }} – {{ todayShift.endTime }}
                </span>
              </div>

              <!-- Color picker -->
              <Transition name="fade-drop">
                <div v-if="showColorPicker" class="absolute left-0 top-full mt-2 flex gap-2 flex-wrap w-44 bg-black/90 p-3 rounded-2xl border border-white/10 z-20 shadow-2xl">
                  <button
                    v-for="color in AVATAR_COLORS" :key="color"
                    @click="employeesStore.updateAvatarColor(selectedEmployee.id, color); showColorPicker = false"
                    class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-125 active:scale-95"
                    :style="{ backgroundColor: color, borderColor: selectedEmployee.avatarColor === color ? 'white' : 'transparent' }"
                  />
                </div>
              </Transition>
            </div>
          </div>

          <!-- ── Separador ─────────────────────────────────────────────── -->
          <div class="w-full h-px bg-white/5 rounded-full" />

          <!-- ── Botones de fichaje ──────────────────────────────────────── -->
          <ShiftStatusScene
            class="w-full"
            :status="selectedEmployee.status"
            :worked-time="selectedEmployee.workedTime"
            :break-time="selectedEmployee.breakTime"
            :shift-start="todayShift?.startTime ?? null"
            :shift-end="todayShift?.endTime ?? null"
            @action="handleAction"
          />

          <!-- ── Desplegable rachas ──────────────────────────────────────── -->
          <div class="w-full">
            <button
              @click="showWeeklyPanel = !showWeeklyPanel"
              class="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/12 transition-all duration-200"
            >
              <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Ver mis rachas de esta semana</span>
              <span :class="['text-gray-600 text-xs transition-transform duration-300 inline-block', showWeeklyPanel ? 'rotate-180' : '']">▾</span>
            </button>

            <Transition name="weekly-expand">
              <div v-if="showWeeklyPanel" class="mt-3">
                <WeeklyPanel
                  :streak="selectedEmployee.streakPuntualidad"
                  :logs="workLogsStore.getEmployeeLogs(selectedEmployee.id)"
                  :today-shift="todayShift ?? null"
                />
              </div>
            </Transition>
          </div>

          <!-- Cerrar sesión -->
          <button
            @click="closeEmployeeSession"
            class="text-gray-600 hover:text-white text-sm uppercase tracking-widest font-bold transition-colors py-2"
          >
            Cerrar sesión
          </button>

        </div>
      </template>

      <!-- ── Verificación de Foto ───────────────────────────────────────────── -->
      <template v-else-if="isPhotoVerifying">
        <GlassCard class="w-full max-w-2xl p-10 flex flex-col items-center justify-center shadow-2xl bg-black/40 animate-in zoom-in duration-500">
          <div class="text-center mb-10">
            <div class="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-400 mx-auto mb-6">
              <Camera class="w-10 h-10" />
            </div>
            <h3 class="text-3xl font-bold mb-2">Verificación Visual</h3>
            <p class="text-gray-400">Colócate frente a la cámara para validar el fichaje</p>
          </div>

          <div class="relative w-full max-w-md aspect-square bg-black/60 rounded-[3rem] border-4 border-white/5 flex items-center justify-center overflow-hidden">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
            <div class="w-64 h-80 border-2 border-dashed border-blue-500/50 rounded-full flex items-center justify-center">
              <User class="w-32 h-32 text-white/10" />
            </div>
          </div>

          <div class="mt-12 flex gap-4 w-full max-w-md">
            <GlassButton @click="isPhotoVerifying = false; pin = '';" variant="secondary" class="flex-1 py-6">
              <X class="w-5 h-5" /> CANCELAR
            </GlassButton>
            <GlassButton @click="confirmPhoto" variant="primary" class="flex-[2] py-6">
              <CheckCircle2 class="w-6 h-6" /> CONFIRMAR FOTO
            </GlassButton>
          </div>
        </GlassCard>
      </template>

      <!-- ── Verificando geolocalización ──────────────────────────────────────── -->
      <template v-else-if="isCheckingGeofence">
        <div class="flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
          <div class="relative w-20 h-20">
            <svg class="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(59,130,246,0.12)" stroke-width="4"/>
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(59,130,246)" stroke-width="4"
                      stroke-dasharray="213" stroke-dashoffset="53" stroke-linecap="round"
                      style="animation: geo-spin 1.2s linear infinite"/>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>
          <div class="text-center">
            <p class="text-base font-bold text-white tracking-wide">Verificando ubicación</p>
            <p class="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Comprobando geovalla del kiosko</p>
          </div>
        </div>
      </template>

      <!-- ── Pantalla Ritual de Bienvenida ────────────────────────────────────── -->
      <template v-else-if="showWelcome && selectedEmployee">
        <div class="absolute inset-0 flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-500">

          <!-- Fondo con color del empleado -->
          <div class="absolute inset-0 pointer-events-none transition-all duration-700"
               :style="{ background: `radial-gradient(ellipse 100% 90% at 50% 50%, ${getAvatarColor(selectedEmployee)}22, transparent 68%)` }" />

          <!-- Anillos de onda expansivos -->
          <div class="absolute flex items-center justify-center">
            <div class="welcome-ring welcome-ring-1"
                 :style="{ borderColor: getAvatarColor(selectedEmployee) + '35' }" />
            <div class="welcome-ring welcome-ring-2"
                 :style="{ borderColor: getAvatarColor(selectedEmployee) + '22' }" />
            <div class="welcome-ring welcome-ring-3"
                 :style="{ borderColor: getAvatarColor(selectedEmployee) + '12' }" />
          </div>

          <!-- Contenido central -->
          <div class="relative z-10 flex flex-col items-center text-center gap-8 welcome-content">

            <!-- Avatar con glow -->
            <div class="welcome-avatar w-44 h-44 rounded-[3rem] flex items-center justify-center text-7xl font-bold"
                 :style="{
                   backgroundColor: getAvatarColor(selectedEmployee) + '20',
                   border: `2px solid ${getAvatarColor(selectedEmployee)}45`,
                   color: getAvatarColor(selectedEmployee),
                   boxShadow: `0 0 80px ${getAvatarColor(selectedEmployee)}35, 0 30px 80px rgba(0,0,0,0.5)`
                 }">
              {{ getInitials(selectedEmployee.name) }}
            </div>

            <!-- Saludo + nombre -->
            <div class="welcome-text flex flex-col items-center gap-3">
              <p class="text-sm font-bold uppercase tracking-[0.5em]"
                 :style="{ color: getAvatarColor(selectedEmployee) }">
                {{ new Date().getHours() < 13 ? 'Buenos días' : new Date().getHours() < 20 ? 'Buenas tardes' : 'Buenas noches' }}
              </p>
              <h2 class="text-7xl font-bold tracking-tighter leading-none">
                {{ selectedEmployee.name.split(' ')[0] }}
              </h2>
            </div>

            <!-- Separador animado -->
            <div class="flex items-center gap-4 welcome-divider">
              <div class="h-px w-20 rounded-full"
                   :style="{ backgroundColor: getAvatarColor(selectedEmployee) + '55' }" />
              <div class="w-2.5 h-2.5 rounded-full animate-pulse"
                   :style="{ backgroundColor: getAvatarColor(selectedEmployee) }" />
              <div class="h-px w-20 rounded-full"
                   :style="{ backgroundColor: getAvatarColor(selectedEmployee) + '55' }" />
            </div>

            <!-- Centro -->
            <p class="text-xs font-bold text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2 welcome-center">
              <Building2 class="w-3.5 h-3.5" />
              {{ selectedEmployee.center }}
            </p>
          </div>

          <!-- Continuar -->
          <button
            @click="skipWelcome"
            class="absolute bottom-10 text-xs text-gray-600 hover:text-white uppercase tracking-widest font-bold transition-colors"
          >
            Continuar →
          </button>
        </div>
      </template>

      <!-- ── Tarjeta flotante de empleado identificado ─────────────────────── -->
      <template v-else-if="showEmployeeCard && selectedEmployee">
        <div class="relative w-full h-full flex items-center justify-center">

          <!-- Glow radial de fondo -->
          <div
            class="absolute inset-0 pointer-events-none"
            :style="{ background: `radial-gradient(ellipse 80% 65% at 50% 50%, ${getAvatarColor(selectedEmployee)}20, transparent 70%)` }"
          />

          <!-- Tarjeta flotante -->
          <button
            @click="openDashboardFromCard"
            :class="['employee-float-card group relative flex flex-col items-center gap-8 p-14 rounded-[3rem] border border-white/10 bg-black/50 backdrop-blur-2xl cursor-pointer hover:border-white/20 focus:outline-none', isCardFlipping ? 'card-flip' : '']"
            :style="{ boxShadow: `0 0 100px ${getAvatarColor(selectedEmployee)}25, 0 40px 120px rgba(0,0,0,0.6)` }"
          >
            <!-- Avatar -->
            <div
              class="w-40 h-40 rounded-[2rem] flex items-center justify-center text-6xl font-bold shadow-2xl"
              :style="{ backgroundColor: getAvatarColor(selectedEmployee) + '22', border: `2px solid ${getAvatarColor(selectedEmployee)}44`, color: getAvatarColor(selectedEmployee) }"
            >
              {{ getInitials(selectedEmployee.name) }}
            </div>

            <!-- Nombre + DNI -->
            <div class="text-center">
              <h2 class="text-4xl font-bold tracking-tighter">{{ selectedEmployee.name }}</h2>
              <p class="text-sm text-gray-500 uppercase tracking-[0.25em] mt-2">{{ selectedEmployee.dni }}</p>
              <div :class="['mt-4 px-4 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-widest inline-block', getStatusColor(selectedEmployee.status)]">
                {{ getStatusText(selectedEmployee.status) }}
              </div>
            </div>

            <!-- Hint -->
            <div class="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white/5 border border-white/8">
              <span class="w-2 h-2 rounded-full animate-pulse" :style="{ backgroundColor: getAvatarColor(selectedEmployee) }" />
              <span class="text-sm text-gray-400 font-bold uppercase tracking-widest">Toca para fichar</span>
            </div>
          </button>

          <!-- Cancelar -->
          <button
            @click="showEmployeeCard = false; kioskStore.resetSelection(); employeeDni = ''; pin = ''; activeField = 'dni'"
            class="absolute bottom-6 text-[10px] text-gray-600 hover:text-white uppercase tracking-widest font-bold transition-colors"
          >
            ← Volver
          </button>
        </div>
      </template>

      <!-- ── Identificación de Empleado (DNI + PIN) ───────────────────────────── -->
      <template v-else>
        <div :class="['w-full max-w-full sm:max-w-md md:max-w-lg flex flex-col items-center', isQuickMode ? 'animate-in fade-in duration-100' : 'animate-in slide-in-from-bottom-10 duration-500']">

          <!-- Badge Cola Rápida -->
          <Transition name="fade-drop">
            <div v-if="isQuickMode" class="flex items-center gap-2 mb-4 px-4 py-2 bg-blue-500/10 border border-blue-500/25 rounded-full">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
              <span class="text-xs text-blue-400 font-bold uppercase tracking-widest">Cola rápida activa</span>
            </div>
          </Transition>

          <!-- Cabecera -->
          <div :class="['text-center', isQuickMode ? 'mb-3' : 'mb-6']">
            <h2 :class="['font-bold tracking-tighter mb-1.5', isQuickMode ? 'text-2xl' : 'text-3xl']">Acceso de Empleado</h2>
            <div class="flex items-center justify-center gap-2 text-gray-500 uppercase tracking-[0.3em] text-xs font-bold">
              <Building2 class="w-3.5 h-3.5" />
              <span>{{ kioskStore.deviceState.center }}</span>
            </div>
          </div>

          <GlassCard class="p-6 border-white/5 w-full">
            <div class="flex flex-col gap-3 mb-6">

              <!-- ── Campo DNI ───────────────────────────────────────────────── -->
              <div
                @click="activeField = 'dni'; keyboard?.resetToNumeric()"
                :class="[
                  'p-5 border-2 rounded-2xl transition-all cursor-pointer',
                  activeField === 'dni' ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'bg-white/5 border-white/5 hover:border-white/10'
                ]"
              >
                <div class="flex items-center gap-2 mb-2">
                  <User class="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <label :class="['text-xs uppercase tracking-widest font-bold', activeField === 'dni' ? 'text-blue-400' : 'text-gray-500']">
                    DNI / NIE
                  </label>
                </div>
                <div class="text-2xl font-mono tracking-widest h-9 flex items-center">
                  <span v-if="employeeDni" class="text-white">{{ employeeDni }}</span>
                  <span v-else class="text-white/20 text-xl">_ _ _ _ _ _ _ _ _</span>
                  <div v-if="activeField === 'dni'" class="w-0.5 h-6 bg-blue-500 ml-1 animate-pulse rounded-full" />
                </div>
              </div>

              <!-- ── Campo PIN (visible solo cuando hay DNI) ────────────────── -->
              <Transition name="fade-drop">
                <div
                  v-if="employeeDni"
                  @click="activeField = 'pin'; keyboard?.resetToNumeric()"
                  :class="[
                    'p-5 border-2 rounded-2xl transition-all cursor-pointer',
                    activeField === 'pin' ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'bg-white/5 border-white/5 hover:border-white/10'
                  ]"
                >
                  <div class="flex items-center gap-2 mb-3">
                    <ShieldCheck class="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <label :class="['text-xs uppercase tracking-widest font-bold', activeField === 'pin' ? 'text-blue-400' : 'text-gray-500']">
                      PIN de seguridad
                    </label>
                  </div>
                  <div :class="['flex items-center gap-4 min-h-[2rem] pl-1', pinError ? 'pin-shake' : '']">
                    <div
                      v-for="i in 5" :key="i"
                      :class="[
                        'w-5 h-5 rounded-full transition-all duration-300',
                        pinError ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' :
                        pin[i-1] ? 'bg-blue-500 shadow-lg shadow-blue-500/50 scale-125' : 'bg-white/10'
                      ]"
                    />
                    <div v-if="activeField === 'pin'" class="w-0.5 h-5 bg-blue-500 animate-pulse rounded-full" />
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Teclado virtual -->
            <div :class="['rounded-2xl transition-all duration-700', showReadyGlow ? 'shadow-[0_0_30px_rgba(59,130,246,0.18)] ring-1 ring-blue-500/20' : '']">
              <Keyboard
                ref="keyboard"
                @key-press="handleKeyPress"
                @clear="handleClear"
                @confirm="handleLogin"
              />
            </div>

            <!-- Hint -->
            <div class="flex items-center justify-center border-t border-white/5 pt-4 mt-4">
              <p class="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                {{ activeField === 'dni' ? 'Escribe tu DNI y pulsa ENTRAR' : 'Introduce tu PIN de 5 dígitos' }}
              </p>
            </div>
          </GlassCard>
        </div>
      </template>

      <!-- ── Encuesta de Estado de Ánimo (overlay independiente) ─────────────── -->
      <Transition name="mood-overlay">
        <div v-if="showSatisfactionSurvey" class="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/85 backdrop-blur-2xl">
          <div class="w-full max-w-xl text-center animate-in zoom-in-95 duration-300">

            <!-- Icono wave -->
            <div class="text-6xl mb-6 select-none">👋</div>
            <h3 class="text-4xl font-bold mb-2 tracking-tight">¿Cómo ha ido tu jornada?</h3>
            <p class="text-gray-500 text-sm mb-10">Cuéntanos cómo te has sentido hoy en el trabajo</p>

            <!-- Caritas -->
            <div class="grid grid-cols-4 gap-4 mb-10">

              <!-- Mal -->
              <button
                @click="submitSatisfaction('BAD')"
                class="group flex flex-col items-center gap-3 p-6 rounded-3xl bg-red-500/5 border border-red-500/15 hover:bg-red-500/15 hover:border-red-400/40 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <div class="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center group-hover:bg-red-500/25 transition-colors shadow-lg shadow-red-500/10">
                  <Frown class="w-9 h-9 text-red-400" />
                </div>
                <span class="text-xs font-bold uppercase tracking-widest text-red-500/70 group-hover:text-red-400 transition-colors">Mal</span>
              </button>

              <!-- Regular -->
              <button
                @click="submitSatisfaction('NEUTRAL')"
                class="group flex flex-col items-center gap-3 p-6 rounded-3xl bg-yellow-500/5 border border-yellow-500/15 hover:bg-yellow-500/15 hover:border-yellow-400/40 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <div class="w-16 h-16 rounded-full bg-yellow-500/15 flex items-center justify-center group-hover:bg-yellow-500/25 transition-colors shadow-lg shadow-yellow-500/10">
                  <Meh class="w-9 h-9 text-yellow-400" />
                </div>
                <span class="text-xs font-bold uppercase tracking-widest text-yellow-500/70 group-hover:text-yellow-400 transition-colors">Regular</span>
              </button>

              <!-- Bien -->
              <button
                @click="submitSatisfaction('GOOD')"
                class="group flex flex-col items-center gap-3 p-6 rounded-3xl bg-green-500/5 border border-green-500/15 hover:bg-green-500/15 hover:border-green-400/40 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <div class="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center group-hover:bg-green-500/25 transition-colors shadow-lg shadow-green-500/10">
                  <Smile class="w-9 h-9 text-green-400" />
                </div>
                <span class="text-xs font-bold uppercase tracking-widest text-green-500/70 group-hover:text-green-400 transition-colors">Bien</span>
              </button>

              <!-- Excelente -->
              <button
                @click="submitSatisfaction('EXCELLENT')"
                class="group flex flex-col items-center gap-3 p-6 rounded-3xl bg-blue-500/5 border border-blue-500/15 hover:bg-blue-500/15 hover:border-blue-400/40 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <div class="w-16 h-16 rounded-full bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors shadow-lg shadow-blue-500/10">
                  <Heart class="w-9 h-9 text-blue-400" />
                </div>
                <span class="text-xs font-bold uppercase tracking-widest text-blue-500/70 group-hover:text-blue-400 transition-colors">Genial</span>
              </button>

            </div>

            <button
              @click="submitSatisfaction('NEUTRAL')"
              class="text-gray-600 hover:text-gray-400 text-[10px] uppercase tracking-widest font-bold transition-colors"
            >
              Saltar y finalizar
            </button>
          </div>
        </div>
      </Transition>

      <!-- ── Modal de error elegante ────────────────────────────────────────── -->
      <Transition name="error-pop">
        <div v-if="showErrorModal"
             class="absolute bottom-10 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-4 px-7 py-4 rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl shadow-2xl shadow-red-500/10 pointer-events-none">
          <div class="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <X class="w-4 h-4 text-red-400" />
          </div>
          <p class="text-sm font-bold text-red-300 tracking-wide">{{ errorModalMessage }}</p>
        </div>
      </Transition>

    </main>
  </div>
</template>

<style scoped>
@keyframes shrink {
  from { width: 100%; }
  to   { width: 0%; }
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.toast-slide-enter-from,
.toast-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.fade-drop-enter-active,
.fade-drop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-drop-enter-from,
.fade-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.95);
}

/* ── PIN shake ────────────────────────────────────────────────────────────── */
.pin-shake {
  animation: pin-shake 0.55s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes pin-shake {
  10%, 90%  { transform: translateX(-2px); }
  20%, 80%  { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60%  { transform: translateX(3px); }
}

/* ── Scan line ────────────────────────────────────────────────────────────── */
.scan-line {
  position: absolute;
  left: -20px;
  right: -20px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7) 40%, rgba(255,255,255,0.7) 60%, transparent);
  animation: scan-sweep 0.4s ease-in forwards;
  pointer-events: none;
  z-index: 10;
}
@keyframes scan-sweep {
  from { top: -2px; opacity: 1; }
  to   { top: 100%; opacity: 0.2; }
}

/* ── Modo noche: reduce brillo de elementos secundarios ───────────────────── */
.bg-\[#04080f\] .text-gray-400 { filter: brightness(0.75); }
.bg-\[#04080f\] .border-white\/10 { border-color: rgba(255,255,255,0.05); }

/* ── Fondo geométrico del dashboard ─────────────────────────────────────── */
.dashboard-geo-bg {
  background-image:
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px),
    radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.06), transparent 70%),
    radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139,92,246,0.04), transparent 60%);
  background-size: 48px 48px, 48px 48px, 100% 100%, 100% 100%;
}

/* ── Panel semanal: transición de expansión ──────────────────────────────── */
.weekly-expand-enter-active,
.weekly-expand-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease, max-height 0.35s ease;
  overflow: hidden;
  max-height: 600px;
}
.weekly-expand-enter-from,
.weekly-expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

/* ── Tarjeta flotante de empleado ────────────────────────────────────────── */
.employee-float-card {
  animation: employee-float 5s ease-in-out infinite;
  will-change: transform;
  perspective: 1000px;
  transform-style: preserve-3d;
}

@keyframes employee-float {
  0%   { transform: translateY(0px) rotate(-0.5deg); }
  30%  { transform: translateY(-14px) rotate(0.5deg); }
  60%  { transform: translateY(-6px) rotate(-0.3deg); }
  100% { transform: translateY(0px) rotate(-0.5deg); }
}

.card-flip {
  animation: card-flip-spin 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
}

@keyframes card-flip-spin {
  0%   { transform: translateY(0px) rotateY(0deg) scale(1); }
  40%  { transform: translateY(-20px) rotateY(180deg) scale(1.04); }
  70%  { transform: translateY(-10px) rotateY(320deg) scale(1.02); }
  100% { transform: translateY(0px) rotateY(360deg) scale(1); }
}


/* ── Pantalla ritual de bienvenida ────────────────────────────────────────── */
.welcome-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid;
  transform: translate(-50%, -50%);
  top: 50%;
  left: 50%;
}

.welcome-ring-1 {
  width: 320px;
  height: 320px;
  animation: ring-pulse 2.2s ease-out infinite;
}
.welcome-ring-2 {
  width: 520px;
  height: 520px;
  animation: ring-pulse 2.2s ease-out 0.4s infinite;
}
.welcome-ring-3 {
  width: 720px;
  height: 720px;
  animation: ring-pulse 2.2s ease-out 0.8s infinite;
}

@keyframes ring-pulse {
  0%   { transform: translate(-50%, -50%) scale(0.85); opacity: 0.7; }
  60%  { transform: translate(-50%, -50%) scale(1.04); opacity: 0.3; }
  100% { transform: translate(-50%, -50%) scale(1.1);  opacity: 0; }
}

.welcome-avatar {
  animation: welcome-drop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.welcome-text {
  animation: welcome-rise 0.7s cubic-bezier(0.34, 1.4, 0.64, 1) 0.15s both;
}
.welcome-divider {
  animation: welcome-fade 0.5s ease 0.4s both;
}
.welcome-center {
  animation: welcome-fade 0.5s ease 0.55s both;
}

@keyframes welcome-drop {
  from { transform: translateY(-24px) scale(0.85); opacity: 0; }
  to   { transform: translateY(0px) scale(1); opacity: 1; }
}
@keyframes welcome-rise {
  from { transform: translateY(20px) scale(0.96); opacity: 0; }
  to   { transform: translateY(0px) scale(1); opacity: 1; }
}
@keyframes welcome-fade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Error modal ──────────────────────────────────────────────────────────── */
.error-pop-enter-active,
.error-pop-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.5, 0.64, 1);
}
.error-pop-enter-from,
.error-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px) scale(0.94);
}

@keyframes geo-spin {
  from { stroke-dashoffset: 213; }
  to   { stroke-dashoffset: -213; }
}
</style>
