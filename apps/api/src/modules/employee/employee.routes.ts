import type { FastifyInstance } from 'fastify'
import { prisma } from '../../utils/prisma.js'
import { requireManager, authenticate } from '../../utils/auth-middleware.js'

export async function employeeRoutes(app: FastifyInstance) {
  // Manager: list all employees with leave balances
  app.get('/', { preHandler: requireManager }, async (req, reply) => {
    const companyId = (req as any).user.companyId
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true, ...(companyId ? { companyId } : {}) },
      select: {
        id: true,
        name: true,
        email: true,
        shiftStartTime: true,
        shiftEndTime: true,
        department: { select: { id: true, name: true } },
        leaveBalance: true,
        attendances: {
          where: { date: new Date(new Date().toDateString()) },
          select: { clockIn: true, clockOut: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    })
    return reply.send({ employees })
  })

  // Manager: get single employee detail
  app.get('/:id', { preHandler: requireManager }, async (req, reply) => {
    const { id } = req.params as any
    const employee = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true,
        shiftStartTime: true, shiftEndTime: true,
        department: { select: { id: true, name: true } },
        leaveBalance: true,
        attendances: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })
    if (!employee) return reply.code(404).send({ error: 'Employee not found' })
    return reply.send({ employee })
  })

  // Manager: update employee shift time or department
  app.patch('/:id', { preHandler: requireManager }, async (req, reply) => {
    const { id } = req.params as any
    const body = req.body as any
    const updated = await prisma.user.update({
      where: { id },
      data: {
        shiftStartTime: body.shiftStartTime,
        shiftEndTime: body.shiftEndTime,
        departmentId: body.departmentId,
        isActive: body.isActive,
      },
    })
    return reply.send({ id: updated.id, name: updated.name })
  })

  // Manager: reset annual leave balance
  app.post('/:id/reset-leave', { preHandler: requireManager }, async (req, reply) => {
    const { id } = req.params as any
    const body = req.body as any
    await prisma.leaveBalance.upsert({
      where: { userId: id },
      update: {
        year: new Date().getFullYear(),
        holidayTotal: body.holidayTotal ?? 28,
        holidayUsed: 0,
        sickNoCertUsed: 0,
      },
      create: {
        userId: id,
        year: new Date().getFullYear(),
        holidayTotal: body.holidayTotal ?? 28,
        holidayUsed: 0,
        sickNoCertUsed: 0,
        sickNoCertLimit: 5,
      },
    })
    return reply.send({ ok: true })
  })

  // Employee: get own profile + balances
  app.get('/me/profile', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true,
        shiftStartTime: true, shiftEndTime: true,
        department: { select: { id: true, name: true } },
        leaveBalance: true,
      },
    })
    return reply.send({ user })
  })
}
