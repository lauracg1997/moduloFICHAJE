<script setup lang="ts">
import { useEmployeesStore } from '../stores/employees';
import { useCalendarsStore } from '../stores/calendars';
import GlassCard from './GlassCard.vue';
import { Calendar, User } from 'lucide-vue-next';

const employeesStore = useEmployeesStore();
const calendarsStore = useCalendarsStore();

const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// Simplified weekly grid for demo
const weekDates = ['2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12'];

const getShiftForDay = (employeeId: string, date: string) => {
  return calendarsStore.shifts.find(s => s.employeeId === employeeId && s.date === date);
};
</script>

<template>
  <GlassCard class="p-6 overflow-hidden">
    <div class="flex items-center gap-3 mb-6">
      <Calendar class="w-6 h-6 text-blue-500" />
      <h2 class="text-xl font-bold">Planificador de Turnos (Vista Semanal)</h2>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th class="p-4 text-left text-xs uppercase tracking-widest text-gray-500 border-b border-white/5">Empleado</th>
            <th v-for="(day, i) in days" :key="day" class="p-4 text-center text-xs uppercase tracking-widest text-gray-500 border-b border-white/5">
              {{ day }} <br> <span class="text-[10px] opacity-50">{{ weekDates[i].split('-')[2] }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="emp in employeesStore.employees" :key="emp.id" class="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td class="p-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <User class="w-4 h-4" />
                </div>
                <span class="font-medium text-sm">{{ emp.name }}</span>
              </div>
            </td>
            <td v-for="date in weekDates" :key="date" class="p-2">
              <div v-if="getShiftForDay(emp.id, date)" class="bg-blue-600/20 border border-blue-500/30 rounded-lg p-2 text-center">
                <p class="text-[10px] font-bold text-blue-400">{{ getShiftForDay(emp.id, date)?.startTime }} - {{ getShiftForDay(emp.id, date)?.endTime }}</p>
              </div>
              <div v-else class="h-10 border border-dashed border-white/5 rounded-lg" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </GlassCard>
</template>
