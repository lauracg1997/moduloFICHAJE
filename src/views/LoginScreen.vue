<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import { useEmployeesStore } from '../stores/employees';
import type { WorkMode } from '../types';
import GlassCard from '../components/GlassCard.vue';
import Keyboard from '../components/Keyboard.vue';
import {
  Monitor, Settings, ShieldCheck,
  Camera, KeyRound, X, Pencil, Trash2, Plus,
  Check, Flame
} from 'lucide-vue-next';

const store = useKioskStore();
const employeesStore = useEmployeesStore();

// ─── Splash / pre-login ──────────────────────────────────────────────────────
const showSplash = ref(true);

// ─── Login form ──────────────────────────────────────────────────────────────
const cif        = ref(store.deviceState.cif || 'B12345678');
const deviceCode = ref(store.deviceState.deviceCode || '9999');
const activeField  = ref<'cif' | 'deviceCode'>('cif');
const showLoginPanel = ref(true);
const showOverview   = ref(false);

const handleKeyDown = (e: KeyboardEvent) => {
  if (!activeField.value || showOverview.value) return;
  if (e.key === 'Backspace') {
    if (activeField.value === 'cif') cif.value = cif.value.slice(0, -1);
    else deviceCode.value = deviceCode.value.slice(0, -1);
  } else if (e.key === 'Enter') {
    handleLogin();
  } else if (e.key.length === 1) {
    const char = e.key.toUpperCase();
    if (activeField.value === 'cif') cif.value += char;
    else if (/[0-9]/.test(char)) deviceCode.value += char;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  initDevFields();
  if (store.configMode) {
    cif.value = store.deviceState.cif;
    deviceCode.value = store.deviceState.deviceCode;
    showOverview.value = true;
    store.configMode = false;
  }
});
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));

const handleKeyPress = (key: string) => {
  if (!activeField.value) return;
  if (activeField.value === 'cif') cif.value += key;
  else deviceCode.value += key;
};
const handleClear = () => {
  if (!activeField.value) return;
  if (activeField.value === 'cif') cif.value = cif.value.slice(0, -1);
  else deviceCode.value = deviceCode.value.slice(0, -1);
};
const handleLogin = () => {
  if (cif.value && deviceCode.value) {
    store.setDeviceState({ cif: cif.value, deviceCode: deviceCode.value });
    showOverview.value = true;
  }
};
const startKiosk = () => store.setScreen('kiosk');

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = computed(() => ({
  total:    employeesStore.employees.length,
  working:  employeesStore.employees.filter(e => e.status === 'EN_TURNO').length,
  break:    employeesStore.employees.filter(e => e.status === 'EN_DESCANSO').length,
  off:      employeesStore.employees.filter(e => e.status === 'SIN_FICHAJE').length,
}));

