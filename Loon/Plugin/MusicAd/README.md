# 音乐去广告

适用于 Loon 的 QQ 音乐免费模式开屏、互动广告与波点音乐开屏广告拦截插件。

## 当前版本

- 版本：v1.3
- 更新日期：2026-06-21

## 一键导入 Loon

[一键添加到 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Frefs%2Fheads%2Fmain%2FLoon%2FPlugin%2FMusicAd%2F%25E9%259F%25B3%25E4%25B9%2590%25E5%258E%25BB%25E5%25B9%25BF%25E5%2591%258A.plugin)

插件 Raw 地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Plugin/MusicAd/%E9%9F%B3%E4%B9%90%E5%8E%BB%E5%B9%BF%E5%91%8A.plugin
```

外部脚本 Raw 地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Plugin/MusicAd/music-adblock.js
```

## 功能

- 拦截 QQ 音乐实际抓包确认的开屏/互动广告接口，并覆盖 `c.y.qq.com`、`szc.y.qq.com`、`c6.y.qq.com` 分流主机。
- 清理 QQ 音乐“我的”页推广横幅接口。
- 仅在 QQ 音乐 `musicu.fcg` 请求包含免费模式开屏、素材或初始化模块时拦截，不影响普通播放请求。
- 清理波点音乐开屏、活动弹窗、免费听歌广告配置、悬浮任务入口与“我的”页推广位。
- 波点配置按原响应返回空数据，不会使用空响应破坏页面解析。
- 不拦截歌曲播放、下载、登录和会员核心接口。

## 使用要求

插件会自动附带 MITM 主机名。请在 iOS 中安装并信任 Loon 根证书；导入或更新后，完全关闭 QQ 音乐和波点音乐后台后重新打开。

如果更新规则后首次启动仍看到旧广告，请在对应 App 设置中清理缓存后再次测试。

## 说明

- QQ 音乐的免费模式配置与普通业务共用 `u.y.qq.com`、`u6.y.qq.com`、`t.y.qq.com` 的 `musicu.fcg` 通道。插件仅识别对应模块后拦截，避免阻断整条音乐业务通道。
- 规则仅用于过滤广告和推广展示，不修改会员、版权、下载权限或付费功能。

## 更新日志

### v1.3 - 2026-06-21

- 修复 QQ 音乐广告接口只匹配 `c.y.qq.com`，遗漏 `szc.y.qq.com` 与 `c6.y.qq.com` 分流的问题。
- 新增 QQ 音乐“我的”页推广横幅清理。
- 修复波点音乐实际广告主机为 `bd-lv.kuwo.cn`、旧规则写成 `bd-api.kuwo.cn` 的问题，同时保留两者兼容。
- 新增波点开屏、活动弹窗、广告任务与页面推广配置清理。

完整历史记录见 [CHANGELOG.md](CHANGELOG.md)。
