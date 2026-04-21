import argon2 from 'argon2'
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

export async function registerUser(data: {
  name: string
  email: string
  password: string
  role?: 'EMPLOYEE' | 'MANAGER' | 'ADMIN'
  companyId?: string
  joinCode?: string
  shiftStartTime?: string
  shiftEndTime?: string
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new Error('Email already registered')

  let companyId = data.companyId

  if (data.joinCode) {
    const company = await prisma.company.findUnique({ where: { joinCode: data.joinCode } })
    if (!company) throw new Error('Invalid company join code')
    companyId = company.id
  }

  const passwordHash = await argon2.hash(data.password)
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role ?? 'EMPLOYEE',
      companyId,
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

  return { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId }
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true },
  })
  if (!user || !user.isActive) throw new Error('Invalid credentials')

  const valid = await argon2.verify(user.passwordHash, password)
  if (!valid) throw new Error('Invalid credentials')

  const token = signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
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
    },
  }
}
