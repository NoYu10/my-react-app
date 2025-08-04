// Background script for notification management
console.log('Service Worker initialized');

// 初期化完了フラグ
let isInitialized = false;

const initializeServiceWorker = () => {
  if (isInitialized) {
    console.log('Service Worker already initialized');
    return;
  }
  
  console.log('Initializing Service Worker...');
  
  // 少し遅延させてから初期化
  setTimeout(() => {
    startNotificationCheck();
    isInitialized = true;
    console.log('Service Worker initialization complete');
  }, 100);
};

// 通知チェック用のタイマー
let notificationTimer: NodeJS.Timeout | null = null;

// 通知チェック関数
const checkNotifications = async () => {
  try {
    // ストレージから設定を取得
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
      'earlyLeaveNotificationShown'
    ]);

    const startTime = result.flexTime_startTime;
    const targetHours = result.flexTime_targetHours || 6;
    const targetMinutes = result.flexTime_targetMinutes || 0;
    const breakStart = result.flexTime_breakStart;
    const breakEnd = result.flexTime_breakEnd;
    const overtimeHours = result.flexTime_overtimeHours || '';
    const overtimeMinutes = result.flexTime_overtimeMinutes || '';
    const shortageHours = result.flexTime_shortageHours || '';
    const shortageMinutes = result.flexTime_shortageMinutes || '';
    const notificationsAllowed = result.notificationsAllowed === 'true';
    const notificationShown = result.notificationShown === 'true';
    const earlyLeaveNotificationShown = result.earlyLeaveNotificationShown === 'true';

    // 通知が許可されていない、または既に表示済みの場合はスキップ
    if (!notificationsAllowed || !startTime) {
      return;
    }

    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    // 推奨退勤時間の計算
    const calculateEndTime = () => {
      if (!startTime) return '--:--';
      
      const start = new Date();
      const [hours, minutes] = startTime.split(':');
      start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // 休憩時間の計算
      const totalTargetHours = targetHours + (targetMinutes / 60);
      const requiredBreak = totalTargetHours >= 6 ? 0.75 : 0;
      
      let actualBreak = 0;
      if (breakStart && breakEnd) {
        const breakStartTime = new Date();
        const [bsHours, bsMinutes] = breakStart.split(':');
        breakStartTime.setHours(parseInt(bsHours), parseInt(bsMinutes), 0, 0);
        
        const breakEndTime = new Date();
        const [beHours, beMinutes] = breakEnd.split(':');
        breakEndTime.setHours(parseInt(beHours), parseInt(beMinutes), 0, 0);
        
        actualBreak = (breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60 * 60);
      }
      
      const totalTargetMinutes = (targetHours * 60) + targetMinutes;
      const actualBreakMinutes = actualBreak * 60;
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
      if (!balance.isOvertime || !startTime) return null;
      
      const endTime = calculateEndTime();
      if (endTime === '--:--') return null;
      
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

    const endTime = calculateEndTime();
    const earlyLeaveTime = calculateEarlyLeaveTime();
    const balance = calculateMonthlyBalance();

    // 推奨退勤時間の通知
    if (!notificationShown && endTime !== '--:--' && currentTimeStr === endTime) {
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

    // 早退可能時間の通知
    if (!earlyLeaveNotificationShown && earlyLeaveTime && currentTimeStr === earlyLeaveTime) {
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

  } catch (error) {
    console.error('通知チェックエラー:', error);
  }
};

// 通知チェックを開始
const startNotificationCheck = () => {
  try {
    if (notificationTimer) {
      clearInterval(notificationTimer);
    }
    
    // 1分間隔でチェック（ポップアップが閉じられていても継続）
    notificationTimer = setInterval(checkNotifications, 60000);
    
    // 初回チェック
    checkNotifications();
    
    console.log('Notification check started successfully');
  } catch (error) {
    console.error('Notification check start error:', error);
  }
};

// 拡張機能が起動したときに通知チェックを開始
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup - initializing service worker');
  initializeServiceWorker();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed - initializing service worker');
  initializeServiceWorker();
});

// 拡張機能が有効になったときにも通知チェックを開始
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension suspended');
  isInitialized = false;
});

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('Extension suspend canceled - reinitializing service worker');
  initializeServiceWorker();
});

// ポップアップから通知チェックの開始を要求された場合
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'startNotificationCheck') {
      initializeServiceWorker();
      sendResponse({ success: true, message: 'Notification check started' });
    } else if (request.action === 'ping') {
      // 接続テスト用
      sendResponse({ success: true, message: 'Service Worker is alive' });
    } else {
      sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    // エラーをログに出力しない（ユーザーには見えない）
    sendResponse({ success: false, error: 'Unknown error' });
  }
  return true; // 非同期レスポンスのためtrueを返す
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);
  // Open popup when notification is clicked
  chrome.action.openPopup();
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  console.log('Notification button clicked:', notificationId, buttonIndex);
}); 