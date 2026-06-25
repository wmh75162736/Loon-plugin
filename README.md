# Loon Plugin

这是个人维护的 Loon 插件与外部 JavaScript 脚本仓库。

每个插件放在独立目录下，插件入口通过 GitHub Raw 引用外部 JS 脚本进行功能扩展，以便于维护与更新。

## BiliBili Daily

说明：用于 B 站网页端 Cookie 捕获/手动 Cookie 保存，并尽量复刻 BiliBiliToolPro DailyTask：登录详情、每日状态、观看视频、分享视频、目标投币/保留硬币/LV6 跳过、直播签到、漫画签到、大会员福利与大积分签到任务。Cookie 只保存在 Loon 本地 `$persistentStore`，不会上传到 GitHub。

插件 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/BiliBili/bilibili.plugin

外部脚本 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/BiliBili/bilibili.js

一键导入 Loon：
https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2FBiliBili%2Fbilibili.plugin

## 中视频

说明：由青龙 Node 脚本无损重构为 Loon 专用定时任务，用于中视频账号自动化日常任务。脚本只在 Loon 环境运行，入口会检查 `$httpClient`、`$persistentStore`、`$done`，避免误放到青龙或普通 Node.js 环境执行。

本版已改为“先保存账号、再运行任务”的 Loon 专用流程。插件设置里的 `secretId/secretKey` 或多账号 `zsp` 需要先通过 `中视频_保存账号` 写入 Loon 本地 `$persistentStore`，每日任务和立即运行任务只读取已保存账号，避免 Loon 参数层把 `#secretId#secretKey` 或空占位符传坏。

兼容说明：按 Loon 官方文档，插件输入项应使用 `#!input` / `#!select`，脚本通过 `$persistentStore.read(参数名)` 读取。当前版本已改为这种方式，`secretId` 和 `secretKey` 不再通过 `argument` 传递。

登录方式：
1. 先在中视频平台完成注册、本人认证，并获取商户密钥。
2. 单账号推荐在插件设置里分别填写 `accountRemark`、`secretId` 和 `secretKey`。
3. 多账号使用 `zsp`，格式为 `备注#secretId#secretKey`，可追加 `#deviceId`。脚本也兼容 `备注＃secretId＃secretKey` 和 `备注%23secretId%23secretKey`。
4. 多账号在 Loon 输入框里建议用 `||` 分隔，例如：`账号1#secretId#secretKey||账号2#secretId#secretKey#deviceId`。
5. 填写或修改账号后，必须手动运行一次 `中视频_保存账号`。
6. 再运行 `中视频_查看状态`，确认账号数量不是 0 后执行每日任务或立即运行。

功能：
- 商户密钥登录并获取 `token`。
- 每日签到，已签到时自动继续后续任务。
- 可选 CDK 自动兑换。
- 每日抽奖，抽奖次数用完时自动跳过。
- 自动获取广告、上报播放开始、按广告时长等待、上报播放结束。
- 默认最多执行 50 次广告任务，可在 `广告次数` 参数中调整。
- 连续 3 次广告任务异常后自动重新登录并继续。
- 多账号顺序执行，账号之间默认等待 5 秒。
- 任务结束后可发送运行摘要通知。
- 支持查看和清除本地保存账号。

插件 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/Video/%E4%B8%AD%E8%A7%86%E9%A2%91.plugin

外部脚本 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/Video/zhongshipin.loon.js

详细 README：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/Video/README.md

一键导入 Loon：
https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2FVideo%2F%25E4%25B8%25AD%25E8%25A7%2586%25E9%25A2%2591.plugin

## 123云盘去广告

说明：用于过滤 123 云盘 App 与网页分享页中的广告、开屏、插屏、活动弹窗、横幅和推广文案；不处理会员权益、下载限制、流量限制或下载鉴权。

插件 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/123Pan/123pan.plugin

外部脚本 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/123Pan/123pan-ad.js

一键导入 Loon：
https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2F123Pan%2F123pan.plugin
