import { TimeInput, BreakInfo, MonthlyBalance } from './types';

// 内部計算用の拡張された型
interface ExtendedTimeInput extends TimeInput {
  totalWorkHours?: string;
  totalWorkMinutes?: string;
  requiredHours?: string;
  requiredMinutes?: string;
}

const timeRegex = /^\d{2}:\d{2}$/;

// 時刻文字列の検証
export const isValidTimeString = (time: string | undefined): boolean => {
  if (!time) return false;
  return timeRegex.test(time);
};

// 休憩時間の計算
export const calculateBreakTime = (
  input: ExtendedTimeInput,
  now: Date
): BreakInfo => {
  const { targetHours = 6, targetMinutes = 0, breakStart, breakEnd } = input;
  const totalTargetHours = Number(targetHours) + (Number(targetMinutes) / 60);
  const requiredBreak = totalTargetHours >= 6 ? 0.75 : 0;

  if (breakStart && timeRegex.test(breakStart) && breakEnd && timeRegex.test(breakEnd)) {
    const breakStartTime = new Date();
    const [bsHours, bsMinutes] = breakStart.split(':');
    if (isNaN(parseInt(bsHours)) || isNaN(parseInt(bsMinutes))) return { required: requiredBreak, actual: 0 };
    breakStartTime.setHours(parseInt(bsHours), parseInt(bsMinutes), 0, 0);
    
    const breakEndTime = new Date();
    const [beHours, beMinutes] = breakEnd.split(':');
    if (isNaN(parseInt(beHours)) || isNaN(parseInt(beMinutes))) return { required: requiredBreak, actual: 0 };
    breakEndTime.setHours(parseInt(beHours), parseInt(beMinutes), 0, 0);
    
    const actualBreak = (breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60 * 60);
    return { required: requiredBreak, actual: Math.max(0, actualBreak) };
  } else if (breakStart && timeRegex.test(breakStart) && !breakEnd) {
    const breakStartTime = new Date();
    const [bsHours, bsMinutes] = breakStart.split(':');
    if (isNaN(parseInt(bsHours)) || isNaN(parseInt(bsMinutes))) return { required: requiredBreak, actual: 0 };
    breakStartTime.setHours(parseInt(bsHours), parseInt(bsMinutes), 0, 0);
    
    if (now >= breakStartTime) {
      const currentBreak = (now.getTime() - breakStartTime.getTime()) / (1000 * 60 * 60);
      return { required: requiredBreak, actual: Math.max(0, currentBreak) };
    }
  }
  
  return { required: requiredBreak, actual: 0 };
};

// 実労働時間の計算
export const calculateWorkingTime = (
  input: ExtendedTimeInput,
  now: Date
): number => {
  const { startTime, breakStart, breakEnd } = input;
  
  if (!startTime || !timeRegex.test(startTime)) return 0;
  const start = new Date();
  const [hours, minutes] = startTime.split(':');
  if (isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) return 0;
  start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  let totalTime = now.getTime() - start.getTime();
  
  // 休憩時間の処理
  if (breakStart && timeRegex.test(breakStart)) {
    const breakStartTime = new Date(now); // 現在の日付を基準に設定
    const [bsHours, bsMinutes] = breakStart.split(':');
    breakStartTime.setHours(parseInt(bsHours), parseInt(bsMinutes), 0, 0);

    // 休憩開始時間がまだ来ていない場合は、休憩時間を考慮しない
    if (now < breakStartTime) {
      return Math.max(0, totalTime / (1000 * 60 * 60));
    }

    // 休憩終了時間が設定されている場合の処理
    if (breakEnd && timeRegex.test(breakEnd)) {
      const breakEndTime = new Date(now); // 現在の日付を基準に設定
      const [beHours, beMinutes] = breakEnd.split(':');
      breakEndTime.setHours(parseInt(beHours), parseInt(beMinutes), 0, 0);
      
      if (now >= breakEndTime) {
        // 休憩終了後の場合は、休憩時間全体を引く
        const breakDuration = breakEndTime.getTime() - breakStartTime.getTime();
        totalTime -= breakDuration;
      } else if (now >= breakStartTime) {
        // 休憩中の場合は、現在までの休憩時間を引く
        const breakDuration = now.getTime() - breakStartTime.getTime();
        totalTime -= breakDuration;
      }
    } else if (now >= breakStartTime) {
      // 休憩終了時間が設定されていない場合で、休憩中の場合
      const breakDuration = now.getTime() - breakStartTime.getTime();
      totalTime -= breakDuration;
    }
  }
  
  return Math.max(0, totalTime / (1000 * 60 * 60));
};

// 推奨退勤時間の計算
export const calculateEndTime = (
  input: ExtendedTimeInput,
  now: Date
): string => {
  const { startTime, targetHours = 6, targetMinutes = 0 } = input;
  if (!startTime || !timeRegex.test(startTime)) return '--:--';
  
  const start = new Date();
  const [hours, minutes] = startTime.split(':');
  if (isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) return '--:--';
  start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const breakInfo = calculateBreakTime(input, now);
  const totalTargetMinutes = (Number(targetHours) * 60) + Number(targetMinutes);
  // 休憩時間は実際に取得した場合のみ考慮する（必須休憩時間は考慮しない）
  const actualBreakMinutes = breakInfo.actual * 60;
  
  const endTime = new Date(start.getTime() + (totalTargetMinutes * 60 * 1000) + (actualBreakMinutes * 60 * 1000));
  
  return endTime.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};

// 月次バランスの計算
export const calculateMonthlyBalance = (input: ExtendedTimeInput): MonthlyBalance => {
  const { 
    overtimeHours = '0', 
    overtimeMinutes = '0', 
    shortageHours = '0', 
    shortageMinutes = '0' 
  } = input;
  
  const overtimeInMinutes = (Number(overtimeHours) * 60) + Number(overtimeMinutes);
  const shortageInMinutes = (Number(shortageHours) * 60) + Number(shortageMinutes);
  const balanceInMinutes = overtimeInMinutes - shortageInMinutes;
  
  return {
    balanceInMinutes,
    isOvertime: balanceInMinutes > 0,
    hours: Math.floor(Math.abs(balanceInMinutes) / 60),
    minutes: Math.abs(balanceInMinutes) % 60
  };
};

// 早退可能時間の計算
export const calculateEarlyLeaveTime = (
  input: ExtendedTimeInput,
  now: Date
): string | null => {
  const balance = calculateMonthlyBalance(input);
  if (!balance.isOvertime || !input.startTime || !timeRegex.test(input.startTime)) return null;
  
  const endTime = calculateEndTime(input, now);
  if (endTime === '--:--') return null;
  
  const [endHours, endMinutes] = endTime.split(':');
  if (isNaN(parseInt(endHours)) || isNaN(parseInt(endMinutes))) return null;
  const endDate = new Date();
  endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
  
  const earlyLeaveTime = new Date(endDate.getTime() - (balance.balanceInMinutes * 60 * 1000));
  
  return earlyLeaveTime.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};
