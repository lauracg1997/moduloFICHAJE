<script setup lang="ts">
import { computed } from 'vue';
import { useEmployeesStore } from '../stores/employees';
import GlassCard from './GlassCard.vue';
import { FileText, Download, Clock } from 'lucide-vue-next';

const props = defineProps<{
  employeeId: string;
}>();

const employeesStore = useEmployeesStore();
const employee = computed(() => employeesStore.employees.find(e => e.id === props.employeeId));
const documents = computed(() => employeesStore.getEmployeeDocuments(props.employeeId));

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
</script>

<template>
  <GlassCard class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <FileText class="w-6 h-6 text-blue-500" />
        <h2 class="text-xl font-bold">Documentación: {{ employee?.name }}</h2>
      </div>
      <span class="text-[10px] uppercase tracking-widest font-bold text-gray-500">{{ documents.length }} Documentos</span>
    </div>

    <div class="space-y-3">
      <div v-for="doc in documents" :key="doc.id" class="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <FileText class="w-5 h-5" />
          </div>
          <div>
            <h4 class="font-medium text-sm">{{ doc.fileName }}</h4>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-[9px] uppercase tracking-widest font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{{ doc.type }}</span>
              <span class="flex items-center gap-1 text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                <Clock class="w-3 h-3" /> {{ formatDate(doc.uploadedAt) }}
              </span>
              <span class="text-[9px] text-gray-500 uppercase tracking-widest font-bold">v{{ doc.version }}</span>
            </div>
          </div>
        </div>
        <button class="p-2 rounded-lg bg-white/5 hover:bg-blue-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
          <Download class="w-4 h-4" />
        </button>
      </div>

      <div v-if="documents.length === 0" class="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-2xl">
        No hay documentos disponibles para este empleado.
      </div>
    </div>
  </GlassCard>
</template>
