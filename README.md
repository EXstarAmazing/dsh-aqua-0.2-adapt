# dsh-aqua-0.2-adapt · DSH 0.2 适配版 Aqua 玻璃主题

> **这是第三方适配分支，不是原作者发布的版本。**
> 上游项目：[WYH66666666/DSH-Transparent-UI-Plugin](https://github.com/WYH66666666/DSH-Transparent-UI-Plugin)（作者 **WYH66666666**）
> 上游 npm 包：`@deepseek-ai/dsh-client-ui-aqua`（本仓库保留同名包名，便于插件行解析）

把 Aqua 磨砂玻璃主题跑在 **DSH 0.2.0-rc.2** 上的兼容补丁分支。上游 1.3.1 是面向 0.1.x 客户端 API 构建的，
在 0.2 上会**直接导致 web 启动失败**；本仓库只做兼容修复，主题外观与功能逻辑保持上游原样。

![preview](assets/1.png)

---

## 一、为什么需要适配

上游 1.3.1 在 DSH 0.2.0-rc.2 上有五处真实不兼容。已逐条定位并修复，全部有据可查：

| # | 问题 | 在 0.2 上的实际后果 | 本分支的修法 |
|---|---|---|---|
| 0 | 打包产物 `require("@deepseek-ai/dsh-client-runtime/client")`，而 **DSH 从不发布 `@deepseek-ai/dsh-client-runtime` 这个包**；平台静态模块表里只有 `@deepseek-ai/dsh-client-store`（DSH 自己的客户端包全部从它取 `defineStore`） | 浏览器模块表查不到该模块 → **整个 web boot 失败**，应用弹「无法启动」 | require 改指向 `@deepseek-ai/dsh-client-store`，`dsh.client.inject` 同步替换 |
| 1 | `IconCheckOutline16` 在 0.2 的 `dsh-client-ui-primitives` 里**已删除**（改名 `IconCheckOutlineRegular` / `IconCheckOutlineMedium`），插件有 6 处引用 | React 收到 `undefined` 组件，渲染即抛错 | 6 处重命名 |
| 2 | 总开关卡片注册到 `settings.plugin.item`，该插槽在 0.2 已被 `settings.plugins.tab` 分页机制取代 | `slots.inject` 对未声明插槽静默失效：开关不出现，主题开着却关不掉 | 把总开关搬到仍然存在的 `settings.general.item`（**设置 → 通用 → 外观** 正下方）行首 |
| 3 | ① `defineStore()` 返回的是句柄 `{ spec, create() }`，声明的 actions 只在 `create()` 出的实例上；② `slots.register` 的 `inject` **必须是工厂函数** | ① `pluginBound?.sync is not a function`；② `TypeError: inject is not a function` → `slot entry crashed`，整行静默消失 | ① 预先绑定 `store.create().actions` 并给调用加类型守卫；② 保持工厂形态，只在返回的 face 里补 `setEnabled` |
| 4 | 0.2 的布局包把不透明 `--dsw-alias-bg-base` 画在 `.BynINW_centerCol`、`.Dc7zOa_root` 上；dockkit 又把右侧分栏柱（`._tabHost_:not(._float_)`）整根刷成同色 | 氛围层是 `position:fixed; z-index:-1`，被这些白底成片盖住 → **背景只在侧边栏可见**，主区域与右侧面板一片白 | 在插件样式表末尾追加覆盖，按类名子串（`centerCol` / `conversation` …）与 `[data-sidebar-right-panel]` 把底色置透明 |
| 5 | 收起侧边栏时，0.2 的 frame 网格是 `grid-template-columns: 0px 2560px 0px`——**侧边栏的网格轨道就是 0px**，窄栏要靠列内内容自己撑出来。而主题给该列加了 `margin:12px`，配合 0.2 收起态的 `padding:0`，列宽被压到 1px：窄栏画不出来，展开按钮也随之落在所有已绘制图层之外（在按钮中心点做 `elementFromPoint`，拿到的是对话区滚动容器）。另外为宽侧边栏设计的玻璃卡底色也被套到了这条 64px 窄栏上，糊住了标题栏文字 | **收起后窄栏消失、展开按钮看不见也点不到，侧边栏收起即无法恢复**；即便勉强可见，标题栏也会被色块盖住 | 仅做两件事：收起态给该列 `min-width:64px`（**轨道仍为 0px**，不动其余网格几何）＋ `margin/padding/border-radius` 归零；并清掉玻璃卡的 `background/border/box-shadow/backdrop-filter`，让窄栏只当一条承载图标的条；再把 toggle 抬到 `z-index:40` 保证可点 |

> 第 4 条**不能用分栏列号定位**：shell 左栏和右侧工具栏都带 `data-dockkit-column="0"`（各自独立编号），
> 必须用 `[data-sidebar-right-panel]` 限定范围，否则会把左栏的玻璃卡片一起抹掉。
>
> 第 5 条**刻意不碰 DSH 自己的按钮定位**。排查过程留档，免得后来者重走：先后怀疑
> `backdrop-filter`、入场动画 `_rail-in`、悬停下压写的 `transform`（`perspective(800px)…scale(1.01)`），
> **三次都被实测数据否定**（逐一移除后按钮 `getBoundingClientRect` 毫无变化）；真正的原因是**列宽为 0**
> ——轨道 `0px` 时谈边距、滤镜、包含块都没有意义。
>
> 另外试过用 `left/top` 反向补偿"列的 12px 外边距把包含块从视口换成列"造成的偏移（原版按钮 `(12,6)`、
> 主题下 `(25,59)`）：**补偿规则实测未改变按钮 rect，且强制定位会让按钮在鼠标移到顶部时跳动**，因此整段
> 已回退。按钮的位置完全交回 DSH；这个 2px 量级的差异（`(12,6)` vs `(25,59)`）作为已知差异保留，
> 想彻底对齐需要改动主题的卡片边距策略，代价大于收益。
>
> 方法论教训：这类问题应当**先量尺寸与包含块**（`grid-template-columns`、列宽、`offsetParent` 链、
> 原版/插件版同一元素 rect 对照），而不是先猜视觉属性；本文这一条就是靠"关掉插件的同元素 rect 对照表"
> 才定位到根因的。




## 二、兼容性

| 项 | 值 |
|---|---|
| 平台 | web |
| 上游基线 | `@deepseek-ai/dsh-client-ui-aqua@1.3.1`（npm tarball，已附于 `vendor/`） |
| 本分支版本 | 1.3.2 |
| 许可 | **上游同时存在两种许可**，见下方说明 |

- **本分支的兼容动作只针对 0.2.x**：在 0.2.0-rc.2 上它把上游修好；在 0.1.x 上不加任何改动，你拿到的就是上游原样行为。
- 包内 `peerDependencies` 声明为 **DSH `^0.1.0-rc.5`**（上游原声明，未改动）。宿主启动时会按「精确 name@version」
  校验，所以 0.2.x 上必须授权精确版本豁免 `dsh-client-ui-aqua@1.3.2` + `0.2.0-rc.2` 才能加载。

> 说明：本分支**只**面向 0.2.x。上游 1.3.1 面向 0.1.x，两者互不兼容；若你仍在 0.1.x，
> 请直接用上游版本。包内 `peerDependencies` 保留的是上游的 `^0.1.0-rc.5` 声明（未改动），
> 这也正是需要版本豁免的原因，不要把它当作本分支的兼容范围。

### ⚠️ 关于许可（上游本身不一致）

- **上游仓库**的 `LICENSE` 是 **GNU AGPL-3.0** 全文（35 KB），已原样保留在本仓库根目录；
- **上游 npm 发布物**里携带的是 **MIT**（`Copyright (c) 2026 John Wu`），已原样保留在 `vendor/LICENSE-npm-artifact.txt`；
- 上游 `package.json` 的 `license` 字段写的是 `MIT`，与仓库 `LICENSE` 文件不一致。

本仓库同时包含上游仓库源码（AGPL-3.0）与上游 npm 产物（MIT 声明），因此 `license` 字段标为
`SEE LICENSE IN LICENSE`，**不替原作者做选择**。若用于商业或闭源场景，请先向上游作者确认实际授权。

## 三、安装

### 方式一：本仓库脚本（推荐，自动打补丁 + 自检）

```powershell
git clone https://github.com/EXstarAmazing/dsh-aqua-0.2-adapt
cd dsh-aqua-0.2-adapt
node vendor/reinstall-aqua.cjs
```

脚本会：解包 `vendor/` 里的**原始 1.3.1 tarball** → 应用 `vendor/patch-aqua.mjs` 补丁 → `node --check` 语法校验
→ 运行 `vendor/smoke-aqua.cjs` 冒烟测试（真实执行打包产物，验证能加载、能注册插槽、能渲染总开关、开关能翻转状态）
→ 安装到 profile → 写入 `dsh.profile.bundles`、`dependencies` 与 `compatibility.json` 版本豁免。
任一步失败都不会安装，幂等可重复执行。

之后**重启 DeepSeek Harness**，再硬刷新 Web 界面（`Ctrl+Shift+R`）。

> 脚本里的 profile 路径默认是 Windows 桌面版的 `%USERPROFILE%\.dsh\profiles\desktop`，
> 其他平台/自定义 profile 请改 `vendor/reinstall-aqua.cjs` 顶部的 `PROFILE` 常量。

### 方式二：`dsh plugin` 命令（仅在你已授权版本豁免后可用）

```sh
dsh plugin --profile <你的profile> add github:EXstarAmazing/dsh-aqua-0.2-adapt
```

⚠️ 直接执行**大概率会被拒绝**：本包 `peerDependencies` 仍写着上游的 `^0.1.0-rc.5`，DSH 0.2 会在启动前
按「精确 name@version」拦下它，报 `incompatible-version`。若你确实想用这条路，需要先显式接受风险、授权精确版本：

```sh
dsh plugin --profile <你的profile> allow-version dsh-client-ui-aqua@1.3.2 --dsh-version 0.2.0-rc.2 --accept-risk
```

授权后重新执行上面的 `add`，再重启宿主。命令形式请以你所用宿主为准（官方 Desktop 用应用内的
「插件 → 添加插件」，不要用 `dsh plugin --profile desktop`）。

### 方式三：手动（了解每一步在做什么）


1. 把仓库内容放到 profile 依赖目录：
   `%USERPROFILE%\.dsh\profiles\<profile>\node_modules\dsh-client-ui-aqua\`
2. 在该 profile 的 `cordis.patch.yml` 追加：
   ```yaml
   - insert:
       - id: ui-aqua
         name: 'dsh-client-ui-aqua'
   ```
3. **必须**在 profile 目录（与 `package.json` 同级）新建 `compatibility.json`，授权精确版本：
   ```json
   {
     "dsh-client-ui-aqua@1.3.2": ["0.2.0-rc.2"]
   }
   ```
   原因：本包 `peerDependencies` 仍写着上游的 `^0.1.0-rc.5`，DSH 0.2 会在启动前按「精确 name@version」拒绝它；
   不授权则启动被拒。授权即表示你接受「可能崩溃或数据丢失」的风险。
4. 重启应用 + 硬刷新。

### 关于 `dsh plugin add` 的两点提醒

- npm 上**没有** 0.2 适配版：`dsh plugin add dsh-client-ui-aqua` 会拉到 npm 上的 0.1.x 版，那在 0.2 上必然崩。
  必须用 `github:EXstarAmazing/dsh-aqua-0.2-adapt` 这个来源。
- 无论哪种来源都会先撞上 `incompatible-version`（peer 范围写的是上游 `^0.1.0-rc.5`），
  需要先按方式二授权精确版本豁免 `dsh-client-ui-aqua@1.3.2` + `0.2.0-rc.2`，再执行 `add`。

## 四、功能与开关位置

**设置 → 通用 → 外观 的正下方**（因为 0.2 移除了「插件」页的卡片插槽，总开关搬到了这一行行首）：

| 控件 | 说明 |
|---|---|
| 行首「玻璃主题」+ 开启/关闭 | 一键开关：关掉即完全还原原生界面 |
| 模式：云母效果 / 兼容模式 | 云母=悬浮玻璃卡片；兼容=原版排版只换材质（其他插件界面也会玻璃化） |
| 玻璃材质：玻璃模糊度、磨砂度 | 仅云母模式显示 |
| 背景：流体 / 壁纸 | 流体可调色调、颜色深浅；壁纸可调模糊度/磨砂度，支持图片与视频 |
| 背景亮度 | 跟随深浅模式：深色 0–50 压暗、浅色 50–100 提亮，50 原样 |
| 环境装饰：粒子鲸鱼 / 小鱼 / 网状交互 | 粒子鲸鱼开关在此 |
| 悬停效果：鼠标辉光 / 悬停下压 | 仅云母模式显示 |

无开关的常驻效果（上游即如此）：**Harness 光泽铭牌**（跟随深浅模式自动切换）、**边缘渐变模糊**（上下 5px）。

## 五、卸载 / 回滚

```powershell
node vendor/uninstall-aqua.cjs      # 撤回 bundle、依赖、版本豁免并删除插件目录
```

界面完全打不开时的兜底：直接编辑 `%USERPROFILE%\.dsh\profiles\<profile>\package.json`，
从 `dsh.profile.bundles` 和 `dependencies` 里删掉 `dsh-client-ui-aqua`，重启即可。
主题开关与旋钮值存在 Web 界面 localStorage，键名前缀 `dsh.ui-aqua.`。

## 六、仓库结构

```
lib/client.js                适配后的浏览器端打包产物（可直接使用）
lib/index.js                 host 半边（空 apply，上游原样）
cordis.patch.yml             插件行声明（上游原样）
src/                         上游源码（原样保留，便于对照与重新构建）
tsdown.config.ts             上游构建配置
LICENSE                      上游仓库许可（GNU AGPL-3.0，原样）
vendor/
  dsh-client-ui-aqua-1.3.1.tgz   上游 npm 原始包（本适配的唯一输入）
  LICENSE-npm-artifact.txt       上游 npm 产物内的 MIT 许可（原样）
  patch-aqua.mjs                 适配补丁定义（精确匹配，不匹配直接报错，不会写坏文件）
  reinstall-aqua.cjs             一键重装（解包→补丁→语法校验→冒烟→安装→登记）
  register-aqua.cjs              配置登记（bundles / dependencies / 版本豁免）
  uninstall-aqua.cjs             卸载
  smoke-aqua.cjs                 冒烟测试（桩模块真实执行打包产物）
  smoke-mocks/                   冒烟测试用桩模块
  registry-entry.yml             提交官方皮肤市场的登记草稿
  UPSTREAM-PR.md                 该 PR 的标题/正文草稿与提交前自查
```

`lib/client.js` 与「`vendor/` 原始 tarball + `vendor/patch-aqua.mjs`」的输出**逐字节一致**，
可用 `vendor/reinstall-aqua.cjs` 重新生成校验。

## 七、来源与致谢

- **原项目 / 原作者**：[WYH66666666/DSH-Transparent-UI-Plugin](https://github.com/WYH66666666/DSH-Transparent-UI-Plugin) — **WYH66666666**
- 上游 npm 包：[`@deepseek-ai/dsh-client-ui-aqua`](https://www.npmjs.com/package/dsh-client-ui-aqua)
- 本分支仅由 **EXstarAmazing** 做 0.2 兼容适配，**未获原作者审核或背书**；上游若发布官方 0.2 版本，请优先使用上游版本
- 原作者已在 README 中提示「随着 DSH 版本更新，本人因学业繁忙可能无法及时适配，请自行更换或修理」——本分支即该提示下的一次修复
- 若你是原作者并希望本分支下线或调整署名方式，开 issue 即可，我会立即处理
