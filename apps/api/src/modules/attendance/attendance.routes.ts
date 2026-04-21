import type { FastifyInstance } from 'fastify'
import { authenticate, requireManager } from '../../utils/auth-middleware.js'
import { clockIn, clockOut, getTodayStatus, getAttendanceHistory } from './attendance.service.js'
import { prisma } from '../../utils/prisma.js'

export async function attendanceRoutes(app: FastifyInstance) {
  app.post('/clock-in', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    try {
      const result = await clockIn(userId)
      return reply.send(result)
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })

  app.post('/clock-out', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    try {
      const result = await clockOut(userId)
      return reply.send(result)
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })

  app.get('/today', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    const attendance = await getTodayStatus(userId)
    return reply.send({ attendance })
  })

  app.get('/history', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    const { days } = req.query as any
    const history = await getAttendanceHistory(userId, Number(days) || 30)
    return reply.send({ history })
  })

  // Manager: all attendance for today
  app.get('/manager/today', { preHandler: requireManager }, async (req, reply) => {
    const today = new Date(new Date().toDateString())
    const records = await prisma.attendance.findMany({
      where: { date: today },
      include: { user: { select: { id: true, name: true, email: true, shiftStartTime: true } } },
      orderBy: { clockIn: 'asc' },
    })
    return reply.send({ records })
  })

  // Manager: late alerts list
  app.get('/manager/late-alerts', { preHandler: requireManager }, async (req, reply) => {
    const alerts = await prisma.lateAlert.findMany({
      where: { resolvedAt: null },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ alerts })
  })

  // Employee: respond to late alert
  app.post('/late-alert/:id/respond', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as any
    const { response } = req.body as any
    await prisma.lateAlert.update({
      where: { id },
      data: { response, resolvedAt: new Date() },
    })
    return reply.send({ ok: true })
  })
}
