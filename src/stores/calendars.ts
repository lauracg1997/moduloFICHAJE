import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { WorkCalendar, Shift, LeaveRequest } from '../types';

export const useCalendarsStore = defineStore('calendars', () => {
  const calendars = ref<WorkCalendar[]>([
    {
      id: 'c1',
      name: 'Calendario General 2026',
      year: 2026,
      type: 'continua',
      holidays: [
        { date: '2026-01-01', name: 'Año Nuevo', isCompanyHoliday: false },
        { date: '2026-01-06', name: 'Reyes Magos', isCompanyHoliday: false },
        { date: '2026-04-10', name: 'Viernes Santo', isCompanyHoliday: false }, // Today in simulation
        { date: '2026-05-01', name: 'Día del Trabajador', isCompanyHoliday: false },
        { date: '2026-06-24', name: 'San Juan (Fiesta Empresa)', isCompanyHoliday: true },
      ]
    }
  ]);

  const shifts = ref<Shift[]>([
    // Juan: Mañana
    { id: 's1', employeeId: '1', date: '2026-04-10', startTime: '08:00', endTime: '16:00', center: 'Centro Principal' },
    // María: Tarde
    { id: 's2', employeeId: '2', date: '2026-04-10', startTime: '15:00', endTime: '23:00', center: 'Centro Principal' },
    // Carlos: Mañana
    { id: 's3', employeeId: '3', date: '2026-04-10', startTime: '09:00', endTime: '17:00', center: 'Centro Principal' },
  ]);

  const leaveRequests = ref<LeaveRequest[]>([
    { id: 'l1', employeeId: '3', type: 'VACACIONES', startDate: '2026-04-10', endDate: '2026-04-17', status: 'APROBADA' },
    { id: 'l2', employeeId: '2', type: 'BAJA', startDate: '2026-04-01', endDate: '2026-04-05', status: 'APROBADA' },
  ]);

  const getTodayShift = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return shifts.value.find(s => s.employeeId === employeeId && s.date === today);
  };

  const getTodayHoliday = () => {
    const today = new Date().toISOString().split('T')[0];
    return calendars.value[0].holidays.find(h => h.date === today);
  };

  const getActiveLeave = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return leaveRequests.value.find(l => 
      l.employeeId === employeeId && 
      l.status === 'APROBADA' &&
      today >= l.startDate && 
      today <= l.endDate
    );
  };

  return {
    calendars,
    shifts,
    leaveRequests,
    getTodayShift,
    getTodayHoliday,
    getActiveLeave
  };
});
