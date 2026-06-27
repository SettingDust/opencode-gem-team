# OpenCode Gem Team 插件 PRD

版本：v1.1

## 1. 背景

OpenCode 用户需要一种低摩擦方式使用 Gem Team agents：安装插件后即可在 OpenCode 中调用 `gem-orchestrator` 与完整的 Gem Team 子代理集合，而不是手工复制、维护大量 agent 配置。

Gem Team 上游已经包含自己的 orchestrator、任务阶段、DAG/waves、任务 schema、失败处理、memory 与 context envelope 逻辑。本项目不重新发明编排框架；插件职责是同步并兼容转换上游 agent 定义，使其能被 OpenCode 加载，并在注入默认 agent 配置时保留用户已有 OpenCode 原生 `agent.model`。

## 2. 产品定位

OpenCode Gem Team 插件是一个面向 OpenCode 的 agent 集成插件，核心价值是：

- 内置并维护 Gem Team agent 定义。
- 安装或加载后，OpenCode 可直接使用 `gem-orchestrator` 与所有 `gem-*` agents。
- 直接同步上游 `mubaidr/gem-team/.apm/agents/*.agent.md`，保留 agent slug。
- 记录每个同步 agent 的 upstream source URL、commit 与 body/content hash。
- 只做 OpenCode 兼容转换，不擅自重写 agent 行为、职责、阶段或编排语义。
- 不暴露插件侧模型路由配置；模型选择交还 OpenCode 原生配置与当前 selected model。

## 3. 目标 / 非目标

### 3.1 目标

- 提供 GitHub-only 的 OpenCode 插件分发与安装路径。
- 维护可验证的 Gem Team agent 同步产物与同步元数据。
- 在 OpenCode 加载插件后注册完整的 16 个真实 Gem Team slug。
- 将 `gem-orchestrator` 作为入口 agent，但禁止其作为自身 child/subagent。
- 保留上游 orchestrator phases、DAG/waves、task schemas、failure handling、memory/context envelope 逻辑。
- 注入默认 agent 配置时不覆盖用户已有 OpenCode 原生 `agent.model`。

### 3.2 非目标

- 不以 npm registry 发布为目标；但 GitHub 安装链路是否需要构建产物或 package manager 辅助步骤，需由 PoC 验证后再写入安装文档。
- 不创建新的 orchestration framework。
- 不重写、改写或重新设计上游 agent 行为。
- 不引入插件自己的 model routing、per-agent override、`complexity_models`、`agent_complexity_models` 或 role_models。
- 不提供 provider-side router、第三方模型路由器长期方案或独立自动模型入口。
- 不要求修改全局或用户级 OpenCode 配置。
- 不在 PRD 中硬编码任何具体模型 ID、供应商模型名或示例模型值。
- 不记录、传递或要求写入 API key、token、cookie、私钥或其他秘密。

## 4. 用户故事

| 编号  | 用户故事                                                                                    | 价值                         |
| ----- | ------------------------------------------------------------------------------------------- | ---------------------------- |
| US-01 | 作为 OpenCode 用户，我希望从 GitHub 安装插件后即可使用 Gem Team agents。                    | 避免手工复制大段配置。       |
| US-02 | 作为 OpenCode 用户，我希望 `gem-orchestrator` 能作为入口 agent 调用上游 Gem Team 编排逻辑。 | 保持 Gem Team 原有工作流。   |
| US-03 | 作为 OpenCode 用户，我希望插件不覆盖我已有的 OpenCode `agent.model`。                       | 保持 OpenCode 原生配置优先。 |
| US-04 | 作为 OpenCode 用户，我希望插件不引入额外模型路由配置。                                      | 保证配置最小化与行为可预测。 |
| US-05 | 作为维护者，我希望同步产物记录 upstream URL、commit 与 body/content hash。                  | 便于审计、回滚和对齐上游。   |
| US-06 | 作为维护者，我希望同步校验能发现 slug 缺失、额外 slug 或行为性改写。                        | 降低偏离上游 Gem Team 风险。 |

## 5. 功能需求

### 5.1 GitHub 安装

- 插件必须以 GitHub 仓库作为发布与安装来源。
- 文档与验收不得要求 npm publish 或 npm registry 包名。
- PoC 必须验证 OpenCode GitHub source 语法、GitHub 安装加载流程、是否需要提交 `dist`、以及是否无需 npm publish 即可安装。
- 在完成 PoC 前，不得承诺安装过程完全不涉及 package manager。

### 5.2 Agent 同步