// ─── Colores avatar ───────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316'];
const getInitials = (name: string) => {
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
};
const getColor = (id: string) => {
  const emp = employeesStore.employees.find(e => e.id === id);
  if (emp?.avatarColor) return emp.avatarColor;
  return AVATAR_COLORS[parseInt(id, 10) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
};
const statusLabel = (s: string) =>
  s === 'EN_TURNO' ? 'En turno' : s === 'EN_DESCANSO' ? 'Descanso' : 'Sin fichar';
const statusClass = (s: string) =>
  s === 'EN_TURNO'    ? 'bg-green-500/15 text-green-400 border-green-500/25' :
  s === 'EN_DESCANSO' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' :
                        'bg-white/5 text-gray-500 border-white/10';

// ─── Edit employee modal ──────────────────────────────────────────────────────
const editingId    = ref<string | null>(null);
const editName     = ref('');
const editDni      = ref('');
const editPin      = ref('');
const editCenter   = ref('');
const editWorkMode = ref<WorkMode>('presencial');
const editBirthday = ref('');
const editError    = ref('');

const openEdit = (id: string) => {
  const emp = employeesStore.employees.find(e => e.id === id);
  if (!emp) return;
  editingId.value    = id;
  editName.value     = emp.name;
  editDni.value      = emp.dni;
  editPin.value      = emp.pin;
  editCenter.value   = emp.center;
  editWorkMode.value = emp.workMode ?? 'presencial';
  // Convertir MM-DD → YYYY-MM-DD para el input type=date (usamos año neutro 2000)
  editBirthday.value = emp.birthday ? `2000-${emp.birthday}` : '';
  editError.value    = '';
};
const closeEdit = () => { editingId.value = null; editError.value = ''; };
const saveEdit = () => {
  if (!editName.value.trim() || !editDni.value.trim() || editPin.value.length < 4) {
    editError.value = 'Nombre, DNI y PIN (mín. 4 dígitos) son obligatorios.';
    return;
  }
  employeesStore.updateEmployee(editingId.value!, {
    name:     editName.value.trim(),
    dni:      editDni.value.trim().toUpperCase(),
    pin:      editPin.value,
    center:   editCenter.value,
    workMode: editWorkMode.value,
    // Convertir YYYY-MM-DD → MM-DD al guardar
    birthday: editBirthday.value ? editBirthday.value.slice(5) : undefined,
  });
  closeEdit();
};
const removeEmp = (id: string) => {
  if (confirm('¿Eliminar este empleado?')) employeesStore.removeEmployee(id);
};

// ─── Buscador de empleados en panel admin ────────────────────────────────────
const employeeSearch = ref('');
const filteredAdminEmployees = computed(() => {
  const q = employeeSearch.value.trim().toLowerCase();
  if (!q) return employeesStore.employees;
  return employeesStore.employees.filter(e =>
    e.name.toLowerCase().includes(q) || e.dni.toLowerCase().includes(q) || e.center.toLowerCase().includes(q)
  );
});

// ─── New employee modal ───────────────────────────────────────────────────────
const showNewEmp    = ref(false);
const newName       = ref('');
const newDni        = ref('');
const newPin        = ref('');
const newCenter     = ref('Centro Principal');
const newWorkMode   = ref<WorkMode>('presencial');
const newBirthday   = ref('');
const newError      = ref('');

const saveNewEmp = () => {
  if (!newName.value.trim() || !newDni.value.trim() || newPin.value.length < 4) {
    newError.value = 'Nombre, DNI y PIN (mín. 4 dígitos) son obligatorios.';
    return;
  }
  employeesStore.addEmployee({
    name:     newName.value.trim(),
    dni:      newDni.value.trim().toUpperCase(),
    pin:      newPin.value,
    center:   newCenter.value,
    workMode: newWorkMode.value,
    birthday: newBirthday.value ? newBirthday.value.slice(5) : undefined,
  });
  showNewEmp.value = false;
  newName.value = newDni.value = newPin.value = newError.value = newBirthday.value = '';
  newCenter.value   = 'Centro Principal';
  newWorkMode.value = 'presencial';
};

// ─── Device settings ────────────────────────────────────────────────────────
const editingDevice = ref(false);
const devCif     = ref('');
const devCenter  = ref('');
const devCode    = ref('');
const initDevFields = () => {
  devCif.value    = store.deviceState.cif;
  devCenter.value = store.deviceState.center;
  devCode.value   = store.deviceState.deviceCode;
};
const openDeviceEdit = () => { initDevFields(); editingDevice.value = true; };
const saveDeviceEdit = () => {
  store.setDeviceState({ cif: devCif.value, deviceCode: devCode.value, center: devCenter.value });
  editingDevice.value = false;
};
const cancelDeviceEdit = () => { editingDevice.value = false; };
// Sincronizar cuando se abre el panel
watch(showOverview, (val) => { if (val) initDevFields(); });

// ─── Geofence radius ────────────────────────────────────────────────────────
const radiusToPixels = (km: number) => ((km - 0.05) / 0.95) * 46 + 10;

// ─── Fijar ubicación del kiosko ─────────────────────────────────────────────
const isFetchingLocation = ref(false);
const locationFeedback   = ref<{ ok: boolean; msg: string } | null>(null);

const fixKioskLocation = () => {
  if (!navigator.geolocation) {
    locationFeedback.value = { ok: false, msg: 'Este dispositivo no tiene GPS.' };
    return;
  }
  isFetchingLocation.value = true;
  locationFeedback.value = null;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      store.setDeviceState({
        kioskLatitude:  pos.coords.latitude,
        kioskLongitude: pos.coords.longitude,
        geofenceEnabled: true,
      });
      isFetchingLocation.value = false;
      locationFeedback.value = {
        ok: true,
        msg: `Ubicación fijada: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
      };
    },
    () => {
      isFetchingLocation.value = false;
      locationFeedback.value = { ok: false, msg: 'Permiso denegado o GPS no disponible.' };
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
};

const clearKioskLocation = () => {
  store.setDeviceState({ kioskLatitude: null, kioskLongitude: null, geofenceEnabled: false });
  locationFeedback.value = null;
};
</script>

<template>
  <div class="h-screen overflow-hidden relative">

    <!-- ══════════════════════════════════════════════════════════════════════
         SPLASH — PANTALLA DE BIENVENIDA CORPORATIVA
    ═══════════════════════════════════════════════════════════════════════ -->
    <Transition name="splash-out">
      <div v-if="showSplash"
           class="absolute inset-0 z-30 overflow-hidden" style="background:#06080f">

        <!-- ── Orbs de ambiente animados ───────────────────────────────────── -->
        <div class="splash-orb splash-orb-1" />
        <div class="splash-orb splash-orb-2" />
        <div class="splash-orb splash-orb-3" />
        <div class="splash-orb splash-orb-4" />

        <!-- ── Rejilla sutil ────────────────────────────────────────────────── -->
        <div class="absolute inset-0 pointer-events-none"
             style="background-image:linear-gradient(rgba(148,163,184,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.04) 1px,transparent 1px);background-size:52px 52px" />

        <!-- ── Contenido central ────────────────────────────────────────────── -->
        <div class="relative z-10 h-full flex flex-col items-center justify-center px-6">
          <div class="flex flex-col items-center text-center w-full max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-700">

            <!-- Icono -->
            <div class="relative mb-8">
              <div class="absolute inset-0 rounded-[1.75rem] bg-blue-500/20 blur-2xl scale-150" />
              <div class="relative w-20 h-20 rounded-[1.75rem] border border-blue-500/20 flex items-center justify-center shadow-2xl shadow-blue-500/20"
                   style="background:linear-gradient(135deg,rgba(37,99,235,0.22) 0%,rgba(6,182,212,0.10) 100%)">
                <svg class="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
                </svg>
              </div>
            </div>

            <!-- Título -->
            <h1 class="text-5xl sm:text-6xl font-black tracking-tighter mb-2.5 leading-none">
              Talention<span class="splash-brand-gradient">HR</span>
            </h1>
            <p class="text-gray-500 text-sm tracking-widest uppercase font-medium mb-1">Sistema de Control Horario</p>
            <p class="text-gray-700 text-[10px] tracking-[0.3em] uppercase font-bold">RDL 8/2019 · Conforme con RGPD</p>

            <!-- Card glassmorphism con botón de acceso -->
            <div class="w-full mt-10 relative">
              <!-- Glow exterior de la card -->
              <div class="absolute -inset-1 rounded-[1.75rem] bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-cyan-500/8 blur-xl" />
              <!-- Card -->
              <div class="relative overflow-hidden rounded-[1.5rem] border border-white/8 backdrop-blur-xl p-7"
                   style="background:rgba(13,18,38,0.75)">
                <!-- Borde superior gradiente -->
                <div class="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
                <!-- Glow interno superior -->
                <div class="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

                <!-- Botón principal -->
                <button
                  @click="showSplash = false"
                  class="group relative w-full flex items-center justify-center gap-3 py-4 rounded-2xl overflow-hidden font-bold text-base tracking-wide text-white shadow-2xl shadow-blue-500/20 active:scale-[0.97] transition-transform mb-5"
                  style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 50%,#1e3a8a 100%)"
                >
                  <!-- Shine on hover -->
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <svg class="w-5 h-5 relative flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
                  </svg>
                  <span class="relative">Acceder al sistema</span>
                </button>

                <!-- Fila inferior: estado + versión -->
                <div class="flex items-center justify-between px-1">
                  <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span class="text-[9px] uppercase tracking-widest font-bold text-gray-600">Sistema activo</span>
                  </div>
                  <span class="text-[9px] uppercase tracking-widest font-bold text-gray-700">v 2.5.0</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- ── Pie ────────────────────────────────────────────────────────────── -->
        <div class="absolute bottom-8 flex items-center gap-4 text-[9px] text-gray-700 uppercase tracking-widest font-bold z-10">
          <span>TalentionHR</span>
          <span class="w-1 h-1 rounded-full bg-gray-700" />
          <span>© {{ new Date().getFullYear() }}</span>
          <span class="w-1 h-1 rounded-full bg-gray-700" />
          <span>Todos los derechos reservados</span>
        </div>
      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════════════════
         PANTALLA DE ACCESO — CIF + CÓDIGO DE DISPOSITIVO
    ═══════════════════════════════════════════════════════════════════════ -->
    <div v-if="!showOverview && !showSplash"
         class="h-full flex flex-col items-center justify-center relative z-10 animate-in fade-in zoom-in-95 duration-500 px-4 sm:px-6">

      <div class="w-full max-w-full sm:max-w-md md:max-w-lg px-0">
      <!-- Cabecera con logo -->
      <div class="mb-7 text-center">
        <div class="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/10">
          <Monitor class="w-6 h-6 text-blue-400" />
        </div>
        <h1 class="text-3xl font-bold tracking-tighter mb-1.5">
          Talention<span class="text-blue-500">HR</span>
        </h1>
        <p class="text-gray-600 text-[10px] uppercase tracking-[0.35em] font-bold">
          Kiosko de Fichaje — Acceso de empresa
        </p>
      </div>

      <GlassCard class="p-7 border-white/5 w-full shadow-2xl">
        <div class="flex flex-col gap-4 mb-8">

          <!-- CIF -->
          <div @click="activeField = 'cif'"
               :class="['p-5 border-2 rounded-2xl transition-all cursor-pointer text-center',
                 activeField === 'cif' ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'bg-white/5 border-white/5 hover:border-white/10']">
            <label :class="['text-[10px] uppercase tracking-widest font-bold block mb-2',
                             activeField === 'cif' ? 'text-blue-400' : 'text-gray-500']">
              CIF Empresa
            </label>
            <div class="text-2xl font-mono tracking-widest h-9 flex items-center justify-center">
              <span v-if="cif">{{ cif }}</span>
              <span v-else class="text-white/15">— — —</span>
              <div v-if="activeField === 'cif'" class="w-0.5 h-6 bg-blue-500 ml-2 animate-pulse rounded-full" />
            </div>
          </div>

          <!-- Código privado -->
          <div @click="activeField = 'deviceCode'"
               :class="['p-5 border-2 rounded-2xl transition-all cursor-pointer text-center',
                 activeField === 'deviceCode' ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'bg-white/5 border-white/5 hover:border-white/10']">
            <label :class="['text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 mb-2',
                             activeField === 'deviceCode' ? 'text-blue-400' : 'text-gray-500']">
              <KeyRound class="w-3 h-3" /> Código privado del dispositivo
            </label>
            <div class="text-2xl font-mono tracking-widest h-9 flex items-center justify-center">
              <span v-if="deviceCode">{{ '●'.repeat(deviceCode.length) }}</span>
              <span v-else class="text-white/15">— —</span>
              <div v-if="activeField === 'deviceCode'" class="w-0.5 h-6 bg-blue-500 ml-2 animate-pulse rounded-full" />
            </div>
          </div>
        </div>

        <Keyboard @key-press="handleKeyPress" @clear="handleClear" @confirm="handleLogin" />

        <div class="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
          <div class="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-gray-700">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Sistema listo
          </div>
          <span @click="store.setScreen('admin')"
                class="text-[10px] uppercase tracking-widest font-bold text-gray-700 cursor-pointer hover:text-white transition-colors">
            v 2.5.0
          </span>
        </div>
      </GlassCard>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════
         PANEL DE ADMINISTRACIÓN
    ═══════════════════════════════════════════════════════════════════════ -->
    <div v-else-if="showOverview"
         class="fixed inset-0 flex flex-col z-20 animate-in fade-in duration-400" style="background: #0a0f1e">

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <header class="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Settings class="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tighter leading-none">
              Talention<span class="text-blue-500">HR</span>
              <span class="ml-2 text-xs font-bold text-gray-500 uppercase tracking-widest align-middle">Admin</span>
            </h1>
            <div class="flex items-center gap-2 mt-0.5 text-xs font-bold uppercase tracking-widest text-gray-600">
              <ShieldCheck class="w-3 h-3 text-green-400" />
              <span>{{ store.deviceState.center }}</span>
              <span class="w-px h-3 bg-white/10" />
              <span>{{ store.deviceState.cif }}</span>
            </div>
          </div>
        </div>
        <button @click="showOverview = false"
                class="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-gray-500 hover:text-white transition-all">
          <X class="w-4 h-4" />
        </button>
      </header>

      <!-- ══════════════════════════════════════════════════════════════════
           ACTIVAR KIOSKO — sticky, siempre visible bajo el header
      ═══════════════════════════════════════════════════════════════════ -->
      <div class="flex-shrink-0 px-4 sm:px-8 pt-6 pb-4">
        <div class="max-w-5xl mx-auto">
        <div class="relative overflow-hidden rounded-[2rem] border-2 border-blue-500/40 bg-gradient-to-br from-blue-600/18 via-blue-500/10 to-blue-400/5 shadow-2xl shadow-blue-500/15">
          <div class="absolute inset-0 pointer-events-none">
            <div class="absolute -top-6 left-1/2 -translate-x-1/2 w-[500px] h-36 bg-blue-500/15 rounded-full blur-3xl" />
          </div>
          <div class="relative z-10 flex items-center justify-between px-10 py-8 gap-8">
            <!-- Icono + texto -->
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/35 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/15">
                <Monitor class="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 class="text-2xl font-bold tracking-tighter">Modo Kiosko</h2>
                <p class="text-sm text-gray-400 mt-0.5">
                  Activa el kiosko para que los empleados puedan fichar en este dispositivo
                </p>
              </div>
            </div>
            <!-- Botón -->
            <button
              @click="startKiosk"
              class="flex-shrink-0 flex items-center gap-3 px-10 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.97] transition-all text-white font-bold text-lg tracking-wide shadow-xl shadow-blue-500/30 group"
            >
              <Monitor class="w-5 h-5 group-hover:scale-110 transition-transform" />
              Activar Kiosko
            </button>
          </div>
        </div>
        </div>
      </div>

      <!-- ── Contenido scrollable ────────────────────────────────────────── -->
      <div class="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pb-8 min-h-0">
      <div class="max-w-5xl mx-auto flex flex-col gap-6 pt-6">

        <!-- ══════════════════════════════════════════════════════════════
             SECCIÓN: ESTADO EN TIEMPO REAL
        ═══════════════════════════════════════════════════════════════ -->
        <section>
          <div class="mb-5">
            <h2 class="text-2xl font-bold tracking-tighter">Estado actual</h2>
            <p class="text-xs text-gray-600 uppercase tracking-widest font-bold mt-1">
              Quién está haciendo qué ahora mismo
            </p>
          </div>

          <!-- Fila de métricas rápidas -->
          <div class="grid grid-cols-3 gap-3 mb-4">
            <!-- Total -->
            <div class="relative overflow-hidden p-4 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/14 via-blue-500/7 to-transparent">
              <div class="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
              <p class="text-[9px] uppercase tracking-widest font-bold text-blue-400/70 mb-1">Plantilla</p>
              <p class="text-4xl font-black tracking-tighter text-white leading-none">{{ stats.total }}</p>
              <p class="text-[9px] text-blue-400/50 font-bold uppercase tracking-widest mt-1.5">empleados</p>
            </div>
            <!-- En turno -->
            <div class="relative overflow-hidden p-4 rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/14 via-green-500/7 to-transparent">
              <div class="absolute -top-4 -right-4 w-16 h-16 bg-green-500/10 rounded-full blur-xl pointer-events-none" />
              <p class="text-[9px] uppercase tracking-widest font-bold text-green-400/70 mb-1 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />En turno
              </p>
              <p class="text-4xl font-black tracking-tighter text-green-400 leading-none">{{ stats.working }}</p>
              <p class="text-[9px] text-green-400/50 font-bold uppercase tracking-widest mt-1.5">activos ahora</p>
            </div>
            <!-- Descanso + Sin fichar -->
            <div class="flex flex-col gap-2">
              <div class="relative overflow-hidden p-3.5 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/12 via-amber-500/5 to-transparent flex items-center justify-between">
                <div>
                  <p class="text-[9px] uppercase tracking-widest font-bold text-amber-400/70 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />Descanso
                  </p>
                  <p class="text-2xl font-black tracking-tighter text-amber-400 leading-none mt-0.5">{{ stats.break }}</p>
                </div>
              </div>
              <div class="relative overflow-hidden p-3.5 rounded-xl border border-white/8 bg-gradient-to-br from-white/5 to-transparent flex items-center justify-between">
                <div>
                  <p class="text-[9px] uppercase tracking-widest font-bold text-gray-600">Sin fichar</p>
                  <p class="text-2xl font-black tracking-tighter text-gray-500 leading-none mt-0.5">{{ stats.off }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <!-- En turno — lista -->
            <div class="p-5 rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent flex flex-col gap-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                <span class="text-xs font-bold text-green-400 uppercase tracking-widest">Trabajando ahora</span>
              </div>
              <div class="flex flex-col gap-2">
                <div v-for="emp in employeesStore.employees.filter(e => e.status === 'EN_TURNO')" :key="emp.id"
                     class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-500/8 border border-green-500/15">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                       :style="{ backgroundColor: getColor(emp.id) + '30', color: getColor(emp.id) }">
                    {{ getInitials(emp.name) }}
                  </div>
                  <span class="text-sm font-semibold leading-tight truncate flex-1">{{ emp.name }}</span>
                  <span class="text-[9px] font-bold text-green-400/60 uppercase tracking-wider">activo</span>
                </div>
                <p v-if="stats.working === 0" class="text-xs text-green-900/60 italic px-1">Nadie en turno</p>
              </div>
            </div>

            <!-- Descanso + Sin fichar — lista -->
            <div class="flex flex-col gap-3">
              <div class="p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent flex flex-col gap-2">
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span class="text-xs font-bold text-amber-400 uppercase tracking-widest">En descanso</span>
                </div>
                <div v-for="emp in employeesStore.employees.filter(e => e.status === 'EN_DESCANSO')" :key="emp.id"
                     class="flex items-center gap-3 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                       :style="{ backgroundColor: getColor(emp.id) + '30', color: getColor(emp.id) }">
                    {{ getInitials(emp.name) }}
                  </div>
                  <span class="text-sm font-semibold leading-tight truncate">{{ emp.name }}</span>
                </div>
                <p v-if="stats.break === 0" class="text-xs text-amber-900/60 italic px-1">Nadie en descanso</p>
              </div>

              <div class="p-5 rounded-2xl border border-white/8 bg-gradient-to-br from-white/5 to-transparent flex flex-col gap-2">
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                  <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Sin fichar</span>
                </div>
                <div v-for="emp in employeesStore.employees.filter(e => e.status === 'SIN_FICHAJE')" :key="emp.id"
                     class="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/4 border border-white/8">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                       :style="{ backgroundColor: getColor(emp.id) + '22', color: getColor(emp.id) }">
                    {{ getInitials(emp.name) }}
                  </div>
                  <span class="text-sm font-semibold text-gray-400 leading-tight truncate">{{ emp.name }}</span>
                </div>
                <p v-if="stats.off === 0" class="text-xs text-gray-700 italic px-1">Todos fichados</p>
              </div>
            </div>

          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════
             SECCIÓN: EMPLEADOS
        ═══════════════════════════════════════════════════════════════ -->
        <section>
          <div class="flex items-center justify-between mb-5">
            <div>
              <h2 class="text-2xl font-bold tracking-tighter">Empleados</h2>
              <p class="text-xs text-gray-600 uppercase tracking-widest font-bold mt-1">
                {{ stats.total }} registrados · gestión de plantilla
              </p>
            </div>
            <button @click="showNewEmp = true"
                    class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-bold text-gray-300">
              <Plus class="w-4 h-4" />
              Nuevo empleado
            </button>
          </div>

          <!-- Buscador -->
          <div class="relative mb-3">
            <input
              v-model="employeeSearch"
              placeholder="Buscar por nombre, DNI o centro..."
              class="w-full bg-white/5 border border-white/10 focus:border-blue-500/40 rounded-2xl px-5 py-3.5 text-sm text-white outline-none placeholder:text-gray-600 transition-colors"
            />
            <span v-if="employeeSearch" class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">
              {{ filteredAdminEmployees.length }} resultado{{ filteredAdminEmployees.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Lista compacta — clic en fila abre edición -->
          <div class="flex flex-col gap-2">
            <div v-for="emp in filteredAdminEmployees" :key="emp.id"
                 class="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all duration-150 cursor-pointer"
                 @click="openEdit(emp.id)">

              <!-- Avatar -->
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                   :style="{ backgroundColor: getColor(emp.id) + '22', border: `1.5px solid ${getColor(emp.id)}44`, color: getColor(emp.id) }">
                {{ getInitials(emp.name) }}
              </div>

              <!-- Nombre + DNI + centro -->
              <div class="flex-1 min-w-0">
                <p class="font-bold text-base leading-tight truncate">{{ emp.name }}</p>
                <p class="text-xs font-mono text-gray-500 mt-0.5 truncate">{{ emp.dni }} · {{ emp.center }}</p>
              </div>

              <!-- Badges zona fija — anchos fijos para alineación perfecta -->
              <div class="flex items-center gap-2 flex-shrink-0">

                <!-- Racha (w-16: siempre reservado) -->
                <div class="w-16 flex justify-end">
                  <span v-if="emp.streakPuntualidad > 0"
                        class="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-bold text-orange-400">
                    <Flame class="w-3 h-3 flex-shrink-0" />{{ emp.streakPuntualidad }}d
                  </span>
                </div>

                <!-- Modalidad (w-24: siempre reservado) -->
                <div class="w-24 flex justify-end">
                  <span v-if="(emp.workMode ?? 'presencial') !== 'presencial'"
                        :class="[
                          'px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest',
                          emp.workMode === 'teletrabajo' ? 'bg-purple-500/12 border-purple-500/25 text-purple-400' : 'bg-cyan-500/12 border-cyan-500/25 text-cyan-400'
                        ]">
                    {{ emp.workMode === 'teletrabajo' ? 'Teletrabajo' : 'Movilidad' }}
                  </span>
                </div>

                <!-- Estado (w-24: siempre visible) -->
                <div class="w-24 flex justify-end">
                  <span :class="['px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-widest whitespace-nowrap', statusClass(emp.status)]">
                    {{ statusLabel(emp.status) }}
                  </span>
                </div>
              </div>

              <!-- Editar (visible en hover) -->
              <div class="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400">
                  <Pencil class="w-3 h-3" /> Editar
                </div>
                <button @click.stop="removeEmp(emp.id)"
                        class="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/8 hover:border-red-500/25 text-gray-600 hover:text-red-400 transition-all">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ── SECCIÓN: CONFIGURACIÓN ──────────────────────────────────── -->
        <section>
          <div class="flex items-center justify-between mb-5">
            <div>
              <h2 class="text-2xl font-bold tracking-tighter">Configuración</h2>
              <p class="text-xs text-gray-600 uppercase tracking-widest font-bold mt-1">
                Dispositivo y ajustes del kiosko
              </p>
            </div>
            <!-- Botones Editar / Guardar + Cancelar -->
            <div v-if="!editingDevice">
              <button @click="openDeviceEdit"
                      class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-bold text-gray-300">
                <Pencil class="w-3.5 h-3.5" /> Editar
              </button>
            </div>
            <div v-else class="flex gap-2">
              <button @click="saveDeviceEdit"
                      class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-sm font-bold text-white shadow-lg shadow-blue-500/20">
                <Check class="w-3.5 h-3.5" /> Guardar
              </button>
              <button @click="cancelDeviceEdit"
                      class="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 hover:text-white text-sm transition-all">
                Cancelar
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <!-- Identidad dispositivo -->
            <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">

              <!-- CIF -->
              <div :class="['p-4 rounded-2xl border flex flex-col gap-2 transition-colors', editingDevice ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/8 bg-white/3']">
                <span class="text-xs font-bold uppercase tracking-widest text-gray-500">CIF Empresa</span>
                <input v-if="editingDevice" v-model="devCif"
                       class="bg-white/8 border border-white/15 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-blue-500/50 w-full transition-colors" />
                <span v-else class="text-base font-bold font-mono text-white">{{ store.deviceState.cif }}</span>
              </div>

              <!-- Centro -->
              <div :class="['p-4 rounded-2xl border flex flex-col gap-2 transition-colors', editingDevice ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/8 bg-white/3']">
                <span class="text-xs font-bold uppercase tracking-widest text-gray-500">Centro</span>
                <select v-if="editingDevice" v-model="devCenter"
                        class="bg-white/8 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50 w-full transition-colors cursor-pointer">
                  <option class="bg-[#0a0f1e]">Centro Principal</option>
                  <option class="bg-[#0a0f1e]">Centro Logístico</option>
                  <option class="bg-[#0a0f1e]">Oficinas Centrales</option>
                </select>
                <span v-else class="text-base font-semibold text-white">{{ store.deviceState.center }}</span>
              </div>

              <!-- Código dispositivo -->
              <div :class="['p-4 rounded-2xl border flex flex-col gap-2 transition-colors', editingDevice ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/8 bg-white/3']">
                <span class="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                  <KeyRound class="w-3 h-3" /> Código dispositivo
                </span>
                <input v-if="editingDevice" v-model="devCode" type="password"
                       class="bg-white/8 border border-white/15 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-blue-500/50 w-full transition-colors" />
                <span v-else class="text-base font-bold font-mono tracking-widest text-white">{{ '●'.repeat(store.deviceState.deviceCode.length) }}</span>
              </div>

              <!-- Foto toggle -->
              <div class="sm:col-span-3 p-5 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <Camera class="w-5 h-5 text-gray-400" />
                  <div>
                    <p class="text-base font-semibold">Verificación por foto</p>
                    <p class="text-xs text-gray-600 mt-0.5">Requiere foto al fichar entrada</p>
                  </div>
                </div>
                <div @click="store.deviceState.requirePhoto = !store.deviceState.requirePhoto"
                     :class="['w-10 h-5 rounded-full relative cursor-pointer transition-colors', store.deviceState.requirePhoto ? 'bg-blue-500' : 'bg-white/15']">
                  <div :class="['absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', store.deviceState.requirePhoto ? 'left-5' : 'left-0.5']" />
                </div>
              </div>
            </div>

            <!-- Geovalla: radio + punto GPS -->
            <div class="flex flex-col gap-3">

              <!-- Radio visual -->
              <div class="p-5 rounded-2xl border border-white/8 bg-white/3 flex flex-col items-center gap-3">
                <div class="flex items-center justify-between w-full">
                  <span class="text-xs font-bold uppercase tracking-widest text-gray-600">Radio Geovalla</span>
                  <span class="text-lg font-bold text-blue-300">{{ store.deviceState.radiusKm.toFixed(1) }} km</span>
                </div>
                <div class="relative flex items-center justify-center">
                  <svg width="100" height="100" viewBox="0 0 130 130">
                    <line x1="65" y1="5" x2="65" y2="125" stroke="rgba(59,130,246,0.08)" stroke-width="0.5"/>
                    <line x1="5" y1="65" x2="125" y2="65" stroke="rgba(59,130,246,0.08)" stroke-width="0.5"/>
                    <circle cx="65" cy="65" :r="radiusToPixels(store.deviceState.radiusKm) * 0.33"
                            fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.2)" stroke-width="0.5" style="transition:r .15s ease"/>
                    <circle cx="65" cy="65" :r="radiusToPixels(store.deviceState.radiusKm) * 0.66"
                            fill="rgba(59,130,246,0.04)" stroke="rgba(59,130,246,0.3)" stroke-width="0.8" style="transition:r .15s ease"/>
                    <circle cx="65" cy="65" :r="radiusToPixels(store.deviceState.radiusKm)"
                            fill="rgba(59,130,246,0.03)" stroke="rgb(59,130,246)" stroke-width="1.5" stroke-dasharray="5 3" style="transition:r .15s ease"/>
                    <circle cx="65" cy="65" r="4" fill="rgba(59,130,246,0.4)"/>
                    <circle cx="65" cy="65" r="2.5" fill="rgb(59,130,246)"/>
                    <circle cx="65" cy="65" r="1" fill="white"/>
                  </svg>
                </div>
                <input type="range" min="0.05" max="1.0" step="0.05"
                       v-model.number="store.deviceState.radiusKm"
                       class="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                <div class="flex justify-between w-full text-xs text-gray-600 font-bold">
                  <span>50 m</span><span>1 km</span>
                </div>
                <p class="text-[10px] text-gray-700 text-center leading-relaxed">
                  GPS interior puede desviarse 50–100 m.<br/>Recomendado para oficinas: <span class="text-blue-500/70">150–300 m</span>
                </p>
              </div>

              <!-- Punto GPS del kiosko -->
              <div class="p-5 rounded-2xl border flex flex-col gap-4"
                   :class="store.deviceState.geofenceEnabled ? 'border-blue-500/25 bg-blue-500/5' : 'border-white/8 bg-white/3'">

                <!-- Header: toggle de geovalla -->
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-bold">Geovalla activa</p>
                    <p class="text-xs text-gray-600 mt-0.5">
                      {{ store.deviceState.geofenceEnabled ? 'Fichaje restringido por ubicación' : 'Sin restricción de ubicación' }}
                    </p>
                  </div>
                  <div @click="store.deviceState.geofenceEnabled = !store.deviceState.geofenceEnabled"
                       :class="['w-11 h-6 rounded-full relative cursor-pointer transition-colors', store.deviceState.geofenceEnabled ? 'bg-blue-500' : 'bg-white/15']">
                    <div :class="['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', store.deviceState.geofenceEnabled ? 'left-6' : 'left-1']" />
                  </div>
                </div>

                <!-- Coordenadas actuales -->
                <div v-if="store.deviceState.kioskLatitude !== null"
                     class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-500/8 border border-green-500/20">
                  <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-green-400 uppercase tracking-widest">Ubicación fijada</p>
                    <p class="text-xs font-mono text-gray-400 mt-0.5 truncate">
                      {{ store.deviceState.kioskLatitude?.toFixed(5) }}, {{ store.deviceState.kioskLongitude?.toFixed(5) }}
                    </p>
                  </div>
                </div>
                <div v-else class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-orange-500/8 border border-orange-500/20">
                  <div class="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <p class="text-xs font-bold text-orange-400">Sin ubicación configurada</p>
                </div>

                <!-- Feedback de operación -->
                <p v-if="locationFeedback"
                   :class="['text-xs font-bold tracking-wide', locationFeedback.ok ? 'text-green-400' : 'text-red-400']">
                  {{ locationFeedback.msg }}
                </p>

                <!-- Botones de acción -->
                <div class="flex gap-2">
                  <button @click="fixKioskLocation" :disabled="isFetchingLocation"
                          class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold text-white">
                    <span v-if="isFetchingLocation" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <Settings v-else class="w-3.5 h-3.5" />
                    {{ isFetchingLocation ? 'Obteniendo GPS…' : 'Fijar ubicación actual' }}
                  </button>
                  <button v-if="store.deviceState.kioskLatitude !== null"
                          @click="clearKioskLocation"
                          class="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/8 hover:border-red-500/25 text-gray-500 hover:text-red-400 transition-all">
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

      </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════
         MODAL: Editar empleado
    ═══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="editingId" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div class="w-full max-w-sm bg-[#0d1220] border border-white/10 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in duration-200">

          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-2xl font-bold tracking-tighter">Editar empleado</h3>
              <p class="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Modificar datos del perfil</p>
            </div>
            <button @click="closeEdit" class="p-2 text-gray-600 hover:text-white transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="flex flex-col gap-4 mb-6">
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">Nombre completo</label>
              <input v-model="editName" type="text"
                     class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-base text-white outline-none transition-colors" />
            </div>
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">DNI</label>
              <input v-model="editDni" type="text"
                     class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-base font-mono text-white outline-none transition-colors uppercase" />
            </div>
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">PIN (mín. 4 dígitos)</label>
              <input v-model="editPin" type="password"
                     class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-base font-mono text-white outline-none transition-colors" />
            </div>
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">Centro</label>
              <select v-model="editCenter"
                      class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-base text-white outline-none transition-colors">
                <option class="bg-[#0d1220]">Centro Principal</option>
                <option class="bg-[#0d1220]">Centro Logístico</option>
                <option class="bg-[#0d1220]">Oficinas Centrales</option>
              </select>
            </div>
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">Modalidad de trabajo</label>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="mode in (['presencial','teletrabajo','movilidad'] as WorkMode[])" :key="mode"
                        type="button"
                        @click="editWorkMode = mode"
                        :class="[
                          'py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all',
                          editWorkMode === mode
                            ? mode === 'presencial'  ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                            : mode === 'teletrabajo' ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                            :                          'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                            : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                        ]">
                  {{ mode === 'presencial' ? 'Presencial' : mode === 'teletrabajo' ? 'Teletrabajo' : 'Movilidad' }}
                </button>
              </div>
              <p v-if="editWorkMode !== 'presencial'" class="text-xs text-gray-600 mt-2">
                {{ editWorkMode === 'teletrabajo' ? 'La geovalla no aplica. Puede fichar desde cualquier ubicación.' : 'Trabajador en campo. La geovalla no aplica.' }}
              </p>
            </div>
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">Cumpleaños</label>
              <input v-model="editBirthday" type="date"
                     class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-base text-white outline-none transition-colors [color-scheme:dark]" />
              <p class="text-xs text-gray-600 mt-1">Opcional — se usará para la notificación de cumpleaños</p>
            </div>
            <p v-if="editError" class="text-red-400 text-xs font-bold uppercase tracking-widest">{{ editError }}</p>
          </div>

          <button @click="saveEdit"
                  class="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-white font-bold text-base tracking-wide shadow-lg shadow-blue-500/20">
            Guardar cambios
          </button>
        </div>
      </div>
    </Teleport>

    <!-- ════════════════════════════════════════════════════════════════════
         MODAL: Nuevo empleado
    ═══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showNewEmp" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div class="w-full max-w-sm bg-[#0d1220] border border-white/10 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in duration-200">

          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-2xl font-bold tracking-tighter">Nuevo empleado</h3>
              <p class="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Añadir a la plantilla</p>
            </div>
            <button @click="showNewEmp = false" class="p-2 text-gray-600 hover:text-white transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="flex flex-col gap-4 mb-6">
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">Nombre completo</label>
              <input v-model="newName" type="text"
                     class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-base text-white outline-none transition-colors" />
            </div>
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">DNI</label>
              <input v-model="newDni" type="text"
                     class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-base font-mono text-white outline-none transition-colors uppercase" />
            </div>
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">PIN (mín. 4 dígitos)</label>
              <input v-model="newPin" type="password"
                     class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-base font-mono text-white outline-none transition-colors" />
            </div>
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">Centro</label>
              <select v-model="newCenter"
                      class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-base text-white outline-none transition-colors">
                <option class="bg-[#0d1220]">Centro Principal</option>
                <option class="bg-[#0d1220]">Centro Logístico</option>
                <option class="bg-[#0d1220]">Oficinas Centrales</option>
              </select>
            </div>
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">Modalidad de trabajo</label>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="mode in (['presencial','teletrabajo','movilidad'] as WorkMode[])" :key="mode"
                        type="button"
                        @click="newWorkMode = mode"
                        :class="[
                          'py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all',
                          newWorkMode === mode
                            ? mode === 'presencial'  ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                            : mode === 'teletrabajo' ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                            :                          'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                            : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                        ]">
                  {{ mode === 'presencial' ? 'Presencial' : mode === 'teletrabajo' ? 'Teletrabajo' : 'Movilidad' }}
                </button>
              </div>
              <p v-if="newWorkMode !== 'presencial'" class="text-xs text-gray-600 mt-2">
                {{ newWorkMode === 'teletrabajo' ? 'La geovalla no aplica. Puede fichar desde cualquier ubicación.' : 'Trabajador en campo. La geovalla no aplica.' }}
              </p>
            </div>
            <div>
              <label class="text-xs uppercase tracking-widest font-bold text-gray-500 block mb-2">Cumpleaños</label>
              <input v-model="newBirthday" type="date"
                     class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-base text-white outline-none transition-colors [color-scheme:dark]" />
              <p class="text-xs text-gray-600 mt-1">Opcional</p>
            </div>
            <p v-if="newError" class="text-red-400 text-xs font-bold uppercase tracking-widest">{{ newError }}</p>
          </div>

          <button @click="saveNewEmp"
                  class="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-white font-bold text-base tracking-wide shadow-lg shadow-blue-500/20">
            Añadir empleado
          </button>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.splash-out-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.splash-out-leave-to {
  opacity: 0;
  transform: scale(1.03);
}
</style>
