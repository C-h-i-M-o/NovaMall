import { describe, expect, it } from "vitest";

import {
  authSessionDataSchema,
  loginInputSchema,
  privateProfileSchema,
  registerInputSchema,
  roleCodeSchema,
  successResponseSchema,
  updatePrivateProfileInputSchema
} from "../src/auth.contract.js";
import { apiErrorCodeSchema } from "../src/errors.js";

describe("认证输入合同", () => {
  it("接受符合约束的注册输入", () => {
    expect(registerInputSchema.safeParse({
      username: "nova_user",
      password: "StrongPass123!",
      phone: "13800138000"
    }).success).toBe(true);
  });

  it("注册输入不再接收展示名", () => {
    expect(registerInputSchema.safeParse({
      username: "nova_user",
      password: "StrongPass123!",
      displayName: "星选用户",
      phone: "13800138000"
    }).success).toBe(false);
  });

  it("拒绝过短用户名、弱密码和非法手机号", () => {
    expect(registerInputSchema.safeParse({
      username: "x",
      password: "short",
      phone: "123"
    }).success).toBe(false);
  });

  it("注册密码至少 8 位且包含大小写英文和数字", () => {
    expect(registerInputSchema.safeParse({
      username: "nova_user",
      password: "Pass1234",
      phone: "13800138000"
    }).success).toBe(true);
    expect(registerInputSchema.safeParse({
      username: "nova_user",
      password: "pass1234",
      phone: "13800138000"
    }).success).toBe(false);
    expect(registerInputSchema.safeParse({
      username: "nova_user",
      password: "PASSWORD123",
      phone: "13800138000"
    }).success).toBe(false);
    expect(registerInputSchema.safeParse({
      username: "nova_user",
      password: "Password",
      phone: "13800138000"
    }).success).toBe(false);
  });

  it("仅接受非空登录凭据", () => {
    expect(loginInputSchema.safeParse({
      username: "nova_user",
      password: "StrongPass123!"
    }).success).toBe(true);
    expect(loginInputSchema.safeParse({ username: "", password: "" }).success).toBe(false);
  });
});

describe("认证输出合同", () => {
  it("角色代码只允许三种固定值", () => {
    expect(roleCodeSchema.options).toEqual(["MEMBER", "OWNER", "ADMIN"]);
    expect(roleCodeSchema.safeParse("VISITOR").success).toBe(false);
  });

  it("ID 使用字符串且成功响应具有统一外层结构", () => {
    const responseSchema = successResponseSchema(authSessionDataSchema);
    const result = responseSchema.safeParse({
      success: true,
      data: {
        user: {
          id: "9007199254740993",
          username: "nova_user",
          displayName: "星选用户",
          roles: ["MEMBER"]
        },
        csrfToken: "csrf-token"
      }
    });

    expect(result.success).toBe(true);
    expect(responseSchema.safeParse({
      success: true,
      data: {
        user: {
          id: 42,
          username: "nova_user",
          displayName: "星选用户",
          roles: ["MEMBER"]
        },
        csrfToken: "csrf-token"
      }
    }).success).toBe(false);
  });

  it("个人资料包含展示名、手机号和角色", () => {
    expect(privateProfileSchema.safeParse({
      id: "1",
      username: "nova_user",
      displayName: "星选用户",
      phone: "13800138000",
      roles: ["MEMBER"]
    }).success).toBe(true);
  });

  it("个人资料允许旧密钥无法解密时返回空手机号", () => {
    expect(privateProfileSchema.safeParse({
      id: "1",
      username: "legacy_user",
      displayName: "旧资料用户",
      phone: "",
      roles: ["MEMBER"]
    }).success).toBe(true);
  });
});

describe("个人资料输入合同", () => {
  it("允许修改展示名、手机号和密码", () => {
    expect(updatePrivateProfileInputSchema.safeParse({
      displayName: "星选会员",
      phone: "13900139000",
      currentPassword: "StrongPass123!",
      newPassword: "NextPass123"
    }).success).toBe(true);
  });

  it("拒绝空修改、非法手机号和弱新密码", () => {
    expect(updatePrivateProfileInputSchema.safeParse({}).success).toBe(false);
    expect(updatePrivateProfileInputSchema.safeParse({ phone: "123" }).success).toBe(false);
    expect(updatePrivateProfileInputSchema.safeParse({
      currentPassword: "StrongPass123!",
      newPassword: "weakpass"
    }).success).toBe(false);
  });
});

describe("稳定错误码", () => {
  it.each([
    "VALIDATION_ERROR",
    "CSRF_INVALID",
    "INVALID_CREDENTIALS",
    "AUTH_REQUIRED",
    "ACCOUNT_DISABLED",
    "FORBIDDEN",
    "USERNAME_TAKEN",
    "SERVICE_NOT_READY",
    "INTERNAL_ERROR"
  ] as const)("包含阶段 1 错误码 %s", (code) => {
    expect(apiErrorCodeSchema.safeParse(code).success).toBe(true);
  });

  it("拒绝未知错误码", () => {
    expect(apiErrorCodeSchema.safeParse("UNKNOWN_ERROR").success).toBe(false);
  });
});
