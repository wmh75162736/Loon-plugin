# 中视频 Loon 插件

中视频插件由青龙 Node 脚本重构为 Loon 专用定时任务，保留原脚本的登录、签到、CDK 兑换、每日抽奖、广告任务、多账号和固定设备码逻辑。

脚本只适合在 Loon 环境运行。入口会检查 `$httpClient`、`$persistentStore`、`$done`，如果误放到青龙或普通 Node.js 环境，会直接提示环境不匹配并退出。

## 一键导入 Loon

https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2FVideo%2F%25E4%25B8%25AD%25E8%25A7%2586%25E9%25A2%2591.plugin

## 文件地址

插件 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/Video/%E4%B8%AD%E8%A7%86%E9%A2%91.plugin

外部脚本 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/Video/zhongshipin.loon.js

README Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/Video/README.md

## 推荐填写方式

推荐单账号直接在 Loon 插件设置里分开填写：

- `账号备注`：用于日志和通知，例如 `主号`。
- `secretId`：商户密钥中的 `secretId`。
- `secretKey`：商户密钥中的 `secretKey`。
- `固定设备码`：可选。留空时首次运行自动生成并本地保存。

这种方式比 `备注#secretId#secretKey` 更适合 Loon 设置页：不需要手动处理 `#`，也更不容易填错。

多账号时仍然使用 `zsp` 高级配置，因为 Loon 插件参数面板不适合动态生成多组 `secretId/secretKey` 输入。脚本会优先读取 `zsp`；如果 `zsp` 为空，才读取独立的 `secretId` 和 `secretKey` 字段。

## 登录方式

1. 先在中视频平台完成注册、本人认证，并获取商户密钥。
2. 商户密钥通常包含 `secretId` 和 `secretKey`，脚本通过这两个字段调用登录接口获取 `token`。
3. 单账号推荐在插件参数页分别填写 `账号备注`、`secretId`、`secretKey`，可选填写 `固定设备码`。
4. 多账号填写 `zsp`，格式：`备注#secretId#secretKey`。
5. 多账号固定设备码格式：`备注#secretId#secretKey#deviceId`。
6. 多账号可用换行 `\n` 或 `||` 分隔。
7. 如果 Loon 参数页对 `#` 解析异常，可把 `#` 写成 `%23`。

单账号推荐示例：

```text
账号备注：主号
secretId：你的secretId
secretKey：你的secretKey
固定设备码：留空或填写已有deviceId
```

多账号示例：

```text
账号1#secretId#secretKey||账号2#secretId#secretKey#固定deviceId
```

URL 编码示例：

```text
账号1%23secretId%23secretKey
```

## 设备码说明

- 脚本会为每组 `secretId + secretKey` 绑定一个设备码。
- 如果账号配置里没有填写 `deviceId`，首次运行会自动生成 32 位设备码。
- 自动生成的设备码会保存到 Loon 的 `$persistentStore`，后续运行固定复用。
- 如果你已经有固定设备码，单账号可填入 `固定设备码` 参数，多账号可按 `备注#secretId#secretKey#deviceId` 填写。

## 插件参数

- `accountRemark`：账号备注，单账号使用，默认 `默认账号`。
- `secretId`：商户密钥中的 `secretId`，单账号推荐填写。
- `secretKey`：商户密钥中的 `secretKey`，单账号推荐填写。
- `deviceId`：固定设备码，可选。留空时自动生成并本地保存。
- `zsp`：多账号高级配置，可选。格式为 `备注#secretId#secretKey`，可追加 `#deviceId`。填写后优先使用此项。
- `ZSP_CDK`：CDK 兑换码，可选。留空时跳过兑换。
- `maxAds`：广告任务次数，默认 `50`。
- `notify`：运行摘要通知开关，默认开启。

## 功能

- 商户密钥登录并获取 `token`。
- 每日签到，已签到时自动继续后续任务。
- 可选 CDK 自动兑换。
- 每日抽奖，抽奖次数用完时自动跳过。
- 自动获取广告任务。
- 上报广告播放开始。
- 按接口返回的视频时长等待。
- 上报广告播放结束。
- 默认最多执行 50 次广告任务。
- 连续 3 次广告任务异常后自动重新登录并继续。
- 支持多账号顺序执行。
- 账号之间默认等待 5 秒。
- 任务结束后发送运行摘要通知。

## 运行时间

广告任务会按照接口返回的视频时长真实等待。默认 `maxAds=50` 时，完整运行可能耗时较长，所以插件 `timeout` 已设置为 `3600` 秒。

如只想测试链路，可先把 `maxAds` 改为较小数值，例如 `1` 或 `3`。

## 定时规则

默认每天 09:00 执行一次：

```text
cron "0 0 9 * * *"
```

可在插件文件中自行调整 cron 时间。

## MITM

该插件是定时 HTTP 任务，不需要配置 MITM。

## 常见问题

### 提示未找到有效账号配置

单账号请检查 `secretId` 和 `secretKey` 是否都已填写。

多账号请检查 `zsp` 是否为空，格式是否为：

```text
备注#secretId#secretKey
```

如果使用 URL 编码，应为：

```text
备注%23secretId%23secretKey
```

### 应该用独立字段还是 zsp

单账号用独立字段更好，填写更直观，也避免 `#` 的解析问题。

多账号用 `zsp` 更好，因为可以一次维护多组账号，并兼容原青龙脚本的账号格式。

### 登录失败

通常是 `secretId` 或 `secretKey` 错误、账号不可用、平台接口变更或网络异常。请查看 Loon 日志中的接口返回信息。

### 运行时间很长

这是正常情况。脚本会模拟完整广告播放流程，按广告时长等待后再上报结束。可降低 `maxAds` 控制耗时。

### 是否会上传账号信息

不会。账号配置来自 Loon 插件参数或 Loon 本地 `$persistentStore`，脚本不会把账号信息上传到 GitHub。
