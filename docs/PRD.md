# OpenCode Gem Team 插件 PRD

版本：v1.0

## 1. 背景

OpenCode 用户需要一种低摩擦方式使用 Gem Team agents：安装插件后即可在 OpenCode 中调用 `gem-orchestrator` 与完整的 Gem Team 子代理集合，而不是手工复制、维护大量 agent 配置。

本项目将作为 OpenCode SDK 插件，以 GitHub 仓库作为发布与安装目标，并利用 OpenCode 对 GitHub 安装源的支持完成分发。GitHub source 语法、是否需要提交构建后的 `dist`、以及是否可以不经 npm publish 完成安装，均需在 PoC 阶段用 OpenCode 实测确认；PRD 不承诺安装过程完全不涉及 package manager。插件不要求用户修改全局 OpenCode 配置。

Gem Team 上游已经包含自己的 orchestrator、任务阶段、DAG/waves、任务 schema、失败处理、memory 与 context envelope 逻辑。本项目不重新发明编排框架；插件职责是同步并兼容转换上游 agent 定义，使其能被 OpenCode 加载，同时在子代理调用前或 agent config 注入时，根据任务复杂度与风险信号解析模型 tier。

## 2. 产品定位

OpenCode Gem Team 插件是一个面向 OpenCode 的 agent 集成插件，核心价值是：

- 内置并维护 Gem Team agent 定义。
- 安装或加载后，OpenCode 可直接使用 `gem-orchestrator` 与所有 `gem-*` agents。
- 直接同步上游 `mubaidr/gem-team/.apm/agents/*.agent.md`，保留 agent slug。
- 记录每个同步 agent 的 upstream source URL、commit 与 body/content hash。
- 只做 OpenCode 兼容转换，不擅自重写 agent 行为、职责、阶段或编排语义。
- 只暴露三档全局复杂度模型配置，由 OpenCode 原生 agent 配置与当前 selected model 共同决定最终模型。

## 3. 目标 / 非目标

### 3.1 目标

- 提供 GitHub-only 的 OpenCode 插件分发与安装路径。
- 维护可验证的 Gem Team agent 同步产物与同步元数据。
- 在 OpenCode 加载插件后注册完整的 16 个真实 Gem Team slug。
- 将 `gem-orchestrator` 作为入口 agent，但禁止其作为自身 child/subagent。
- 保留上游 orchestrator phases、DAG/waves、task schemas、failure handling、memory/context envelope 逻辑。
- 提供基于复杂度 tier 的模型解析能力：`simple`、`medium`、`complex`。
- 支持风险升档，但不新增 per-agent、role 或 provider-side 模型覆盖机制。
- 在未配置某档 complexity model 时透明 fallback 到当前 OpenCode selected model。

### 3.2 非目标

- 不以 npm registry 发布为目标；但 GitHub 安装链路是否需要构建产物或 package manager 辅助步骤，需由 PoC 验证后再写入安装文档。
- 不创建新的 orchestration framework。
- 不重写、改写或重新设计上游 agent 行为。
- 不引入插件自己的 per-agent override、`agent_complexity_models` 或 role_models。
- 不提供 provider-side router、第三方模型路由器长期方案或独立自动模型入口。
- 不要求修改全局或用户级 OpenCode 配置。
- 不在 PRD 中硬编码任何具体模型 ID、供应商模型名或示例模型值。
- 不记录、传递或要求写入 API key、token、cookie、私钥或其他秘密。

## 4. 用户故事

| 编号 | 用户故事 | 价值 |
| --- | --- | --- |
| US-01 | 作为 OpenCode 用户，我希望从 GitHub 安装插件后即可使用 Gem Team agents。 | 避免手工复制大段配置。 |
| US-02 | 作为 OpenCode 用户，我希望 `gem-orchestrator` 能作为入口 agent 调用上游 Gem Team 编排逻辑。 | 保持 Gem Team 原有工作流。 |
| US-03 | 作为 OpenCode 用户，我希望为简单、中等、复杂任务分别可选配置模型。 | 在成本、速度和推理能力之间做全局权衡。 |
| US-04 | 作为 OpenCode 用户，我希望插件在未配置某档模型时使用当前 selected model。 | 保证开箱可用与配置最小化。 |
| US-05 | 作为维护者，我希望同步产物记录 upstream URL、commit 与 body/content hash。 | 便于审计、回滚和对齐上游变更。 |
| US-06 | 作为维护者，我希望同步校验能发现 slug 缺失、额外 slug 或行为性改写。 | 降低偏离上游 Gem Team 的风险。 |

