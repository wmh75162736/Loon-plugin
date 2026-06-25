# Loon Plugin

这是个人维护的 Loon 插件与外部 JavaScript 脚本仓库。

每个插件放在独立目录下，插件入口通过 GitHub Raw 引用外部 JS 脚本进行功能扩展，以便于维护与更新。

## BiliBili Daily

说明：用于 B 站网页端 Cookie 捕获/手动 Cookie 保存、每日经验状态、观看视频、分享视频、可选投币、直播签到、漫画签到、大会员福利与大积分签到任务。Cookie 只保存在 Loon 本地 `$persistentStore`，不会上传到 GitHub。

插件 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/BiliBili/bilibili.plugin

外部脚本 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/BiliBili/bilibili.js

一键导入 Loon：
https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2FBiliBili%2Fbilibili.plugin

## 123云盘去广告

说明：用于过滤 123 云盘 App 与网页分享页中的广告、开屏、插屏、活动弹窗、横幅和推广文案；不处理会员权益、下载限制、流量限制或下载鉴权。

插件 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/123Pan/123pan.plugin

外部脚本 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/Loon/Plugin/123Pan/123pan-ad.js

一键导入 Loon：
https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Fmain%2FLoon%2FPlugin%2F123Pan%2F123pan.plugin
