## ADDED Requirements

### Requirement: 持久化锻炼配置
系统 SHALL 将锻炼计划配置持久化存储到 IndexedDB 中。

#### Scenario: 保存配置
- **WHEN** 用户修改锻炼计划配置
- **THEN** 配置数据自动保存到 IndexedDB，下次打开应用时自动加载

#### Scenario: 首次使用加载默认配置
- **WHEN** IndexedDB 中不存在配置数据
- **THEN** 系统创建并保存默认的脊柱侧弯锻炼计划配置

### Requirement: 持久化锻炼历史
系统 SHALL 将所有锻炼记录持久化存储到 IndexedDB 中。

#### Scenario: 保存锻炼记录
- **WHEN** 一次锻炼结束（正常或提前结束）
- **THEN** 完整的锻炼记录保存到 IndexedDB

#### Scenario: 查询历史记录
- **WHEN** 用户打开历史记录页面
- **THEN** 系统从 IndexedDB 中按日期降序查询并展示锻炼记录

### Requirement: 持久化统计元数据
系统 SHALL 将派生统计数据（如最长连续锻炼天数）持久化到 IndexedDB 中，避免每次启动重新遍历全部历史。

#### Scenario: 保存最长连续天数
- **WHEN** 一次锻炼记录保存后，系统重新计算当前 streak
- **THEN** 如果当前 streak > 已保存的 `maxStreak`，则更新 `maxStreak` 值到 IndexedDB `metadata` store

#### Scenario: 读取最长连续天数
- **WHEN** 首页或历史记录页加载
- **THEN** 系统从 `metadata` store 读取 `maxStreak` 值用于展示，无需遍历全部历史记录

### Requirement: 数据导出
系统 SHALL 支持将所有数据导出为 JSON 文件。

#### Scenario: 导出所有数据
- **WHEN** 用户点击「导出数据」按钮
- **THEN** 系统将所有锻炼配置和历史记录打包为 JSON 文件并触发下载

### Requirement: 数据导入
系统 SHALL 支持从 JSON 文件导入数据。

#### Scenario: 导入备份数据
- **WHEN** 用户选择一个有效的 JSON 备份文件并确认导入
- **THEN** 系统将导入的配置和历史记录合并到现有数据中

#### Scenario: 导入合并 — 锻炼记录去重
- **WHEN** 导入文件包含与本地相同 `sessionId` 的锻炼记录
- **THEN** 跳过该重复记录，保留本地版本不覆盖

#### Scenario: 导入合并 — 配置覆盖策略
- **WHEN** 导入文件包含锻炼配置
- **THEN** 系统提示用户选择「保留本地配置」或「使用导入的配置覆盖」，默认保留本地

#### Scenario: 导入合并 — metadata 取较大值
- **WHEN** 导入文件包含 `maxStreak` 等统计元数据
- **THEN** 系统取本地值与导入值中的较大者作为合并结果

#### Scenario: 导入无效文件
- **WHEN** 用户选择一个格式错误的文件
- **THEN** 系统显示错误提示「文件格式无效」，不修改现有数据
