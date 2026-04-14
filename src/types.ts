export type Screen = 'login' | 'config' | 'kiosk' | 'admin';
export type EmployeeStatus = 'SIN_FICHAJE' | 'EN_TURNO' | 'EN_DESCANSO';
export type WorkMode = 'presencial' | 'teletrabajo' | 'movilidad';

export interface Employee {
  id: string;
  dni: string;
  name: string;
  pin: string;
  status: EmployeeStatus;
  workedTime: number; // in seconds
  breakTime: number; // in seconds
  center: string;
  streakPuntualidad: number;
  lastPunctualDate?: string;
  avatarColor?: string;
  workMode?: WorkMode;
}

// RDL 8/2019 Compliance Models
export type WorkLogType = 'ENTRADA' | 'SALIDA' | 'DESCANSO_INICIO' | 'DESCANSO_FIN';

export interface WorkLog {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO String
  type: WorkLogType;
  createdAt: string;
  createdByDeviceId: string;
  hash: string; // Simulated immutable hash
  satisfaction?: 'BAD' | 'NEUTRAL' | 'GOOD' | 'EXCELLENT';
}

// Calendars and Schedules
export type WorkDayType = 'flexible' | 'partida' | 'continua' | 'turnos';

export interface Holiday {
  date: string;
  name: string;
  isCompanyHoliday: boolean;
}

export interface WorkCalendar {
  id: string;
  name: string;
  year: number;
  type: WorkDayType;
  holidays: Holiday[];
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  center: string;
}

// Absences and Vacations
export type LeaveType = 'VACACIONES' | 'BAJA' | 'PERMISO_RETRIBUIDO' | 'OTRO';
export type LeaveStatus = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
}

// Documentation
export type DocumentType = 'CONTRATO' | 'DNI' | 'NOMINA' | 'OTROS';

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: DocumentType;
  fileName: string;
  uploadedAt: string;
  expiresAt?: string;
  version: string;
}
