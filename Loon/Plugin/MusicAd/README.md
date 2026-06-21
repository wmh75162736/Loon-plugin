# 音乐去广告

适用于 Loon 的 QQ 音乐与波点音乐开屏、互动广告拦截插件。

## 当前版本

- 版本：v1.1
- 更新日期：2026-06-21

## 一键导入 Loon

[一键添加到 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Frefs%2Fheads%2Fmain%2FLoon%2FPlugin%2FMusicAd%2F%25E9%259F%25B3%25E4%25B9%2590%25E5%258E%25BB%25E5%25B9%25BF%25E5%2591%258A.plugin)

插件 Raw 地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Plugin/MusicAd/%E9%9F%B3%E4%B9%90%E5%8E%BB%E5%B9%BF%E5%91%8A.plugin
```

## 功能

- 拦截 QQ 音乐当前开屏与互动广告配置接口。
- 保留并合并 QQ 音乐常见广告分发、点击和统计域名规则。
- 拦截波点音乐启动开屏配置与兜底接口。
- 不拦截歌曲播放、下载、登录和会员核心接口。

## 使用要求

插件会自动附带 MITM 主机名。请在 iOS 中安装并信任 Loon 根证书；导入或更新后，完全关闭 QQ 音乐和波点音乐后台后重新打开。

如果更新规则后首次启动仍看到旧广告，请在对应 App 设置中清理缓存后再次测试。

## 说明

- 原 QQ 音乐域名规则对广告分发与统计仍有效，但无法覆盖新抓到的互动开屏接口；本插件已补充该接口。
- 规则仅用于过滤广告和推广展示，不修改会员、版权、下载权限或付费功能。
