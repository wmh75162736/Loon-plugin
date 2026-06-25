# BiliBili Loon Automation Template

基于 RayWangQvQ/BiliBiliToolPro 当前公开 API 组织方式整理的 Loon 插件模板。Cookie 只保存在 iOS 本地 Loon `$persistentStore`，不要把 Cookie 写进 GitHub 仓库、Actions Secret 或日志。

## Core files

```text
BiliBili/
├── README.md
├── bilibili.plugin
└── scripts/
    └── bilibili.js
```

## Deploy

本插件已部署在：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/BiliBili/bilibili.plugin
```

如启用 GitHub Pages，也可使用：

```text
https://wmh75162736.github.io/Loon-plugin/bilibili.plugin
```

## Use

1. Loon 安装插件并启用 MitM，信任证书。
2. 打开 B 站 App，等待通知 `BiliBili Cookie 保存成功`。
3. 等待每天 `09:15` 自动运行，或在 Loon 里手动运行 `BiliBili Daily Tasks`。

## Notes

- 本模板只提供签到、福利领取和状态查询骨架，接口可能随 B 站调整失效。
- 大会员福利、漫画福利、银瓜子兑换等接口在非会员、已领取、无余额或无次数时会返回失败提示，这是正常结果。
- 自动同步 workflow 只同步接口清单和发布文件，不同步用户 Cookie。