## 5. 功能需求

### 5.1 GitHub 安装

- 插件必须以 GitHub 仓库作为发布与安装来源。
- 文档与验收不得要求 npm publish 或 npm registry 包名。
- 插件应与 OpenCode 支持的 GitHub 安装方式兼容。
- PoC 必须验证 OpenCode GitHub source 语法、GitHub 安装加载流程、是否需要提交 `dist`、以及是否无需 npm publish 即可安装。
- 在完成 PoC 前，不得承诺安装过程完全不涉及 package manager。

### 5.2 Agent 同步

- 插件必须直接同步上游 `mubaidr/gem-team/.apm/agents/*.agent.md`。
- 同步必须保留每个 agent 的 slug。
- 每个同步产物或同步 manifest 必须记录：
  - upstream source URL；
  - upstream commit；
  - body/content hash，例如 source body hash 或 converted body hash；
  - 本地 slug；
  - 同步时间或同步批次标识。
- 同步过程只允许做 OpenCode 兼容转换，例如字段映射、格式包装、加载所需 metadata 注入。
- 同步过程不得擅自改写 agent 行为、职责边界、编排指令、阶段定义、任务 schema、failure handling 或 memory/context envelope 语义。

### 5.3 OpenCode agent 注册/加载

- 插件安装或加载后，OpenCode 必须可用全部 16 个真实 slug：
  - `gem-browser-tester`
  - `gem-code-simplifier`
  - `gem-critic`
  - `gem-debugger`
  - `gem-designer-mobile`
  - `gem-designer`
  - `gem-devops`
  - `gem-documentation-writer`
  - `gem-implementer-mobile`
  - `gem-implementer`
  - `gem-mobile-tester`
  - `gem-orchestrator`
  - `gem-planner`
  - `gem-researcher`
  - `gem-reviewer`
  - `gem-skill-creator`
- `gem-orchestrator` 是入口 agent，可选择其他 Gem Team agents 作为 child/subagent。
- `gem-orchestrator` 不得作为自身 child/subagent。

### 5.4 模型 tier resolve

- 插件只暴露三档全局配置：
  - `complexity_models.simple`
  - `complexity_models.medium`
  - `complexity_models.complex`
- 三档配置均为可选。
- 每次需要为 agent 调用解析模型时，插件必须按以下优先级选择最终模型：
  1. OpenCode 原生 `agent.model`；
  2. plugin `complexity_models[tier]`；
  3. 当前 OpenCode selected model。
- 插件不得提供自己的 per-agent override、`agent_complexity_models` 或 role_models。
- 模型选择以复杂度为主，风险信号可将 tier 升档。

### 5.5 透明 fallback

- 未配置 `complexity_models.simple` 时，simple tier fallback 到当前 OpenCode selected model。
- 未配置 `complexity_models.medium` 时，medium tier fallback 到当前 OpenCode selected model。
- 未配置 `complexity_models.complex` 时，complex tier fallback 到当前 OpenCode selected model。
- fallback 行为必须可预测、可记录，不得隐式选择 PRD 中未声明的具体模型。

### 5.6 同步校验

- 校验必须确认本地注册 slug 与上游同步契约一致。
- 校验必须确认 `gem-orchestrator` 不在其自身 child/subagent 列表中。
- 校验必须确认每个同步 agent 存在 upstream source URL、commit 与 body/content hash 记录。
- 校验必须确认 OpenCode 兼容转换没有移除或重写上游关键编排逻辑。
- 校验必须确认 PRD、README 与插件配置示例不包含具体模型 ID 默认值。

### 5.7 OpenCode SDK 插件技术路线与可行性

基于 opencode-kimchi 的可行性研究，本项目采用 OpenCode SDK 插件机制作为实现路线，但只借鉴 SDK 插件形态、hook 注入能力与请求参数修改能力，不继承 kimchi 的产品能力集合。

实现形态：

