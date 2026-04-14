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
          <!-- Glow azul suave arriba-izquierda -->
          <radialGradient id="g-blue" cx="15%" cy="0%" r="50%" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stop-color="#3b82f6" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </radialGradient>
          <!-- Glow violeta muy tenue abajo-derecha -->
          <radialGradient id="g-violet" cx="90%" cy="105%" r="40%" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stop-color="#8b5cf6" stop-opacity="0.06"/>
            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- Glows de fondo (solo 2, muy sutiles) -->
        <rect width="1440" height="900" fill="url(#g-blue)"/>
        <rect width="1440" height="900" fill="url(#g-violet)"/>

        <!-- Tres ondas horizontales suaves, casi invisibles -->
        <path d="M 0 220 C 360 170 720 270 1080 210 S 1320 190 1440 215"
              stroke="rgba(59,130,246,0.055)" stroke-width="1" fill="none"/>
        <path d="M 0 480 C 320 435 680 520 1040 462 S 1280 445 1440 468"
              stroke="rgba(99,102,241,0.04)" stroke-width="1" fill="none"/>
        <path d="M 0 740 C 380 696 760 778 1120 720 S 1300 706 1440 726"
              stroke="rgba(139,92,246,0.03)" stroke-width="0.8" fill="none"/>
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
  background-image: radial-gradient(rgba(99,120,200,0.055) 1px, transparent 1px);
  background-size: 40px 40px;
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
