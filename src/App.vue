<script setup lang="ts">
import { useKioskStore } from './stores/kiosk';
import LoginScreen from './views/LoginScreen.vue';
import KioskScreen from './views/KioskScreen.vue';
import AdminDemo from './views/AdminDemo.vue';

const store = useKioskStore();
</script>

<template>
  <div class="app-root min-h-screen text-white font-sans selection:bg-blue-500/30">

    <!-- ── Fondo global: ondas suaves + dot-grid ─────────────────────────── -->
    <div class="app-bg" aria-hidden="true">
      <svg class="app-bg-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
           xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g-blue" cx="15%" cy="0%" r="55%" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stop-color="#3b82f6" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="g-violet" cx="90%" cy="105%" r="45%" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stop-color="#8b5cf6" stop-opacity="0.14"/>
            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="g-cyan" cx="85%" cy="8%" r="30%" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stop-color="#06b6d4" stop-opacity="0.10"/>
            <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <rect width="1440" height="900" fill="url(#g-blue)"/>
        <rect width="1440" height="900" fill="url(#g-violet)"/>
        <rect width="1440" height="900" fill="url(#g-cyan)"/>

        <!-- Onda principal azul -->
        <path d="M 0 220 C 360 155 720 285 1080 200 S 1320 175 1440 210"
              stroke="rgba(59,130,246,0.18)" stroke-width="1.5" fill="none"/>
        <!-- Sombra onda principal -->
        <path d="M 0 228 C 360 163 720 293 1080 208 S 1320 183 1440 218"
              stroke="rgba(59,130,246,0.07)" stroke-width="3" fill="none"/>

        <!-- Onda media violeta -->
        <path d="M 0 480 C 320 415 680 530 1040 455 S 1280 435 1440 465"
              stroke="rgba(139,92,246,0.15)" stroke-width="1.2" fill="none"/>

        <!-- Onda inferior cyan -->
        <path d="M 0 730 C 380 668 760 768 1120 705 S 1300 692 1440 718"
              stroke="rgba(6,182,212,0.12)" stroke-width="1" fill="none"/>

        <!-- Onda eco inferior -->
        <path d="M 0 755 C 380 693 760 793 1120 730 S 1300 717 1440 743"
              stroke="rgba(6,182,212,0.05)" stroke-width="2" fill="none"/>
      </svg>
    </div>

    <!-- Contenido de la app -->
    <div class="relative z-10 min-h-screen">
      <LoginScreen v-if="store.currentScreen === 'login'" />
      <KioskScreen v-else-if="store.currentScreen === 'kiosk'" />
      <AdminDemo v-else-if="store.currentScreen === 'admin'" />
    </div>

  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

:root {
  --font-sans: 'Outfit', sans-serif;
}

body {
  font-family: var(--font-sans);
  background-color: #0a0f1e;
  overflow: hidden;
}

/* ── Raíz de la app ──────────────────────────────────────────────────────── */
.app-root {
  background-color: #0a0f1e;
  position: relative;
}

/* ── Capa de fondo fija ──────────────────────────────────────────────────── */
.app-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;

  /* Dot-grid minimalista — puntos muy pequeños, espaciado amplio */
  background-image: radial-gradient(rgba(99,130,220,0.12) 1px, transparent 1px);
  background-size: 36px 36px;
}

.app-bg-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ── Scrollbar ───────────────────────────────────────────────────────────── */
.custom-scrollbar::-webkit-scrollbar        { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track  { background: rgba(255,255,255,0.02); }
.custom-scrollbar::-webkit-scrollbar-thumb  { background: rgba(255,255,255,0.1); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
</style>
