import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Target, Coffee, Calendar } from 'lucide-react';

const FlexTimeTracker = () => {
  const [startTime, setStartTime] = useState('');
  const [targetHours, setTargetHours] = useState(6);
  const [targetMinutes, setTargetMinutes] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  // --- ここから新しいstate ---
  const [overtimeHours, setOvertimeHours] = useState(''); // 本日までの残業時間（時間）
  const [overtimeMinutes, setOvertimeMinutes] = useState(''); // 本日までの残業時間（分）
  const [shortageHours, setShortageHours] = useState(''); // 本日までの不足時間（時間）
  const [shortageMinutes, setShortageMinutes] = useState(''); // 本日までの不足時間（分）
  // --- ここまで新しいstate ---
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [notificationShown, setNotificationShown] = useState(false);
  const [earlyLeaveNotificationShown, setEarlyLeaveNotificationShown] = useState(false);

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
    const requiredBreakMinutes = breakInfo.required * 60;
    const endTime = new Date(start.getTime() + (totalTargetMinutes * 60 * 1000) + (requiredBreakMinutes * 60 * 1000));
    
    return endTime.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }, [startTime, targetHours, targetMinutes, calculateBreakTime]);

  // --- ここから計算ロジック修正 ---
  const calculateMonthlyBalance = useCallback(() => {
    // 残業時間（分）
    const overtimeInMinutes = (Number(overtimeHours) * 60) + Number(overtimeMinutes);
    // 不足時間（分）
    const shortageInMinutes = (Number(shortageHours) * 60) + Number(shortageMinutes);
    // 差分（分）
    const balanceInMinutes = overtimeInMinutes - shortageInMinutes;
    return {
      balanceInMinutes,
      isOvertime: balanceInMinutes > 0,
      hours: Math.floor(Math.abs(balanceInMinutes) / 60),
      minutes: Math.abs(balanceInMinutes) % 60
    };
  }, [overtimeHours, overtimeMinutes, shortageHours, shortageMinutes]);
  // --- ここまで計算ロジック修正 ---

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
        tag: 'flex-time-notification' // 同じ種類の通知が重複しないようにする
      });

      notification.onclick = () => {
        disableNotifications();
        notification.close();
      };

      notification.onshow = () => {
        // 通知が表示された時の処理
      };

      notification.onerror = () => {
        // エラー時の処理
      };
    } catch (error) {
      // エラー時の処理
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
        // 通知APIが利用可能かチェック
        if (!("Notification" in window)) {
          return;
        }

        // 既存の権限状態をチェック
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

        // 権限が"default"の場合、ユーザーに許可を求める
        const permission = await Notification.requestPermission();
        
        const isGranted = permission === "granted";
        setNotificationPermission(isGranted);
        saveNotificationPreference(isGranted);
        
        // テスト通知を送信
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
        
        // 不足時間がある場合はその情報も追加
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
  }, [startTime, notificationPermission, notificationShown, calculateEndTime, showNotification]);

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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            ✨ フレックスタイム管理 ✨
          </h1>
          <div className="flex items-center justify-center h-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">
                {currentTime.toLocaleDateString('ja-JP', { 
                  month: 'long', 
                  day: 'numeric', 
                  weekday: 'long' 
                })}
              </span>
              <span className="flex items-center text-gray-700">
                <Clock className="text-pink-400 w-4 h-4 mx-1" />
                {currentTime.toLocaleTimeString('ja-JP', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
                <span className="text-gray-400 ml-1">
                  {currentTime.getSeconds().toString().padStart(2, '0')}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* 勤務状況表示 */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6 border border-blue-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Calendar className="text-blue-400 w-5 h-5 mr-2" />
            勤務状況
          </h2>

          {startTime && (
            <>
              {/* プログレスバー */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>進捗</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-pink-100 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-pink-400 to-purple-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div className="bg-pink-50 rounded-2xl p-4">
                  <div className="text-2xl font-bold text-pink-600">
                    {Math.floor(workingHours)}:{String(Math.floor((workingHours % 1) * 60)).padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-600">現在の勤務時間</div>
                </div>
                
                <div className="bg-purple-50 rounded-2xl p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.floor(remainingHours)}:{String(Math.floor((remainingHours % 1) * 60)).padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-600">残り時間</div>
                </div>
              </div>

              {/* 推奨退勤時間 */}
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl text-center border border-blue-200">
                <div className="text-sm text-gray-600 mb-1">推奨退勤時間</div>
                <div className="text-2xl font-bold text-blue-600">
                  {calculateEndTime()}
                </div>
              </div>

              {/* 超過・不足メッセージ */}
              {monthlyBalance.balanceInMinutes !== 0 && (
                <div className={`p-4 rounded-2xl text-center text-sm ${
                  monthlyBalance.isOvertime 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-orange-50 text-orange-700'
                }`}>
                  {monthlyBalance.isOvertime ? (
                    <>
                      🎉 今日は{monthlyBalance.hours > 0 ? `${monthlyBalance.hours}時間` : ''}{monthlyBalance.minutes}分早く帰っても大丈夫だよ！
                      {earlyLeaveTime && (
                        <div className="mt-1 font-semibold">
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
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6 border border-purple-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Target className="text-purple-400 w-5 h-5 mr-2" />
            今日の設定
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                出勤時間
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所定勤務時間（日）
              </label>
              <div className="flex gap-2">
                <select
                  value={targetHours}
                  onChange={(e) => setTargetHours(Number(e.target.value))}
                  className="flex-1 p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
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
                  onChange={(e) => setTargetMinutes(Number(e.target.value))}
                  className="flex-1 p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent text-center"
                >
                  <option value={0}>0分</option>
                  <option value={15}>15分</option>
                  <option value={30}>30分</option>
                  <option value={45}>45分</option>
                </select>
              </div>
              <div className="text-sm text-gray-500 mt-1 text-center">
                合計: {targetHours}時間{targetMinutes > 0 ? `${targetMinutes}分` : ''}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  本日までの残業時間
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={overtimeHours}
                    onChange={(e) => setOvertimeHours(e.target.value)}
                    className="w-24 p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent text-center"
                    placeholder="時間"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={overtimeMinutes}
                    onChange={(e) => setOvertimeMinutes(e.target.value)}
                    className="w-16 p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent text-center"
                    placeholder="分"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  本日までの不足時間
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={shortageHours}
                    onChange={(e) => setShortageHours(e.target.value)}
                    className="w-24 p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent text-center"
                    placeholder="時間"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={shortageMinutes}
                    onChange={(e) => setShortageMinutes(e.target.value)}
                    className="w-16 p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent text-center"
                    placeholder="分"
                  />
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center mb-4">
              ハーモス勤怠の該当項目から転記してね
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  休憩開始
                </label>
                <input
                  type="time"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                  className="w-full p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  休憩終了
                </label>
                <input
                  type="time"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                  disabled={!breakStart}
                  className="w-full p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 勤務状況と休憩・退勤予定を横並びに */}
        {startTime && (
          <div className="max-w-md mx-auto">
            {/* 休憩・退勤時間 */}
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-green-100">                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Coffee className="text-green-400 w-5 h-5 mr-2" />
                休憩時間の管理
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-2xl">
                  <span className="text-gray-700">必要休憩時間</span>
                  <span className="font-semibold text-green-600">
                    {breakInfo.required * 60}分
                  </span>
                </div>
                
                {breakInfo.actual > 0 && (
                  <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-2xl">
                    <span className="text-gray-700">実際の休憩時間</span>
                    <span className="font-semibold text-yellow-600">
                      {Math.floor(breakInfo.actual * 60)}分
                      {breakStart && !breakEnd && ' (休憩中)'}
                    </span>
                  </div>
                )}
                
                {targetHours + (targetMinutes / 60) >= 6 && (
                  <div className="text-xs text-gray-500 text-center">
                    💡 6時間を超える勤務の場合、45分の休憩が必要です
                  </div>
                )}
                
                {breakInfo.required > 0 && breakInfo.actual < breakInfo.required && (
                  <div className="text-xs text-orange-500 text-center">
                    ⚠️ 休憩時間が足りません（あと{Math.ceil((breakInfo.required - breakInfo.actual) * 60)}分）
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="text-center mt-6 text-gray-400 text-sm space-y-1">
          <div>⏰ コアタイム ⏰</div>
          <div>10:00 - 16:00 (正社員)</div>
          <div>10:00 - 13:00 (短時間正社員)</div>
          <div>10:00 - 12:00 (パート社員)</div>
        </div>
      </div>
    </div>
  );
};

export default FlexTimeTracker;