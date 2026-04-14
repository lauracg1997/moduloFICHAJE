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
          class="key-num flex-1"
        >{{ k }}</button>
      </div>

      <!-- ABC · 0 · CLR -->
      <div class="flex gap-2">
        <button @click="handleKey('ABC')" class="key-special flex-1 text-blue-400 border-blue-500/20 bg-blue-500/8 hover:bg-blue-500/15">
          ABC
        </button>
        <button @click="handleKey('0')" class="key-num flex-1">0</button>
        <button @click="handleKey('CLR')" class="key-delete flex-1 flex items-center justify-center">
          <Delete class="w-5 h-5 text-red-400" />
        </button>
      </div>

      <!-- ENTER -->
      <button @click="handleKey('OK')" class="key-confirm w-full mt-1">
        <CornerDownLeft class="w-4 h-4" />
        <span>ENTRAR</span>
      </button>
    </div>

    <!-- ── Teclado alfanumérico (QWERTY) ───────────────────────────────────── -->
    <div v-else class="flex flex-col gap-2 animate-in fade-in duration-200">

      <!-- Q W E R T Y U I O P -->
      <div class="flex gap-1.5">
        <button v-for="k in alphaRow1" :key="k" @click="handleKey(k)" class="key-alpha flex-1">{{ k }}</button>
      </div>

      <!-- A S D F G H J K L -->
      <div class="flex gap-1.5 px-[5%]">
        <button v-for="k in alphaRow2" :key="k" @click="handleKey(k)" class="key-alpha flex-1">{{ k }}</button>
      </div>

      <!-- Z X C V B N M + CLR -->
      <div class="flex gap-1.5">
        <div class="flex-[1.5]" />
        <button v-for="k in alphaRow3" :key="k" @click="handleKey(k)" class="key-alpha flex-1">{{ k }}</button>
        <button @click="handleKey('CLR')" class="key-alpha flex-[1.5] flex items-center justify-center bg-red-500/8 border-red-500/15 hover:bg-red-500/15">
          <Delete class="w-4 h-4 text-red-400" />
        </button>
      </div>

      <!-- 123 · ENTER -->
      <div class="flex gap-2 mt-1">
        <button @click="handleKey('123')" class="key-special flex-none w-24 text-blue-400 border-blue-500/20 bg-blue-500/8 hover:bg-blue-500/15">
          ← 123
        </button>
        <button @click="handleKey('OK')" class="key-confirm flex-1">
          <CornerDownLeft class="w-4 h-4" />
          <span>ENTRAR</span>
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Base de teclas numéricas ────────────────────────────────────────────── */
.key-num {
  height: 3.75rem;
  border-radius: 0.875rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  font-feature-settings: "tnum";
  transition: background 0.1s, transform 0.08s, border-color 0.1s;
}
.key-num:hover  { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); }
.key-num:active { transform: scale(0.94); background: rgba(255,255,255,0.12); }

/* ── Teclas especiales (ABC / Numérico) ─────────────────────────────────── */
.key-special {
  height: 3.25rem;
  border-radius: 0.875rem;
  border: 1px solid;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: background 0.1s, transform 0.08s;
}
.key-special:active { transform: scale(0.96); }

/* ── Tecla borrar ────────────────────────────────────────────────────────── */
.key-delete {
  height: 3.75rem;
  border-radius: 0.875rem;
  background: rgba(239,68,68,0.07);
  border: 1px solid rgba(239,68,68,0.18);
  transition: background 0.1s, transform 0.08s;
}
.key-delete:hover  { background: rgba(239,68,68,0.13); }
.key-delete:active { transform: scale(0.94); }

/* ── Teclas alfabéticas ──────────────────────────────────────────────────── */
.key-alpha {
  height: 3.25rem;
  border-radius: 0.75rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  transition: background 0.1s, transform 0.08s, border-color 0.1s;
}
.key-alpha:hover  { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); }
.key-alpha:active { transform: scale(0.93); background: rgba(255,255,255,0.12); }

/* ── Botón ENTRAR ────────────────────────────────────────────────────────── */
.key-confirm {
  height: 3.25rem;
  border-radius: 0.875rem;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  box-shadow: 0 4px 20px rgba(37,99,235,0.25);
  transition: background 0.15s, transform 0.08s, box-shadow 0.15s;
}
.key-confirm:hover  { background: #3b82f6; box-shadow: 0 4px 28px rgba(59,130,246,0.35); }
.key-confirm:active { transform: scale(0.98); }
</style>
