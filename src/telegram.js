// Telegram Dispatch Simulator & Incident Logger (Replicating Telebot_alert.py)
import { sound } from './sound.js';

export class TelegramDispatcher {
  constructor() {
    this.alerts = [];
    this.lastAlertTime = 0;
    this.cooldownSeconds = 15; // 15 seconds for interactive preview demo
    this.botUsername = '@GuardianEyeAlertBot';
    this.chatId = '1484998700 (Central Police Dispatch)';
  }

  canSendAlert() {
    const now = Date.now();
    return (now - this.lastAlertTime) >= this.cooldownSeconds * 1000;
  }

  getCooldownRemaining() {
    const elapsed = (Date.now() - this.lastAlertTime) / 1000;
    return Math.max(0, Math.ceil(this.cooldownSeconds - elapsed));
  }

  dispatchAlert(triggerType, message, canvasElement) {
    if (!this.canSendAlert()) return false;

    this.lastAlertTime = Date.now();

    // Capture snapshot of current canvas frame
    let snapshotUrl = '';
    try {
      snapshotUrl = canvasElement.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      console.warn('Snapshot capture warning:', e);
    }

    const alertItem = {
      id: 'SOS-' + Math.floor(100000 + Math.random() * 900000),
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      triggerType,
      message,
      snapshotUrl,
      camera: 'CAM-04 (Sector 7)',
      location: '28.6139° N, 77.2090° E',
      status: 'DISPATCHED_TO_POLICE',
    };

    this.alerts.unshift(alertItem);
    if (this.alerts.length > 8) {
      this.alerts.pop();
    }

    // Play alert sound effects
    sound.playSosAlarm();
    setTimeout(() => sound.playTelegramChime(), 600);

    return alertItem;
  }
}

export const telegramDispatcher = new TelegramDispatcher();
