import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Screen } from '../types';

export const useKioskStore = defineStore('kiosk', () => {
  const currentScreen = ref<Screen>('login');
  const deviceState = ref({
    cif: 'B12345678',
    deviceCode: '9999',
    center: 'Centro Principal',
    radiusKm: 0.15,
    requirePhoto: false,
    geofenceEnabled: false,
    kioskLatitude: null as number | null,
    kioskLongitude: null as number | null,
  });

  const selectedEmployeeId = ref<string | null>(null);
  const configMode = ref(false);

  const setScreen = (screen: Screen) => {
    currentScreen.value = screen;
  };

  const goToConfig = () => {
    configMode.value = true;
    currentScreen.value = 'login';
  };

  const setDeviceState = (state: any) => {
    deviceState.value = { ...deviceState.value, ...state };
  };

  const selectEmployee = (id: string | null) => {
    selectedEmployeeId.value = id;
  };

  const resetSelection = () => {
    selectedEmployeeId.value = null;
  };

  return {
    currentScreen,
    deviceState,
    selectedEmployeeId,
    configMode,
    setScreen,
    setDeviceState,
    selectEmployee,
    resetSelection,
    goToConfig
  };
});
