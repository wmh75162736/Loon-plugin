# Js

此目录用于存放外部 JavaScript 脚本（例如供 Loon 插件通过 script-path 引用的脚本）。

说明：
- 仅放置单一用途的脚本文件（例如 123pan-ad.js）。
- 不要在此目录中创建或提交 Node.js 项目、package.json、node_modules、或其他构建工具文件。
- 每个插件应在 Loon/Plugin/<PluginName>/ 目录下保留插件文件（.plugin、icon.png、CHANGELOG.md 等），并可通过 GitHub Raw 引用此目录中的脚本（推荐将脚本放在各自插件目录下以便管理）。
