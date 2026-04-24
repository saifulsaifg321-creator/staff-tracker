"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const auth_routes_1 = require("./modules/auth/auth.routes");
const employee_routes_1 = require("./modules/employee/employee.routes");
const attendance_routes_1 = require("./modules/attendance/attendance.routes");
const leave_routes_1 = require("./modules/leave/leave.routes");
const late_alert_cron_1 = require("./modules/attendance/late-alert.cron");
const sick_doc_reminder_cron_1 = require("./modules/leave/sick-doc-reminder.cron");
async function main() {
    const app = (0, fastify_1.default)({ logger: true });
    await app.register(helmet_1.default, {
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    });
    await app.register(cors_1.default, {
        origin: (origin, cb) => {
            if (!origin)
                return cb(null, true);
            if (origin.includes('hostingersite.com') ||
                origin.includes('localhost') ||
                origin.includes('127.0.0.1') ||
                origin.startsWith('exp://')) {
                return cb(null, true);
            }
            cb(new Error('Not allowed by CORS'), false);
        },
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    });
    await app.register(rate_limit_1.default, {
        max: 100,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({ error: 'Too many requests, please slow down' }),
    });
    await app.register(multipart_1.default, {
        limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    });
    app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));
    await app.register(auth_routes_1.authRoutes, { prefix: '/auth' });
    await app.register(employee_routes_1.employeeRoutes, { prefix: '/employees' });
    await app.register(attendance_routes_1.attendanceRoutes, { prefix: '/attendance' });
    await app.register(leave_routes_1.leaveRoutes, { prefix: '/leave' });
    (0, late_alert_cron_1.startLateAlertCron)();
    (0, sick_doc_reminder_cron_1.startSickDocReminderCron)();
    const port = Number(process.env.PORT) || 3001;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Staff Tracker API running on port ${port}`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
