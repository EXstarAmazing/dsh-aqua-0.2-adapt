# 提交给官方皮肤市场的 PR 草稿

- **目标仓库**：`kingOfSoySauce/dsh-skin-market`
- **新增文件**：`registry/skins/EXstarAmazing__dsh-aqua-0.2-adapt.yml`（内容见同目录 `registry-entry.yml`）
- **建议标题**：

  ```
  registry: add dsh-aqua-0.2-adapt (Aqua glass theme, DSH 0.2 compatible fork)
  ```

- **建议正文**：

  ```markdown
  Adds a registry entry for a **DSH 0.2 compatible fork** of the Aqua glass theme.

  - Upstream: https://github.com/WYH66666666/DSH-Transparent-UI-Plugin (author WYH66666666)
  - Fork: https://github.com/EXstarAmazing/dsh-aqua-0.2-adapt
  - Package name is kept as `dsh-client-ui-aqua` / rowId `ui-aqua`, so the row resolves unchanged.
  - Fork version: 1.3.2 · upstream baseline: `@deepseek-ai/dsh-client-ui-aqua@1.3.1` (npm tarball vendored in-repo)

  Why a separate entry instead of updating the existing one: `WYH66666666__DSH-Transparent-UI-Plugin.yml`
  targets `^0.1.0-rc.5`, and on 0.2.0-rc.2 that build fails at web boot — it requires
  `@deepseek-ai/dsh-client-runtime`, a package DSH never ships (the platform module table seeds
  `@deepseek-ai/dsh-client-store` instead). This fork fixes that plus four further 0.2 drifts:
  the `IconCheckOutline16` → `IconCheckOutlineRegular` rename, the removal of `settings.plugin.item`,
  the `defineStore` handle-vs-instance and `inject`-must-be-a-factory contracts, and the opaque
  layout backgrounds that hid the ambient layer everywhere except the sidebar.

  Compatibility: `>=0.2.0-rc.2 <0.3.0-0`, web, verified on the Windows desktop build of 0.2.0-rc.2.
  Install is `manual-only`: the fork is not on npm, and 0.2 refuses the package before it runs unless
  the exact-version exemption `dsh-client-ui-aqua@1.3.2` on `0.2.0-rc.2` is granted. The repo's
  `vendor/reinstall-aqua.cjs` performs install + patch + smoke test and writes that exemption;
  `vendor/uninstall-aqua.cjs` rolls everything back.

  Note on licensing: the upstream repository LICENSE is AGPL-3.0 while the published npm artifact
  carries an MIT license (`Copyright (c) 2026 John Wu`); both are archived verbatim in the fork.
  The entry therefore records `license.code: AGPL-3.0` (the stricter of the two) — please adjust if
  the market prefers a different convention for such forks.

  Upstream authorship is credited prominently in the README, and this fork is explicitly marked as
  unreviewed by the original author.
  ```

## 提交前的自查

- [ ] 仓库已推送且公开可见（截图 URL 用 `raw.githubusercontent.com/.../main/assets/*.png`，需与实际默认分支一致）
- [ ] 仓库已加 topic：`dsh-plugin`（对应市场健康检查的 `topic` 项，也便于被发现）
- [ ] `install.target` 的版本号与实际 `package.json` 的 `version` 一致（当前 1.3.2）
- [ ] 若市场要求固定 commit，补上推送后的 commit SHA：`github:EXstarAmazing/dsh-aqua-0.2-adapt#<sha>`
- [ ] 许可标注：若维护者更希望按 npm 产物的 MIT 标注，改为 `license.code: MIT / commercialUse: true`
