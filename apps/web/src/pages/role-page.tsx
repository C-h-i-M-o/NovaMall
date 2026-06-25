import { Link } from "react-router-dom";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type {
  AdminMerchantApplication,
  Category,
  CategoryInput,
  CategoryStatus,
  MerchantApplication,
  MerchantApplicationStatus,
  Product,
  ProductStatus,
  ShopSummary
} from "@novamall/shared";

import { BrandMark } from "../ui/brand-mark.js";
import { Button } from "../ui/button.js";
import { StatusMessage } from "../ui/status-message.js";
import { RoleNav } from "../app/app.js";
import {
  ApiClientError,
  approveMerchantApplication,
  archiveProduct,
  createCategory,
  createProduct,
  disableCategory,
  enableCategory,
  fetchCsrf,
  getAdminCategories,
  getMyMerchantApplication,
  getOwnerProducts,
  getOwnerShop,
  getPublicCategories,
  listMerchantApplications,
  publishProduct,
  rejectMerchantApplication,
  submitMerchantApplication,
  unpublishProduct,
  updateCategory,
  updateStock
} from "../api/client.js";

type RoleCode = "MEMBER" | "OWNER" | "ADMIN";

const roleCopy: Record<RoleCode, { title: string; body: string }> = {
  MEMBER: { title: "会员首页壳已就绪", body: "商品浏览、购物车和订单将在后续阶段接入。当前页面用于验证会员登录与权限边界。" },
  OWNER: { title: "店主后台壳已就绪", body: "店铺、商品、库存和履约功能将在 Stage 2 后开放。当前页面用于验证 OWNER 权限。" },
  ADMIN: { title: "管理员后台壳已就绪", body: "分类、审核、账号和审计管理将在后续阶段开放。当前页面用于验证 ADMIN 权限。" }
};

interface RolePageProps {
  role: RoleCode;
}

export function RolePage({ role }: RolePageProps) {
  return (
    <main className="app-frame">
      <aside className="side-nav">
        <BrandMark />
        <RoleNav role={role} />
      </aside>
      <section className="workspace" aria-labelledby="role-title">
        <div className="empty-state">
          <p>{role}</p>
          <h1 id="role-title">{roleCopy[role].title}</h1>
          <p>{roleCopy[role].body}</p>
        </div>
        <RoleStageTwoPanel role={role} />
      </section>
    </main>
  );
}

function RoleStageTwoPanel({ role }: RolePageProps) {
  if (role === "MEMBER") {
    return <MemberMerchantApplicationPanel />;
  }
  if (role === "ADMIN") {
    return (
      <>
        <AdminMerchantApplicationsPanel />
        <AdminCategoriesPanel />
      </>
    );
  }
  return (
    <>
      <OwnerShopPanel />
      <OwnerProductsPanel />
    </>
  );
}

