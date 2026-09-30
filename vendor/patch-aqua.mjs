/**
 * Apply the DSH 0.2.0-rc.2 compatibility patch to one dsh-client-ui-aqua
 * `lib/client.js`.
 *
 * Exported as a function so reinstall-aqua.cjs can call it on a freshly
 * unpacked tarball, and runnable directly to patch an installed copy in place
 * (`node patch-aqua.mjs <path-to-lib/client.js>`).
 *
 * Why patching is needed at all: the published 1.3.1 bundle was built against
 * the 0.1.x client packages and breaks twice on 0.2.0-rc.2 —
 *   1. `IconCheckOutline16` no longer exists in
 *      @deepseek-ai/dsh-client-ui-primitives (renamed to
 *      `IconCheckOutlineRegular`), so six <IconCheckOutline16 /> call sites
 *      pass `undefined` to React and throw.
 *   2. The master switch registered into `settings.plugin.item`, a slot that
 *      0.2.0-rc.2 replaced with the `settings.plugins.tab` page mechanism; an
 *      undeclared slot makes `slots.inject` a silent no-op, so no switch
 *      rendered and the theme could not be turned off from the UI.
 *
 * The patch renames the icon, drops the dead Plugins-page registration, and
 * moves the master switch into the surviving `settings.general.item` row
 * (Settings -> General -> Appearance).
 */
import { readFileSync, writeFileSync } from 'node:fs'

const TAB = '\t'

/**
 * Patch one bundle in place.
 * @param file - absolute path to the package's lib/client.js.
 * @returns the list of applied changes.
 */
