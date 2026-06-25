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

说明：由青龙 Node 脚本无损重构为 Loon 专用定时任务，用于中视频账号的自动化日常任务。脚本只在 Loon 环境中运行，入口会检查 `$httpClient`、`$persistentStore`、`$done`，避免误放到青龙或普通 Node.js 环境执行。账号、设备码缓存和运行配置只保存在 Loon 本地或插件参数中，不会上传到 GitHub。

登录方式：
1. 先在中视频平台完成注册、本人认证，并获取商户密钥。
2. 商户密钥通常包含 `secretId` 和 `secretKey`，这是脚本登录接口使用的凭据。
3. 在 Loon 导入插件后，进入插件参数页，填写 `zsp` 账号配置。
4. 单账号格式：`备注#secretId#secretKey`。
5. 固定设备码格式：`备注#secretId#secretKey#deviceId`。不填写 `deviceId` 时，脚本会首次自动生成 32 位设备码并写入 Loon `$persistentStore`，后续固定复用。
6. 多账号可用换行 `\n` 或 `||` 分隔，例如：`账号1#secretId#secretKey||账号2#secretId#secretKey#deviceId`。
7. 如果 Loon 参数页对 `#` 解析异常，可把 `#` 写成 `%23`。

功能：
- 商户密钥登录并获取 `token`。
- 每日签到，已签到时自动继续后续任务。
- 可选 CDK 自动兑换，参数名为 `ZSP_CDK`。
- 每日抽奖，抽奖次数用完时自动跳过。
- 自动获取广告、上报播放开始、按广告时长等待、上报播放结束。
- 默认最多执行 50 次广告任务，可在 `maxAds` 参数中调整。
- 连续 3 次广告任务异常后自动重新登录并继续。
- 多账号顺序执行，账号之间默认等待 5 秒。
- 任务结束后可发送运行摘要通知，可通过 `notify` 开关控制。

插件参数：
- `zsp`：账号配置，必填。格式为 `备注#secretId#secretKey`，可追加 `#deviceId`。
- `ZSP_CDK`：CDK 兑换码，可选，留空则跳过兑换。
- `maxAds`：广告任务次数，默认 `50`。
- `notify`：运行通知开关，默认开启。

注意事项：
- 广告任务会按接口返回的视频时长真实等待，完整运行可能耗时较长，插件超时已设置为 `3600` 秒。
- 如账号失效、密钥错误、平台接口变更或网络异常，脚本会在 Loon 日志中输出失败原因。
- 该插件是定时任务，不需要配置 MITM。

插件 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/Video/%E4%B8%AD%E8%A7%86%E9%A2%91.plugin

外部脚本 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/Video/zhongshipin.loon.js

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
