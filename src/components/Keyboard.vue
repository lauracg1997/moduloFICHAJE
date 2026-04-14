<script setup lang="ts">
import { ref } from 'vue';
import { Delete, CornerDownLeft } from 'lucide-vue-next';

const emit = defineEmits(['key-press', 'clear', 'confirm']);

const currentMode = ref<'numeric' | 'alpha'>('numeric');

defineExpose({
  resetToNumeric: () => { currentMode.value = 'numeric'; },
  setAlpha:       () => { currentMode.value = 'alpha'; },
});

const handleKey = (k: string) => {
  if (k === 'CLR') emit('clear');
  else if (k === 'OK') emit('confirm');
  else if (k === 'ABC') currentMode.value = 'alpha';
  else if (k === '123') currentMode.value = 'numeric';
  else emit('key-press', k);
};

const alphaRow1 = ['Q','W','E','R','T','Y','U','I','O','P'];
const alphaRow2 = ['A','S','D','F','G','H','J','K','L'];
const alphaRow3 = ['Z','X','C','V','B','N','M'];
</script>

<template>
  <div class="select-none w-full">

    <!-- ── Teclado numérico ─────────────────────────────────────────────────── -->
    <div v-if="currentMode === 'numeric'" class="flex flex-col gap-2">

      <div v-for="row in [['1','2','3'],['4','5','6'],['7','8','9']]" :key="row[0]" class="flex gap-2">
        <button
          v-for="k in row" :key="k"
          @click="handleKey(k)"
          class="flex-1 h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-100 text-2xl font-bold text-white"
        >{{ k }}</button>
      </div>

      <!-- ABC · 0 · CLR -->
      <div class="flex gap-2">
        <button
          @click="handleKey('ABC')"
          class="flex-1 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20 active:scale-95 transition-all duration-100 text-sm font-bold text-blue-400 tracking-widest uppercase"
        >ABC</button>
        <button
          @click="handleKey('0')"
          class="flex-1 h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-100 text-2xl font-bold text-white"
        >0</button>
        <button
          @click="handleKey('CLR')"
          class="flex-1 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 active:scale-95 transition-all duration-100 flex items-center justify-center"
        >
          <Delete class="w-6 h-6 text-red-400" />
        </button>
      </div>

      <!-- ENTER -->
      <button
        @click="handleKey('OK')"
        class="w-full h-14 mt-1 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all duration-150 text-sm font-bold uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3"
      >
        <CornerDownLeft class="w-5 h-5" />
        ENTRAR
      </button>
    </div>

    <!-- ── Teclado alfanumérico (QWERTY) ───────────────────────────────────── -->
    <div v-else class="flex flex-col gap-2 animate-in fade-in duration-200">

      <!-- Botón de vuelta al teclado numérico -->
      <button
        @click="handleKey('123')"
        class="w-full flex items-center justify-center gap-2 py-3 mb-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-400/40 active:scale-[0.98] transition-all duration-150"
      >
        <span class="text-blue-400 text-xs font-bold uppercase tracking-widest">← Volver al teclado numérico</span>
      </button>

      <!-- Fila 1: Q W E R T Y U I O P -->
      <div class="flex gap-1.5">
        <button
          v-for="k in alphaRow1" :key="k"
          @click="handleKey(k)"
          class="flex-1 h-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-100 text-base font-bold text-white"
        >{{ k }}</button>
      </div>

      <!-- Fila 2: A S D F G H J K L (centrada) -->
      <div class="flex gap-1.5 px-[5%]">
        <button
          v-for="k in alphaRow2" :key="k"
          @click="handleKey(k)"
          class="flex-1 h-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-100 text-base font-bold text-white"
        >{{ k }}</button>
      </div>

      <!-- Fila 3: espacio · Z X C V B N M · CLR -->
      <div class="flex gap-1.5">
        <div class="flex-[1.5]"></div>
        <button
          v-for="k in alphaRow3" :key="k"
          @click="handleKey(k)"
          class="flex-1 h-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-100 text-base font-bold text-white"
        >{{ k }}</button>
        <button
          @click="handleKey('CLR')"
          class="flex-[1.5] h-14 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all duration-100 flex items-center justify-center"
        >
          <Delete class="w-5 h-5 text-red-400" />
        </button>
      </div>

      <!-- ENTER -->
      <button
        @click="handleKey('OK')"
        class="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all duration-150 text-sm font-bold uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3"
      >
        <CornerDownLeft class="w-5 h-5" />
        ENTRAR
      </button>
    </div>

  </div>
</template>
