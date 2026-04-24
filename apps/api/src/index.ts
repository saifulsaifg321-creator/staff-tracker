import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { authRoutes } from './modules/auth/auth.routes'
import { employeeRoutes } from './modules/employee/employee.routes'
import { attendanceRoutes } from './modules/attendance/attendance.routes'
import { leaveRoutes } from './modules/leave/leave.routes'
import { startLateAlertCron } from './modules/attendance/late-alert.cron'
import { startSickDocReminderCron } from './modules/leave/sick-doc-reminder.cron'

async function main() {
  const app = Fastify({ logger: true })

  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (
        origin.includes('hostingersite.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.startsWith('exp://')
      ) {
        return cb(null, true)
      }
      cb(new Error('Not allowed by CORS'), false)
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'Too many requests, please slow down' }),
  })

  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  })

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
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