export function patchBundle(file) {
  let src = readFileSync(file, 'utf8')
  const applied = []

  /** Replace exactly once, or report the mismatch instead of corrupting. */
  const replaceOnce = (label, from, to) => {
    const at = src.indexOf(from)
    if (at === -1) throw new Error(`${label}: pattern not found`)
    if (src.indexOf(from, at + 1) !== -1) throw new Error(`${label}: pattern not unique`)
    src = src.slice(0, at) + to + src.slice(at + from.length)
    applied.push(label)
  }

  // 0. The store import. 0.2.0-rc.2 ships no `@deepseek-ai/dsh-client-runtime`
  //    package at all — every shipped client bundle takes `defineStore` from
  //    `@deepseek-ai/dsh-client-store` — so the require misses the browser
  //    module table and the whole web boot fails.
  replaceOnce(
    'store import',
    `require("@deepseek-ai/dsh-client-runtime/client")`,
    `require("@deepseek-ai/dsh-client-store")`,
  )

  // 1. The icon that no longer exists in 0.2.0-rc.2's primitives package.
  const iconFrom = '_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16'
  const iconTo = '_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular'
  const iconCount = src.split(iconFrom).length - 1
  if (iconCount !== 6) throw new Error(`icon rename: expected 6 occurrences, found ${iconCount}`)
  src = src.split(iconFrom).join(iconTo)
  applied.push(`icon rename x${iconCount}`)

  // 2. Stop hiding the whole row while the layer is off, and put the master
  //    switch at the top of it. The children array is wrapped so the array
  //    literal still owns one child expression per element.
  replaceOnce(
    'row head',
    `${TAB}${TAB}${TAB}if (!enabled) return null;\n${TAB}${TAB}${TAB}return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {\n${TAB}${TAB}${TAB}${TAB}className: AquaAppearanceRow_module_css_default.group,\n${TAB}${TAB}${TAB}${TAB}children: [`,
    `${TAB}${TAB}${TAB}return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {\n`
    + `${TAB}${TAB}${TAB}${TAB}className: AquaAppearanceRow_module_css_default.group,\n`
    + `${TAB}${TAB}${TAB}${TAB}children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}className: AquaAppearanceRow_module_css_default.row,\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}className: AquaAppearanceRow_module_css_default.rowLabel,\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}children: t("aqua.title")\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}type: "button",\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}className: enabled ? AquaAppearanceRow_module_css_default.toggleOn : AquaAppearanceRow_module_css_default.toggle,\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}"aria-pressed": enabled,\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}onClick: () => {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}setEnabled(!enabled);\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}},\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}className: AquaAppearanceRow_module_css_default.check,\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}children: enabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(${iconTo}, {})\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}}), enabled ? t("aqua.enable") : t("aqua.disable")]\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}})]\n`
    + `${TAB}${TAB}${TAB}${TAB}}), enabled && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}className: AquaAppearanceRow_module_css_default.subGroup,\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}children: [`,
  )

  // 3. The nested wrapper needs one more indentation level and one more
  //    closing bracket. Re-indenting the 350-line JSX body is unnecessary:
  //    only the closing sequence changes shape.
  replaceOnce(
    'row tail',
    `${TAB}${TAB}${TAB}${TAB}]\n${TAB}${TAB}${TAB}});\n${TAB}${TAB}}\n${TAB}${TAB}//#endregion`,
    `${TAB}${TAB}${TAB}${TAB}${TAB}]\n${TAB}${TAB}${TAB}${TAB}})]\n${TAB}${TAB}${TAB}});\n${TAB}${TAB}}\n${TAB}${TAB}//#endregion`,
  )

  // 0b. `sync()` and the two bound-action slots. `defineStore` returns a HANDLE
  //     (`{ spec, create() }`); the declared actions live on the instance that
  //     `create()` returns, so the handle itself has no `sync`. Bind a real
  //     instance's actions up front (the renderer's own inject pass replaces
  //     them with its bound copy later) and keep the call guarded.
  replaceOnce(
    'bound action guards',
    `${TAB}${TAB}${TAB}const sync = () => {\n`,
    `${TAB}${TAB}${TAB}// PATCH(0.2.0-rc.2): bind a store instance's actions eagerly - the\n`
    + `${TAB}${TAB}${TAB}// handle returned by defineStore has create(), not the declared actions.\n`
    + `${TAB}${TAB}${TAB}pluginBound = pluginBound ?? pluginStore.create().actions;\n`
    + `${TAB}${TAB}${TAB}appearanceBound = appearanceBound ?? appearanceStore.create().actions;\n`
    + `${TAB}${TAB}${TAB}const sync = () => {\n`,
  )

  replaceOnce(
    'sync guards',
    `${TAB}${TAB}${TAB}${TAB}pluginBound?.sync(next, revision);\n`
    + `${TAB}${TAB}${TAB}${TAB}appearanceBound?.sync(next, revision);\n`,
    `${TAB}${TAB}${TAB}${TAB}if (typeof pluginBound?.sync === "function") pluginBound.sync(next, revision);\n`
    + `${TAB}${TAB}${TAB}${TAB}if (typeof appearanceBound?.sync === "function") appearanceBound.sync(next, revision);\n`,
  )

  // 4. Keep the inject factories. 0.2.0-rc.2's `slots.register` runs
  //    `options.inject` itself (`runInject`), so passing the built face object
  //    throws "inject is not a function" and the whole row fails to render.
  //    The eager handle bindings from step 0b stay, which is what the row's
  //    `useStore` reads.
  // 4. The inject factories keep their shipped factory form: `slots.register`
  //    runs `options.inject(actions)` itself (`runInject`), so the original
  //    `(actions) => face` shape is exactly what 0.2.0-rc.2 wants. Only the
  //    face's contents change (step 7 adds the master-switch write entry), and
  //    step 0b already provides a store instance for the row's `useStore`.

  // 5. Drop the registration for the slot 0.2.0-rc.2 removed, and register the
  //    surviving row with its inject factory.
  replaceOnce(
    'plugins-page registration',
    `${TAB}${TAB}${TAB}ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({\n`
    + `${TAB}${TAB}${TAB}${TAB}name: "settings.plugin.item",\n`
    + `${TAB}${TAB}${TAB}${TAB}id: "aqua",\n`
    + `${TAB}${TAB}${TAB}${TAB}order: 5,\n`
    + `${TAB}${TAB}${TAB}${TAB}store: pluginStore,\n`
    + `${TAB}${TAB}${TAB}${TAB}locale: NS,\n`
    + `${TAB}${TAB}${TAB}${TAB}inject: pluginInjected\n`
    + `${TAB}${TAB}${TAB}}, AquaPluginCard));\n`
    + `${TAB}${TAB}${TAB}ctx.slots.inject("settings.general.item", () => ctx.slots.register({\n`
    + `${TAB}${TAB}${TAB}${TAB}name: "settings.general.item",\n`
    + `${TAB}${TAB}${TAB}${TAB}id: "aqua",\n`
    + `${TAB}${TAB}${TAB}${TAB}order: 11,\n`
    + `${TAB}${TAB}${TAB}${TAB}store: appearanceStore,\n`
    + `${TAB}${TAB}${TAB}${TAB}locale: NS,\n`
    + `${TAB}${TAB}${TAB}${TAB}inject: appearanceInjected\n`
    + `${TAB}${TAB}${TAB}}, AquaAppearanceRow));\n`,
    `${TAB}${TAB}${TAB}// PATCH(0.2.0-rc.2): \`settings.plugin.item\` no longer exists; the\n`
    + `${TAB}${TAB}${TAB}// master switch now lives at the top of the Appearance row below.\n`
    + `${TAB}${TAB}${TAB}ctx.slots.inject("settings.general.item", () => ctx.slots.register({\n`
    + `${TAB}${TAB}${TAB}${TAB}name: "settings.general.item",\n`
    + `${TAB}${TAB}${TAB}${TAB}id: "aqua",\n`
    + `${TAB}${TAB}${TAB}${TAB}order: 11,\n`
    + `${TAB}${TAB}${TAB}${TAB}store: appearanceStore,\n`
    + `${TAB}${TAB}${TAB}${TAB}locale: NS,\n`
    + `${TAB}${TAB}${TAB}${TAB}inject: appearanceInjected\n`
    + `${TAB}${TAB}${TAB}}, AquaAppearanceRow));\n`,
  )

  // 6. The moved master switch writes through this row's inject face, which did
  //    not carry a `setEnabled` entry before, and the component only destructures
  //    the actions it uses — so bind the new action before the JSX reads it.
  replaceOnce(
    'row setEnabled binding',
    `${TAB}${TAB}${TAB}const enabled = useStore((s) => s.enabled);\n`
    + `${TAB}${TAB}${TAB}const mode = useStore((s) => s.mode);\n`,
    `${TAB}${TAB}${TAB}const enabled = useStore((s) => s.enabled);\n`
    + `${TAB}${TAB}${TAB}const mode = useStore((s) => s.mode);\n`,
  )

  // 6b. The master switch must not depend on a prop the host may withhold:
  //     the write goes through the registered face when it is present, and the
  //     button stays inert instead of crashing the row when it is not.
  replaceOnce(
    'master switch handler',
    `${TAB}${TAB}${TAB}${TAB}${TAB}className: enabled ? AquaAppearanceRow_module_css_default.toggleOn : AquaAppearanceRow_module_css_default.toggle,\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}"aria-pressed": enabled,\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}onClick: () => {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}setEnabled(!enabled);\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}},\n`,
    `${TAB}${TAB}${TAB}${TAB}${TAB}className: enabled ? AquaAppearanceRow_module_css_default.toggleOn : AquaAppearanceRow_module_css_default.toggle,\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}"aria-pressed": enabled,\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}onClick: () => {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}// PATCH(0.2.0-rc.2): optional-call, so a missing injected action\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}// can never take the whole settings row down with it.\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}if (typeof props.setEnabled === "function") props.setEnabled(!enabled);\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}},\n`,
  )

  // 7. The moved master switch needs the matching write entry on that face.
  replaceOnce(
    'appearance setEnabled',
    `${TAB}${TAB}${TAB}${TAB}return {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}setMode: (mode) => {\n`,
    `${TAB}${TAB}${TAB}${TAB}return {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}// PATCH(0.2.0-rc.2): the master switch moved into this row, so\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}// its write entry has to live on this inject face too.\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}setEnabled: (enabled) => {\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}layer.setEnabled(enabled);\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}sync();\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}},\n`
    + `${TAB}${TAB}${TAB}${TAB}${TAB}setMode: (mode) => {\n`,
  )

  // 8. Let the ambient layer show across the whole surface. 0.2.0-rc.2 paints an
  //    opaque `--dsw-alias-bg-base` on the layout centre column and on the
  //    conversation root; both sit above the plugin's fixed `z-index:-1`
  //    ambient layer, so the fluid/wallpaper only showed in the sidebar (whose
  //    fill this theme already makes transparent). Append the override to the
  //    plugin's own stylesheet, matched on class-name fragments so a hashed
  //    build keeps matching.
  const cssTail = '[data-dsh-aqua] [data-aqua-critter=bubble]{opacity:0}}";'
  const layoutOverride = '[data-dsh-aqua] [class*=centerCol],'
    + '[data-dsh-aqua] [class*=rightbarCol],'
    + '[data-dsh-aqua] [data-testid=conversation],'
    + '[data-dsh-aqua] [class*=conversation],'
    + '[data-dsh-aqua] [class*=threadCol],'
    + '[data-dsh-aqua] [class*=chatCol],'
    + '[data-dsh-aqua] [class*=contentCol],'
    + '[data-dsh-aqua] [class*=mainCol],'
    + '[data-dsh-aqua] [class*=sessionCol]'
    + '{background:transparent!important}'
    // The right tool pane is a dockkit tab host whose `:not(._float_)` rule
    // paints `--dsw-alias-bg-base` over the whole column. Its own dock columns
    // are numbered from 0 too — exactly like the shell's left sidebar — so the
    // panel is identified through the right-sidebar container itself rather
    // than a column index.
    + '[data-dsh-aqua] [data-sidebar-right-panel] [data-dockkit-pane]'
    + '{background:transparent!important}'
    + '[data-dsh-aqua] [data-sidebar-right-panel] [data-dockkit-pane-body],'
    + '[data-dsh-aqua] [data-sidebar-right-panel] [data-dockkit-content]'
    + '{background-color:transparent!important}'
    + '[data-dsh-aqua] [data-sidebar-right-panel] [data-sidebar-right-session],'
    + '[data-dsh-aqua] [data-sidebar-right-panel] [data-sidebar-right-tab]'
    + '{background:transparent!important}'
    + 'body[data-windows-titlebar] [data-dsh-aqua] [class*=centerCol],'
    + 'body[data-windows-titlebar] [data-dsh-aqua] [class*=rightbarCol]'
    + '{border-radius:0!important}'
  replaceOnce(
    'ambient layout override',
    cssTail,
    `[data-dsh-aqua] [data-aqua-critter=bubble]{opacity:0}}${layoutOverride}";`,
  )

  // The old slot name intentionally survives inside the explanatory comment
  // written by the registration patch, so only the icon is re-checked here.
  if (src.includes(iconFrom)) throw new Error('icon rename: occurrences remain after patching')

  writeFileSync(file, src)
  return applied
}

// Direct invocation: patch the file named on the command line.
if (process.argv[1] !== undefined && process.argv[1].endsWith('patch-aqua.mjs') && process.argv[2] !== undefined) {
  const applied = patchBundle(process.argv[2])
  console.log(`patched ${process.argv[2]}: ${applied.join(', ')}`)
}
