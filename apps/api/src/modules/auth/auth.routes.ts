import type { FastifyInstance } from 'fastify'
import { registerUser, loginUser, createCompany } from './auth.service.js'
import { authenticate, requireManager } from '../../utils/auth-middleware.js'
import { prisma } from '../../utils/prisma.js'

export async function authRoutes(app: FastifyInstance) {
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
        shiftStartTime: true, shiftEndTime: true,
        department: { select: { id: true, name: true } },
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

  // Manager: add employee or manager within their own company
  app.post('/manager/add-user', { preHandler: requireManager }, async (req: any, reply: any) => {
    const managerCompanyId = (req as any).user.companyId
    if (!managerCompanyId) return reply.code(400).send({ error: 'You must set up your company first' })
    const body = req.body as any
    try {
      const user = await registerUser({ ...body, companyId: managerCompanyId })
      return reply.code(201).send({ user })
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })

  // Create a company and link the manager to it
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

  // Get company info + join code
  app.get('/company', { preHandler: requireManager }, async (req, reply) => {
    const userId = (req as any).user.sub
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    })
    return reply.send({ company: user?.company })
  })
}
