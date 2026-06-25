import { categoryInputSchema, categoryUpdateSchema } from "@novamall/shared";
import { z } from "zod";

import { AppError } from "../../errors/app-error.js";
import type { CategoriesRepository } from "./categories.repository.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  async listAll() {
    return this.repository.listAll();
  }

  async listForAdmin(query: unknown) {
    const parsed = listQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "分类列表查询参数不合法");
    }
    return this.repository.listForAdmin(parsed.data);
  }

  async create(input: unknown) {
    const parsed = categoryInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "分类参数不合法");
    }
    return this.repository.create(parsed.data);
  }

  async update(id: string, input: unknown) {
    assertNumericId(id);
    const parsed = categoryUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "分类更新参数不合法");
    }
    return this.repository.update(id, parsed.data);
  }

  async disable(id: string) {
    assertNumericId(id);
    return this.repository.updateStatus(id, "DISABLED");
  }

  async enable(id: string) {
    assertNumericId(id);
    return this.repository.updateStatus(id, "ACTIVE");
  }
}

function assertNumericId(value: string): void {
  if (!/^\d+$/.test(value)) {
    throw new AppError(404, "NOT_FOUND", "分类不存在");
  }
}
