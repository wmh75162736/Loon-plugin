# BiliBili Daily for Loon

基于 RayWangQvQ/BiliBiliToolPro 当前公开 API 组织方式整理的 Loon 插件。B 站 App 对 MITM 不友好，本插件不再要求拦截 App；Cookie 可以通过 Safari 网页端捕获，或手动粘贴保存。

Cookie 只保存在 iOS 本地 Loon `$persistentStore`，不要把 Cookie 写进 GitHub 仓库、Actions Secret 或日志。

## 一键导入

[点击一键导入 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2FBiliBili%2Fbilibili.plugin)

Raw 插件地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/BiliBili/bilibili.plugin
```

## Cookie 获取

推荐方式：网页捕获

1. Loon 中启用插件，并开启 `网页获取 Cookie`。
2. 启用 MitM，信任 Loon 证书。
3. 用 Safari 打开 `https://www.bilibili.com` 并登录。
4. 登录后刷新首页或打开个人页，看到 `BiliBili Cookie 保存成功` 通知即可。

备用方式：手动保存

1. 在电脑浏览器登录 `https://www.bilibili.com`。
2. 打开开发者工具，复制任意已登录请求的 `Cookie` 请求头。
3. 在插件设置的 `手动 Cookie` 中粘贴 Cookie。
4. 打开 `显示 Cookie 工具`，运行 `BiliBili_保存Cookie`。

## 设置项

- `每日自动任务`: 总开关。
- `开始小时` / `开始分钟`: 设置每天首次执行时间。脚本每 5 分钟唤醒一次，到点后当天只执行一次。
- `显示立即运行`: 打开后可手动运行 `BiliBili_立即运行`。
- `显示 Cookie 工具`: 打开后可运行保存 Cookie、查看状态、清除 Cookie。
- `每日经验状态`、`直播签到`、`漫画签到`、`漫画会员福利`、`大会员每月福利`、`大会员大积分签到`、`银瓜子兑换硬币`: 子任务开关。
- `通知模式`: `always` 始终通知，`failure` 仅失败/缺 Cookie 通知，`never` 不通知。

## 文件结构

```text
Loon/Plugin/BiliBili/
├── README.md
├── bilibili.plugin
├── bilibili.js
└── upstream-api-manifest.json
```

## 自动同步

`.github/workflows/bilibili-sync.yml` 每天拉取 `RayWangQvQ/BiliBiliToolPro` 的接口定义，生成 `upstream-api-manifest.json`，并在接口清单变化时提交更新。

## 注意事项

- 自动任务请求不依赖 MITM；MITM 只用于网页端 Cookie 捕获。
- 本插件只提供签到、福利领取和状态查询骨架，接口可能随 B 站调整失效。
- 大会员福利、漫画福利、银瓜子兑换等接口在非会员、已领取、无余额或无次数时会返回失败提示，这是正常结果。
- 自动同步 workflow 只同步接口清单和发布文件，不同步用户 Cookie。
