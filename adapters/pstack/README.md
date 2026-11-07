# pstack：Codex 适配，Claude Code 保留官方原版

这份改动只为 Codex 生成安装包。Claude Code 继续安装 `cursor/plugins` 官方 pstack，不需要安装我们的 Claude 变体。

沿用官方 Claude 适配的思路：同一份上游技能正文，加平台工具/路径映射，再生成 Codex 可用副本。`pstack/`、原有 Claude 生成器和官方 Claude 产物均不修改。

## 安装与更新

### Claude Code：官方原版，用户级

```sh
claude plugin marketplace add cursor/plugins --scope user
claude plugin install pstack@cursor-plugins --scope user
```

以后更新：

```sh
claude plugin marketplace update cursor-plugins
claude plugin update pstack@cursor-plugins --scope user
```

### Codex：我们的适配版，用户级

PR 合并到 `main` 后，要等 `Publish pstack packages` 工作流成功创建 `pstack-release` 分支，再执行：

```sh
codex plugin marketplace add RengarLee/plugins --ref pstack-release
```

然后在支持插件的桌面客户端选择 `pstack-shared` 市场，安装 `pstack`。该命令使用用户级 Codex 配置，没有 `--scope` 参数。以后更新：

```sh
codex plugin marketplace upgrade pstack-shared
```

刷新/重启客户端，核对安装包 `BUILD.json`。Claude 和 Codex 分别维护安装状态，不会因为更新其中一个而更新另一个。不要同时启用多份同名 pstack；迁移时通过客户端停用旧版，不直接改缓存。

**用户级安装不代表用户级共享所有记忆。** 默认共享记录仍按当前项目隔离，不会跨项目混读。

## 更新上游与发布

1. 在 GitHub 点击 Sync fork，把 `cursor/plugins` 更新到这个 fork 的 `main`。
2. 相关文件变化触发工作流，测试通过后生成 Codex 包并普通推送到独立 `pstack-release`。失败保留上一份发布。
3. Codex 执行原生 marketplace upgrade；不再需要使用者在电脑上运行 Node 构建。

发布只允许在 `RengarLee/plugins` 的 `main` 运行。没有定时同步、没有 PR 发布触发、不自动合并上游。仅发布 job 请求 `contents: write`，不修改全局 Actions 权限，也不需要 PAT。已有发布分支必须有匹配的管理标记；普通推送，不 force，遇到分叉或分支保护就停止。包版本包含运行编号与重试编号，`BUILD.json` 记录源提交和内容摘要。不要随意重建发布工作流以重置编号。

PR 本身不会创建发布分支；必须先合并并等首次发布成功。真实发布、客户端安装和更新仍需验证。

## 共享官方实际写入的位置

pstack 没有单一记忆数据库。Codex 主动使用 Claude 官方约定的这些位置，不要求 Claude 安装我们的插件：

| 内容 | 官方行为与 Codex 适配 |
| --- | --- |
| `/correct` 规则/强制检查表 | 写 agent instruction file；Claude adapter 映射到项目 `CLAUDE.md`，没有时用 `AGENTS.md`。Codex 复用现有文件，不另建副本。 |
| `/reflect` 经批准的技能改进 | 官方复制后编辑本地技能，Claude 映射为项目 `.claude/skills/<skill>/`；用户明确选用户范围时才用 `~/.claude/skills/<skill>/`。Codex 读写同一份。 |
| 项目验证技能 | 官方 `.cursor/skills/verify-<app>/` 经 Claude 映射到 `.claude/skills/verify-<app>/`；Codex 保持这一位置。 |
| `/show-me-your-work` 决策记录 | 保留项目 `decisions.tsv` 或 `.audit/<task-slug>.tsv`。 |
| 模型偏好 | 各自独立，Claude 为 `~/.claude/rules/pstack-models.md`，Codex 为项目 `.pstack/models/codex.md`。 |
| 原生聊天记录与平台自动记忆 | 不合并、不扫描、不自动迁移。 |

上游依据：`pstack/docs/harness/claude-code.md` 的 Paths 表和技能调用映射；`pstack/skills/reflect/SKILL.md` 的复制/批准步骤；`pstack/skills/correct/SKILL.md` 的规则表；`pstack/skills/show-me-your-work/SKILL.md` 的日志位置。

**共享文件不等于保证官方 Claude 每次调用都会自动用它。** 官方 Claude adapter 内部调用技能时显式读取插件包内的技能路径；我们不能从 Codex 改变它的优先级。需要使用本地改进时，明确调用本地技能或请 Claude 读取那个具体文件。Codex 则按适配说明先检查指定项目覆盖技能。

Codex 写共享技能时保留平台中立的正文，不把 Codex 专属工具映射和模型设置写进去。插件更新不覆盖本地改进，但本地副本可能落后于上游，需比较后合并。两端更新节奏不同也可能存在版本差异，不能承诺永久零维护。

不要扫描整个 `~/.claude`，不读取凭据或无关项目，不把插件缓存当记忆文件夹。同一日志只保留一个写者；不同电脑/worktree 的未提交文件不会自动同步。没有可访问的同一份文件时，共享未生效。

## 本地开发

需要 Node.js 22+，无 npm 依赖：

```sh
node --test adapters/pstack/test/*.test.mjs
node adapters/pstack/generate.mjs
node adapters/pstack/generate.mjs --check
```

本地生成 `build/codex/` 与 `build/.agents/plugins/marketplace.json`（市场名 `pstack-local`）；不生成 Claude 包。`build/` 和 `build-release/` 都是可重建目录，不提交，不保存个人经验。上游生成器会清空 `harness/pstack/`，因此使用独立目录避免冲突。

`update.cmd` 是开发者本地拉取、测试和生成助手，不替代 GitHub Sync fork 或客户端刷新。日常使用者推荐上面的发布分支方式。

## 功能边界

`cursor-team-kit` 是同仓库技能集合，不是私有 SDK。Codex 包带入 `deslop`、`control-cli`、`control-ui` 及资源和许可证；依赖的软件、浏览器/终端权限仍须实际可用。Cursor 专属 Task 参数、模型名、Automations、Bugbot 启动、云代理和 `/loop` 不能假装兼容；适配器用实际工具或明确降级。

测试验证生成结构、链接、更新传递和发布保护条件，不等于所有技能在真实客户端端到端通过。

官方命令依据：[Codex 插件市场](https://developers.openai.com/plugins/build/plugins)、[Claude 市场托管](https://code.claude.com/docs/en/plugins/host-marketplace)。
