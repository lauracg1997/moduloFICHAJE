<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import { Building2, Monitor, Settings, X, Lock, KeyRound } from 'lucide-vue-next';
import Keyboard from './Keyboard.vue';

const store = useKioskStore();
const timeH  = ref('00');
const timeM  = ref('00');
const timeS  = ref('00');
const currentDate = ref('');

const showAuthModal = ref(false);
const enteredCif = ref('');
const enteredDeviceCode = ref('');
const activeField = ref<'cif' | 'deviceCode'>('cif');
const authError = ref(false);
const authAttempts = ref(0);
const isLocked = ref(false);
const lockSecondsLeft = ref(0);
const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 30;

let lockInterval: ReturnType<typeof setInterval> | null = null;

const updateDateTime = () => {
  const now = new Date();
  timeH.value  = String(now.getHours()).padStart(2, '0');
  timeM.value  = String(now.getMinutes()).padStart(2, '0');
  timeS.value  = String(now.getSeconds()).padStart(2, '0');
  currentDate.value = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
};

let timer: any;
onMounted(() => { updateDateTime(); timer = setInterval(updateDateTime, 1000); });
onUnmounted(() => { clearInterval(timer); if (lockInterval) clearInterval(lockInterval); });

const openAuthModal = () => {
  if (isLocked.value) return;
  enteredCif.value = '';
  enteredDeviceCode.value = '';
  activeField.value = 'cif';
  authError.value = false;
  showAuthModal.value = true;
};

const closeAuthModal = () => {
  showAuthModal.value = false;
  enteredCif.value = '';
  enteredDeviceCode.value = '';
  activeField.value = 'cif';
  authError.value = false;
};

const startLockout = () => {
  isLocked.value = true;
  lockSecondsLeft.value = LOCK_DURATION;
  showAuthModal.value = false;
  enteredCif.value = '';
  enteredDeviceCode.value = '';
  lockInterval = setInterval(() => {
    lockSecondsLeft.value--;
    if (lockSecondsLeft.value <= 0) {
      isLocked.value = false;
      authAttempts.value = 0;
      if (lockInterval) clearInterval(lockInterval);
    }
  }, 1000);
};

const handleKeyPress = (key: string) => {
  if (activeField.value === 'cif') enteredCif.value += key;
  else enteredDeviceCode.value += key;
};
const handleClear = () => {
  if (activeField.value === 'cif') enteredCif.value = enteredCif.value.slice(0, -1);
  else enteredDeviceCode.value = enteredDeviceCode.value.slice(0, -1);
};

const verifyAndProceed = () => {
  const cifOk  = enteredCif.value.toUpperCase() === store.deviceState.cif.toUpperCase();
  const codeOk = enteredDeviceCode.value === store.deviceState.deviceCode;
  if (cifOk && codeOk) {
    authAttempts.value = 0;
    closeAuthModal();
    store.goToConfig();
  } else {
    authAttempts.value++;
    authError.value = true;
    enteredDeviceCode.value = '';
    setTimeout(() => { authError.value = false; }, 1500);
    if (authAttempts.value >= MAX_ATTEMPTS) startLockout();
  }
};
</script>

