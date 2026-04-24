import cron from 'node-cron';
import { checkAndAlertLate } from './attendance.service.js';
export function startLateAlertCron() {
    // Run every minute Mon–Fri between 08:00–12:00
    cron.schedule('* 8-12 * * 1-5', async () => {
        try {
            await checkAndAlertLate();
        }
        catch (err) {
            console.error('Late alert cron error:', err);
        }
    });
    console.log('Late alert cron started');
}
