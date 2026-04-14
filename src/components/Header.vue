<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import { Building2, Monitor, Clock, Settings, X, ShieldAlert, Lock, KeyRound } from 'lucide-vue-next';
import Keyboard from './Keyboard.vue';

const store = useKioskStore();
const currentTime = ref('');
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
  currentTime.value = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  currentDate.value = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
};

let timer: any;
onMounted(() => {
  updateDateTime();
  timer = setInterval(updateDateTime, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
  if (lockInterval) clearInterval(lockInterval);
});

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
  const cifOk = enteredCif.value.toUpperCase() === store.deviceState.cif.toUpperCase();
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
  <header class="w-full bg-black/20 backdrop-blur-lg border-b border-white/5 p-6 flex justify-between items-center relative z-50">
    <div class="flex items-center gap-8">
      <div class="flex flex-col">
        <h1 class="text-2xl font-bold tracking-tighter flex items-center gap-2">
          Talention<span class="text-blue-500">HR</span>
        </h1>
        <div class="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-gray-500 mt-1">
          <span class="flex items-center gap-1.5"><Building2 class="w-3 h-3" /> {{ store.deviceState.center }}</span>
          <span class="w-px h-3 bg-white/10"></span>
          <span class="flex items-center gap-1.5"><Monitor class="w-3 h-3" /> Punto {{ store.deviceState.deviceCode || '01' }}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4 text-right">
      <div class="flex flex-col">
        <div class="text-2xl font-mono font-bold tracking-tighter flex items-center justify-end gap-2">
          <Clock class="w-5 h-5 text-blue-500" />
          {{ currentTime }}
        </div>
        <div class="text-[10px] uppercase tracking-widest font-bold text-gray-500 mt-1">
          {{ currentDate }}
        </div>
      </div>

      <button
        @click="openAuthModal"
        :disabled="isLocked"
        :title="isLocked ? `Bloqueado ${lockSecondsLeft}s` : 'Acceso configuración'"
        :class="[
          'relative p-2.5 border rounded-xl transition-all',
          isLocked
            ? 'bg-red-500/10 border-red-500/20 text-red-500 cursor-not-allowed'
            : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 text-gray-600 hover:text-gray-400'
        ]"
      >
        <Lock v-if="isLocked" class="w-4 h-4" />
        <Settings v-else class="w-4 h-4" />
        <span v-if="isLocked" class="absolute -bottom-1 -right-1 text-[8px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
          {{ lockSecondsLeft }}
        </span>
      </button>
    </div>
  </header>

  <!-- Modal de re-autenticación -->
  <Teleport to="body">
    <div
      v-if="showAuthModal"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div class="w-full max-w-md bg-[#0d1220] border border-white/10 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in duration-200">

        <!-- Cabecera -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ShieldAlert class="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 class="font-bold text-base">Acceso restringido</h3>
              <p class="text-[10px] text-gray-500 uppercase tracking-widest">
                CIF + código privado del dispositivo
                <span v-if="authAttempts > 0" class="text-orange-400 ml-1">({{ MAX_ATTEMPTS - authAttempts }} intentos)</span>
              </p>
            </div>
          </div>
          <button @click="closeAuthModal" class="p-2 text-gray-600 hover:text-white transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Campos -->
        <div class="flex flex-col gap-3 mb-6">

          <!-- CIF -->
          <div
            @click="activeField = 'cif'"
            :class="[
              'p-4 rounded-[1.5rem] border-2 text-center transition-all duration-200 cursor-pointer',
              authError ? 'border-red-500 bg-red-500/10' :
              activeField === 'cif' ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5'
            ]"
          >
            <label :class="['text-[10px] uppercase tracking-widest font-bold block mb-1', activeField === 'cif' ? 'text-blue-400' : 'text-gray-500']">
              CIF Empresa
            </label>
            <div class="text-xl font-mono tracking-widest h-8 flex items-center justify-center">
              <span v-if="enteredCif">{{ enteredCif }}</span>
              <span v-else class="text-gray-600 text-sm">_ _ _ _ _ _ _ _ _</span>
              <div v-if="activeField === 'cif'" class="w-0.5 h-5 bg-blue-500 ml-1 animate-pulse rounded-full" />
            </div>
          </div>

          <!-- Código dispositivo (enmascarado) -->
          <div
            @click="activeField = 'deviceCode'"
            :class="[
              'p-4 rounded-[1.5rem] border-2 text-center transition-all duration-200 cursor-pointer',
              authError ? 'border-red-500 bg-red-500/10' :
              activeField === 'deviceCode' ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5'
            ]"
          >
            <label :class="['text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1 mb-1', activeField === 'deviceCode' ? 'text-blue-400' : 'text-gray-500']">
              <KeyRound class="w-3 h-3" /> Código privado
            </label>
            <div class="text-xl font-mono tracking-widest h-8 flex items-center justify-center">
              <span v-if="enteredDeviceCode">{{ '●'.repeat(enteredDeviceCode.length) }}</span>
              <span v-else class="text-gray-600 text-sm">_ _ _ _</span>
              <div v-if="activeField === 'deviceCode'" class="w-0.5 h-5 bg-blue-500 ml-1 animate-pulse rounded-full" />
            </div>
          </div>

          <p v-if="authError" class="text-red-400 text-[10px] uppercase tracking-widest font-bold text-center">
            Credenciales incorrectas. {{ MAX_ATTEMPTS - authAttempts }} intentos restantes.
          </p>
        </div>

        <!-- Teclado -->
        <Keyboard
          @key-press="handleKeyPress"
          @clear="handleClear"
          @confirm="verifyAndProceed"
        />

      </div>
    </div>
  </Teleport>
</template>