- 插件模块以 default export 形式导出 `PluginModule { id, server }`。
- `server` 返回 OpenCode hooks。
- `config` hook 负责在 OpenCode 加载配置时动态注入 Gem Team agents。
- 注入范围包含 `gem-orchestrator` 与 15 个非 orchestrator 的 `gem-*` agents。
- 注入默认 agent/model 信息时，必须先检测 OpenCode 已有 agent 配置；若用户已配置 OpenCode 原生 `agent.model`，插件不得覆盖。
- 子代理调用时可使用 `chat.params` 设置实际请求 model，用于在 OpenCode 原生 `agent.model` 未命中时应用 resolved complexity tier。
- `chat.params` 仅用于落实 `OpenCode agent.model > plugin complexity_models[tier] > current OpenCode selected model` 的优先级链，不得扩展为 provider-side router 或 standalone auto model。

kimchi 参考边界：

- 本项目只借鉴 OpenCode SDK 插件机制。
- 本项目不照搬 kimchi 的 provider virtual models。
- 本项目不照搬 kimchi 的 profiles。
- 本项目不照搬 kimchi 的 telemetry。
- 本项目不照搬 kimchi 的 slash commands。
- 本项目不照搬 kimchi 的 provider auto-router。
- 本项目不照搬 kimchi 的 context auto-compaction。
- 本项目不照搬 kimchi 的 model fallback chain。

## 6. Agent 清单与同步契约

