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

单账号推荐填写插件设置里的两个独立字段：

```text
账号备注：默认账号
secretId：你的 secretId
secretKey：你的 secretKey
```

多账号使用“多账号配置”字段：

```text
账号1#secretId#secretKey
账号2#secretId#secretKey#固定deviceId
```

在 Loon 输入框里多账号更推荐用 `||` 分隔：

```text
账号1#secretId#secretKey||账号2#secretId#secretKey#固定deviceId
```

`固定设备码` 可留空。留空时脚本会首次自动生成 32 位设备码，并保存到 Loon 持久化存储，后续运行固定使用同一个设备码。

## 首次使用步骤

1. 删除旧版“中视频”插件后重新导入，避免 Loon 使用旧缓存。
2. 进入插件设置，填写 `secretId` 和 `secretKey`，单账号不需要填写“多账号配置”。
3. 保持“显示账号工具”开启。
4. 在脚本列表手动运行 `中视频_保存账号`。
5. 再手动运行 `中视频_查看状态`，看到“已保存 1 个”或对应账号数量后再执行任务。
6. 需要立即测试时，打开“显示立即运行”，手动运行 `中视频_立即运行`。
7. 每日自动任务默认每天 09:00 运行。

重要：每日任务不会直接读取插件设置里的 `secretId/secretKey`，它只读取“保存账号”写入的本地存储。修改账号后必须重新运行一次 `中视频_保存账号`。

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
- 清除本地保存账号和 CDK

## 参数说明

| 参数 | 说明 |
| --- | --- |
| 每日自动任务 | 开启后每天 09:00 自动运行 |
| 显示立即运行 | 开启后显示手动测试任务 |
| 显示账号工具 | 开启后显示保存账号、查看状态、清除账号 |
| 账号备注 | 单账号备注 |
| secretId | 商户密钥里的 secretId |
| secretKey | 商户密钥里的 secretKey |
| 固定设备码 | 可选，留空自动生成 |
| 多账号配置 | 高级用法，填写后优先使用此项 |
| CDK 兑换码 | 可选，留空跳过 CDK |
| 广告次数 | 默认 50 |
| 运行通知 | 是否发送运行摘要通知 |

## 常见问题

如果提示“未找到有效账号配置”，按下面顺序排查：

1. 确认已经重新导入最新版插件。
2. 确认填写账号后运行过 `中视频_保存账号`。
3. 运行 `中视频_查看状态`，确认账号数量不是 0。
4. 单账号不要把 `secretId#secretKey` 填到 `secretId` 或 `secretKey` 单独字段里。
5. 多账号必须带备注，格式是 `备注#secretId#secretKey`。
6. 仍然异常时，运行 `中视频_清除账号`，重新填写并保存。

这版脚本已经避免每日 cron 直接携带 `#secretId#secretKey`，因为 Loon 的插件参数层在部分情况下会把未替换占位符或 `#` 分隔内容传坏。账号先保存到 `$persistentStore` 后，每日任务读取本地存储执行。
