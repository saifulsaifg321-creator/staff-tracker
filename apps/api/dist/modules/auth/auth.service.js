"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompany = createCompany;
exports.createProject = createProject;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_js_1 = require("../../utils/prisma.js");
const jwt_js_1 = require("../../utils/jwt.js");
function generateJoinCode(name) {
    const slug = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${slug}${rand}`;
}
async function createCompany(name) {
    const joinCode = generateJoinCode(name);
    return prisma_js_1.prisma.company.create({ data: { name, joinCode } });
}
async function createProject(name, companyId) {
    const joinCode = generateJoinCode(name);
    return prisma_js_1.prisma.project.create({ data: { name, joinCode, companyId } });
}
async function registerUser(data) {
    const existing = await prisma_js_1.prisma.user.findUnique({ where: { email: data.email } });
    if (existing)
        throw new Error('Email already registered');
    let companyId = data.companyId;
    let projectId = data.projectId;
    if (data.projectJoinCode) {
        const project = await prisma_js_1.prisma.project.findUnique({ where: { joinCode: data.projectJoinCode } });
        if (!project)
            throw new Error('Invalid project join code');
        projectId = project.id;
        companyId = project.companyId;
    }
    const passwordHash = await bcryptjs_1.default.hash(data.password, 12);
    const user = await prisma_js_1.prisma.user.create({
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
    });
    await prisma_js_1.prisma.leaveBalance.create({
        data: {
            userId: user.id,
            year: new Date().getFullYear(),
            holidayTotal: 28,
            holidayUsed: 0,
            sickNoCertUsed: 0,
            sickNoCertLimit: 5,
        },
    });
    return { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId, projectId: user.projectId };
}
async function loginUser(email, password) {
    const user = await prisma_js_1.prisma.user.findUnique({
        where: { email },
        include: { company: true, project: true },
    });
    if (!user || !user.isActive)
        throw new Error('Invalid credentials');
    const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!valid)
        throw new Error('Invalid credentials');
    const token = (0, jwt_js_1.signToken)({
        sub: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        projectId: user.projectId,
    });
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
    };
}
