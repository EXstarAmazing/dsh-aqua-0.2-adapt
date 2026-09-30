# 提交给官方皮肤市场的 PR 记录

**状态：已提交 → [kingOfSoySauce/dsh-skin-market#88](https://github.com/kingOfSoySauce/dsh-skin-market/pull/88)**

- 分支：`EXstarAmazing:registry/add-dsh-aqua-0.2-adapt`
- 内容：仅新增 1 个文件 `registry/skins/EXstarAmazing__dsh-aqua-0.2-adapt.yml`（+12 行，基于上游 `2e8ac6f`）
- 标题：`feat(registry): add dsh-aqua-0.2-adapt`
- 校验：`Validate registry submission` 工作流状态为 `action_required`
  —— **fork PR 首次运行需要维护者点一次 Approve**，这是 GitHub 对来自 fork 的工作流的默认保护，不是失败。
- PR #87 是同一提交的早期版本，因分支历史被重写而被 GitHub 自动关闭（非维护者拒绝），已由 #88 取代。

## 条目本身的形态（严格按市场文档）

```yaml
url: https://github.com/EXstarAmazing/dsh-aqua-0.2-adapt
name: dsh-aqua-0.2-adapt
author: EXstarAmazing
description: >-
  ...
```

只允许 `url`、`subpath`、`name`、`author`、`description`、`screenshots`；
CI 会从皮肤仓库补全 `package`、`commit`、`rowId`、`license`、`screenshots` 与 `health`。
写 `package`/`rowId`/`install`/`compatibility` 等字段会直接失败。

## 我用市场的脚本做的本地预演（提交前自查）

按 `scripts/hydrate-submission.mjs` + `scripts/skin-health.mjs` + `scripts/license.mjs` 的逻辑，
用仓库当前提交离线推导，结果应为：

| 字段 | 推导值 |
|---|---|
| `package` | `dsh-client-ui-aqua` |
| `rowId` | `ui-aqua`（来自 `cordis.patch.yml`） |
| `install.version` / `commit` | `1.3.2` / 仓库当前 HEAD |
| `license` | `AGPL-3.0`，`commercialUse: true` |
| `health.checks` | readmeScreenshots / compatibility / installation / installCommand / topic 全部 `pass` |
| `review` | compatibility / preview / installation 全部 `verified` |

其中两项是我为此专门调整过的，值得记住：

1. `health.installCommand` 要求 README 里出现 `dsh plugin … add` 形式的命令——README 里必须写，
   哪怕真实安装更推荐走 `vendor/reinstall-aqua.cjs`。
2. `compatibility.dsh` 取自本仓库 README 的**原文正则**，它只认 `0.1.0-rc.N` 写法并会回退到
   `peerDependencies`。因此 README 里必须如实写出 peer 声明 `^0.1.0-rc.5`，否则市场会把
   上游的 0.1.x 范围误当成兼容范围展示。

