# 52FRP 自动签到

## 生成信息

- 生成时间：2026-06-20 13:38:30（UTC+09:00）
- 脚本版本：v1
- 脚本路径：`loon/js/52frp checkin/52frpCheckin-v1.js`
- 适用客户端：Loon（iOS）

## 文件说明

| 文件 | 用途 |
|---|---|
| `52frpCheckin-v1.js` | 自动签到、登录态保存和真实签到接口临时捕获脚本；文件顶部包含完整 Loon 插件配置。 |
| `README.md` | 生成信息、功能说明与使用教程。 |

## GitHub Raw 地址

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Js/52frpChekin/52frpCheckin-v1.js
```

## 功能

- 每天 `08:10` 自动检查 52FRP 签到状态。
- 未签到时请求已捕获的真实签到接口。
- 已签到时不重复提交，输出简洁结果。
- 记录 Cookie、Token、请求头和真实签到接口，登录态失效后可重新捕获。
- 日志显示日期、签到状态、累计签到、连续签到、本次获得流量和累计获得流量。
- 临时捕获规则默认关闭，避免长期影响登录页和用户中心。

## Loon 插件配置

在 Loon 的“插件”中新增插件，粘贴以下完整配置：

```ini
#!name=52FRP 自动签到
#!desc=52FRP 每日签到 + 临时捕获真实签到接口 v1
#!author=ChatGPT
#!homepage=https://www.52frp.com
#!icon=https://www.52frp.com/favicon.ico

[Script]
# 临时捕获接口：默认关闭；仅在首次保存登录态或登录态失效后开启。
http-request ^https?:\/\/www\.52frp\.com\/api\/(?!.*(?:auth\/login|auth\/register|login|logout|captcha|verify|sms|password|reset)).* script-path=https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/loon/js/52frp%20checkin/52frpCheckin-v1.js, requires-body=true, timeout=10, tag=52FRP 临时捕获接口, enable=false

# 每日自动签到：每天 08:10 运行。
cron "10 8 * * *" script-path=https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/loon/js/52frp%20checkin/52frpCheckin-v1.js, timeout=60, tag=52FRP 每日签到, enable=true

[MITM]
hostname = www.52frp.com
```

## 首次使用

1. 将 `52frpCheckin-v1.js` 和本 README 上传到上述 GitHub 路径。
2. 在 Loon 中导入上方插件配置，并确认已安装和信任 Loon MITM 证书。
3. 保持“52FRP 临时捕获接口”为关闭状态，打开 52FRP 网站正常登录。
4. 登录后进入个人主页，手动开启“52FRP 临时捕获接口”。
5. 在 52FRP 页面点击一次“立即签到”。
6. Loon 日志或通知出现“签到接口已捕获”后，立即关闭“52FRP 临时捕获接口”。
7. 保持“52FRP 每日签到”开启，脚本会在每天 08:10 自动运行。

## 日常使用

- 只需开启“52FRP 每日签到”。
- “52FRP 临时捕获接口”必须保持关闭。
- 如果收到“未保存登录态”或“登录态可能失效”，重新执行一次“首次使用”的第 3 至第 6 步。

## 日志示例

```text
2026 年 6 月 20 日
今日已签到
累计签到：2天
连续签到：2天
本次获得：302.68MB
累计获得：788.61MB
```

## 注意事项

- 本脚本仅用于个人账号正常签到。
- 不包含验证码绕过、登录破解或异常请求逻辑。
- 不建议长期启用临时捕获接口；捕获完成后关闭可减少对网页访问的影响。
