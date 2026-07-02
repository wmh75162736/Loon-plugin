# 🎯 Unicom Token Extractor

自动从中国联通 APP 登录接口提取 **token_online** 和 **appId**，并生成：

```text
token_online#appId
```

适用于青龙联通脚本免密登录。

---

## ✨ 功能

- 自动拦截联通登录接口
- 自动提取 `token_online`
- 自动提取 `appId`
- 自动生成 `token_online#appId`
- 自动保存到 Loon Persistent Store（`chinaUnicomCookie`）
- 自动通知显示提取结果

---

## 📥 Loon 一键导入

**点击导入：**

```
loon://import?plugin=https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Plugin/Unicom/unicom.plugin
```

---

## 🌐 Raw 地址

```
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Plugin/Unicom/unicom.plugin
```

---

## 📋 输出格式

```text
token_online#appId
```

例如：

```text
f606ffad814c7bc8xxxxxxxx#44fd964cef7a8cedxxxxxxxx
```

---

## ⚙️ 使用要求

插件已包含：

- MITM
- Rewrite
- Script

无需手动配置。

---

## ❤️ 鸣谢

- China Unicom
- Loon
