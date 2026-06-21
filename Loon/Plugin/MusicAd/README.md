# 音乐去广告

适用于 Loon 的 QQ 音乐免费模式开屏、互动广告与波点音乐开屏广告拦截插件。

## 当前版本

- 版本：v1.5
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

- 拦截 QQ 音乐实际抓包确认的互动广告接口，并覆盖 `c.y.qq.com`、`c6.y.qq.com`、`szc.y.qq.com`、`szc6.y.qq.com`、`shc.y.qq.com` 与 `shc6.y.qq.com` 分流主机。
- 精准关闭波点音乐的冷启动、热启动和免费模式开屏开关，兼容 `bd-api.kuwo.cn`、`bd-lv.kuwo.cn`。
- 保留波点的账号、首页、会员、播放和下载配置字段，不再返回空首页响应。
- 不拦截歌曲播放、下载、登录和会员核心接口。

## 使用要求

插件会自动附带 MITM 主机名。请在 iOS 中安装并信任 Loon 根证书；导入或更新后，完全关闭 QQ 音乐和波点音乐后台后重新打开。

如果更新规则后首次启动仍看到旧广告，请在对应 App 设置中清理缓存后再次测试。

## 说明

- QQ 音乐的 `musics.fcg` 请求采用二进制编码且与正常功能共用，本插件不封锁该通道，以免影响首页和账号。
- 波点脚本只改动已抓包确认的 `screenColdBoot`、`screenHotBoot`、`screenSign`、`startUpPopLimit` 与 `freeSplash` 字段。
- 规则仅用于过滤广告和推广展示，不修改会员、版权、下载权限或付费功能。

## 更新日志

### v1.5 - 2026-06-21

- 新增 QQ 音乐 `szc6.y.qq.com` 广告分流支持。
- 波点开屏由整段响应清空改为精准关闭开屏字段，恢复首页与登录兼容。

完整历史记录见 [CHANGELOG.md](CHANGELOG.md)。
