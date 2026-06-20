# 更新日志

## v1.2.2 - 2026-06-20

- 插件目录、配置文件和外部脚本统一更名为 `CarHome`。
- Loon 展示名称调整为“CarHome 去广告”。
- 保留汽车之家 App 图标配置，并同步更新全部外部脚本 Raw 路径。

## v1.2.1 - 2026-06-20

- 更正分类：品牌页 `17007`、`17009` 是选车推广模块，不作为原版直播广告规则的替代。
- 恢复原版两条独立直播处理路径：`selectcarportal/reclist`（直播浮窗）与 `seriestopwithtagscard`（报价页直播内容）。
- 为原版兼容的 `a.athm.cn` 转发形式补充 MITM 主机名。

## v1.2.0 - 2026-06-20

- 根据 `357_1781948904394.zip` 实际进入品牌车型页后的新抓包新增处理。
- 精确清理 `brandseriespage/seriestopwithtags` 中类型 `17007` 的顶部品牌车型推广位。
- 精确清理同一响应中类型 `17009` 的“专业主播帮你选好车”直播卡。
- 不改写品牌页正常筛选和车辆列表接口 `brand_series/series_list`、`rcmserieslist`。

## v1.1.0 - 2026-06-20

- 根据 `356_1781948094650.zip` 新抓包补充社区、选车、首页资讯和二手车页面处理。
- 社区仅清理 `businessv` 响应的 `bannerlist`，保留话题、分类和动态内容。
- 使用当前 `cars.app.autohome.com.cn/carstreaming/clue/getruleconfig` 清理报价页留资弹窗规则。
- 清理选车页的 `brandpromotion`、`liveinfo`、`operationPlatformSeriesList`，对应品牌补贴、右下“限时补贴”和免费查成交价卡。
- 清理首页 `feed` 响应中的 `adlist`，对应资讯信息流品牌广告。
- 二手车页仅清理 `otherlist` 推广轮播/视频插卡，保留 `carlist` 正常车辆列表。

## v1.0.0 - 2026-06-20

- 根据 `354_1781947239178.zip` 抓包重构为原生 Loon 插件。
- 新增开屏后运营弹窗、首页悬浮运营卡和广告创意接口处理。
- 新增“我的”页独立推广卡处理，不再碰核心 `mycardv8` 接口。
- 删除旧模块中对 `mycard*`、`usercenter`、社区和二手车接口的宽泛改写，修复“我的”刷新显示无网络的问题。
- 保留启动、域名与网络配置接口，避免因广告规则影响 App 初始化。
