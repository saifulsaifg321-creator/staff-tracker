import bcrypt from 'bcryptjs'
import { prisma } from '../../utils/prisma.js'
import { signToken } from '../../utils/jwt.js'

function generateJoinCode(name: string) {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${slug}${rand}`
}

export async function createCompany(name: string) {
  const joinCode = generateJoinCode(name)
  return prisma.company.create({ data: { name, joinCode } })
}

export async function createProject(name: string, companyId: string) {
  const joinCode = generateJoinCode(name)
  return prisma.project.create({ data: { name, joinCode, companyId } })
}

export async function registerUser(data: {
  name: string
  email: string
  password: string
  role?: 'EMPLOYEE' | 'MANAGER' | 'ADMIN'
  companyId?: string
  projectId?: string
  projectJoinCode?: string
  shiftStartTime?: string
  shiftEndTime?: string
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new Error('Email already registered')

  let companyId = data.companyId
  let projectId = data.projectId

  if (data.projectJoinCode) {
    const project = await prisma.project.findUnique({ where: { joinCode: data.projectJoinCode } })
    if (!project) throw new Error('Invalid project join code')
    projectId = project.id
    companyId = project.companyId
  }

  const passwordHash = await bcrypt.hash(data.password, 12)
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role ?? 'EMPLOYEE',
      companyId,
      projectId,
      shiftStartTime: data.shiftStartTime ?? '09:00',
      shiftEndTime: data.shiftEndTime ?? '17:00',
    },
  })

  await prisma.leaveBalance.create({
    data: {
      userId: user.id,
      year: new Date().getFullYear(),
      holidayTotal: 28,
      holidayUsed: 0,
      sickNoCertUsed: 0,
      sickNoCertLimit: 5,
    },
  })

  return { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId, projectId: user.projectId }
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true, project: true },
  })
  if (!user || !user.isActive) throw new Error('Invalid credentials')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new Error('Invalid credentials')

  const token = signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    projectId: user.projectId,
  })

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name,
      projectId: user.projectId,
      projectName: user.project?.name,
    },
  }
}