- 插件必须直接同步上游 `mubaidr/gem-team/.apm/agents/*.agent.md`。
- 同步必须保留每个 agent 的 slug。
- 每个同步产物或同步 manifest 必须记录 upstream source URL、upstream commit、body/content hash、本地 slug、同步时间或同步批次标识。
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

### 5.4 模型配置边界

- 插件不得暴露 `complexity_models.simple|medium|complex` 或其他插件侧模型路由配置。
- 插件不得提供自己的 per-agent override、`agent_complexity_models` 或 role_models。
- 插件注入默认 agent 配置时，必须保留用户已有 OpenCode 原生 `agent.model`。
- 模型选择由 OpenCode 原生 agent 配置与当前 selected model 负责。

### 5.5 透明 fallback

- 插件不实现自己的 model fallback chain。
- 若用户没有配置 OpenCode 原生 `agent.model`，OpenCode 使用其当前 selected model 或自身默认行为。
- fallback 行为不得隐式选择 PRD 中未声明的具体模型。

### 5.6 同步校验

- 校验必须确认本地注册 slug 与上游同步契约一致。
- 校验必须确认 `gem-orchestrator` 不在其自身 child/subagent 列表中。
- 校验必须确认每个同步 agent 存在 upstream source URL、commit 与 body/content hash 记录。
- 校验必须确认 OpenCode 兼容转换没有移除或重写上游关键编排逻辑。
- 校验必须确认 PRD、README 与插件配置示例不包含具体模型 ID 默认值或插件侧模型路由配置。

### 5.7 OpenCode SDK 插件技术路线与可行性

本项目采用 OpenCode SDK 插件机制作为实现路线，但只借鉴 SDK 插件形态与 hook 注入能力，不继承 kimchi 的产品能力集合。

实现形态：

- 插件模块以 default export 形式导出 `PluginModule { id, server }`。
- `server` 返回 OpenCode hooks。
- `config` hook 负责在 OpenCode 加载配置时动态注入 Gem Team agents。
- 注入范围包含 `gem-orchestrator` 与 15 个非 orchestrator 的 `gem-*` agents。
- 注入默认 agent 信息时，必须先检测 OpenCode 已有 agent 配置；若用户已配置 OpenCode 原生 `agent.model`，插件不得覆盖。
- `gem-orchestrator` 的 system prompt 会追加一段泛化到所有路径的 decision-block NOTICE：在执行任何动作前，必须先输出 decision block，并在同一 turn 内继续执行该动作；字段顺序固定为 `Phase`、`Complexity`、`Action`、`Decision`，其中 `Complexity` 取值限定为 `TRIVIAL|LOW|MEDIUM|HIGH`，`Action` 只允许 research、plan、implement、review、critic、debug、document、design、test、devops、simplify、skill，且可填写一个或多个值，多个值必须用 ` + ` 连接，`Decision` 用于说明依据复杂度、动作与 agent 规则是委派给哪个 subagent 或直接处理；并且在关键 workflow checkpoint 输出统一 checkpoint block，自陈 `Current phase: <2 | 3>`、`Complexity`、`Wave completed` 与 `Next step`，用于覆盖 Phase 2 计划生成/加载后与 Phase 3 每个 wave 完成后的 checkpoint 场景。
- 插件不得使用 `chat.params` 设置实际请求 model；本插件只负责 agent 注册/注入与同步校验。

kimchi 参考边界：本项目不照搬 provider virtual models、profiles、telemetry、slash commands、provider auto-router、context auto-compaction 或 model fallback chain。

## 6. Agent 清单与同步契约

