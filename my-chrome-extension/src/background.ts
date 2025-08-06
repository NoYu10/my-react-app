// Background script for notification management

// 通知チェック関数
const checkNotifications = async () => {
  try {
    const now = new Date(); // チェック開始時点の時刻を基準とする
    
    // ストレージから設定を一度に取得
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
      'notificationShown',
      'earlyLeaveNotificationShown',
      'lastCheckedDate' // 最後にチェックした日付を取得
    ]);

    // YYYY-MM-DD形式で今日の日付を確実に取得
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    let {
      flexTime_startTime: startTime,
      flexTime_targetHours: targetHours = 6,
      flexTime_targetMinutes: targetMinutes = 0,
      flexTime_breakStart: breakStart,
      flexTime_breakEnd: breakEnd,
      flexTime_overtimeHours: overtimeHours = '',
      flexTime_overtimeMinutes: overtimeMinutes = '',
      flexTime_shortageHours: shortageHours = '',
      flexTime_shortageMinutes: shortageMinutes = '',
      notificationsAllowed,
      notificationShown,
      earlyLeaveNotificationShown,
      lastCheckedDate
    } = result;

    // lastCheckedDateが未定義の場合、今日の日付で初期化
    if (typeof lastCheckedDate === 'undefined') {
      lastCheckedDate = today;
    }

    // 日付が変わっていたら通知フラグをリセット
    if (lastCheckedDate !== today) {
      console.log(`Date changed from ${lastCheckedDate} to ${today}. Resetting notification flags.`);
      await chrome.storage.local.set({
        notificationShown: 'false',
        earlyLeaveNotificationShown: 'false',
        lastCheckedDate: today
      });
      // 現在の処理で使う変数も更新
      notificationShown = 'false';
      earlyLeaveNotificationShown = 'false';
    }

    // 通知が許可されていない、または既に表示済みの場合はスキップ
    if (notificationsAllowed !== 'true' || !startTime) {
      return;
    }

    const timeRegex = /^\d{2}:\d{2}$/;

    // 休憩時間の計算 (popup.tsxから移植・修正)
    const calculateBreakTime = () => {
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

    // 推奨退勤時間の計算
    const calculateEndTime = () => {
      if (!startTime || !timeRegex.test(startTime)) return '--:--';
      
      const start = new Date();
      const [hours, minutes] = startTime.split(':');
      if (isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) {
        console.error('Invalid start time format:', startTime);
        return '--:--';
      }
      start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const breakInfo = calculateBreakTime();
      const totalTargetMinutes = (Number(targetHours) * 60) + Number(targetMinutes);
      
      // ユーザーが入力した実績の休憩時間のみを加算する
      const actualBreakMinutes = breakInfo.actual * 60;

      const endTime = new Date(start.getTime() + (totalTargetMinutes * 60 * 1000) + (actualBreakMinutes * 60 * 1000));
      
      return endTime.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    };

    // 月次バランスの計算
    const calculateMonthlyBalance = () => {
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
    const calculateEarlyLeaveTime = () => {
      const balance = calculateMonthlyBalance();
      if (!balance.isOvertime || !startTime || !timeRegex.test(startTime)) return null;
      
      const endTime = calculateEndTime();
      if (endTime === '--:--') return null;
      
      const [endHours, endMinutes] = endTime.split(':');
      if (isNaN(parseInt(endHours)) || isNaN(parseInt(endMinutes))) {
        return null;
      }
      const endDate = new Date();
      endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
      
      const earlyLeaveTime = new Date(endDate.getTime() - (balance.balanceInMinutes * 60 * 1000));
      
      return earlyLeaveTime.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    };

    const endTimeStr = calculateEndTime();
    const earlyLeaveTimeStr = calculateEarlyLeaveTime();
    const balance = calculateMonthlyBalance();

    // 推奨退勤時間の通知
    if (notificationShown !== 'true' && endTimeStr !== '--:--') {
      const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
      const endTimeDate = new Date(now); // 今日の日付をコピー
      endTimeDate.setHours(endHours, endMinutes, 0, 0); // 時刻を設定

      // 現在時刻が推奨退勤時刻を過ぎていたら通知
      if (now >= endTimeDate) {
        let notificationMessage = "推奨退勤時間になりました！";
        
        if (!balance.isOvertime && balance.balanceInMinutes !== 0) {
          notificationMessage += `\n今月は${balance.hours > 0 ? `${balance.hours}時間` : ''}${balance.minutes}分不足しています。`;
        }
        
        notificationMessage += "\n（通知を完全に止めるには設定から通知をオフにしてください）";
        
        chrome.notifications.create('end-time-notification', {
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'フレックスタイム管理',
          message: notificationMessage,
          requireInteraction: true
        });
        
        // 通知表示済みフラグを保存
        await chrome.storage.local.set({ notificationShown: 'true' });
      }
    }

    // 早退可能時間の通知
    if (earlyLeaveNotificationShown !== 'true' && earlyLeaveTimeStr) {
      const [earlyHours, earlyMinutes] = earlyLeaveTimeStr.split(':').map(Number);
      const earlyLeaveDate = new Date(now); // 今日の日付をコピー
      earlyLeaveDate.setHours(earlyHours, earlyMinutes, 0, 0); // 時刻を設定

      // 現在時刻が早退可能時刻を過ぎていたら通知
      if (now >= earlyLeaveDate) {
        chrome.notifications.create('early-leave-notification', {
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'フレックスタイム管理',
          message: `${balance.hours > 0 ? `${balance.hours}時間` : ''}${balance.minutes}分早く帰れます！\n（通知を完全に止めるには設定から通知をオフにしてください）`,
          requireInteraction: true
        });
        
        // 通知表示済みフラグを保存
        await chrome.storage.local.set({ earlyLeaveNotificationShown: 'true' });
      }
    }

  } catch (error) {
    console.error('通知チェックエラー:', error);
  }
};

