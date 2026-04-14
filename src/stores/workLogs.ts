import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { WorkLog, WorkLogType } from '../types';

export const useWorkLogsStore = defineStore('workLogs', () => {
  // In-memory immutable list (simulated)
  // In a real app, this would be a Firestore collection or a REST API endpoint.
  const logs = ref<WorkLog[]>([]);

  const generateHash = (data: string) => {
    // Simulated hash for RDL 8/2019 compliance
    // In production, use a real cryptographic hash (SHA-256) and potentially a blockchain or audit trail service.
    return btoa(data).slice(0, 16);
  };

  const addLog = (employeeId: string, type: WorkLogType, deviceId: string) => {
    const now = new Date();
    const log: WorkLog = {
      id: crypto.randomUUID(),
      employeeId,
      date: now.toISOString().split('T')[0],
      timestamp: now.toISOString(),
      type,
      createdAt: now.toISOString(),
      createdByDeviceId: deviceId,
      hash: ''
    };

    // Calculate hash based on content to ensure "immutability"
    log.hash = generateHash(`${log.employeeId}-${log.timestamp}-${log.type}`);

    // Add to list (simulating immutable append)
    logs.value.push(log);

    // CONNECTION POINT:
    // Here you would call: await db.collection('workLogs').add(log);
    // Or: await axios.post('/api/work-logs', log);
    console.log(`[RDL 8/2019] New Log Registered: ${type} for Employee ${employeeId}`);
  };

  const getEmployeeLogs = (employeeId: string) => {
    return logs.value
      .filter(log => log.employeeId === employeeId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  };

  return {
    logs,
    addLog,
    getEmployeeLogs
  };
});