| Slug                       | OpenCode 中的定位               | 同步契约                                                               |
| -------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `gem-browser-tester`       | 浏览器测试与交互验证 agent      | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-code-simplifier`      | 代码简化与复杂度降低 agent      | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-critic`               | 批判性审视与方案压力测试 agent  | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-debugger`             | 故障定位与调试 agent            | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-designer-mobile`      | 移动端设计 agent                | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-designer`             | 通用设计 agent                  | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-devops`               | DevOps、CI/CD、环境与发布 agent | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-documentation-writer` | 文档写作 agent                  | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-implementer-mobile`   | 移动端实现 agent                | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-implementer`          | 通用实现 agent                  | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-mobile-tester`        | 移动端测试 agent                | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-orchestrator`         | 入口编排 agent                  | 从上游同名 agent 同步，保留 slug 与行为；不得作为自身 child/subagent。 |
| `gem-planner`              | 计划与任务拆解 agent            | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-researcher`           | 研究与资料整理 agent            | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-reviewer`             | 审查与验收核对 agent            | 从上游同名 agent 同步，保留 slug 与行为。                              |
| `gem-skill-creator`        | 技能创建 agent                  | 从上游同名 agent 同步，保留 slug 与行为。                              |

## 7. 模型配置契约

### 7.1 无插件侧模型路由

插件不接受以下配置键：

- `complexity_models.simple`
- `complexity_models.medium`
- `complexity_models.complex`
- `agent_complexity_models`
- `role_models`
- per-agent plugin model overrides

PRD、README、示例配置和验收标准不得为任何模型配置提供具体模型 ID 默认值。

### 7.2 OpenCode 原生配置保留

- 若用户已有 OpenCode 原生 `agent.model`，插件注入 generated agent defaults 时不得覆盖。
- 若用户没有配置 `agent.model`，插件不补写模型字段。
- 当前 selected model 与其他模型 fallback 行为由 OpenCode 自身处理。

### 7.3 Reasoning-critical roles

`gem-planner`、`gem-debugger`、`gem-critic`、`gem-reviewer` 等 roles 不产生任何插件侧模型配置维度。它们只能保留上游 agent 职责语义，不允许产生 role_models、per-role model 或 per-agent override。

## 8. 上游编排保留契约

本项目必须 preserve 上游 Gem Team orchestrator 的核心编排逻辑，包括 orchestrator phases、DAG/waves、task schemas、failure handling、memory/context envelope 逻辑、上游 agent 职责边界与协作语义。

插件不得将 `gem-orchestrator` 改造成新的通用编排框架。插件只能在以下边界内介入：

- OpenCode agent 注册或配置注入；
- OpenCode 兼容所需的格式转换；
- 同步与校验 metadata 的维护。

## 9. 配置边界与非目标

- 对外不暴露插件侧模型路由配置。
- OpenCode 原生 `agent.model` 不得被插件生成默认值覆盖。
- 禁止插件自定义 per-agent override。
- 禁止 `agent_complexity_models`。
- 禁止 role_models。
- reasoning-critical roles 不能成为模型配置维度。
- 禁止在 PRD、README 或示例配置中写具体模型 ID 默认值。
- 禁止把插件职责扩展为 provider-side router、第三方模型路由器长期方案、全局 OpenCode 配置修改器或独立自动模型入口。

## 10. 验收标准

| 编号  | 标准                                                                                                                                                                                                                                   | 验证方式                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| AC-01 | PRD 为 Markdown 文档。                                                                                                                                                                                                                 | 检查文件路径与格式为 `docs/PRD.md`。       |
| AC-02 | PRD 明确 GitHub-only 发布/安装目标，不出现 npm publish 或 npm registry 发布要求，并将 GitHub source 语法、`dist`、package manager 需求列为待验证。                                                                                     | 检查第 1、3、5 节。                        |
| AC-03 | OpenCode 加载后可用全部 16 个真实 slug。                                                                                                                                                                                               | 检查第 5.3 节与第 6 节清单。               |
| AC-04 | `gem-orchestrator` 是入口 agent，但不能作为自身 child/subagent。                                                                                                                                                                       | 检查第 3.1、5.3、5.6、6 节。               |
| AC-05 | 每个同步 agent 必须记录 upstream source URL、commit 与 body/content hash。                                                                                                                                                             | 检查第 5.2、5.6、6 节。                    |
| AC-06 | PRD 明确只做 OpenCode 兼容转换，不重写 agent 行为。                                                                                                                                                                                    | 检查第 2、5.2、6、8 节。                   |
| AC-07 | PRD 明确 preserve 上游编排逻辑。                                                                                                                                                                                                       | 检查第 1、3.1、5.2、8 节。                 |
| AC-08 | 对外不暴露 `complexity_models.simple|medium|complex` 或其他插件侧模型路由配置。                                                                                                                                                        | 检查第 5.4、7.1、9 节。                    |
| AC-09 | 插件不实现自己的 model fallback chain，缺省模型行为交由 OpenCode selected model 或 OpenCode 自身默认行为处理。                                                                                                                          | 检查第 5.4、5.5、7.1、7.2、9 节。          |
| AC-10 | 注入默认 agent 信息时不得覆盖用户已有 OpenCode `agent.model`，且不得补写插件侧模型字段。                                                                                                                                                | 检查第 5.4、5.7、7.2、9 节。               |
| AC-11 | 禁止 plugin per-agent override、`agent_complexity_models`、role_models。                                                                                                                                                               | 检查第 3.2、5.4、7.1、9 节。               |
| AC-12 | reasoning-critical roles 不作为模型配置维度。                                                                                                                                                                                          | 检查第 7.3、9 节。                         |
| AC-13 | PRD 不硬编码任何具体模型 ID、供应商模型名或示例模型值。                                                                                                                                                                                | 搜索全文，确认没有具体模型默认值或示例值。 |
| AC-14 | PRD 明确 OpenCode SDK 插件技术路线：default export `PluginModule { id, server }`，`server` 返回 hooks，`config` hook 动态注入 `gem-orchestrator` 与 15 个非 orchestrator `gem-*` agents，且不使用 `chat.params` 设置实际请求 model。 | 检查第 5.7 节。                            |
| AC-15 | PRD 明确 kimchi 仅作为 SDK 插件机制参考，不包含 provider virtual models、profiles、telemetry、slash commands、provider auto-router、context auto-compaction、model fallback chain。                                                    | 检查第 5.7、9、11 节。                     |
| AC-16 | PoC 可证明 GitHub 安装加载成功。                                                                                                                                                                                                       | 按第 10.1 节 PoC 清单执行。                |
| AC-17 | PoC 可证明 16 个 agents 可见。                                                                                                                                                                                                         | 按第 10.1 节 PoC 清单执行。                |
| AC-18 | PoC 可证明用户已有 OpenCode `agent.model` 不被覆盖。                                                                                                                                                                                   | 按第 10.1 节 PoC 清单执行。                |
| AC-19 | PoC 可证明插件未配置模型时不补写模型字段，模型选择交由 OpenCode 当前 selected model 或自身默认行为处理。                                                                                                                               | 按第 10.1 节 PoC 清单执行。                |
| AC-20 | PoC 可证明插件不会通过 `chat.params` 或其他 hook mutation 覆盖实际请求 model。                                                                                                                                                         | 按第 10.1 节 PoC 清单执行。                |
| AC-21 | PoC 可证明 `gem-orchestrator` 不会路由到自身。                                                                                                                                                                                         | 按第 10.1 节 PoC 清单执行。                |
| AC-22 | PRD、README、示例配置、验收清单均不包含具体模型 ID。                                                                                                                                                                                   | 搜索全文与示例文件确认。                   |

### 10.1 PoC / 验收清单

- 验证 OpenCode 可通过 GitHub source 加载插件，并记录实际 source 语法。
- 验证 GitHub 安装是否需要提交 `dist`。
- 验证无需 npm publish 是否足以完成安装；如仍需要 package manager 辅助步骤，必须在安装文档中准确说明。
- 验证 OpenCode 加载后可见全部 16 个 agents。
- 验证 `config` hook 注入默认 agent 信息时不覆盖用户已有 OpenCode `agent.model`。
- 验证插件不接受 `complexity_models.simple|medium|complex` 作为模型路由配置。
- 验证插件不会通过 `chat.params` 应用或覆盖实际子代理请求 model。
- 验证 `gem-orchestrator` 不会选择自身作为 child/subagent。
- 验证 PRD 不含当前方案之外的历史路线章节或交叉引用。
- 验证 PRD 与示例不含任何具体模型 ID、供应商模型名或示例模型值。

## 11. 风险与缓解

| 风险                                                     | 影响                                                                                                                          | 缓解                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 上游 Gem Team agent 发生新增、删除或重命名。             | 本地注册清单与上游偏离。                                                                                                      | 同步校验暴露差异，并要求更新 PRD 与注册清单。                                       |
| OpenCode 兼容转换误改 agent 行为。                       | 上游编排语义被破坏。                                                                                                          | 限制转换范围，校验关键片段与 metadata，记录 upstream commit 与 body/content hash。  |
| 用户误以为 reasoning-critical roles 是独立模型配置维度。 | 配置复杂度上升并偏离插件同步目标。                                                                                            | 文档明确它们不是模型维度，禁止 role_models。                                       |
| 用户期待插件侧 complexity model。                        | 配置预期与实际不一致。                                                                                                        | 明确插件不暴露模型路由配置，模型选择交由 OpenCode 原生机制。                       |
| 插件注入覆盖 OpenCode 原生 agent 设置。                  | 破坏 OpenCode 用户预期。                                                                                                      | 注入逻辑只填 missing fields，保留已有 `agent.model`。                               |
| GitHub 安装机制未实测。                                  | 安装文档可能误写 source 语法、`dist` 要求或 package manager 步骤。                                                            | PoC 先验证 GitHub source 语法、构建产物要求与是否无需 npm publish，再发布安装说明。 |
| kimchi 参考范围扩张。                                    | 插件偏离 Gem Team agent 同步目标，变成 provider virtual models、profiles、telemetry、slash commands 或 provider auto-router。 | PRD 仅允许借鉴 OpenCode SDK 插件机制，其他 kimchi 能力不进入产品范围。              |
