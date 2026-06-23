# 123云盘去广告

适用于 Loon 的 123云盘 App 与网页分享页广告净化插件。

## 当前版本

- 版本：v1.0.1
- 更新日期：2026-06-23

## 一键导入 Loon

[一键添加到 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fwmh75162736%2FLoon-plugin%2Frefs%2Fheads%2Fmain%2FLoon%2FPlugin%2F123Pan%2F123pan.plugin)

插件 Raw 地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Plugin/123Pan/123pan.plugin
```

外部脚本 Raw 地址：

```text
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Plugin/123Pan/123pan-ad.js
```

## 功能

- 净化 123云盘 App 广告配置、广告资源、活动弹窗、公告推广和用户中心推广文案。
- 拦截自有广告图片与网页分享页广告脚本。
- 在网页分享页注入有限 CSS/JS，隐藏广告容器、打赏按钮和推广横幅。
- 保留既有外部“解除下载限制”脚本规则，规则来源为 `ddgksf2013/Scripts`。

## 保留内容

- 不改会员权益、流量限制或下载鉴权逻辑。
- 不修改文件列表、保存至云盘、登录和正常下载页面展示。
- `123pan-ad.js` 只处理广告与推广展示；下载限制相关逻辑由插件中保留的外部脚本负责。

## 使用要求

导入插件后确认 Loon MITM 证书已安装并信任。更新后建议完全关闭 123云盘 App 和浏览器分享页后重新打开测试。

## 更新日志

完整历史记录见 [CHANGELOG.md](CHANGELOG.md)。
