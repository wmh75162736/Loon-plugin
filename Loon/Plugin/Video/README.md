# 中视频 Loon 插件

这是由青龙 Node 脚本无损重构的 Loon 专用插件与脚本，保留登录、签到、CDK 兑换、每日抽奖、广告任务、多账号和固定设备码逻辑。

## 一键导入

推荐导入链接：

```text
https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2FVideo%2F%25E4%25B8%25AD%25E8%25A7%2586%25E9%25A2%2591.plugin
```

Loon 原生导入链接：

[loon://import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2FVideo%2F%25E4%25B8%25AD%25E8%25A7%2586%25E9%25A2%2591.plugin](loon://import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2FVideo%2F%25E4%25B8%25AD%25E8%25A7%2586%25E9%25A2%2591.plugin)

插件地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/Video/%E4%B8%AD%E8%A7%86%E9%A2%91.plugin
```

脚本地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/Video/zhongshipin.loon.js
```

## 适配判断

此脚本只适合 Loon 环境运行。脚本启动时会检查 `$httpClient`、`$persistentStore`、`$done`，缺少这些对象会直接停止，避免误放到青龙或普通 Node.js 环境。

## 登录方式

先在中视频平台完成注册和实名认证，然后在商户密钥页面取得 `secretId` 和 `secretKey`。

单账号推荐填写插件设置里的两个独立字段。当前版本使用 Loon 官方 `#!input` 配置项，设置页显示的是字段名：

```text
accountRemark：备注
secretId：你的 secretId
secretKey：你的 secretKey
```

多账号使用 `zsp` 字段，填写多账号时请留空 `secretId` 和 `secretKey`。脚本支持半角 `#`、全角 `＃` 和 `%23` 三种分隔方式：

```text
账号1#secretId#secretKey
账号2#secretId#secretKey#固定deviceId
账号3＃secretId＃secretKey
账号4%23secretId%23secretKey
```

在 Loon 输入框里多账号更推荐用 `||` 分隔：

```text
账号1#secretId#secretKey||账号2#secretId#secretKey#固定deviceId
```

`固定设备码` 可留空。留空时脚本会首次自动生成 32 位设备码，并保存到 Loon 持久化存储，后续运行固定使用同一个设备码。

## 首次使用步骤

1. 删除旧版“中视频”插件后重新导入，避免 Loon 使用旧缓存。
2. 进入插件设置，单账号填写 `accountRemark`、`secretId`、`secretKey`。
3. 多账号只填写 `zsp`，格式为 `备注#secretId#secretKey`，并留空 `secretId` 和 `secretKey`。
4. 在脚本列表手动运行 `中视频_保存账号`。
5. 再手动运行 `中视频_查看状态`，看到“已保存 1 个”或对应账号数量后再执行任务。
6. 手动运行 `中视频_测试登录`，只验证 secretId/secretKey 登录，不执行签到、抽奖、广告。
7. 需要立即完整测试时，手动运行 `中视频_立即运行`。
8. 每日自动任务默认每天 09:00 运行；如需关闭，把 `dailyTasks` 设为 `false`。

重要：每日任务不会直接读取插件设置里的 `secretId/secretKey`，它只读取“保存账号”写入的本地存储。修改账号后必须重新运行一次 `中视频_保存账号`。

## Loon 3.4.0 兼容说明

Loon 官方文档中，脚本 `argument` 建议整体使用双引号，例如 `argument = "name=loon&version=2.1.0"`；插件输入项的值也可以在脚本里通过 `$persistentStore.read(参数名)` 读取。

因此当前版本改为官方配置读取方式：

- 插件设置使用 `#!input` / `#!select`，不是 `[Argument]`。
- `中视频_保存账号` 只传 `argument="action=save"`，不再传递密钥。
- 脚本会直接读取插件设置键：`accountRemark`、`secretId`、`secretKey`、`deviceId`、`zsp`、`ZSP_CDK`、`maxAds`、`notify`。
- 账号保存成功后，会写入 `zsp.accounts.v1` 和 `ZSP`，每日任务只读这两个保存后的账号配置。

## 功能

- secretId / secretKey 登录
- 多账号顺序执行
- 自动生成并持久化设备码
- 每日签到
- CDK 自动兑换
- 每日抽奖
- 广告观看任务，默认 50 次
- 任务结束摘要通知
- 查看已保存账号状态
- 单独测试登录并输出平台返回码
- 清除本地保存账号和 CDK

## 参数说明

| 参数 | 说明 |
| --- | --- |
| dailyTasks | `true` 开启每日任务，`false` 跳过每日任务 |
| accountRemark | 单账号备注 |
| secretId | 商户密钥里的 secretId |
| secretKey | 商户密钥里的 secretKey |
| deviceId | 可选，留空自动生成 |
| zsp | 多账号配置；填写后请留空 secretId/secretKey |
| ZSP_CDK | 可选，留空跳过 CDK |
| maxAds | 默认 50 |
| notify | `true` 开启通知，`false` 关闭通知 |

## 常见问题

如果提示“未找到有效账号配置”，按下面顺序排查：

1. 确认已经重新导入最新版插件。
2. 确认填写账号后运行过 `中视频_保存账号`。
3. 运行 `中视频_查看状态`，确认账号数量不是 0。
4. 单账号不要把 `secretId#secretKey` 填到 `secretId` 或 `secretKey` 单独字段里。
5. 多账号必须带备注，格式是 `备注#secretId#secretKey`。如果半角 `#` 在 Loon 里保存异常，可改用 `备注＃secretId＃secretKey` 或 `备注%23secretId%23secretKey`。
6. 仍然异常时，运行 `中视频_清除账号`，重新填写并保存。

如果提示“账号密码错误”或登录失败：

1. 先运行 `中视频_查看状态`，确认 `secretId`、`secretKey` 显示的前后掩码和长度与原始密钥一致。
2. 单账号分开填写时，不要在输入框里写 `secretId = xxx` 或 `secretKey = xxx`，只填值本身。
3. 修改插件设置后必须重新运行一次 `中视频_保存账号`，否则每日任务仍会读取旧保存值。
4. 运行 `中视频_测试登录`，它只按原青龙脚本的 `secretKeyLogin` 请求测试登录。
5. 查看运行日志中的 `登录失败: code=..., message=...` 和 `登录响应体`，这是平台接口返回的信息。

登录请求对比：Loon 版使用的登录 URL、body 字段和 `app-device` 请求头与原青龙脚本一致，登录 body 仍是：

```json
{
  "secretId": "你的 secretId",
  "secretKey": "你的 secretKey"
}
```

为兼容 Loon 3.4.0 的 `$httpClient.post`，脚本会把 POST body 固定为字符串，并显式补 `Content-Length`。

这版脚本已经避免每日 cron 直接依赖 `#secretId#secretKey` 参数传递，因为 Loon 的插件参数层在部分情况下会把未替换占位符或 `#` 分隔内容传坏。账号先保存到 `$persistentStore` 后，每日任务读取本地存储执行。
