import { z } from "zod";

export const roleCodeSchema = z.enum(["MEMBER", "OWNER", "ADMIN"]);

export const registerInputSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[A-Za-z0-9_]+$/),
  password: z.string()
    .min(8)
    .max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/\d/),
  phone: z.string().regex(/^1[3-9]\d{9}$/)
}).strict();

export const loginInputSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(128)
}).strict();

export const authUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  roles: z.array(roleCodeSchema)
});

const strongPasswordSchema = z.string()
  .min(8)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/\d/);

export const privateProfileSchema = authUserSchema.extend({
  phone: z.union([z.string().regex(/^1[3-9]\d{9}$/), z.literal("")])
});

export const updatePrivateProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/).optional(),
  currentPassword: z.string().min(1).max(128).optional(),
  newPassword: strongPasswordSchema.optional()
}).strict().superRefine((value, context) => {
  const hasProfileChange = value.displayName !== undefined || value.phone !== undefined;
  const hasPasswordChange = value.currentPassword !== undefined || value.newPassword !== undefined;
  if (!hasProfileChange && !hasPasswordChange) {
    context.addIssue({ code: "custom", message: "至少修改一项资料" });
  }
  if (hasPasswordChange && (value.currentPassword === undefined || value.newPassword === undefined)) {
    context.addIssue({ code: "custom", message: "修改密码需要当前密码和新密码" });
  }
});

export const authSessionDataSchema = z.object({
  user: authUserSchema,
  csrfToken: z.string().min(1)
});

export const csrfDataSchema = z.object({
  csrfToken: z.string().min(1)
});

export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.literal(true),
  data: dataSchema
});

export type RoleCode = z.infer<typeof roleCodeSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type PrivateProfile = z.infer<typeof privateProfileSchema>;
export type UpdatePrivateProfileInput = z.infer<typeof updatePrivateProfileInputSchema>;
export type AuthSessionData = z.infer<typeof authSessionDataSchema>;