| Slug | OpenCode 中的定位 | 同步契约 |
| --- | --- | --- |
| `gem-browser-tester` | 浏览器测试与交互验证 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-code-simplifier` | 代码简化与复杂度降低 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-critic` | 批判性审视与方案压力测试 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-debugger` | 故障定位与调试 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-designer-mobile` | 移动端设计 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-designer` | 通用设计 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-devops` | DevOps、CI/CD、环境与发布 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-documentation-writer` | 文档写作 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-implementer-mobile` | 移动端实现 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-implementer` | 通用实现 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-mobile-tester` | 移动端测试 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-orchestrator` | 入口编排 agent | 从上游同名 agent 同步，保留 slug 与行为；不得作为自身 child/subagent。 |
| `gem-planner` | 计划与任务拆解 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-researcher` | 研究与资料整理 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-reviewer` | 审查与验收核对 agent | 从上游同名 agent 同步，保留 slug 与行为。 |
| `gem-skill-creator` | 技能创建 agent | 从上游同名 agent 同步，保留 slug 与行为。 |

同步契约：

- 上游来源固定为 `mubaidr/gem-team/.apm/agents/*.agent.md`。
- 本地 slug 必须与上游 slug 一致。
- 每次同步必须记录 upstream source URL、commit 与 body/content hash；hash 可以是 source body hash 或 converted body hash，但必须能用于识别对应同步内容是否发生变化。
- OpenCode 兼容转换必须最小化，且不得改变上游 agent 行为。
- 如上游新增、删除或重命名 agent，必须通过同步校验暴露差异，并更新本 PRD 与插件注册清单。

## 7. 模型路由契约

### 7.1 三档配置

插件仅接受以下全局配置键：

| 配置键 | 含义 | 是否必填 |
| --- | --- | --- |
| `complexity_models.simple` | 低复杂度、低风险、短上下文任务使用的模型。 | 否 |
| `complexity_models.medium` | 中等复杂度、需要一定推理或多步骤处理任务使用的模型。 | 否 |
| `complexity_models.complex` | 高复杂度、高风险、深度推理或关键质量任务使用的模型。 | 否 |

PRD、README、示例配置和验收标准不得为这些键提供具体模型 ID 默认值。

### 7.2 优先级链

最终模型解析必须严格遵循：

```text
OpenCode agent.model > plugin complexity_models[tier] > current OpenCode selected model
```

说明：

- 若 OpenCode 原生 `agent.model` 已配置，插件不得覆盖。
- 若 `agent.model` 未配置，插件按 resolved tier 查询 `complexity_models[tier]`。
- 若对应 tier 未配置，插件使用当前 OpenCode selected model。

### 7.3 复杂度映射

插件应从上游 Gem Team 编排上下文中读取复杂度信号，并映射为三档 tier：

| 上游信号 | 目标 tier |
| --- | --- |
| orchestrator `LOW` | `simple` |
| orchestrator `MEDIUM` | `medium` |
| orchestrator `HIGH` | `complex` |
| planner `simple` | `simple` |
| planner `medium` | `medium` |
| planner `complex` | `complex` |

当多个复杂度信号同时存在时，应选择不低于最高复杂度信号的 tier。

### 7.4 风险升档

风险信号可以将基础复杂度 tier 升档，但不得降档。风险信号包括但不限于：

- `risk_score` 或 `overall_risk_level` 偏高。
- `estimated_effort`、预计文件数量或预计行数较高。
- `requires_design_validation` 为真。
- `review_depth` 要求深度审查。
- security sensitive 或 devops sensitive。
- `requires_approval` 为真。
- production、高影响或高失败代价场景。

升档约束：

- `simple` 可因风险升为 `medium` 或 `complex`。
- `medium` 可因风险升为 `complex`。
- `complex` 不再继续升档。
- 升档理由应可记录为 tier resolve metadata，但不得记录秘密或完整用户内容。

### 7.5 Reasoning-critical tier hints

以下 roles 被视为 reasoning-critical：

- `gem-planner`
- `gem-debugger`
- `gem-critic`
- `gem-reviewer`

这些 roles 只作为 tier hints：默认倾向 `complex`，或至少 `medium` 且在存在风险信号时升为 `complex`。它们不是模型配置维度，不允许产生 role_models、per-role model 或 per-agent override。最终模型仍必须只通过三档 complexity tier 与优先级链解析，并且必须尊重 OpenCode 原生 `agent.model` 的最高优先级。

## 8. 上游编排保留契约

本项目必须 preserve 上游 Gem Team orchestrator 的核心编排逻辑，包括：

- orchestrator phases；
- DAG/waves；
- task schemas；
- failure handling；
- memory 与 context envelope 逻辑；
- 上游 agent 职责边界与协作语义。

插件不得将 `gem-orchestrator` 改造成新的通用编排框架。插件只能在以下边界内介入：

- OpenCode agent 注册或配置注入；
- 子代理调用前的 resolved tier 与模型解析；
- OpenCode 兼容所需的格式转换；
- 同步与校验 metadata 的维护。

## 9. 配置边界与非目标

- 对外配置只包含 `complexity_models.simple`、`complexity_models.medium`、`complexity_models.complex`。
- 三档配置均为可选。
- 未配置时 fallback 当前 OpenCode selected model。
- OpenCode 原生 `agent.model` 永远高于插件 complexity tier 配置。
- 禁止插件自定义 per-agent override。
- 禁止 `agent_complexity_models`。
- 禁止 role_models。
- reasoning-critical roles 只能影响 tier hint，不能成为模型配置维度。
- 禁止在 PRD、README 或示例配置中写具体模型 ID 默认值。
- 禁止把插件职责扩展为 provider-side router、第三方模型路由器长期方案、全局 OpenCode 配置修改器或独立自动模型入口。

## 10. 验收标准

| 编号 | 标准 | 验证方式 |
| --- | --- | --- |
| AC-01 | PRD 为 Markdown 文档。 | 检查文件路径与格式为 `docs/PRD.md`。 |
| AC-02 | PRD 明确 GitHub-only 发布/安装目标，不出现 npm publish 或 npm registry 发布要求，并将 GitHub source 语法、`dist`、package manager 需求列为待验证。 | 检查第 1、3、5 节。 |
| AC-03 | OpenCode 加载后可用全部 16 个真实 slug。 | 检查第 5.3 节与第 6 节清单。 |
| AC-04 | `gem-orchestrator` 是入口 agent，但不能作为自身 child/subagent。 | 检查第 3.1、5.3、5.6、6 节。 |
| AC-05 | 每个同步 agent 必须记录 upstream source URL、commit 与 body/content hash（例如 source body hash 或 converted body hash）。 | 检查第 5.2、5.6、6 节。 |
| AC-06 | PRD 明确只做 OpenCode 兼容转换，不重写 agent 行为。 | 检查第 2、5.2、6、8 节。 |
| AC-07 | PRD 明确 preserve 上游编排逻辑。 | 检查第 1、3.1、5.2、8 节。 |
| AC-08 | 对外只暴露 `complexity_models.simple`、`complexity_models.medium`、`complexity_models.complex`。 | 检查第 5.4、7.1、9 节。 |
| AC-09 | 三档 complexity model 均可选，缺省 fallback 当前 OpenCode selected model。 | 检查第 5.4、5.5、7.1、7.2、9 节。 |
| AC-10 | 优先级为 OpenCode `agent.model` > plugin `complexity_models[tier]` > current OpenCode selected model，且注入默认 agent/model 时不得覆盖用户已有 OpenCode `agent.model`。 | 检查第 5.4、5.7、7.2、9 节。 |
| AC-11 | 禁止 plugin per-agent override、`agent_complexity_models`、role_models。 | 检查第 3.2、5.4、7.5、9 节。 |
| AC-12 | reasoning-critical roles 只作为 tier hints，不作为模型配置维度。 | 检查第 7.5、9 节。 |
| AC-13 | PRD 不硬编码任何具体模型 ID、供应商模型名或示例模型值。 | 搜索全文，确认没有具体模型默认值或示例值。 |
| AC-14 | PRD 明确 OpenCode SDK 插件技术路线：default export `PluginModule { id, server }`，`server` 返回 hooks，`config` hook 动态注入 `gem-orchestrator` 与 15 个非 orchestrator `gem-*` agents，`chat.params` 可用于子代理调用时设置实际请求 model。 | 检查第 5.7 节。 |
| AC-15 | PRD 明确 kimchi 仅作为 SDK 插件机制参考，不包含 provider virtual models、profiles、telemetry、slash commands、provider auto-router、context auto-compaction、model fallback chain。 | 检查第 5.7、9、11 节。 |
| AC-16 | PoC 可证明 GitHub 安装加载成功。 | 按第 10.1 节 PoC 清单执行。 |
| AC-17 | PoC 可证明 16 个 agents 可见。 | 按第 10.1 节 PoC 清单执行。 |
| AC-18 | PoC 可证明用户已有 OpenCode `agent.model` 不被覆盖。 | 按第 10.1 节 PoC 清单执行。 |
| AC-19 | PoC 可证明缺省 fallback 使用 current OpenCode selected model。 | 按第 10.1 节 PoC 清单执行。 |
| AC-20 | PoC 可证明 medium/complex tier 能应用到实际请求 model。 | 按第 10.1 节 PoC 清单执行。 |
| AC-21 | PoC 可证明 `gem-orchestrator` 不会路由到自身。 | 按第 10.1 节 PoC 清单执行。 |
| AC-22 | PRD、README、示例配置、验收清单均不包含具体模型 ID。 | 搜索全文与示例文件确认。 |

### 10.1 PoC / 验收清单

- 验证 OpenCode 可通过 GitHub source 加载插件，并记录实际 source 语法。
- 验证 GitHub 安装是否需要提交 `dist`。
- 验证无需 npm publish 是否足以完成安装；如仍需要 package manager 辅助步骤，必须在安装文档中准确说明。
- 验证 OpenCode 加载后可见全部 16 个 agents。
- 验证 `config` hook 注入默认 agent/model 信息时不覆盖用户已有 OpenCode `agent.model`。
- 验证未配置 `complexity_models.simple|medium|complex` 时 fallback 到 current OpenCode selected model。
- 验证 medium tier 能通过 `chat.params` 应用到实际子代理请求 model。
- 验证 complex tier 能通过 `chat.params` 应用到实际子代理请求 model。
- 验证 `gem-orchestrator` 不会选择自身作为 child/subagent。
- 验证 PRD 不含当前方案之外的历史路线章节或交叉引用。
- 验证 PRD 与示例不含任何具体模型 ID、供应商模型名或示例模型值。

## 11. 风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 上游 Gem Team agent 发生新增、删除或重命名。 | 本地注册清单与上游偏离。 | 同步校验暴露差异，并要求更新 PRD 与注册清单。 |
| OpenCode 兼容转换误改 agent 行为。 | 上游编排语义被破坏。 | 限制转换范围，校验关键片段与 metadata，记录 upstream commit 与 body/content hash。 |
| 用户误以为 reasoning-critical roles 是独立模型配置维度。 | 配置复杂度上升并偏离三档契约。 | 文档明确它们仅为 tier hints，禁止 role_models。 |
| 某档 complexity model 未配置。 | 用户担心无法调用 agent。 | 透明 fallback 当前 OpenCode selected model。 |
| 插件模型解析覆盖 OpenCode 原生 agent 设置。 | 破坏 OpenCode 用户预期。 | 固化优先级链，`agent.model` 永远最高。 |
| GitHub 安装机制未实测。 | 安装文档可能误写 source 语法、`dist` 要求或 package manager 步骤。 | PoC 先验证 GitHub source 语法、构建产物要求与是否无需 npm publish，再发布安装说明。 |
| kimchi 参考范围扩张。 | 插件偏离 Gem Team agent 同步目标，变成 provider virtual models、profiles、telemetry、slash commands 或 provider auto-router。 | PRD 仅允许借鉴 OpenCode SDK 插件机制，其他 kimchi 能力不进入产品范围。 |
