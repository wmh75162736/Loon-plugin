# BiliBili Daily for Loon

基于 RayWangQvQ/BiliBiliToolPro 当前公开 API 组织方式整理的 Loon 插件模板。Cookie 只保存在 iOS 本地 Loon `$persistentStore`，不要把 Cookie 写进 GitHub 仓库、Actions Secret 或日志。

## 一键导入

[点击一键导入 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2FBiliBili%2Fbilibili.plugin)

Raw 插件地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/BiliBili/bilibili.plugin
```

外部脚本 Raw 地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/BiliBili/bilibili.js
```

## 文件结构

```text
Loon/Plugin/BiliBili/
├── README.md
├── bilibili.plugin
├── bilibili.js
└── upstream-api-manifest.json
```

## 使用方法

1. 点击上方一键导入链接，或在 Loon 中手动添加 Raw 插件地址。
2. 启用插件、启用 MitM，并信任 Loon 证书。
3. 打开 B 站 App，等待通知 `BiliBili Cookie 保存成功`。
4. 等待每天 `09:15` 自动运行，或在 Loon 中手动运行 `BiliBili Daily Tasks`。

## 自动同步

`.github/workflows/bilibili-sync.yml` 每天拉取 `RayWangQvQ/BiliBiliToolPro` 的接口定义，生成 `upstream-api-manifest.json`，并在接口清单变化时提交更新。

## 注意事项

- 本模板只提供签到、福利领取和状态查询骨架，接口可能随 B 站调整失效。
- 大会员福利、漫画福利、银瓜子兑换等接口在非会员、已领取、无余额或无次数时会返回失败提示，这是正常结果。
- 自动同步 workflow 只同步接口清单和发布文件，不同步用户 Cookie。
