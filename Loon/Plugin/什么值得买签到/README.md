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
3. 确认 MITM 域名包含：

```text
user-api.smzdm.com
```

4. 打开什么值得买 App，进入签到页并手动签到一次。
5. Loon 通知出现 `Cookie 获取成功` 后，即可等待定时任务自动执行。

## 默认任务

```text
cron "5 10 * * *"
```

默认每天 10:05 执行一次。可在 `smzdm_daily_loon.plugin` 中自行修改 cron 时间。

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
