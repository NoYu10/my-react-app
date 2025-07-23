import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Clock, Target, Coffee, Calendar } from 'lucide-react';

const Popup: React.FC = () => {
  const [startTime, setStartTime] = useState(() => {
    const saved = localStorage.getItem('flexTime_startTime');
    return saved || '';
  });
  const [targetHours, setTargetHours] = useState(() => {
    const saved = localStorage.getItem('flexTime_targetHours');
    return saved ? parseInt(saved) : 6;
  });
  const [targetMinutes, setTargetMinutes] = useState(() => {
    const saved = localStorage.getItem('flexTime_targetMinutes');
    return saved ? parseInt(saved) : 0;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [breakStart, setBreakStart] = useState(() => {
    const saved = localStorage.getItem('flexTime_breakStart');
    return saved || '';
  });
  const [breakEnd, setBreakEnd] = useState(() => {
    const saved = localStorage.getItem('flexTime_breakEnd');
    return saved || '';
  });
  const [overtimeHours, setOvertimeHours] = useState(() => {
    const saved = localStorage.getItem('flexTime_overtimeHours');
    return saved || '';
  });
  const [overtimeMinutes, setOvertimeMinutes] = useState(() => {
    const saved = localStorage.getItem('flexTime_overtimeMinutes');
    return saved || '';
  });
  const [shortageHours, setShortageHours] = useState(() => {
    const saved = localStorage.getItem('flexTime_shortageHours');
    return saved || '';
  });
  const [shortageMinutes, setShortageMinutes] = useState(() => {
    const saved = localStorage.getItem('flexTime_shortageMinutes');
    return saved || '';
  });
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [notificationShown, setNotificationShown] = useState(false);
  const [earlyLeaveNotificationShown, setEarlyLeaveNotificationShown] = useState(false);

  // localStorageに保存する関数
  const saveToLocalStorage = useCallback((key: string, value: string | number) => {
    try {
      localStorage.setItem(`flexTime_${key}`, value.toString());
    } catch (error) {
      console.error('localStorage保存エラー:', error);
    }
  }, []);

  // 値が変更されたときにlocalStorageに保存する関数
  const handleStartTimeChange = useCallback((value: string) => {
    setStartTime(value);
    saveToLocalStorage('startTime', value);
  }, [saveToLocalStorage]);

  const handleTargetHoursChange = useCallback((value: number) => {
    setTargetHours(value);
    saveToLocalStorage('targetHours', value);
  }, [saveToLocalStorage]);

  const handleTargetMinutesChange = useCallback((value: number) => {
    setTargetMinutes(value);
    saveToLocalStorage('targetMinutes', value);
  }, [saveToLocalStorage]);

  const handleBreakStartChange = useCallback((value: string) => {
    setBreakStart(value);
    saveToLocalStorage('breakStart', value);
  }, [saveToLocalStorage]);

  const handleBreakEndChange = useCallback((value: string) => {
    setBreakEnd(value);
    saveToLocalStorage('breakEnd', value);
  }, [saveToLocalStorage]);

  const handleOvertimeHoursChange = useCallback((value: string) => {
    setOvertimeHours(value);
    saveToLocalStorage('overtimeHours', value);
  }, [saveToLocalStorage]);

  const handleOvertimeMinutesChange = useCallback((value: string) => {
    setOvertimeMinutes(value);
    saveToLocalStorage('overtimeMinutes', value);
  }, [saveToLocalStorage]);

  const handleShortageHoursChange = useCallback((value: string) => {
    setShortageHours(value);
    saveToLocalStorage('shortageHours', value);
  }, [saveToLocalStorage]);

  const handleShortageMinutesChange = useCallback((value: string) => {
    setShortageMinutes(value);
    saveToLocalStorage('shortageMinutes', value);
  }, [saveToLocalStorage]);

  // 計算関連の関数
  const calculateBreakTime = useCallback(() => {
    const totalTargetHours = targetHours + (targetMinutes / 60);
    const requiredBreak = totalTargetHours >= 6 ? 0.75 : 0;
    
    if (breakStart && breakEnd) {
      const breakStartTime = new Date();
      const [bsHours, bsMinutes] = breakStart.split(':');
      breakStartTime.setHours(parseInt(bsHours), parseInt(bsMinutes), 0, 0);
      
      const breakEndTime = new Date();
      const [beHours, beMinutes] = breakEnd.split(':');
      breakEndTime.setHours(parseInt(beHours), parseInt(beMinutes), 0, 0);
      
      const actualBreak = (breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60 * 60);
      return { required: requiredBreak, actual: actualBreak };
    } else if (breakStart && !breakEnd) {
      const breakStartTime = new Date();
      const [bsHours, bsMinutes] = breakStart.split(':');
      breakStartTime.setHours(parseInt(bsHours), parseInt(bsMinutes), 0, 0);
      
      if (currentTime >= breakStartTime) {
        const currentBreak = (currentTime.getTime() - breakStartTime.getTime()) / (1000 * 60 * 60);
        return { required: requiredBreak, actual: currentBreak };
      }
    }
    
    return { required: requiredBreak, actual: 0 };
  }, [targetHours, targetMinutes, breakStart, breakEnd, currentTime]);

  const calculateWorkingTime = useCallback(() => {
    if (!startTime) return 0;
    const start = new Date();
    const [hours, minutes] = startTime.split(':');
    start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    let totalTime = currentTime.getTime() - start.getTime();
    
    if (breakStart && breakEnd) {
      const breakStartTime = new Date();
      const [bsHours, bsMinutes] = breakStart.split(':');
      breakStartTime.setHours(parseInt(bsHours), parseInt(bsMinutes), 0, 0);
      
      const breakEndTime = new Date();
      const [beHours, beMinutes] = breakEnd.split(':');
      breakEndTime.setHours(parseInt(beHours), parseInt(beMinutes), 0, 0);
      
      const breakDuration = breakEndTime.getTime() - breakStartTime.getTime();
      totalTime -= breakDuration;
    } else if (breakStart && !breakEnd) {
      const breakStartTime = new Date();
      const [bsHours, bsMinutes] = breakStart.split(':');
      breakStartTime.setHours(parseInt(bsHours), parseInt(bsMinutes), 0, 0);
      
      if (currentTime >= breakStartTime) {
        const breakDuration = currentTime.getTime() - breakStartTime.getTime();
        totalTime -= breakDuration;
      }
    }
    
    return Math.max(0, totalTime / (1000 * 60 * 60));
  }, [startTime, currentTime, breakStart, breakEnd]);

  const calculateEndTime = useCallback(() => {
    if (!startTime) return '--:--';
    const start = new Date();
    const [hours, minutes] = startTime.split(':');
    start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const breakInfo = calculateBreakTime();
    const totalTargetMinutes = (targetHours * 60) + targetMinutes;
    const actualBreakMinutes = breakInfo.actual * 60;
    const endTime = new Date(start.getTime() + (totalTargetMinutes * 60 * 1000) + (actualBreakMinutes * 60 * 1000));
    
    return endTime.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }, [startTime, targetHours, targetMinutes, calculateBreakTime]);

  const calculateMonthlyBalance = useCallback(() => {
    const overtimeInMinutes = (Number(overtimeHours) * 60) + Number(overtimeMinutes);
    const shortageInMinutes = (Number(shortageHours) * 60) + Number(shortageMinutes);
    const balanceInMinutes = overtimeInMinutes - shortageInMinutes;
    return {
      balanceInMinutes,
      isOvertime: balanceInMinutes > 0,
      hours: Math.floor(Math.abs(balanceInMinutes) / 60),
      minutes: Math.abs(balanceInMinutes) % 60
    };
  }, [overtimeHours, overtimeMinutes, shortageHours, shortageMinutes]);

  const calculateEarlyLeaveTime = useCallback(() => {
    const balance = calculateMonthlyBalance();
    if (!balance.isOvertime || !startTime) return null;
    
    const endTime = calculateEndTime();
    const [endHours, endMinutes] = endTime.split(':');
    const endDate = new Date();
    endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
    
    const earlyLeaveTime = new Date(endDate.getTime() - (balance.balanceInMinutes * 60 * 1000));
    
    return earlyLeaveTime.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }, [startTime, calculateMonthlyBalance, calculateEndTime]);

  // 通知関連の関数
  const saveNotificationPreference = useCallback((allowed: boolean) => {
    localStorage.setItem('notificationsAllowed', allowed ? 'true' : 'false');
  }, []);

  const disableNotifications = useCallback(() => {
    setNotificationPermission(false);
    saveNotificationPreference(false);
  }, [saveNotificationPreference]);

  const showNotification = useCallback((title: string, body: string) => {
    if (!notificationPermission) {
      return;
    }

    if (!("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: "/favicon.ico",
        requireInteraction: true,
        tag: 'flex-time-notification'
      });

      notification.onclick = () => {
        disableNotifications();
        notification.close();
      };
    } catch (error) {
      console.error('通知エラー:', error);
    }
  }, [notificationPermission, disableNotifications]);

  // タイマー関連のEffect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 通知の初期化
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        if (!("Notification" in window)) {
          return;
        }

        if (Notification.permission === "denied") {
          setNotificationPermission(false);
          saveNotificationPreference(false);
          return;
        }

        if (Notification.permission === "granted") {
          setNotificationPermission(true);
          saveNotificationPreference(true);
          return;
        }

        const permission = await Notification.requestPermission();
        const isGranted = permission === "granted";
        setNotificationPermission(isGranted);
        saveNotificationPreference(isGranted);
        
        if (isGranted) {
          new Notification("フレックスタイム管理", {
            body: "通知が正常に設定されました！",
            icon: "/favicon.ico"
          });
        }
      } catch (error) {
        console.error('通知の設定中にエラーが発生しました:', error);
        setNotificationPermission(false);
        saveNotificationPreference(false);
      }
    };

    setupNotifications();
    setNotificationShown(false);
    setEarlyLeaveNotificationShown(false);
  }, [saveNotificationPreference]);

  // 推奨退勤時間の通知
  useEffect(() => {
    if (!startTime || !notificationPermission || notificationShown) {
      return;
    }

    const checkEndTime = () => {
      const endTime = calculateEndTime();
      if (endTime === '--:--') return;

      const now = new Date();
      const currentTimeStr = now.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      if (currentTimeStr === endTime) {
        const balance = calculateMonthlyBalance();
        let notificationMessage = "推奨退勤時間になりました！";
        
        if (!balance.isOvertime && balance.balanceInMinutes !== 0) {
          notificationMessage += `\n今月は${balance.hours > 0 ? `${balance.hours}時間` : ''}${balance.minutes}分不足しています。`;
        }
        
        notificationMessage += "\n（通知を完全に止めるには設定から通知をオフにしてください）";
        
        showNotification(
          "フレックスタイム管理",
          notificationMessage
        );
        setNotificationShown(true);
      }
    };

    const timer = setInterval(checkEndTime, 1000);
    return () => clearInterval(timer);
  }, [startTime, notificationPermission, notificationShown, calculateEndTime, showNotification, calculateMonthlyBalance]);

  // 早退可能時間の通知
  useEffect(() => {
    if (!startTime || !notificationPermission || earlyLeaveNotificationShown) return;

    const checkEarlyLeaveTime = () => {
      const earlyTime = calculateEarlyLeaveTime();
      if (!earlyTime) return;

      const now = new Date();
      const currentTimeStr = now.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      if (currentTimeStr === earlyTime) {
        const balance = calculateMonthlyBalance();
        showNotification(
          "フレックスタイム管理",
          `${balance.hours > 0 ? `${balance.hours}時間` : ''}${balance.minutes}分早く帰れます！\n（通知を完全に止めるには設定から通知をオフにしてください）`
        );
        setEarlyLeaveNotificationShown(true);
      }
    };

    const timer = setInterval(checkEarlyLeaveTime, 1000);
    return () => clearInterval(timer);
  }, [startTime, notificationPermission, earlyLeaveNotificationShown, calculateEarlyLeaveTime, calculateMonthlyBalance, showNotification]);

  const workingHours = calculateWorkingTime();
  const totalTargetHours = targetHours + (targetMinutes / 60);
  const remainingHours = Math.max(0, totalTargetHours - workingHours);
  const progressPercentage = Math.min(100, (workingHours / totalTargetHours) * 100);
  const breakInfo = calculateBreakTime();
  const monthlyBalance = calculateMonthlyBalance();
  const earlyLeaveTime = calculateEarlyLeaveTime();

  return (
    <div 
      className="popup-content"
      style={{ 
        width: '480px', 
        height: '800px', 
        overflowY: 'auto', 
        padding: '24px', 
        backgroundColor: '#f8fafc',
        boxSizing: 'border-box',
        margin: '0',
        border: 'none'
      }}
    >
      {/* ヘッダー */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
            ✨ フレックスタイム管理 ✨
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
          <span style={{ color: '#6b7280' }}>
            {currentTime.toLocaleDateString('ja-JP', { 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            })}
          </span>
                      <span style={{ display: 'flex', alignItems: 'center', color: '#374151', marginLeft: '8px' }}>
              <Clock style={{ color: '#ec4899', width: '16px', height: '16px', margin: '0 6px' }} />
            {currentTime.toLocaleTimeString('ja-JP', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })}
            <span style={{ color: '#9ca3af', marginLeft: '4px' }}>
              {currentTime.getSeconds().toString().padStart(2, '0')}
            </span>
          </span>
        </div>
      </div>

      {/* 勤務状況表示 */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '18px', marginBottom: '16px', border: '1px solid #dbeafe' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
          <Calendar style={{ color: '#3b82f6', width: '18px', height: '18px', marginRight: '10px' }} />
          勤務状況
        </h2>

        {startTime && (
          <>
            {/* プログレスバー */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                <span>進捗</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div style={{ width: '100%', backgroundColor: '#fce7f3', borderRadius: '8px', height: '12px' }}>
                <div 
                  style={{ 
                    background: 'linear-gradient(to right, #ec4899, #a855f7)', 
                    height: '12px', 
                    borderRadius: '8px', 
                    transition: 'width 0.5s',
                    width: `${progressPercentage}%` 
                  }}
                ></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#fdf2f8', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#db2777' }}>
                  {Math.floor(workingHours)}:{String(Math.floor((workingHours % 1) * 60)).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>現在の勤務時間</div>
              </div>
              
              <div style={{ backgroundColor: '#faf5ff', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#9333ea' }}>
                  {Math.floor(remainingHours)}:{String(Math.floor((remainingHours % 1) * 60)).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>残り時間</div>
              </div>
            </div>

            {/* 推奨退勤時間 */}
            <div style={{ marginBottom: '16px', padding: '16px', background: 'linear-gradient(to right, #eff6ff, #faf5ff)', borderRadius: '12px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>推奨退勤時間</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
                {calculateEndTime()}
              </div>
            </div>

            {/* 超過・不足メッセージ */}
            {monthlyBalance.balanceInMinutes !== 0 && (
              <div style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                textAlign: 'center', 
                fontSize: '12px',
                backgroundColor: monthlyBalance.isOvertime ? '#f0fdf4' : '#fffbeb',
                color: monthlyBalance.isOvertime ? '#166534' : '#92400e'
              }}>
                {monthlyBalance.isOvertime ? (
                  <>
                    🎉 今日は{monthlyBalance.hours > 0 ? `${monthlyBalance.hours}時間` : ''}{monthlyBalance.minutes}分早く帰っても大丈夫だよ！
                    {earlyLeaveTime && (
                      <div style={{ marginTop: '4px', fontWeight: '600' }}>
                        {earlyLeaveTime}に退勤できるよ ✨
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    ⚠️ 今月は{monthlyBalance.hours > 0 ? `${monthlyBalance.hours}時間` : ''}{monthlyBalance.minutes}分不足しているよ
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 設定エリア */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '18px', marginBottom: '16px', border: '1px solid #f3e8ff' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
          <Target style={{ color: '#a855f7', width: '18px', height: '18px', marginRight: '10px' }} />
          今日の設定
        </h2>
        
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                出勤時間
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '1px solid #fbcfe8', 
                  borderRadius: '8px', 
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              所定勤務時間（日）
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
                             <select
                 value={targetHours}
                 onChange={(e) => handleTargetHoursChange(Number(e.target.value))}
                 style={{ 
                   flex: 1, 
                   padding: '10px', 
                   border: '1px solid #fbcfe8', 
                   borderRadius: '8px', 
                   fontSize: '13px',
                   outline: 'none',
                   boxSizing: 'border-box'
                 }}
               >
                <option value={1}>1時間</option>
                <option value={2}>2時間</option>
                <option value={3}>3時間</option>
                <option value={4}>4時間</option>
                <option value={5}>5時間</option>
                <option value={6}>6時間</option>
                <option value={7}>7時間</option>
                <option value={8}>8時間</option>
              </select>
                             <select
                 value={targetMinutes}
                 onChange={(e) => handleTargetMinutesChange(Number(e.target.value))}
                 style={{ 
                   flex: 1, 
                   padding: '10px', 
                   border: '1px solid #fbcfe8', 
                   borderRadius: '8px', 
                   fontSize: '13px',
                   textAlign: 'center',
                   outline: 'none',
                   boxSizing: 'border-box'
                 }}
               >
                <option value={0}>0分</option>
                <option value={15}>15分</option>
                <option value={30}>30分</option>
                <option value={45}>45分</option>
              </select>
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>
              合計: {targetHours}時間{targetMinutes > 0 ? `${targetMinutes}分` : ''}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                本日までの残業時間
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                                 <input
                   type="number"
                   min="0"
                   value={overtimeHours}
                   onChange={(e) => handleOvertimeHoursChange(e.target.value)}
                   style={{ 
                     width: '60px', 
                     padding: '8px', 
                     border: '1px solid #fbcfe8', 
                     borderRadius: '8px', 
                     fontSize: '12px',
                     textAlign: 'center',
                     outline: 'none',
                     boxSizing: 'border-box'
                   }}
                   placeholder="時間"
                 />
                                 <input
                   type="number"
                   min="0"
                   max="59"
                   value={overtimeMinutes}
                   onChange={(e) => handleOvertimeMinutesChange(e.target.value)}
                   style={{ 
                     width: '50px', 
                     padding: '8px', 
                     border: '1px solid #fbcfe8', 
                     borderRadius: '8px', 
                     fontSize: '12px',
                     textAlign: 'center',
                     outline: 'none',
                     boxSizing: 'border-box'
                   }}
                   placeholder="分"
                 />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                本日までの不足時間
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                                 <input
                   type="number"
                   min="0"
                   value={shortageHours}
                   onChange={(e) => handleShortageHoursChange(e.target.value)}
                   style={{ 
                     width: '60px', 
                     padding: '8px', 
                     border: '1px solid #fbcfe8', 
                     borderRadius: '8px', 
                     fontSize: '12px',
                     textAlign: 'center',
                     outline: 'none',
                     boxSizing: 'border-box'
                   }}
                   placeholder="時間"
                 />
                                 <input
                   type="number"
                   min="0"
                   max="59"
                   value={shortageMinutes}
                   onChange={(e) => handleShortageMinutesChange(e.target.value)}
                   style={{ 
                     width: '50px', 
                     padding: '8px', 
                     border: '1px solid #fbcfe8', 
                     borderRadius: '8px', 
                     fontSize: '12px',
                     textAlign: 'center',
                     outline: 'none',
                     boxSizing: 'border-box'
                   }}
                   placeholder="分"
                 />
              </div>
            </div>
          </div>
          <div style={{ fontSize: '9px', color: '#6b7280', textAlign: 'center' }}>
            ハーモス勤怠の該当項目から転記してね
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                休憩開始
              </label>
              <input
                type="time"
                value={breakStart}
                onChange={(e) => handleBreakStartChange(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '1px solid #fbcfe8', 
                  borderRadius: '8px', 
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                休憩終了
              </label>
              <input
                type="time"
                value={breakEnd}
                onChange={(e) => handleBreakEndChange(e.target.value)}
                disabled={!breakStart}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '1px solid #fbcfe8', 
                  borderRadius: '8px', 
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: !breakStart ? '#f3f4f6' : 'white',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 休憩時間の管理 */}
      {startTime && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '18px', marginBottom: '16px', border: '1px solid #dcfce7' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
            <Coffee style={{ color: '#22c55e', width: '16px', height: '16px', marginRight: '8px' }} />
            休憩時間の管理
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: '#374151' }}>必要休憩時間</span>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#16a34a' }}>
                {breakInfo.required * 60}分
              </span>
            </div>
            
            {breakInfo.actual > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#374151' }}>実際の休憩時間</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#d97706' }}>
                  {Math.floor(breakInfo.actual * 60)}分
                  {breakStart && !breakEnd && ' (休憩中)'}
                </span>
              </div>
            )}
            
            {targetHours + (targetMinutes / 60) >= 6 && (
              <div style={{ fontSize: '9px', color: '#6b7280', textAlign: 'center' }}>
                💡 6時間を超える勤務の場合、45分の休憩が必要です
              </div>
            )}
            
            {breakInfo.required > 0 && breakInfo.actual < breakInfo.required && (
              <div style={{ fontSize: '9px', color: '#ea580c', textAlign: 'center' }}>
                ⚠️ 休憩時間が足りません（あと{Math.ceil((breakInfo.required - breakInfo.actual) * 60)}分）
              </div>
            )}
          </div>
        </div>
      )}

      {/* フッター */}
      <div style={{ textAlign: 'center', marginTop: '8px', color: '#9ca3af', fontSize: '9px' }}>
        <div>⏰ コアタイム ⏰</div>
        <div>10:00 - 16:00 (正社員)</div>
        <div>10:00 - 13:00 (短時間正社員)</div>
        <div>10:00 - 12:00 (パート社員)</div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
