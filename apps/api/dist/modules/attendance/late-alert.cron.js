"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLateAlertCron = startLateAlertCron;
const node_cron_1 = __importDefault(require("node-cron"));
const attendance_service_js_1 = require("./attendance.service.js");
function startLateAlertCron() {
    // Run every minute Mon–Fri between 08:00–12:00
    node_cron_1.default.schedule('* 8-12 * * 1-5', async () => {
        try {
            await (0, attendance_service_js_1.checkAndAlertLate)();
        }
        catch (err) {
            console.error('Late alert cron error:', err);
        }
    });
    console.log('Late alert cron started');
}
