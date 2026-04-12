## Context

用户（家长）每天需要监督女儿完成脊柱侧弯康复锻炼。锻炼包含多个项目，每个项目有固定的组数、每组持续时长和组间休息时长，项目之间也有休息间隔。目前完全依赖手动计时，操作复杂且缺乏历史记录。

这是一个全新项目，无现有代码基础。目标用户是家长和孩子，在手机上使用，需要简洁直观的界面。

## Goals / Non-Goals

**Goals:**
- 提供一键启动的自动化计时流程，按预设计划依次执行锻炼、休息、切换项目
- 计时过程中提供视觉和声音反馈（倒计时、状态变化提示音）
- 记录每次锻炼的执行情况，支持标记跳过或中途退出
- 提供直观的统计图表，展示当日完成情况和历史趋势
- 纯前端实现，无需后端服务器，数据本地存储
- 移动端优先的响应式设计，支持 PWA 离线使用

**Non-Goals:**
- 不做社交/分享功能
- 不做用户登录/注册系统
- 不做多设备数据同步（V1 仅本地）
- 不做视频/动画锻炼指导
- 不做智能推荐/自动调整锻炼计划

## Decisions

### 1. 技术栈：纯 HTML/CSS/JS + Vite 构建

**选择**: 使用 Vanilla JS（TypeScript）+ Vite 构建工具，不引入框架

**理由**: 
- 应用规模较小（单页应用，5-6 个视图），不需要 React/Vue 等框架的复杂度
- Vite 提供快速开发体验和优化的生产构建
- TypeScript 保证代码质量，同时保持轻量
- 更小的 bundle size，PWA 场景下加载更快

**替代方案**:
- React: 过重，这个应用的状态管理需求简单
- Vue: 可行但增加不必要的依赖
- 纯 HTML 无构建: 缺少 TypeScript 支持和模块化能力

### 2. 数据存储：IndexedDB（通过 idb 封装库）

**选择**: 使用 IndexedDB 存储所有数据，通过 `idb` 库简化 API

**理由**:
- 支持结构化数据存储，适合锻炼记录的复杂数据结构
- 存储容量远大于 localStorage（几百 MB vs 5-10 MB）
- 支持索引查询，方便按日期范围查询历史记录
- `idb` 库提供 Promise-based API，使用简便

**替代方案**:
- localStorage: 容量太小，不支持结构化查询
- SQLite (WASM): 过重，增加加载时间

### 3. 图表库：Chart.js

**选择**: 使用 Chart.js 实现统计可视化

**理由**:
- 轻量（~60KB gzipped），支持响应式
- 内置多种图表类型（柱状图、折线图、环形图），满足需求
- 社区活跃，文档完善
- 移动端触摸交互支持良好

**替代方案**:
- ECharts: 功能更强但 bundle 更大
- D3.js: 过于底层，开发成本高
- 自定义 Canvas/SVG: 开发量太大

### 4. 计时器引擎：基于状态机的 requestAnimationFrame 方案

**选择**: 使用有限状态机管理计时器状态，`requestAnimationFrame` + `performance.now()` 驱动计时

**理由**:
- 状态机清晰地管理计时器的各种状态（锻炼中、休息中、项目间休息、暂停、完成）
- `performance.now()` 比 `setInterval` 更精确，不受浏览器节流影响
- 结合 `requestAnimationFrame` 实现流畅的 UI 更新
- 使用 Web Audio API（`AudioContext` oscillator）生成提示音，无需加载音频文件

**替代方案**:
- setInterval: 浏览器后台会节流，不精确
- Web Worker: 增加复杂度，V1 暂不需要

### 5. 会话崩溃恢复：localStorage 快照

**选择**: 使用 localStorage 对进行中的锻炼状态做秒级快照，页面重载时自动恢复

**理由**:
- 锻炼一次持续几十分钟，误刷新页面或误触返回键会导致全部进度丢失，严重伤害用户信任
- localStorage 是同步 API，写入延迟极低（<1ms），适合高频快照（每秒或每次状态变更）
- IndexedDB 是异步的，不适合这种"必须在 `beforeunload` 前写完"的场景
- 快照数据量小（当前项目索引、组号、剩余秒数、已完成记录），几 KB 以内

**方案细节**:
- 计时器每次状态变更（组切换、阶段切换）时写入 `localStorage.setItem('workout-snapshot', JSON.stringify(state))`
- 页面 `mount` 时检查 `workout-snapshot` 是否存在且 `status !== 'completed'`，如存在则提示用户"检测到未完成的锻炼，是否恢复？"
- 锻炼正常结束或用户主动放弃时清除快照

**替代方案**:
- IndexedDB: 异步写入在 `beforeunload` 中不可靠
- sessionStorage: 关闭标签页后丢失，不能覆盖"浏览器崩溃重启"场景
- 不做恢复: 用户体验不可接受

### 6. iOS AudioContext 解锁策略

**选择**: 在"开始锻炼"按钮的点击事件中创建并 `resume()` AudioContext，确保后续所有声音可自动播放

**理由**:
- iOS Safari 和大部分移动浏览器要求 AudioContext 必须在用户手势（touch/click）的事件回调中首次创建或 resume
- 如果在非用户手势上下文中调用 `audioCtx.resume()`，会被静默拦截，导致整个锻炼过程无声音提示
- "开始锻炼"按钮是天然的交互入口，在此处初始化 AudioContext 不增加任何额外操作

