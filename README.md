# NovaMall（星选）

NovaMall 是一个面向《数据库课程设计》的多商户网上购物系统。项目以数据库设计和可验证的高级数据库技术为核心，采用 React、Express 与 MySQL 构建。

> 当前状态：设计与文档阶段。业务代码尚未开始实现。

## 项目目标

系统包含会员、店主和系统管理员三类角色，覆盖以下核心业务：

- 会员注册、登录、资料及收货地址管理；
- 会员提交开店申请，管理员审核后创建店铺；
- 店主管理本店商品、库存、订单和退款申请；
- 商品分类、名称查找、全文检索及商品详情；
- 购物车添加、修改、删除与跨店结算；
- 一次结算生成平台总订单，并按店铺拆分子订单；
- 模拟支付、发货、确认收货和待发货整单退款；
- 查询全平台累计有效销量 Top 10 商品；
- 管理员管理用户、分类、审核和审计日志。

## 技术栈

- 前端：React + TypeScript
- 后端：Express + TypeScript
- 数据库：MySQL
- 数据访问：mysql2 原生 SQL，不使用 ORM
- 参数校验：Zod
- 包管理：pnpm workspace
- 部署：Docker Compose

项目采用模块化单体结构：

```text
Route → Controller → Service → Repository → MySQL
```

## 高阶数据库技术

项目计划实现并验证 9 项技术：

1. 带输入/输出参数的存储过程；
2. 触发器；
3. 视图；
4. 索引优化与执行计划对比；
5. 事务与并发控制；
6. 窗口函数；
7. 审计日志；
8. 全文检索；
9. 手机号 AES 加密存储。

## 文档导航

- [项目需求说明](docs/requirements.md)
- [系统架构设计](docs/architecture.md)
- [数据库 ER 图与关系模式](docs/database/er-and-relational-design.md)
- [数据库范式与完整性约束](docs/database/normalization-and-integrity.md)
- [高阶数据库技术设计](docs/database/advanced-technologies.md)
- [数据库实验与证据计划](docs/database/experiment-plan.md)
- [API 设计](docs/api.md)
- [安全设计](docs/security.md)
- [前端与交互设计](docs/ui-design.md)
- [测试与验收](docs/testing-and-acceptance.md)
- [分阶段开发计划](docs/development-plan.md)
- [部署与运维](docs/deployment.md)
- [课程报告编写指南](docs/course-report-guide.md)
- [总体设计规格](docs/superpowers/specs/2026-06-22-novamall-design.md)

## 开发原则

- 文档先行：每个阶段先确认需求、接口、数据结构和验收标准，再编写代码。
- 最小闭环：每个阶段必须形成可运行、可演示、可自动验证的业务闭环。
- SQL 优先：数据库能力使用显式 SQL 实现，不以 ORM 隐藏关键逻辑。
- 范围控制：不实现 SKU、优惠券、真实支付、物流接口和完整退货流程。
- 证据驱动：性能数字、执行计划和并发结果必须来自真实实验。

## 运行说明

Docker Compose、环境变量和启动命令将在基础设施阶段实现后补充。当前仓库尚无可运行应用。

## 许可证

当前仓库未授予开源许可证，默认保留全部权利。若未来需要公开分发，应由项目所有者明确选择并添加许可证。
