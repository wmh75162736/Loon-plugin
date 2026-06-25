# BiliBili Daily for Loon

基于 RayWangQvQ/BiliBiliToolPro 当前公开 API 组织方式整理的 Loon 插件。DailyTask 主流程尽量复刻原版：登录详情、每日任务状态、观看/分享跳过判断、目标投币、保留硬币、LV6 跳过投币。B 站 App 对 MITM 不友好，本插件不再要求拦截 App；Cookie 可以通过 Safari 网页端捕获，或手动粘贴保存。

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
- `显示立即投币`: 打开后可手动运行 `BiliBili_立即投币`，用于验证投币链路；该入口会显式启用投币。
- `显示 Cookie 工具`: 打开后可运行保存 Cookie、查看状态、清除 Cookie。
- `每日经验状态`、`观看视频`、`分享视频`、`直播签到`、`漫画签到`、`漫画会员福利`、`大会员B币券/权益`、`大会员大积分签到`、`银瓜子兑换硬币`: 子任务开关。
- `投币任务`: 默认关闭，因为会消耗账号硬币；开启后按 `目标投币数`、`保留硬币`、`LV6 跳过投币`、`投币尝试次数` 和 `投币时点赞` 执行。
- `投币模式`: 默认 `off`。如果 Loon 的 switch 开关传参异常，改成 `on` 可强制启用投币。
- `目标投币数`: 原版默认 5，范围 0-5。插件仍保持投币总开关默认关闭，避免误消耗硬币。
- `投币尝试次数`: 原版最多尝试 10 次；Loon 默认 6 次，最大 10，用于降低移动端超时概率。
- `通知模式`: `always` 始终通知，`failure` 仅失败/缺 Cookie 通知，`never` 不通知。

## 日志

脚本会同时输出 iOS 通知和 Loon 运行日志。运行日志中会显示启动参数、投币开关解析结果和完整任务流水。若通知显示投币未开启，请打开运行日志查看：

```text
BiliBili Daily 启动: action=..., taskDonateCoin=..., donateMode=..., coinTarget=...
```

如果 `taskDonateCoin` 没有正确变成开启值，把 `投币模式` 设置为 `on`，或开启 `显示立即投币` 后运行 `BiliBili_立即投币`。

## 登录方式

不支持账号密码登录。原版 BiliBiliToolPro 当前也是扫码登录和 Cookie 持久化，没有实现 B 站账号密码登录。账号密码登录涉及验证码、风控、短信/二次验证和密码安全，不适合放进 Loon 插件参数。推荐继续使用 Safari 网页捕获 Cookie 或手动粘贴 Cookie。

## DailyTask 复刻范围

已复刻：

- 登录后展示用户名、会员类型、会员状态、硬币余额、当前经验和等级。
- 观看/分享前查询每日任务状态，已完成则跳过。
- 观看视频按原版方式先打开视频，再上报一次播放进度。
- 投币前查询今日已投、目标欲投、还需再投。
- 投币前检查硬币余额、保留硬币和 LV6 跳过配置。
- 投币时检查单视频已投币数量，避免明显超过单视频上限。
- 大会员B币券/权益调用原版同源接口，`type=1` 为年度大会员每月 B 币券，`type=2` 为大会员权益。

为保证 Loon 稳定运行而简化：

- 投币候选默认从排行榜选择；原版支持配置 UP、特别关注、普通关注多级筛选，其中部分接口需要 WBI/风控参数，移动端 Loon 中不默认启用。
- 投币循环默认最多尝试 6 次，避免触发 Loon 脚本超时。

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
- 本插件提供签到、观看、分享、可选投币、福利领取和状态查询，接口可能随 B 站调整失效。
- 大会员B币券/权益、漫画福利、银瓜子兑换等接口在非会员、已领取、无余额或无次数时会返回失败提示，这是正常结果。
- `大会员大积分签到` 若返回 `-401 非法访问`，通常是 B 站限制网页 Cookie 调用该接口，可在插件设置中关闭这个子任务。
- 自动同步 workflow 只同步接口清单和发布文件，不同步用户 Cookie。
