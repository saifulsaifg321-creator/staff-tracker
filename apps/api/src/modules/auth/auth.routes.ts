import type { FastifyInstance } from 'fastify'
import { registerUser, loginUser, createCompany, createProject } from './auth.service.js'
import { authenticate, requireManager } from '../../utils/auth-middleware.js'
import { prisma } from '../../utils/prisma.js'

export async function authRoutes(app: FastifyInstance) {
  // Public: register (first manager only — no company/project yet)
  app.post('/register', async (req, reply) => {
    const body = req.body as any
    try {
      const user = await registerUser(body)
      return reply.code(201).send({ user })
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })

  app.post('/login', async (req, reply) => {
    const { email, password } = req.body as any
    try {
      const result = await loginUser(email, password)
      return reply.send(result)
    } catch (err: any) {
      return reply.code(401).send({ error: err.message })
    }
  })

  app.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true,
        companyId: true, projectId: true,
        shiftStartTime: true, shiftEndTime: true,
        company: { select: { id: true, name: true, joinCode: true } },
        project: { select: { id: true, name: true, joinCode: true } },
        leaveBalance: true,
      },
    })
    return reply.send({ user })
  })

  app.patch('/push-token', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req as any).user.sub
    const { token } = req.body as any
    await prisma.user.update({ where: { id: userId }, data: { expoPushToken: token } })
    return reply.send({ ok: true })
  })

  // Manager: create company and link manager to it
  app.post('/company', { preHandler: requireManager }, async (req, reply) => {
    const userId = (req as any).user.sub
    const { name } = req.body as any
    try {
      const company = await createCompany(name)
      await prisma.user.update({ where: { id: userId }, data: { companyId: company.id } })
      return reply.code(201).send({ company })
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })

  // Manager: get company info
  app.get('/company', { preHandler: requireManager }, async (req, reply) => {
    const userId = (req as any).user.sub
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: { include: { projects: true } } },
    })
    return reply.send({ company: user?.company })
  })

  // Manager: create a project under their company
  app.post('/projects', { preHandler: requireManager }, async (req, reply) => {
    const userId = (req as any).user.sub
    const manager = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
    const companyId = manager?.companyId
    if (!companyId) return reply.code(400).send({ error: 'Set up your company first' })
    const { name } = req.body as any
    try {
      const project = await createProject(name, companyId)
      return reply.code(201).send({ project })
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })

  // Manager: list all projects in their company
  app.get('/projects', { preHandler: requireManager }, async (req, reply) => {
    const userId = (req as any).user.sub
    const manager = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
    const companyId = manager?.companyId
    if (!companyId) return reply.send({ projects: [] })
    const projects = await prisma.project.findMany({
      where: { companyId },
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return reply.send({ projects })
  })

  // Manager: add employee or manager to their company/project
  app.post('/manager/add-user', { preHandler: requireManager }, async (req, reply) => {
    const userId = (req as any).user.sub
    const manager = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true, projectId: true } })
    const { companyId, projectId } = manager ?? {}
    if (!companyId) return reply.code(400).send({ error: 'Set up your company first' })
    const body = req.body as any
    try {
      const user = await registerUser({ ...body, companyId, projectId: body.projectId ?? projectId })
      return reply.code(201).send({ user })
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })
}
