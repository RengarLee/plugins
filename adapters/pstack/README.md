# pstack：Codex + Claude Code 本地适配

这一层借鉴上游 `pstack/docs/harness/claude-code.md` 和 `scripts/generate-pstack-harness-trees.mjs`：保留同一份技能正文，在入口加入平台适配说明，再生成可安装副本。**没有修改 `pstack/`、上游 Claude 生成器或其已提交产物。**

## 构建和检查

需要 Node.js 22 或更高版本，无 npm 依赖。在此 fork 的仓库根目录运行：

```sh
node adapters/pstack/generate.mjs
node adapters/pstack/generate.mjs --check
node --test adapters/pstack/test/*.test.mjs
```

产物在本目录 `build/`，不提交 Git：

- `codex/`：Codex 插件，`.codex-plugin/plugin.json` 声明 `./skills/`。
- `claude-code/`：Claude 插件，继续使用上游 Claude 工具映射，额外加载共享记录约定。
- `.agents/plugins/marketplace.json`：Codex 本地市场。
- `.claude-plugin/marketplace.json`：Claude 本地市场。

适配包使用独立版本，例如 `0.15.36-pstack.h<内容摘要>`。源技能、kit、适配器或生成逻辑变化都会改变版本身份，即使上游版本号未变；`BUILD.json` 另外保留上游版本与完整摘要。这个哈希是内容身份，不是递增发布序号，不能据此承诺客户端自动升级排序。显式刷新后仍须核对安装副本的版本；若客户端拒绝较低排序的本地版本，应通过客户端重新安装，而不是手改缓存。

不会安装软件、登录、修改全局配置、写入项目记忆或推送远程。生成器只重建自己的 `build/`，不要在里面保存定制。上游生成器会清空 `harness/pstack/`，所以不把 Codex 产物放在那里。

## 安装

请先阅读生成的适配说明，再安装。不要同时启用上游 pstack 和这个同名包，以免重复技能。

Codex 支持本地市场的客户端：

```sh
codex plugin marketplace add /absolute/path/to/plugins/adapters/pstack/build
```

然后在 ChatGPT 桌面应用插件页面安装/启用 `pstack-local` 市场的 `pstack`。这一步需要用户在自己的客户端完成，本次测试没有执行真实客户端安装。路径可以使用 Windows 的实际绝对路径并加引号。

Claude Code 在插件命令中添加同一构建目录：

```text
/plugin marketplace add /absolute/path/to/plugins/adapters/pstack/build
/plugin install pstack@pstack-local
```

也可用 Claude Code 的本地插件目录方式测试 `build/claude-code`。如果仍安装上游 `pstack@cursor-plugins`，它**没有**本适配器的共享记忆约定。

安装机制依据 [OpenAI 本地插件与市场文档](https://developers.openai.com/plugins/build/plugins)。本地市场会复制到客户端缓存，并不是直接运行工作副本。修改源文件后要刷新插件/重启客户端，不可仅以生成成功认定安装已更新。

## 后续更新

推荐保留上游 `main`，只在这个适配目录维护自己的改动。普通上游变更无需重写 Codex 技能：

1. GitHub 的 **Sync fork** 把 `cursor/plugins:main` 合入你的 fork。
2. 本地运行以下命令。也可把它保存成自己的更新按钮所调用的操作：

```sh
git pull --ff-only
node --test adapters/pstack/test/*.test.mjs
node adapters/pstack/generate.mjs
node adapters/pstack/generate.mjs --check
```

Windows 可以双击 `adapters/pstack/update.cmd` 执行第 2 步；它不处理 GitHub 的 Sync fork，也不自动改客户端配置。

3. 刷新已安装插件。Codex 可刷新本地市场后重启客户端；Claude 执行 `claude plugin update pstack@pstack-local`，然后开启新会话。确认新包的 `BUILD.json` 摘要与本次构建一致。

**Sync fork 不会自动拉取电脑上的代码，也不会替客户端刷新插件缓存。** 如果上游改变目录、工具协议或引入新的平台专属能力，仍需检查适配。`git pull --ff-only` 遇到分叉会停止，不强推、不自动丢弃改动。生成器的输入摘要可追踪版本；并不能自动证明一个新工具已正确适配。

## 共享什么

两个适配包都读取同一个目标项目，而不是插件仓库：

| 内容 | 共同位置 / 做法 |
| --- | --- |
| `/correct` 的规则与约束表 | 优先项目现有 `CLAUDE.md`；没有时复用现有 `AGENTS.md`，两者都没有时新建 `CLAUDE.md`。Codex 显式读取，不假设原生自动发现 |
| `/show-me-your-work` 的决策记录 | 原有 `decisions.tsv` 或 `.audit/<task>.tsv` |
| 已批准的 `/reflect` 改进、项目验证技能 | 项目 `.claude/skills/<name>/`，两边都先检查并直接读取，保留 Claude 既有位置 |
| 模型选项 | 不共享；Codex 与 Claude 可用模型不同 |
| 原生聊天记录、平台自动记忆 | 不共享、不搬运、不扫描别的项目 |

项目覆盖技能有明确优先级，**不会被上游更新覆盖，也不会自动获得上游对该技能的后续修复**。这是保留个性化的代价，需要比较后再合并。不要同时写一个 TSV 日志；每工作流分日志或只保留一个写者。不同 worktree/电脑上的未提交文件不会自动同步。

这不是新建一个庞大的记忆系统。主要是让上游本来会写出的文件落在共同位置，并确保两边都读取它们。用户已有 `CLAUDE.md`、`AGENTS.md` 不会被脚本改写。

## Cursor 专属部分

`cursor-team-kit` 不是私有 SDK。本构建从同一仓库复制 `deslop`、`control-cli`、`control-ui` 三个技能及其资源，并保留许可证。不会自动安装它们提到的软件或提供浏览器、GUI、终端控制权限。

Cursor 的 Task 字段、模型 slug、自定义 agent、自动化、Bugbot 启动、`/loop`、云端环境并不能照搬到 Codex。适配器使用当前会话实际提供的能力，没有则明确降级/标记未验证。例如，同模型的两个 reviewer 不等于跨模型验证。平台原生 transcript 不可读时，不编造日志审计结果。

上游自动化资料保留在包内用于查阅，但未注册成可运行的 Codex 自动化。脚本保留原字节和可执行位；需要 Bash 等依赖的脚本仍要求目标机器具备它们。此补丁的自动测试验证生成、资源与更新流程，不等于各个技能在两个真实客户端上都完成了端到端运行。

共享范围是 Claude 现有的项目规则、技能改进及任务记录，不是整个 `~/.claude`。不会扫描凭据、其他项目或原生聊天/自动记忆。用户级技能只在明确选择该范围时读取指定目录；已有其他位置的记录不会自动搬迁。该约定在运行本适配包技能时生效，并非让所有普通会话自动共享记忆。
