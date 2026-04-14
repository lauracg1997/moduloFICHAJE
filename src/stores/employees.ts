import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Employee, EmployeeDocument, WorkMode } from '../types';

export const useEmployeesStore = defineStore('employees', () => {
  const employees = ref<Employee[]>([
    { id: '1', dni: '12345678A', name: 'Juan Pérez',       pin: '12345', status: 'SIN_FICHAJE', workedTime: 0, breakTime: 0, center: 'Centro Principal', streakPuntualidad: 3,  workMode: 'presencial'  },
    { id: '2', dni: '87654321B', name: 'María García',     pin: '54321', status: 'SIN_FICHAJE', workedTime: 0, breakTime: 0, center: 'Centro Principal', streakPuntualidad: 0,  workMode: 'teletrabajo' },
    { id: '3', dni: '11223344C', name: 'Carlos Rodríguez', pin: '11111', status: 'SIN_FICHAJE', workedTime: 0, breakTime: 0, center: 'Centro Principal', streakPuntualidad: 12, workMode: 'movilidad'   },
  ]);

  const documents = ref<EmployeeDocument[]>([
    { id: 'd1', employeeId: '1', type: 'CONTRATO', fileName: 'contrato_indefinido_juan.pdf', uploadedAt: '2024-01-15T10:00:00Z', version: '1.0' },
    { id: 'd2', employeeId: '1', type: 'DNI', fileName: 'dni_juan_anverso.jpg', uploadedAt: '2024-01-15T10:05:00Z', version: '1.0' },
    { id: 'd3', employeeId: '2', type: 'NOMINA', fileName: 'nomina_marzo_2026_maria.pdf', uploadedAt: '2026-04-01T09:00:00Z', version: '1.0' },
  ]);

  const getEmployeeDocuments = (employeeId: string) => {
    return documents.value.filter(doc => doc.employeeId === employeeId);
  };

  const updateEmployeeStatus = (id: string, status: Employee['status']) => {
    const emp = employees.value.find(e => e.id === id);
    if (emp) emp.status = status;
  };

  const incrementTime = (id: string, type: 'work' | 'break') => {
    const emp = employees.value.find(e => e.id === id);
    if (emp) {
      if (type === 'work') emp.workedTime++;
      else emp.breakTime++;
    }
  };

  const resetTimes = (id: string) => {
    const emp = employees.value.find(e => e.id === id);
    if (emp) {
      emp.workedTime = 0;
      emp.breakTime = 0;
    }
  };

  const updateStreak = (id: string, isPunctual: boolean) => {
    const emp = employees.value.find(e => e.id === id);
    if (emp) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      if (isPunctual) {
        if (emp.lastPunctualDate === todayStr) return; // Already counted today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (emp.lastPunctualDate === yesterdayStr || emp.streakPuntualidad === 0) {
          emp.streakPuntualidad++;
        } else {
          // If they missed a day, we could either reset or keep it. 
          // "Consecutive days" usually means calendar days.
          // But for work, maybe it means "consecutive working days".
          // The prompt says "Si es puntual y ayer también se fichó puntual".
          // I'll stick to the strict "yesterday" check.
          emp.streakPuntualidad = 1;
        }
        emp.lastPunctualDate = todayStr;
      } else {
        emp.streakPuntualidad = 0;
        emp.lastPunctualDate = undefined;
      }
    }
  };

  const updateAvatarColor = (id: string, color: string) => {
    const emp = employees.value.find(e => e.id === id);
    if (emp) emp.avatarColor = color;
  };

  const updateEmployee = (id: string, fields: Partial<Pick<Employee, 'name' | 'dni' | 'pin' | 'center' | 'workMode'>>) => {
    const emp = employees.value.find(e => e.id === id);
    if (emp) Object.assign(emp, fields);
  };

  const addEmployee = (emp: Omit<Employee, 'id' | 'status' | 'workedTime' | 'breakTime' | 'streakPuntualidad'>) => {
    const id = String(Date.now());
    employees.value.push({ workMode: 'presencial', ...emp, id, status: 'SIN_FICHAJE', workedTime: 0, breakTime: 0, streakPuntualidad: 0 });
  };

  const removeEmployee = (id: string) => {
    employees.value = employees.value.filter(e => e.id !== id);
  };

  return {
    employees,
    documents,
    getEmployeeDocuments,
    updateEmployeeStatus,
    incrementTime,
    resetTimes,
    updateStreak,
    updateAvatarColor,
    updateEmployee,
    addEmployee,
    removeEmployee,
  };
});
