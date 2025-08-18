import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Clock, Target, Coffee, Calendar } from 'lucide-react';
import {
  calculateBreakTime,
  calculateWorkingTime,
  calculateEndTime,
  calculateMonthlyBalance,
  calculateEarlyLeaveTime
} from '../../src/common/timeCalculations';
import { TimeInput } from '../../src/common/types';
import { saveToStorage, loadFromStorage } from '../../src/common/storage';

const Popup: React.FC = () => {
  const [startTime, setStartTime] = useState('');
  const [targetHours, setTargetHours] = useState(6);
  const [targetMinutes, setTargetMinutes] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');
  const [overtimeMinutes, setOvertimeMinutes] = useState('');
  const [shortageHours, setShortageHours] = useState('');
  const [shortageMinutes, setShortageMinutes] = useState('');
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);

  // ストレージ操作は共通のユーティリティを使用

  const handleNotificationToggle = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const allowed = e.target.checked;
    setNotificationsAllowed(allowed);
    await chrome.storage.local.set({ notificationsAllowed: allowed ? 'true' : 'false' });
    // Service Workerに通知チェックを即時開始/再設定させる
    chrome.runtime.sendMessage({ action: 'startNotificationCheck' });
  }, [setNotificationsAllowed]);

  // 値が変更されたときにchrome.storageに保存する関数
  const handleStartTimeChange = useCallback((value: string) => {
    setStartTime(value);
    saveToStorage('startTime', value);
    // 出勤時間を変更したら、通知フラグをリセットして再度通知されるようにする
    chrome.storage.local.set({ notificationShown: 'false', earlyLeaveNotificationShown: 'false' });
  }, [saveToStorage]);

  const handleTargetHoursChange = useCallback((value: number) => {
    setTargetHours(value);
    saveToStorage('targetHours', value);
  }, [saveToStorage]);

  const handleTargetMinutesChange = useCallback((value: number) => {
    setTargetMinutes(value);
    saveToStorage('targetMinutes', value);
  }, [saveToStorage]);

  const handleBreakStartChange = useCallback((value: string) => {
    setBreakStart(value);
    saveToStorage('breakStart', value);
  }, [saveToStorage]);

  const handleBreakEndChange = useCallback((value: string) => {
    setBreakEnd(value);
    saveToStorage('breakEnd', value);
  }, [saveToStorage]);

  const handleOvertimeHoursChange = useCallback((value: string) => {
    setOvertimeHours(value);
    saveToStorage('overtimeHours', value);
  }, [saveToStorage]);

  const handleOvertimeMinutesChange = useCallback((value: string) => {
    setOvertimeMinutes(value);
    saveToStorage('overtimeMinutes', value);
  }, [saveToStorage]);

  const handleShortageHoursChange = useCallback((value: string) => {
    setShortageHours(value);
    saveToStorage('shortageHours', value);
  }, [saveToStorage]);

  const handleShortageMinutesChange = useCallback((value: string) => {
    setShortageMinutes(value);
    saveToStorage('shortageMinutes', value);
  }, [saveToStorage]);

  // 計算関連の関数を共通ライブラリから使用
  const timeInput = {
    startTime,
    targetHours,
    targetMinutes,
    breakStart,
    breakEnd,
    overtimeHours: Number(overtimeHours),
    overtimeMinutes: Number(overtimeMinutes),
    shortageHours: Number(shortageHours),
    shortageMinutes: Number(shortageMinutes)
  };

  // データ読み込みとタイマー関連のEffect
  useEffect(() => {
    // chrome.storageからデータを読み込み
    const loadData = async () => {
      try {
        const result = await chrome.storage.local.get([
          'flexTime_startTime',
          'flexTime_targetHours',
          'flexTime_targetMinutes',
          'flexTime_breakStart',
          'flexTime_breakEnd',
          'flexTime_overtimeHours',
          'flexTime_overtimeMinutes',
          'flexTime_shortageHours',
          'flexTime_shortageMinutes',
          'notificationsAllowed',
        ]);

        setStartTime(result.flexTime_startTime || '');
        setTargetHours(result.flexTime_targetHours ? parseInt(result.flexTime_targetHours) : 6);
        setTargetMinutes(result.flexTime_targetMinutes ? parseInt(result.flexTime_targetMinutes) : 0);
        setBreakStart(result.flexTime_breakStart || '');
        setBreakEnd(result.flexTime_breakEnd || '');
        setOvertimeHours(result.flexTime_overtimeHours || '');
        setOvertimeMinutes(result.flexTime_overtimeMinutes || '');
        setShortageHours(result.flexTime_shortageHours || '');
        setShortageMinutes(result.flexTime_shortageMinutes || '');
        setNotificationsAllowed(result.notificationsAllowed === 'true');
      } catch (error) {
        console.error('データ読み込みエラー:', error);
      }
    };

    loadData();

    // タイマー設定
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Service Workerに通知チェックを委ねる
  useEffect(() => {
    // ポップアップが開かれたときにService Workerに通知チェック開始を要求
    const startNotificationCheck = () => {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'startNotificationCheck' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Service Workerへのメッセージ送信に失敗しました:', chrome.runtime.lastError.message);
          } else {
            console.log('Service Workerに通知チェックを開始するよう要求しました。', response);
          }
        });
      } else {
        console.warn('Service Workerとの通信APIが利用できません。');
      }
    };
    
    // ポップアップが開かれたらすぐにチェックを開始
    startNotificationCheck();
  }, []);

  const workingHours = calculateWorkingTime(timeInput, currentTime);
  const totalTargetHours = targetHours + (targetMinutes / 60);
  const remainingHours = Math.max(0, totalTargetHours - workingHours);
  const progressPercentage = Math.min(100, (workingHours / totalTargetHours) * 100);
  const breakInfo = calculateBreakTime(timeInput, currentTime);
  const monthlyBalance = calculateMonthlyBalance(timeInput);
  const earlyLeaveTime = calculateEarlyLeaveTime(timeInput, currentTime);

  return (
    <div 
      className="popup-content"
      style={{ 
        width: '340px', // さらに狭く
        height: '800px', 
        overflowY: 'auto', 
        padding: '16px', // paddingも減らす
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
                {calculateEndTime(timeInput, currentTime)}
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

        <label htmlFor="notification-toggle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px', marginBottom: '16px', cursor: 'pointer' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
            退勤時間の通知
          </span>
          <div style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
            <input
              type="checkbox"
              id="notification-toggle"
              checked={notificationsAllowed}
              onChange={handleNotificationToggle}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: notificationsAllowed ? '#22c55e' : '#e5e7eb', transition: '.4s', borderRadius: '20px' }}>
              <span style={{ position: 'absolute', height: '16px', width: '16px', left: '2px', bottom: '2px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%', transform: notificationsAllowed ? 'translateX(20px)' : 'translateX(0)' }}></span>
            </span>
          </div>
        </label>
        
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
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>
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
          <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
            ハーモス勤怠の該当項目（右下）から転記
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
              <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
                💡 6時間を超える勤務の場合、45分休憩が必要です
              </div>
            )}
            
            {breakInfo.required > 0 && breakInfo.actual < breakInfo.required && (
              <div style={{ fontSize: '13px', color: '#ea580c', textAlign: 'center' }}>
                ⚠️ 休憩時間が足りません（あと{Math.ceil((breakInfo.required - breakInfo.actual) * 60)}分）
              </div>
            )}
          </div>
        </div>
      )}

      {/* フッター */}
      <div style={{ textAlign: 'center', marginTop: '8px', color: '#9ca3af', fontSize: '13px' }}>
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
