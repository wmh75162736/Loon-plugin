# 什么值得买每日签到

适用于 Loon 的什么值得买 App 每日签到插件。脚本根据抓包中的 App 端接口构建，使用 `user-api.smzdm.com/checkin` 获取 Cookie 并定时执行签到。

## 文件说明

- `smzdm_daily_loon.plugin`: Loon 插件配置，包含 Cookie 获取、定时任务和 MITM 域名。
- `smzdm_daily_loon.js`: 签到脚本，负责保存 Cookie、获取 token、生成签名、执行签到和查询奖励。

## 功能介绍

- 自动抓取什么值得买 App 签到请求 Cookie。
- 支持持久化保存多个账号 Cookie。
- 每日定时执行 App 端签到。
- 自动请求 `robot/token` 并生成 MD5 签名。
- 查询签到奖励接口 `checkin/all_reward`。
- 通过 Loon 通知展示签到结果、连续签到天数、积分、金币、经验等奖励信息。

## 开关说明

- `获取 Cookie`: 默认关闭。首次使用或 Cookie 失效时在插件“设置”里打开，进入什么值得买 App 手动签到一次，提示获取成功后关闭。
- `每日自动签到`: 默认开启。cron 每 5 分钟短暂唤醒一次，脚本每天生成一次随机目标时间，到点后自动签到。
- `通知模式`: 默认 `failure`，仅失败通知；可改为 `always` 或 `never`。
- `最小随机延迟分钟`: 默认 `5`。
- `最大随机延迟分钟`: 默认 `60`。
- `查询签到奖励`: 默认开启。关闭后只执行签到，不额外请求奖励详情。
- `多账号间隔秒`: 默认 `2`，多个 Cookie 账号之间会额外加少量随机等待。

插件通过 `[Argument]` 提供 Loon 设置面板开关，并用 `enable={captureCookie}`、`enable={dailyCheckin}` 控制脚本资源是否启用。单独在脚本资源行写 `enable=false/true` 不会显示设置面板。

## Cookie 说明

常见网页签到脚本多抓取 `zhiyou.smzdm.com` 或 `www.smzdm.com` 的网页 Cookie，再请求 Web 端签到接口。你的抓包里 Web 端 `zhiyou.smzdm.com/user/checkin/jsonp_checkin` 已返回验证码错误，所以本插件没有走网页签到。

本插件当前抓取的是 App 端请求：

```text
https://user-api.smzdm.com/checkin
```

保存的是该请求头里的 `Cookie`，主要用于 `user-api.smzdm.com` 的 App 端接口。脚本签到时会再请求 `user-api.smzdm.com/robot/token` 获取 token，并按 App 端参数生成签名后请求 `user-api.smzdm.com/checkin`。

主要区别和风险：

- 网页 Cookie 更容易被旧脚本复用，但可能触发网页验证码或风控。
- App 端 Cookie 更贴近你这次抓包的真实签到链路，能避开这次 Web 端验证码问题。
- App 端请求包含移动端会话信息，仍然属于敏感登录态，泄露后可能被别人调用账号相关接口。
- 建议 `获取 Cookie` 默认关闭，只在首次使用或 Cookie 失效时打开；不要公开 Loon 日志、抓包文件或持久化存储内容。

## 一键导入 Loon

[一键添加到 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Frefs%2Fheads%2Fmain%2FLoon%2FPlugin%2F%25E4%25BB%2580%25E4%25B9%2588%25E5%2580%25BC%25E5%25BE%2597%25E4%25B9%25B0%25E7%25AD%25BE%25E5%2588%25B0%2Fsmzdm_daily_loon.plugin)

复制链接到 Safari 打开：

```text
https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Frefs%2Fheads%2Fmain%2FLoon%2FPlugin%2F%25E4%25BB%2580%25E4%25B9%2588%25E5%2580%25BC%25E5%25BE%2597%25E4%25B9%25B0%25E7%25AD%25BE%25E5%2588%25B0%2Fsmzdm_daily_loon.plugin
```

Raw 插件地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Plugin/%E4%BB%80%E4%B9%88%E5%80%BC%E5%BE%97%E4%B9%B0%E7%AD%BE%E5%88%B0/smzdm_daily_loon.plugin
```

Raw 脚本地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/%E4%BB%80%E4%B9%88%E5%80%BC%E5%BE%97%E4%B9%B0%E7%AD%BE%E5%88%B0/smzdm_daily_loon.js
```

## 使用方法

1. 在 Loon 中导入 `smzdm_daily_loon.plugin`。
2. 开启 MITM，并确保证书已安装和信任。
3. 首次使用时，在插件“设置”里打开 `获取 Cookie`。
4. 确认 MITM 域名包含：

```text
user-api.smzdm.com
```

5. 打开什么值得买 App，进入签到页并手动签到一次。
6. Loon 通知出现 `Cookie 获取成功` 后，关闭 `获取 Cookie`，保留 `每日自动签到` 开启即可。

## 默认任务

```text
cron "*/5 10-11 * * *"
```

默认每天 10:00 后首次唤醒时，随机生成 5-60 分钟后的签到目标时间；未到目标时间会直接退出，到了目标时间才执行签到，且当天只执行一次。可在 `smzdm_daily_loon.plugin` 中自行修改 cron 时间窗口。

## 抓包入口

```text
https://user-api.smzdm.com/checkin
```

插件规则：

```text
http-request ^https?:\/\/user-api\.smzdm\.com\/checkin$
```

## 注意事项

- Cookie 属于敏感信息，不要公开日志或持久化存储内容。
- Web 端签到接口容易触发验证码，本插件使用 App 端接口。
- Cookie 失效后，重新打开 App 手动签到一次即可刷新。
- 脚本只执行签到和奖励查询，不执行浏览、评论、抽奖等额外任务。
