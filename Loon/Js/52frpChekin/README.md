# 52FRP 自动签到

## 生成信息

- 更新时间：2026-06-23
- 脚本版本：v1.6
- 脚本路径：`Loon/Js/52frpChekin/52frpCheckin-v1.js`
- 适用客户端：Loon（iOS）

## 文件说明

| 文件 | 用途 |
|---|---|
| `52frpCheckin-v1.js` | 自动签到、登录态保存、登录凭据保存、自动登录续期和签到令牌获取脚本；文件顶部包含完整 Loon 插件配置。 |
| `52frpCheckin-v1.3-test.js` | 只测试签到令牌接口，不提交签到。 |
| `README.md` | 功能说明与使用教程。 |

## GitHub Raw 地址

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Js/52frpChekin/52frpCheckin-v1.js
```

## 功能

- 每天 `08:10` 自动检查 52FRP 签到状态。
- 未签到时获取新的 `slider_token`，等待 10 秒后提交真实签到接口。
- 已签到时不重复提交，输出简洁结果。
- 记录 Cookie、Token、请求头和登录态。
- 可选保存 52FRP 用户名/密码到 Loon 本地持久化存储。
- Bearer Token 快过期或接口返回 401 时，自动调用登录接口换取新 Token。
- 日志显示日期、签到状态、累计签到、连续签到、本次获得流量和累计获得流量。
- 临时捕获规则默认关闭，避免长期影响网页访问。

## Loon 插件配置

在 Loon 的“插件”中新增插件，粘贴以下完整配置：

```ini
#!name=52FRP 自动签到
#!desc=52FRP 每日签到 + 自动登录续期 + 官方时序等待 v1.6
#!author=ChatGPT
#!homepage=https://www.52frp.com
#!icon=https://www.52frp.com/favicon.ico

[Script]
# 临时捕获登录凭据：默认关闭；仅在你接受本地保存账号密码时开启一次。
http-request ^https?:\/\/www\.52frp\.com\/api\/user\/login(?:\?|$) script-path=https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Js/52frpChekin/52frpCheckin-v1.js, requires-body=true, timeout=10, tag=52FRP 临时捕获登录凭据, enable=false

# 临时捕获登录态：默认关闭；需要重新抓 Cookie / Token 时开启。
http-request ^https?:\/\/www\.52frp\.com\/api\/(?!.*(?:auth\/login|auth\/register|login|logout|captcha|verify|sms|password|reset)).* script-path=https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Js/52frpChekin/52frpCheckin-v1.js, timeout=10, tag=52FRP 临时捕获登录态, enable=false

# 每日自动签到：每天 08:10 运行。
cron "10 8 * * *" script-path=https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Js/52frpChekin/52frpCheckin-v1.js, timeout=60, tag=52FRP 每日签到, enable=true

# 签到令牌测试：默认关闭，仅用于手动运行。
cron "0 0 1 1 *" script-path=https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Js/52frpChekin/52frpCheckin-v1.js, argument=token-test, timeout=60, tag=52FRP 签到令牌测试, enable=false

[MITM]
hostname = www.52frp.com
```

## 首次使用

1. 在 Loon 中导入上方插件配置，并确认已安装和信任 Loon MITM 证书。
2. 保持“52FRP 临时捕获登录态”和“52FRP 临时捕获登录凭据”为关闭状态。
3. 打开 52FRP 网站并正常登录。
4. 登录后进入个人主页，手动开启“52FRP 临时捕获登录态”。
5. 刷新个人主页，等待出现“登录态已捕获”，然后关闭该脚本。
6. 如需自动登录续期，手动开启“52FRP 临时捕获登录凭据”。
7. 在 52FRP 登录页重新正常登录一次，等待出现“登录凭据已保存”，然后立即关闭该脚本。
8. 保持“52FRP 每日签到”开启。

## 日常使用

- 只需开启“52FRP 每日签到”。
- “52FRP 临时捕获登录态”和“52FRP 临时捕获登录凭据”都应保持关闭。
- 如果收到“自动登录续期失败”或服务端后续要求验证码，重新执行首次使用中的登录态/登录凭据捕获步骤。

## 日志示例

```text
2026 年 6 月 23 日
签到完成
累计签到：4天
连续签到：1天
本次获得：245.90MB
累计获得：1.17GB
```

## 注意事项

- 自动登录续期需要把 52FRP 用户名/密码保存到 Loon 本地持久化存储。
- 本脚本不会把账号密码写入 GitHub 脚本文件。
- 本脚本不包含验证码绕过、登录破解或异常请求逻辑。
- 如果 52FRP 登录接口后续加入滑块、验证码或更强风控，自动登录续期可能失效。
- 临时捕获脚本只在保存登录态或登录凭据时开启，用完立即关闭。
