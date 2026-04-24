import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { authRoutes } from './modules/auth/auth.routes.js';
import { employeeRoutes } from './modules/employee/employee.routes.js';
import { attendanceRoutes } from './modules/attendance/attendance.routes.js';
import { leaveRoutes } from './modules/leave/leave.routes.js';
import { startLateAlertCron } from './modules/attendance/late-alert.cron.js';
import { startSickDocReminderCron } from './modules/leave/sick-doc-reminder.cron.js';
const app = Fastify({ logger: true });
// Security headers (XSS, clickjacking, MIME sniffing protection)
await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
});
// CORS — only allow the mobile app and known origins
await app.register(cors, {
    origin: (origin, cb) => {
        // Allow requests with no origin (mobile apps, Expo, curl)
        if (!origin)
            return cb(null, true);
        // Allow any hostingersite.com or localhost origin
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
// Global rate limit — 100 requests per minute per IP
await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'Too many requests, please slow down' }),
});
// File uploads — max 5MB
await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));
// Stricter rate limit on login/register to block brute-force attacks
await app.register(authRoutes, { prefix: '/auth' });
await app.register(employeeRoutes, { prefix: '/employees' });
await app.register(attendanceRoutes, { prefix: '/attendance' });
await app.register(leaveRoutes, { prefix: '/leave' });
startLateAlertCron();
startSickDocReminderCron();
const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`Staff Tracker API running on port ${port}`);
