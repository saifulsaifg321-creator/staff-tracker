import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { authRoutes } from './modules/auth/auth.routes.js'
import { employeeRoutes } from './modules/employee/employee.routes.js'
import { attendanceRoutes } from './modules/attendance/attendance.routes.js'
import { leaveRoutes } from './modules/leave/leave.routes.js'
import { startLateAlertCron } from './modules/attendance/late-alert.cron.js'
import { startSickDocReminderCron } from './modules/leave/sick-doc-reminder.cron.js'

const app = Fastify({ logger: true })

await app.register(helmet)
await app.register(cors, { origin: true })
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })

app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

await app.register(authRoutes, { prefix: '/auth' })
await app.register(employeeRoutes, { prefix: '/employees' })
await app.register(attendanceRoutes, { prefix: '/attendance' })
await app.register(leaveRoutes, { prefix: '/leave' })

startLateAlertCron()
startSickDocReminderCron()

const port = Number(process.env.PORT) || 3001
await app.listen({ port, host: '0.0.0.0' })
console.log(`Staff Tracker API running on port ${port}`)
