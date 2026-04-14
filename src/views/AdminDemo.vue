<script setup lang="ts">
import { ref } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import { useEmployeesStore } from '../stores/employees';
import ShiftsPlanner from '../components/ShiftsPlanner.vue';
import EmployeeDocumentsPreview from '../components/EmployeeDocumentsPreview.vue';
import GlassButton from '../components/GlassButton.vue';
import { ArrowLeft, LayoutDashboard, FileText } from 'lucide-vue-next';

const kioskStore = useKioskStore();
const employeesStore = useEmployeesStore();
const selectedEmployeeId = ref(employeesStore.employees[0].id);
</script>

<template>
  <div class="min-h-screen p-8 bg-[#0a0f1e]">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-12">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
            <LayoutDashboard class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Panel de Administración (Demo)</h1>
            <p class="text-gray-400">Visualización de modelos y planificación</p>
          </div>
        </div>
        <GlassButton @click="kioskStore.setScreen('login')" variant="secondary" class="flex items-center gap-2">
          <ArrowLeft class="w-4 h-4" /> Volver al Kiosko
        </GlassButton>
      </div>

      <div class="grid grid-cols-1 gap-8">
        <!-- Planificador de Turnos -->
        <ShiftsPlanner />

        <!-- Vista de Documentos -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-1">
            <div class="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 class="text-xs uppercase tracking-widest font-bold text-gray-500 mb-6">Seleccionar Empleado</h3>
              <div class="space-y-2">
                <button
                  v-for="emp in employeesStore.employees"
                  :key="emp.id"
                  @click="selectedEmployeeId = emp.id"
                  :class="[
                    'w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left',
                    selectedEmployeeId === emp.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 hover:bg-white/10 text-gray-400'
                  ]"
                >
                  <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span class="text-xs font-bold">{{ emp.name.charAt(0) }}</span>
                  </div>
                  <span class="font-medium text-sm">{{ emp.name }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <EmployeeDocumentsPreview :employeeId="selectedEmployeeId" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