**方案细节**:
- `audio.ts` 模块延迟初始化：`init()` 方法必须在用户手势事件中调用
- `init()` 内部创建 `AudioContext`，播放一个静音的 0.01 秒 oscillator 音（解锁音频通道）
- 后续所有提示音复用同一个 AudioContext 实例

### 7. 业务日期边界定义

**选择**: 以凌晨 4:00 作为"业务日"分界线

**理由**:
- 锻炼可能在深夜 23:45 开始，次日 0:20 结束。如果以自然日 00:00 为界，这次锻炼会被错误归入次日
- 定义凌晨 4:00 为分界线后，00:00-03:59 之间的活动仍算作"前一天"
- 这是运动/健身类应用的通行做法（如 Apple Health、Fitbit 均有类似逻辑）

**方案细节**:
- `utils/date.ts` 提供 `getBusinessDate(timestamp: number): string` 函数
- 如果当前时间的小时 < 4，则返回前一天的日期字符串
- 所有记录存储、streak 计算、日历展示均使用 business date 而非 raw date

### 8. 应用架构：模块化单页应用

**选择**: 基于 Hash 路由的 SPA，按功能模块划分代码

```
src/
  main.ts          # 入口
  router.ts        # Hash 路由
  state.ts         # 全局状态管理（简单 pub/sub）
  db.ts            # IndexedDB 数据层
  timer/           # 计时器引擎
    engine.ts      # 状态机 + 计时逻辑
    audio.ts       # 声音提示
    snapshot.ts    # 锻炼状态快照（崩溃恢复）
  utils/           # 工具函数
    date.ts        # 业务日期计算（凌晨4点分界）
  views/           # 页面视图
    home.ts        # 首页（开始锻炼 + 快捷入口）
    workout.ts     # 锻炼执行页
    complete.ts    # 完成统计页
    history.ts     # 历史记录页
    config.ts      # 配置管理页
  components/      # 可复用 UI 组件
    timer-display.ts
    progress-bar.ts
    chart-wrapper.ts
  styles/          # CSS
    main.css
    variables.css
```

**理由**:
- 清晰的关注点分离
- 不引入框架的前提下保持代码组织性
- Hash 路由简单可靠，无需服务端配置

### 9. IndexedDB 版本迁移框架

**选择**: 在 `db.ts` 中实现基于 `idb` 库 `upgrade` 回调的版本迁移链

**理由**:
- V1 已有 3 个 object store（config, sessions, metadata），后续版本可能新增字段或 store
- IndexedDB 原生支持 `onupgradeneeded` 事件，`idb` 库将其封装为 `upgrade(db, oldVersion, newVersion)` 回调
- 需要一个有序的迁移链，确保从任意旧版本到最新版本的平滑升级

**方案细节**:
- `db.ts` 中维护一个 `DB_VERSION` 常量和迁移函数数组 `migrations: Array<(db, tx) => void>`
- `openDB('exercise-tracker', DB_VERSION, { upgrade(db, oldVersion) { for (let v = oldVersion; v < DB_VERSION; v++) migrations[v]?.(db, tx); } })`
- V1 migration（version 0→1）：创建 `config`、`sessions`、`metadata` 三个 store
- 后续版本只需追加 migration 函数，无需修改已有逻辑

**替代方案**:
- 不做版本管理：首次部署可行，但后续无法安全修改 schema
- 外部迁移库：过重，`idb` 已内置足够的迁移支持

## Risks / Trade-offs

- **[浏览器后台节流]** → 当手机屏幕关闭或切到其他 App 时，计时器可能不准确。**缓解**: 使用 `performance.now()` 计算经过时间而非累加间隔；添加 `visibilitychange` 事件监听，恢复时重新校准。
- **[数据仅本地存储]** → 清除浏览器数据会丢失所有记录。**缓解**: V1 提供 JSON 导出/导入功能；未来可考虑云同步。
- **[无框架的维护性]** → 如果功能持续扩展，Vanilla JS 的状态管理可能变得复杂。**缓解**: 保持模块化设计；如果需求扩展显著，可迁移到轻量框架（Preact/Solid）。
- **[PWA 兼容性]** → 部分旧浏览器不支持 Service Worker。**缓解**: 应用核心功能不依赖 SW，离线只是增强体验。
- **[声音提示被系统静音]** → 手机在静音模式下可能听不到提示音。**缓解**: 同时提供振动反馈（`navigator.vibrate`）和视觉闪烁提示。
- **[锻炼中途页面意外刷新]** → 误触返回键或浏览器崩溃会丢失当前进度。**缓解**: localStorage 秒级快照 + 页面加载时自动检测恢复（见 Decision 5）。
- **[iOS 音频被静默拦截]** → 未经用户手势解锁的 AudioContext 在 iOS Safari 上无法播放。**缓解**: 在"开始锻炼"按钮点击事件中初始化 AudioContext（见 Decision 6）。
- **[跨夜锻炼日期归属]** → 23:45 开始 00:20 结束的锻炼会被错误归入次日。**缓解**: 使用凌晨 4:00 作为业务日分界线（见 Decision 7）。
