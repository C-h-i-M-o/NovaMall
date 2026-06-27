import {
  loginInputSchema,
  registerInputSchema,
  updatePrivateProfileInputSchema,
  type AuthSessionData,
  type AuthUser,
  type PrivateProfile
} from "@novamall/shared";

import { AppError } from "../../errors/app-error.js";
import { AuthRepository } from "./auth.repository.js";
import { hashPassword, verifyPassword } from "./password.js";

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async register(input: unknown): Promise<AuthUser> {
    const parsed = registerInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "注册参数不合法");
    }
    return this.repository.createMember({
      username: parsed.data.username,
      passwordHash: await hashPassword(parsed.data.password),
      displayName: createDefaultDisplayName(),
      phone: parsed.data.phone
    });
  }

  async login(input: unknown): Promise<AuthUser> {
    const parsed = loginInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "登录参数不合法");
    }
    const credential = await this.repository.findCredentialByUsername(parsed.data.username);
    if (credential === null || !await verifyPassword(parsed.data.password, credential.passwordHash)) {
      throw new AppError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
    }
    if (credential.status === "DISABLED") {
      throw new AppError(401, "ACCOUNT_DISABLED", "账号已被禁用");
    }
    return {
      id: credential.id,
      username: credential.username,
      displayName: credential.displayName,
      roles: credential.roles
    };
  }

  async getPrivateProfile(userId: string): Promise<PrivateProfile> {
    const profile = await this.repository.findPrivateProfileById(userId);
    if (profile === null) {
      throw new AppError(404, "AUTH_REQUIRED", "请先登录");
    }
    return profile;
  }

  async updatePrivateProfile(user: AuthUser, input: unknown): Promise<PrivateProfile> {
    const parsed = updatePrivateProfileInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "个人资料参数不合法");
    }
    let passwordHash: string | undefined;
    if (parsed.data.newPassword !== undefined) {
      const credential = await this.repository.findCredentialByUsername(user.username);
      if (credential === null || parsed.data.currentPassword === undefined || !await verifyPassword(parsed.data.currentPassword, credential.passwordHash)) {
        throw new AppError(401, "INVALID_CREDENTIALS", "当前密码错误");
      }
      passwordHash = await hashPassword(parsed.data.newPassword);
    }
    const updateInput: { displayName?: string; phone?: string; passwordHash?: string } = {};
    if (parsed.data.displayName !== undefined) {
      updateInput.displayName = parsed.data.displayName;
    }
    if (parsed.data.phone !== undefined) {
      updateInput.phone = parsed.data.phone;
    }
    if (passwordHash !== undefined) {
      updateInput.passwordHash = passwordHash;
    }
    const profile = await this.repository.updatePrivateProfile(user.id, updateInput);
    if (profile === null) {
      throw new AppError(404, "AUTH_REQUIRED", "请先登录");
    }
    return profile;
  }

  sessionData(user: AuthUser, csrfToken: string): AuthSessionData {
    return { user, csrfToken };
  }
}

function createDefaultDisplayName(): string {
  return `新会员${Math.floor(100000 + Math.random() * 900000)}`;
}