// 通知チェックを開始
const startNotificationCheck = () => {
  // 既存のアラームを一旦クリアして、タイミングを再設定
  chrome.alarms.clear('notificationCheck', (wasCleared) => {
    const now = new Date();
    // 次の分の0秒にアラームを設定することで、テスト時のタイミングを予測しやすくする
    const nextMinute = new Date(now.getTime());
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0, 0);

    // 1分ごとにチェックするアラームを再設定
    chrome.alarms.create('notificationCheck', {
      when: nextMinute.getTime(),
      periodInMinutes: 1,
    });
  });
  // 初回チェック
  checkNotifications();
};

// アラームリスナー
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'notificationCheck') {
    checkNotifications();
  }
});

// ストレージの変更を監視して、勤務開始時間が変更されたら通知フラグをリセット
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local') {
    const keysToWatch = [
      'flexTime_startTime',
      'flexTime_targetHours',
      'flexTime_targetMinutes',
      'flexTime_breakStart',
      'flexTime_breakEnd',
      'flexTime_overtimeHours',
      'flexTime_overtimeMinutes',
      'flexTime_shortageHours',
      'flexTime_shortageMinutes'
    ];
    
    const hasChanged = keysToWatch.some(key => key in changes);

    if (hasChanged) {
      await chrome.storage.local.set({ notificationShown: 'false', earlyLeaveNotificationShown: 'false' });
    }
  }
});

// 拡張機能が起動したときに通知チェックを開始
chrome.runtime.onStartup.addListener(startNotificationCheck);
chrome.runtime.onInstalled.addListener(startNotificationCheck);

// ポップアップから通知チェックの開始を要求された場合
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'startNotificationCheck') {
      startNotificationCheck();
      sendResponse({ success: true, message: 'Notification check started/reset' });
    } else if (request.action === 'ping') {
      // 接続テスト用
      sendResponse({ success: true, message: 'Service Worker is alive' });
    } else {
      console.warn('Unknown action received:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('onMessage listener error:', error);
    sendResponse({ success: false, error: (error as Error).message || 'Unknown error' });
  }
  return true; // 非同期レスポンスのためtrueを返す
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // Open popup when notification is clicked
  chrome.action.openPopup();
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
});