# 呆呆面板模块化自适应同步插件

## 插件信息

- **插件名称**: 呆呆面板模块化自适应同步插件
- **作者**: -
- **更新日期**: 2026-07-14
- **插件图标**: ![Auto_Sync](https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto_Sync.png)

## 一键导入

[点击一键导入 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2FSyncDai%2Fdaipanel_sync.plugin)

Raw 插件地址：
```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/SyncDai/daipanel_sync.plugin
```

## 功能简介

本插件用于自动化同步多个应用的账号数据到呆呆面板，采用模块化设计，支持灵活扩展。

### 主要功能

- ✅ 自动抓取并同步腾讯视频 Cookie
- ✅ 自动抓取并同步小米商城抽奖活动数据
- ✅ 自动抓取并同步 WPS 活动数据
- ✅ 防重复推送机制（5分钟冷却时间）
- ✅ 同步成功/失败通知提醒

## 架构设计

插件采用**解耦模块化架构**，分为两层：

```
┌─────────────────────────────────────┐
│        业务拦截层 (Capture)          │
│  ┌──────────┬──────────┬──────────┐ │
│  │ 腾讯视频  │ 小米商城  │   WPS    │ │
│  │ Capture  │ Capture  │ Capture  │ │
│  └──────────┴──────────┴──────────┘ │
└─────────────────────────────────────┘
                  ↓ 数据总线
┌─────────────────────────────────────┐
│       核心同步底座 (Core)            │
│    daipanel_sync_core.js            │
│    (与呆呆面板 API 交互)             │
└─────────────────────────────────────┘
```

### 优势

- **易扩展**: 新增 App 只需编写 capture 脚本，无需修改核心模块
- **低耦合**: 业务逻辑与同步逻辑分离
- **可维护**: 模块独立，便于调试和更新

## 支持的应用

### 1. 腾讯视频

- **变量名**: `TENV_COOKIE`
- **抓取内容**: 腾讯视频 Cookie（含 `vqq_refresh_token`）
- **匹配规则**: `^https:\/\/pbaccess\.video\.qq\.com`

### 2. 小米商城

- **变量名**: `MI_LOTTERY`
- **抓取内容**: `actId#cookie#mishopClientId`
- **匹配规则**: `^https:\/\/shop-api\.retail\.mi\.com\/mtop\/navi\/venue\/batch`

### 3. WPS

- **匹配规则**: `^https:\/\/personal-act\.wps\.cn\/activity-rubik\/activity\/page_info`

## 使用方法

### 前置要求

1. 已安装 Loon 客户端
2. 已配置呆呆面板并获取 App Key 和 App Secret

### 安装步骤

1. 在 Loon 中添加插件仓库
2. 启用 `呆呆面板模块化自适应同步插件`
3. 确保 MITM 配置正确

### MITM 配置

需添加以下域名到 MITM：

```
pbaccess.video.qq.com
shop-api.retail.mi.com
personal-act.wps.cn
```

## 工作流程

```
用户触发请求
    ↓
业务脚本捕获数据
    ↓
写入数据总线 (DAIPANEL_SYNC_QUEUE)
    ↓
唤醒核心同步脚本
    ↓
调用呆呆面板 API
    ↓
同步环境变量到面板
    ↓
发送通知提醒
```

## 文件说明

| 文件名 | 说明 |
|--------|------|
| `daipanel_sync.plugin` | 插件主配置文件 |
| `daipanel_sync_core.js` | 核心同步模块，负责 API 交互 |
| `daipanel_capture_vqq.js` | 腾讯视频数据抓取模块 |
| `daipanel_capture_mi.js` | 小米商城数据抓取模块 |
| `daipanel_capture_wps.js` | WPS 数据抓取模块 |

## 注意事项

1. 请勿修改核心模块中的 App Key 和 App Secret
2. 数据同步采用防重复机制，同一变量 5 分钟内不会重复推送
3. 如遇同步失败，请检查网络连接和面板服务状态

## 更新日志

### 2026-07-14
- 初始版本发布
- 支持腾讯视频、小米商城、WPS 数据同步
- 实现模块化架构设计