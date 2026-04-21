import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET!

export function signToken(payload: object, expiresIn = '8h') {
  return jwt.sign(payload, SECRET, { expiresIn } as jwt.SignOptions)
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as jwt.JwtPayload
}
