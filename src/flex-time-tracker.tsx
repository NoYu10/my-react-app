import React, { useState, useEffect } from 'react';
import { Clock, Target, Coffee, Calendar } from 'lucide-react';

const FlexTimeTracker = () => {
  const [startTime, setStartTime] = useState('');
  const [targetHours, setTargetHours] = useState(6);
  const [targetMinutes, setTargetMinutes] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isWorking, setIsWorking] = useState(false);
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [totalWorkHours, setTotalWorkHours] = useState(0);
  const [totalWorkMinutes, setTotalWorkMinutes] = useState(0);
  const [requiredHours, setRequiredHours] = useState(0);
  const [requiredMinutes, setRequiredMinutes] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateWorkingTime = () => {
    if (!startTime) return 0;
    const start = new Date();
    const [hours, minutes] = startTime.split(':');
    start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    let totalTime = currentTime.getTime() - start.getTime();
    
    // 休憩時間を差し引く（修正版）
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
      // 実際に休憩時間になっている場合のみ差し引く
      const breakStartTime = new Date();
      const [bsHours, bsMinutes] = breakStart.split(':');
      breakStartTime.setHours(parseInt(bsHours), parseInt(bsMinutes), 0, 0);
      
      if (currentTime >= breakStartTime) {
        const breakDuration = currentTime.getTime() - breakStartTime.getTime();
        totalTime -= breakDuration;
      }
    }
    
    return Math.max(0, totalTime / (1000 * 60 * 60));
  };

  const calculateBreakTime = () => {
    const totalTargetHours = targetHours + (targetMinutes / 60);
    const requiredBreak = totalTargetHours >= 6 ? 0.75 : 0; // 45分 or 0分
    
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
  };

  const calculateEndTime = () => {
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
  };

  // 月次労働時間の超過不足を計算
  const calculateMonthlyBalance = () => {
    const totalWorkInMinutes = (totalWorkHours * 60) + totalWorkMinutes;
    const requiredInMinutes = (requiredHours * 60) + requiredMinutes;
    const balanceInMinutes = totalWorkInMinutes - requiredInMinutes;
    
    return {
      balanceInMinutes,
      isOvertime: balanceInMinutes > 0,
      hours: Math.floor(Math.abs(balanceInMinutes) / 60),
      minutes: Math.abs(balanceInMinutes) % 60
    };
  };

  // 早退可能時間を計算
  const calculateEarlyLeaveTime = () => {
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
  };

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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            ✨ フレックスタイム管理 ✨
          </h1>
          <p className="text-gray-600 text-sm">
            {currentTime.toLocaleDateString('ja-JP', { 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            })}
          </p>
        </div>

        {/* 現在時刻 */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6 border border-pink-100">
          <div className="flex items-center justify-center mb-4">
            <Clock className="text-pink-400 w-6 h-6 mr-2" />
            <span className="text-gray-700 font-medium">現在時刻</span>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-800 mb-2">
              {currentTime.toLocaleTimeString('ja-JP', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })}
            </div>
            <div className="text-sm text-gray-500">
              {currentTime.getSeconds().toString().padStart(2, '0')}秒
            </div>
          </div>
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
              
              {/* 月次労働時間バランス表示 */}
              {monthlyBalance.balanceInMinutes !== 0 && (
                <div className={`mt-3 p-3 rounded-2xl text-center text-sm ${
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                本日までの総労働時間
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={totalWorkHours}
                  onChange={(e) => setTotalWorkHours(Math.max(0, Number(e.target.value)))}
                  className="flex-1 p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent text-center"
                  placeholder="時間"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={totalWorkMinutes}
                  onChange={(e) => setTotalWorkMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                  className="flex-1 p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent text-center"
                  placeholder="分"
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                ハーモス勤怠から転記してね
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                本日までの所定時間
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={requiredHours}
                  onChange={(e) => setRequiredHours(Math.max(0, Number(e.target.value)))}
                  className="flex-1 p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent text-center"
                  placeholder="時間"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={requiredMinutes}
                  onChange={(e) => setRequiredMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                  className="flex-1 p-3 border border-pink-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent text-center"
                  placeholder="分"
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                ハーモス勤怠から転記してね
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                休憩開始時間
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
                休憩終了時間
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

        {/* 勤務状況 */}
        {startTime && (
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6 border border-blue-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="text-blue-400 w-5 h-5 mr-2" />
              勤務状況
            </h2>
            
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

            <div className="grid grid-cols-2 gap-4 text-center">
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
          </div>
        )}

        {/* 休憩・退勤時間 */}
        {startTime && (
          <div className="bg-white rounded-3xl shadow-lg p-6 border border-green-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Coffee className="text-green-400 w-5 h-5 mr-2" />
              休憩・退勤予定
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
              
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl">
                <span className="text-gray-700">推奨退勤時間</span>
                <span className="font-semibold text-blue-600 text-xl">
                  {calculateEndTime()}
                </span>
              </div>
              
              {targetHours + (targetMinutes / 60) >= 6 && (
                <div className="text-xs text-gray-500 text-center">
                  💡 6時間以上の勤務には45分の休憩が必要です
                </div>
              )}
              
              {breakInfo.required > 0 && breakInfo.actual < breakInfo.required && (
                <div className="text-xs text-orange-500 text-center">
                  ⚠️ 休憩時間が足りません（あと{Math.ceil((breakInfo.required - breakInfo.actual) * 60)}分）
                </div>
              )}
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="text-center mt-6 text-gray-400 text-sm">
          コアタイム: 10:00 - 13:00
        </div>
      </div>
    </div>
  );
};

export default FlexTimeTracker;