function MemberMerchantApplicationPanel() {
  const [csrfToken, setCsrfToken] = useState("");
  const [application, setApplication] = useState<MerchantApplication | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("正在读取开店申请…");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([fetchCsrf(), getMyMerchantApplication()])
      .then(([token, nextApplication]) => {
        if (alive) {
          setCsrfToken(token);
          setApplication(nextApplication);
          setMessage(nextApplication === null ? "你还没有提交开店申请。" : "申请状态已同步。");
        }
      })
      .catch((error) => {
        if (alive) {
          setMessage(errorMessage(error, "暂时无法读取开店申请。"));
          setApplication(null);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const shopName = formValue(formData, "shopName").trim();
    const shopDescription = formValue(formData, "shopDescription").trim();
    if (shopName.length < 2 || shopDescription.length < 10) {
      setFieldError("店铺名称至少 2 个字，店铺简介至少 10 个字。");
      return;
    }
    setLoading(true);
    setFieldError(null);
    try {
      const nextApplication = await submitMerchantApplication({
        shopName,
        shopDescription
      }, csrfToken);
      setApplication(nextApplication);
      setMessage("开店申请已提交，等待管理员审核。");
    } catch (error) {
      setMessage(errorMessage(error, "提交失败，请检查店铺名称和简介后再试。"));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = application === null || application?.status === "REJECTED";
  const buttonText = application?.status === "REJECTED" ? "重新提交申请" : "提交开店申请";

  return (
    <section className="stage-panel" aria-labelledby="merchant-application-title">
      <div className="section-heading">
        <h2 id="merchant-application-title">开店申请</h2>
        {application !== undefined && application !== null ? <StatusBadge status={application.status} /> : null}
      </div>
      {application === undefined ? <StatusMessage>{message}</StatusMessage> : null}
      {application !== null && application !== undefined ? (
        <div className="record-summary">
          <strong>{application.shopName}</strong>
          <p>{application.shopDescription}</p>
          {application.rejectReason !== null ? <StatusMessage>{application.rejectReason}</StatusMessage> : null}
          {application.status === "APPROVED" ? <Link to="/owner">进入店主后台</Link> : null}
        </div>
      ) : null}
      {canSubmit ? (
        <form className="form-stack stage-form" noValidate onSubmit={(event) => { void handleSubmit(event); }}>
          <label className="field">
            <span>店铺名称</span>
            <input aria-label="店铺名称" name="shopName" defaultValue={application?.shopName ?? ""} minLength={2} maxLength={100} required />
            <small>2-100 个字，审核通过后将作为店铺名称。</small>
          </label>
          <label className="field">
            <span>店铺简介</span>
            <textarea aria-label="店铺简介" name="shopDescription" defaultValue={application?.shopDescription ?? ""} rows={4} minLength={10} maxLength={500} required />
            <small>10-500 个字，说明主营品类和服务范围。</small>
          </label>
          {fieldError !== null ? <p className="field-error">{fieldError}</p> : null}
          <Button type="submit" loading={loading} disabled={csrfToken.length === 0}>{buttonText}</Button>
        </form>
      ) : null}
      <StatusMessage>{message}</StatusMessage>
    </section>
  );
}

function AdminMerchantApplicationsPanel() {
  const [csrfToken, setCsrfToken] = useState("");
  const [applications, setApplications] = useState<AdminMerchantApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<MerchantApplicationStatus | "ALL">("ALL");
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("正在读取申请列表…");

  async function refresh(nextStatusFilter = statusFilter): Promise<void> {
    const result = await listMerchantApplications(nextStatusFilter === "ALL" ? undefined : nextStatusFilter);
    setApplications(result.data);
    setMessage(result.meta.total === 0 ? "暂无开店申请。" : `共 ${result.meta.total} 条开店申请。`);
  }

  useEffect(() => {
    let alive = true;
    void fetchCsrf()
      .then((token) => {
        if (alive) {
          setCsrfToken(token);
        }
      })
      .catch((error) => {
        if (alive) {
          setMessage(errorMessage(error, "暂时无法获取安全令牌。"));
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void listMerchantApplications(statusFilter === "ALL" ? undefined : statusFilter)
      .then((result) => {
        if (alive) {
          setApplications(result.data);
          setMessage(result.meta.total === 0 ? "暂无开店申请。" : `共 ${result.meta.total} 条开店申请。`);
        }
      })
      .catch((error) => {
        if (alive) {
          setMessage(errorMessage(error, "暂时无法读取申请列表。"));
        }
      });
    return () => {
      alive = false;
    };
  }, [statusFilter]);

  function updateStatusFilter(event: ChangeEvent<HTMLSelectElement>): void {
    const nextStatus = parseStatusFilter(event.target.value);
    setMessage("正在读取申请列表…");
    setStatusFilter(nextStatus);
  }

  function updateRejectReason(id: string, value: string): void {
    setRejectReasons((current) => ({
      ...current,
      [id]: value
    }));
  }

  async function approve(id: string): Promise<void> {
    setLoadingId(id);
    try {
      await approveMerchantApplication(id, csrfToken);
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error, "批准申请失败。"));
    } finally {
      setLoadingId(null);
    }
  }

  async function reject(id: string): Promise<void> {
    const reason = (rejectReasons[id] ?? "").trim();
    if (reason.length < 2) {
      setMessage("拒绝原因至少 2 个字。");
      return;
    }
    setLoadingId(id);
    try {
      await rejectMerchantApplication(id, { reason }, csrfToken);
      setRejectReasons((current) => {
        const nextReasons = { ...current };
        delete nextReasons[id];
        return nextReasons;
      });
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error, "拒绝申请失败。"));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="stage-panel" aria-labelledby="admin-applications-title">
      <div className="section-heading">
        <h2 id="admin-applications-title">开店审核</h2>
      </div>
      <label className="field filter-control">
        <span>审核状态</span>
        <select aria-label="审核状态" value={statusFilter} onChange={updateStatusFilter}>
          <option value="ALL">全部申请</option>
          <option value="PENDING">待审核</option>
          <option value="APPROVED">已通过</option>
          <option value="REJECTED">已拒绝</option>
        </select>
      </label>
      <div className="application-list">
        {applications.map((application) => (
          <article className="application-row" key={application.id}>
            <div>
              <strong>{application.shopName}</strong>
              <p>{application.shopDescription}</p>
              <span>{application.user.displayName}</span>
            </div>
            <StatusBadge status={application.status} />
            {application.status === "PENDING" ? (
              <div className="review-actions">
                <label className="field reject-reason-field">
                  <span>拒绝原因</span>
                  <input
                    aria-label={`拒绝原因：${application.shopName}`}
                    value={rejectReasons[application.id] ?? ""}
                    onChange={(event) => { updateRejectReason(application.id, event.target.value); }}
                    minLength={2}
                    maxLength={500}
                    placeholder="说明需要会员修改的内容"
                  />
                </label>
                <div className="row-actions">
                  <Button
                    loading={loadingId === application.id}
                    onClick={() => { void approve(application.id); }}
                  >
                    批准
                  </Button>
                  <Button
                    variant="secondary"
                    loading={loadingId === application.id}
                    onClick={() => { void reject(application.id); }}
                  >
                    拒绝
                  </Button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <StatusMessage>{message}</StatusMessage>
    </section>
  );
}

function parseStatusFilter(value: string): MerchantApplicationStatus | "ALL" {
  if (value === "PENDING" || value === "APPROVED" || value === "REJECTED") {
    return value;
  }
  return "ALL";
}

function OwnerShopPanel() {
  const [shop, setShop] = useState<ShopSummary | null>(null);
  const [message, setMessage] = useState("正在读取店铺资料…");

  useEffect(() => {
    let alive = true;
    void getOwnerShop()
      .then((nextShop) => {
        if (alive) {
          setShop(nextShop);
          setMessage("店铺资料已同步。");
        }
      })
      .catch((error) => {
        if (alive) {
          setMessage(errorMessage(error, "暂时无法读取店铺资料。"));
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="stage-panel" aria-labelledby="owner-shop-title">
      <div className="section-heading">
        <h2 id="owner-shop-title">店铺资料</h2>
        {shop !== null ? <StatusBadge status={shop.status} /> : null}
      </div>
      {shop !== null ? (
        <div className="record-summary">
          <strong>{shop.name}</strong>
          <p>{shop.description}</p>
          <span>商品功能将在下一阶段开放。</span>
        </div>
      ) : null}
      <StatusMessage>{message}</StatusMessage>
    </section>
  );
}

function AdminCategoriesPanel() {
  const [csrfToken, setCsrfToken] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("正在读取分类列表…");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryInput>({ name: "" });

  async function refresh(): Promise<void> {
    try {
      const result = await getAdminCategories();
      setCategories(result.data);
      setTotal(result.meta.total);
      setMessage(result.meta.total === 0 ? "暂无分类。" : `共 ${result.meta.total} 个分类。`);
    } catch (error) {
      setMessage(errorMessage(error, "暂时无法读取分类列表。"));
    }
  }

  useEffect(() => {
    let alive = true;
    void fetchCsrf()
      .then((token) => { if (alive) setCsrfToken(token); })
      .catch((error) => { if (alive) setMessage(errorMessage(error, "暂时无法获取安全令牌。")); });
    void getAdminCategories()
      .then((result) => {
        if (alive) {
          setCategories(result.data);
          setTotal(result.meta.total);
          setMessage(result.meta.total === 0 ? "暂无分类。" : `共 ${result.meta.total} 个分类。`);
        }
      })
      .catch((error) => { if (alive) setMessage(errorMessage(error, "暂时无法读取分类列表。")); });
    return () => { alive = false; };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formValue(formData, "name").trim();
    const description = formValue(formData, "description").trim();
    const sortOrderStr = formValue(formData, "sortOrder").trim();
    if (name.length < 2) { setMessage("分类名称至少 2 个字。"); return; }
    setLoading(true);
    try {
      await createCategory({
        name,
        description: description.length > 0 ? description : undefined,
        sortOrder: sortOrderStr.length > 0 ? parseInt(sortOrderStr, 10) : undefined
      }, csrfToken);
      (event.target as HTMLFormElement).reset();
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error, "创建分类失败。"));
    } finally {
      setLoading(false);
    }
  }

  function startEdit(category: Category): void {
    setEditingId(category.id);
    setEditForm({ name: category.name, description: category.description ?? "", sortOrder: category.sortOrder });
  }

  function cancelEdit(): void {
    setEditingId(null);
    setEditForm({ name: "" });
  }

  async function saveEdit(): Promise<void> {
    if (editingId === null) return;
    const name = (editForm.name ?? "").trim();
    if (name.length < 2) { setMessage("分类名称至少 2 个字。"); return; }
    setLoading(true);
    try {
      await updateCategory(editingId, {
        name,
        description: (editForm.description ?? "").trim() || undefined,
        sortOrder: editForm.sortOrder
      }, csrfToken);
      cancelEdit();
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error, "编辑分类失败。"));
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(category: Category): Promise<void> {
    setLoading(true);
    try {
      if (category.status === "ACTIVE") {
        await disableCategory(category.id, csrfToken);
      } else {
        await enableCategory(category.id, csrfToken);
      }
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error, "操作失败。"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="stage-panel" aria-labelledby="admin-categories-title">
      <div className="section-heading">
        <h2 id="admin-categories-title">分类管理</h2>
        <span>共 {total} 个</span>
      </div>
      <form className="form-stack stage-form" noValidate onSubmit={(event) => { void handleCreate(event); }}>
        <label className="field">
          <span>分类名称</span>
          <input aria-label="分类名称" name="name" minLength={2} maxLength={100} required />
        </label>
        <label className="field">
          <span>分类描述（可选）</span>
          <input aria-label="分类描述" name="description" maxLength={500} />
        </label>
        <label className="field">
          <span>排序序号</span>
          <input aria-label="排序序号" name="sortOrder" type="number" min={0} defaultValue={0} />
        </label>
        <Button type="submit" loading={loading} disabled={csrfToken.length === 0}>新增分类</Button>
      </form>
      <div className="application-list">
        {categories.map((category) => (
          <article className="application-row" key={category.id}>
            {editingId === category.id ? (
              <div className="form-stack stage-form">
                <label className="field">
                  <span>名称</span>
                  <input value={editForm.name ?? ""} onChange={(event) => { setEditForm((prev) => ({ ...prev, name: event.target.value })); }} />
                </label>
                <label className="field">
                  <span>描述</span>
                  <input value={editForm.description ?? ""} onChange={(event) => { setEditForm((prev) => ({ ...prev, description: event.target.value })); }} />
                </label>
                <label className="field">
                  <span>排序</span>
                  <input type="number" value={editForm.sortOrder ?? 0} onChange={(event) => { setEditForm((prev) => ({ ...prev, sortOrder: parseInt(event.target.value, 10) || 0 })); }} />
                </label>
                <div className="row-actions">
                  <Button loading={loading} onClick={() => { void saveEdit(); }}>保存</Button>
                  <Button variant="secondary" onClick={cancelEdit}>取消</Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <strong>{category.name}</strong>
                  {category.description ? <p>{category.description}</p> : null}
                  <span>排序：{category.sortOrder}</span>
                </div>
                <CategoryStatusBadge status={category.status} />
                <div className="row-actions">
                  <Button variant="secondary" onClick={() => { startEdit(category); }}>编辑</Button>
                  <Button variant="secondary" loading={loading} onClick={() => { void toggleStatus(category); }}>
                    {category.status === "ACTIVE" ? "停用" : "启用"}
                  </Button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      <StatusMessage>{message}</StatusMessage>
    </section>
  );
}

function OwnerProductsPanel() {
  const [csrfToken, setCsrfToken] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("正在读取商品列表…");
  const [showForm, setShowForm] = useState(false);

  async function refresh(nextFilter = statusFilter): Promise<void> {
    try {
      const result = await getOwnerProducts(nextFilter === "ALL" ? undefined : nextFilter);
      setProducts(result.data);
      setTotal(result.meta.total);
      setMessage(result.meta.total === 0 ? "暂无商品。" : `共 ${result.meta.total} 个商品。`);
    } catch (error) {
      setMessage(errorMessage(error, "暂时无法读取商品列表。"));
    }
  }

  useEffect(() => {
    let alive = true;
    void fetchCsrf()
      .then((token) => { if (alive) setCsrfToken(token); })
      .catch((error) => { if (alive) setMessage(errorMessage(error, "暂时无法获取安全令牌。")); });
    void getPublicCategories()
      .then((cats) => { if (alive) setCategories(cats); })
      .catch(() => {});
    void getOwnerProducts()
      .then((result) => {
        if (alive) {
          setProducts(result.data);
          setTotal(result.meta.total);
          setMessage(result.meta.total === 0 ? "暂无商品。" : `共 ${result.meta.total} 个商品。`);
        }
      })
      .catch((error) => { if (alive) setMessage(errorMessage(error, "暂时无法读取商品列表。")); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    void getOwnerProducts(statusFilter === "ALL" ? undefined : statusFilter)
      .then((result) => {
        if (alive) {
          setProducts(result.data);
          setTotal(result.meta.total);
          setMessage(result.meta.total === 0 ? "暂无商品。" : `共 ${result.meta.total} 个商品。`);
        }
      })
      .catch((error) => { if (alive) setMessage(errorMessage(error, "暂时无法读取商品列表。")); });
    return () => { alive = false; };
  }, [statusFilter]);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formValue(formData, "name").trim();
    const price = formValue(formData, "price").trim();
    const stock = formValue(formData, "stock").trim();
    const description = formValue(formData, "description").trim();
    const categoryId = formValue(formData, "categoryId").trim();

    if (name.length < 2 || price.length === 0 || stock.length === 0 || description.length === 0 || categoryId.length === 0) {
      setMessage("请填写所有必填字段。");
      return;
    }

    setLoading(true);
    try {
      await createProduct({
        name,
        price,
        stock: parseInt(stock, 10),
        description,
        categoryId,
        imagePath: ""
      }, csrfToken);
      (event.target as HTMLFormElement).reset();
      setShowForm(false);
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error, "创建商品失败。"));
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusAction(productId: string, action: "publish" | "unpublish" | "archive"): Promise<void> {
    setLoading(true);
    try {
      if (action === "publish") await publishProduct(productId, csrfToken);
      else if (action === "unpublish") await unpublishProduct(productId, csrfToken);
      else await archiveProduct(productId, csrfToken);
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error, "操作失败。"));
    } finally {
      setLoading(false);
    }
  }

  async function handleStockChange(productId: string, newStock: number): Promise<void> {
    setLoading(true);
    try {
      await updateStock(productId, newStock, csrfToken);
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error, "库存更新失败。"));
    } finally {
      setLoading(false);
    }
  }

  function statusFilterLabel(s: ProductStatus | "ALL"): string {
    if (s === "ALL") return "全部";
    if (s === "DRAFT") return "草稿";
    if (s === "ON_SALE") return "上架";
    if (s === "OFF_SALE") return "下架";
    return "归档";
  }

  return (
    <section className="stage-panel" aria-labelledby="owner-products-title">
      <div className="section-heading">
        <h2 id="owner-products-title">商品管理</h2>
        <span>共 {total} 个</span>
        <Button variant="secondary" onClick={() => { setShowForm((prev) => !prev); }}>
          {showForm ? "取消新增" : "新增商品"}
        </Button>
      </div>

      {showForm ? (
        <form className="form-stack stage-form" noValidate onSubmit={(event) => { void handleCreate(event); }}>
          <label className="field">
            <span>分类</span>
            <select aria-label="分类" name="categoryId" required>
              <option value="">请选择分类</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>商品名称</span>
            <input aria-label="商品名称" name="name" minLength={2} maxLength={200} required />
          </label>
          <label className="field">
            <span>价格</span>
            <input aria-label="价格" name="price" placeholder="例如：29.90" required />
          </label>
          <label className="field">
            <span>库存</span>
            <input aria-label="库存" name="stock" type="number" min={0} defaultValue={0} required />
          </label>
          <label className="field">
            <span>描述</span>
            <textarea aria-label="商品描述" name="description" rows={3} minLength={1} maxLength={5000} required />
          </label>
          <Button type="submit" loading={loading} disabled={csrfToken.length === 0}>创建商品（草稿）</Button>
        </form>
      ) : null}

      <label className="field filter-control">
        <span>商品状态</span>
        <select aria-label="商品状态" value={statusFilter} onChange={(event) => { setStatusFilter(parseProductStatusFilter(event.target.value)); }}>
          {(["ALL", "DRAFT", "ON_SALE", "OFF_SALE", "ARCHIVED"] as const).map((s) => (
            <option key={s} value={s}>{statusFilterLabel(s)}</option>
          ))}
        </select>
      </label>

      <div className="application-list">
        {products.map((product) => (
          <article className="application-row" key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <span>¥{product.price}</span>
              <p>库存：{product.stock}</p>
              <p>分类：{product.categoryName}</p>
              <span>{product.shopName}</span>
            </div>
            <ProductStatusBadge status={product.status} />
            <div className="row-actions">
              {product.status === "DRAFT" || product.status === "OFF_SALE" ? (
                <Button loading={loading} onClick={() => { void handleStatusAction(product.id, "publish"); }}>上架</Button>
              ) : null}
              {product.status === "ON_SALE" ? (
                <Button variant="secondary" loading={loading} onClick={() => { void handleStatusAction(product.id, "unpublish"); }}>下架</Button>
              ) : null}
              {product.status !== "ARCHIVED" ? (
                <Button variant="secondary" loading={loading} onClick={() => { void handleStatusAction(product.id, "archive"); }}>归档</Button>
              ) : null}
              <Button variant="secondary" onClick={() => {
                const stockStr = window.prompt("新库存值：", String(product.stock));
                if (stockStr !== null) {
                  const newStock = parseInt(stockStr, 10);
                  if (!isNaN(newStock) && newStock >= 0) {
                    void handleStockChange(product.id, newStock);
                  }
                }
              }}>调库存</Button>
            </div>
          </article>
        ))}
      </div>
      <StatusMessage>{message}</StatusMessage>
    </section>
  );
}

function CategoryStatusBadge({ status }: { status: CategoryStatus }) {
  return <span className="status-badge">{status === "ACTIVE" ? "启用" : "停用"}</span>;
}

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <span className="status-badge">{productStatusLabel(status)}</span>;
}

function productStatusLabel(status: ProductStatus): string {
  if (status === "DRAFT") return "草稿";
  if (status === "ON_SALE") return "上架";
  if (status === "OFF_SALE") return "下架";
  return "归档";
}

function parseProductStatusFilter(value: string): ProductStatus | "ALL" {
  if (value === "DRAFT" || value === "ON_SALE" || value === "OFF_SALE" || value === "ARCHIVED") {
    return value;
  }
  return "ALL";
}

function StatusBadge({ status }: { status: MerchantApplication["status"] | ShopSummary["status"] }) {
  return <span className="status-badge">{statusLabel(status)}</span>;
}

function statusLabel(status: MerchantApplication["status"] | ShopSummary["status"]): string {
  if (status === "PENDING") {
    return "等待管理员审核";
  }
  if (status === "APPROVED") {
    return "已通过";
  }
  if (status === "REJECTED") {
    return "已拒绝";
  }
  if (status === "ACTIVE") {
    return "营业中";
  }
  return "已暂停";
}

function errorMessage(error: unknown, fallback: string): string {
  if (isApiClientErrorLike(error)) {
    if (error.code === "DUPLICATE_APPLICATION" || error.code === "APPLICATION_STATE_CONFLICT") {
      return "当前申请状态已经变化，请刷新后再试。";
    }
    if (error.code === "SHOP_NAME_TAKEN") {
      return "这个店铺名称已被使用，请换一个名称。";
    }
    if (error.code === "VALIDATION_ERROR") {
      return fallback;
    }
    return "操作没有成功，请稍后再试。";
  }
  return fallback;
}

function isApiClientErrorLike(error: unknown): error is Pick<ApiClientError, "code"> {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && typeof error.code === "string";
}

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
