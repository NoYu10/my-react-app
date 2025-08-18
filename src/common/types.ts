export interface TimeInput {
  startTime: string;
  targetHours: number;
  targetMinutes: number;
  breakStart: string;
  breakEnd: string;
  overtimeHours: number;
  overtimeMinutes: number;
  shortageHours: number;
  shortageMinutes: number;
}

export interface BreakInfo {
  required: number;
  actual: number;
}

export interface MonthlyBalance {
  balanceInMinutes: number;
  isOvertime: boolean;
  hours: number;
  minutes: number;
}

export interface StorageData {
  startTime: string;
  targetHours: number;
  targetMinutes: number;
  breakStart: string;
  breakEnd: string;
  overtimeHours: string;
  overtimeMinutes: string;
  shortageHours: string;
  shortageMinutes: string;
  notificationsAllowed: boolean;
}