<template>
  <header class="w-full bg-black/20 backdrop-blur-lg border-b border-white/5 px-6 py-4 flex justify-between items-center relative z-50">
    <div class="flex items-center gap-4">
      <div class="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
        <Monitor class="w-4 h-4 text-blue-400" />
      </div>
      <div>
        <h1 class="text-lg font-bold tracking-tighter leading-none">
          Talention<span class="text-blue-500">HR</span>
        </h1>
        <div class="flex items-center gap-3 text-[9px] uppercase tracking-widest font-bold text-gray-600 mt-0.5">
          <span class="flex items-center gap-1"><Building2 class="w-2.5 h-2.5" /> {{ store.deviceState.center }}</span>
          <span class="w-px h-2.5 bg-white/10" />
          <span class="flex items-center gap-1"><Monitor class="w-2.5 h-2.5" /> Punto {{ store.deviceState.deviceCode || '01' }}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <!-- ── Reloj premium ──────────────────────────────────────────────────── -->
      <div class="text-right flex flex-col items-end gap-0.5">
        <!-- HH : MM  con segundos pequeños -->
        <div class="flex items-baseline gap-px leading-none">
          <span class="text-[1.6rem] font-black font-mono tracking-tighter text-white tabular-nums">{{ timeH }}</span>
          <span class="text-[1.4rem] font-black text-blue-500/70 mx-0.5 leading-none" style="line-height:1">:</span>
          <span class="text-[1.6rem] font-black font-mono tracking-tighter text-white tabular-nums">{{ timeM }}</span>
          <!-- segundos: badge pequeño -->
          <span class="ml-1.5 flex flex-col items-center">
            <span class="text-[0.6rem] font-bold font-mono text-gray-600 tabular-nums leading-none">{{ timeS }}</span>
            <span class="text-[0.45rem] uppercase tracking-widest font-bold text-gray-700 leading-none mt-px">seg</span>
          </span>
        </div>
        <!-- Fecha + indicador live -->
        <div class="flex items-center justify-end gap-1.5">
          <span class="w-1 h-1 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          <span class="text-[9px] uppercase tracking-widest font-bold text-gray-600">{{ currentDate }}</span>
        </div>
      </div>

      <button
        @click="openAuthModal"
        :disabled="isLocked"
        :class="[
          'relative p-2.5 border rounded-xl transition-all',
          isLocked
            ? 'bg-red-500/10 border-red-500/20 text-red-500 cursor-not-allowed'
            : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 text-gray-600 hover:text-gray-300'
        ]"
      >
        <Lock v-if="isLocked" class="w-4 h-4" />
        <Settings v-else class="w-4 h-4" />
        <span v-if="isLocked"
              class="absolute -bottom-1 -right-1 text-[8px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
          {{ lockSecondsLeft }}
        </span>
      </button>
    </div>
  </header>

  <!-- ── Modal de acceso — mismo estilo que login CIF ───────────────────── -->
  <Teleport to="body">
    <Transition name="auth-fade">
      <div v-if="showAuthModal"
           class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md px-4"
           @click.self="closeAuthModal">

        <div class="w-full max-w-md animate-in zoom-in-95 duration-300">

          <!-- Cabecera marca -->
          <div class="mb-7 text-center">
            <div class="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/10">
              <Monitor class="w-6 h-6 text-blue-400" />
            </div>
            <h2 class="text-2xl font-bold tracking-tighter mb-1">
              Talention<span class="text-blue-500">HR</span>
            </h2>
            <p class="text-[10px] text-gray-600 uppercase tracking-[0.35em] font-bold">
              Acceso a configuración
              <span v-if="authAttempts > 0" class="text-orange-400 ml-2">· {{ MAX_ATTEMPTS - authAttempts }} intentos</span>
            </p>
          </div>

          <!-- Card -->
          <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden p-7 shadow-2xl">
            <div class="flex flex-col gap-3 mb-6">

              <!-- CIF -->
              <div @click="activeField = 'cif'"
                   :class="['p-4 border-2 rounded-2xl transition-all cursor-pointer text-center',
                     authError ? 'border-red-500/60 bg-red-500/5' :
                     activeField === 'cif' ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'bg-white/5 border-white/5 hover:border-white/10']">
                <label :class="['text-[10px] uppercase tracking-widest font-bold block mb-1.5',
                                 activeField === 'cif' && !authError ? 'text-blue-400' : authError ? 'text-red-400' : 'text-gray-500']">
                  CIF Empresa
                </label>
                <div class="text-xl font-mono tracking-widest h-8 flex items-center justify-center">
                  <span v-if="enteredCif" class="text-white">{{ enteredCif }}</span>
                  <span v-else class="text-white/15">— — — — — — —</span>
                  <div v-if="activeField === 'cif'" class="w-0.5 h-5 bg-blue-500 ml-1.5 animate-pulse rounded-full" />
                </div>
              </div>

              <!-- Código dispositivo -->
              <div @click="activeField = 'deviceCode'"
                   :class="['p-4 border-2 rounded-2xl transition-all cursor-pointer text-center',
                     authError ? 'border-red-500/60 bg-red-500/5' :
                     activeField === 'deviceCode' ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'bg-white/5 border-white/5 hover:border-white/10']">
                <label :class="['text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 mb-1.5',
                                 activeField === 'deviceCode' && !authError ? 'text-blue-400' : authError ? 'text-red-400' : 'text-gray-500']">
                  <KeyRound class="w-3 h-3" /> Código privado del dispositivo
                </label>
                <div class="text-xl font-mono tracking-widest h-8 flex items-center justify-center">
                  <span v-if="enteredDeviceCode" class="text-white">{{ '●'.repeat(enteredDeviceCode.length) }}</span>
                  <span v-else class="text-white/15">— —</span>
                  <div v-if="activeField === 'deviceCode'" class="w-0.5 h-5 bg-blue-500 ml-1.5 animate-pulse rounded-full" />
                </div>
              </div>

              <p v-if="authError" class="text-red-400 text-[10px] uppercase tracking-widest font-bold text-center animate-in fade-in duration-200">
                Credenciales incorrectas
              </p>
            </div>

            <Keyboard @key-press="handleKeyPress" @clear="handleClear" @confirm="verifyAndProceed" />

            <div class="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
              <div class="flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold text-gray-700">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Sistema activo
              </div>
              <button @click="closeAuthModal" class="text-[9px] uppercase tracking-widest font-bold text-gray-700 hover:text-gray-400 transition-colors flex items-center gap-1">
                <X class="w-3 h-3" /> Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.auth-fade-enter-active, .auth-fade-leave-active { transition: opacity 0.25s ease; }
.auth-fade-enter-from, .auth-fade-leave-to       { opacity: 0; }
</style>
