/*
 * 汽车之家去广告
 * 版本：v1
 * 更新日期：2026-06-20
 * 仅处理抓包确认的运营广告字段；不改写 mycard、usercenter、车辆和账号接口。
 */

(function () {
  const url = $request.url;
  const emptyCards = {
    returncode: 0,
    message: "",
    result: { cards: [] }
  };

  const blockedPageTags = new Set([
    "opreate_popup",
    "pop_rule",
    "use_center",
    "gerzhongxin_center",
    "usergrowth_snapshot"
  ]);

  function hasAdMarker(value) {
    const text = JSON.stringify(value || {});
    return /"is_ad":"?1"?/.test(text) ||
      /"is_business_v2":1/.test(text) ||
      text.includes("AD_AdanceLanding") ||
      text.includes("ad_degrade_recall");
  }

  function clearLiveAdFields(result) {
    if (!result || typeof result !== "object") return;
    ["liveinfo", "liveentry", "livecard", "livecardinfo", "livelist"].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        result[key] = Array.isArray(result[key]) ? [] : {};
      }
    });
  }

  function clearNestedLiveAdFields(value, depth) {
    if (!value || typeof value !== "object" || depth > 6) return;
    clearLiveAdFields(value);
    Object.keys(value).forEach(function (key) {
      clearNestedLiveAdFields(value[key], depth + 1);
    });
  }

  function getQueryParam(rawUrl, name) {
    const query = String(rawUrl || "").split("?")[1] || "";
    const target = String(name || "").toLowerCase();

    return query.split("&").reduce(function (result, part) {
      if (result !== null) return result;

      const index = part.indexOf("=");
      const key = index === -1 ? part : part.slice(0, index);
      if (key.toLowerCase() !== target) return null;

      const value = index === -1 ? "" : part.slice(index + 1);
      try {
        return decodeURIComponent(value.replace(/\+/g, " "));
      } catch (error) {
        return value;
      }
    }, null);
  }

  try {
    const payload = JSON.parse($response.body);

    if (url.includes("/pageCard/queryPageCardData")) {
      const pageTag = getQueryParam(url, "pagetag");
      if (blockedPageTags.has(pageTag)) {
        $done({ body: JSON.stringify(emptyCards) });
        return;
      }
    }

    if (url.includes("/resource/queryresourcedatas")) {
      const cards = payload && payload.result && Array.isArray(payload.result.cards)
        ? payload.result.cards
        : null;

      if (cards) {
        payload.result.cards = cards.filter(function (card) {
          const tag = String(card && card.pagetag || "");
          return !/^(?:app_main_(?:pop|float)[1-5]|opreate_pop_rule)$/.test(tag);
        });
      }
    }

    if (/\/club\/index\/businessv\d+/.test(url)) {
      if (payload.result && Array.isArray(payload.result.bannerlist)) {
        payload.result.bannerlist = [];
      }
    }

    if (url.includes("/carstreaming/clue/getruleconfig")) {
      if (payload.result) {
        payload.result.poprule = [];
        payload.result.pagerule = [];
      }
    }

    if (/\/(?:cars\.app\.autohome\.com\.cn\/)?carstreaming\/selectcarportal\/(?:reclist|seriestopwithtagscard)/.test(url)) {
      // 保留原版的两条独立直播规则：直播浮窗与报价页直播内容。
      clearLiveAdFields(payload.result);
    }

    if (/\/carstreaming\/seriessummary\/(?:operatecardinfo|tabcard)/.test(url)) {
      // 当前版本的报价/车系详情页已迁移到该接口，直播字段可能位于嵌套卡片中。
      clearNestedLiveAdFields(payload.result, 0);
    }

    if (/\/car_v\d+(?:\.\d+){2}\/indexpage\/reclist/.test(url)) {
      if (payload.result) {
        payload.result.brandpromotion = [];
        payload.result.brandlistadvertinfo = [];
        payload.result.liveinfo = {};
        payload.result.operationPlatformSeriesList = [];
      }
    }

    if (/\/car_v\d+(?:\.\d+){2}\/brandseriespage\/seriestopwithtags/.test(url)) {
      if (payload.result) {
        // 17007: 品牌页顶部车型推广；17009: "专业主播帮你选好车"直播卡。
        if (Array.isArray(payload.result.toplist)) {
          payload.result.toplist = payload.result.toplist.filter(function (item) {
            const type = Number(item && item.type);
            return type !== 17007 && type !== 17009;
          });
        }
        payload.result.liveinfo = {};
      }
    }

    if (/\/shouye_v\d+(?:\.\d+){2}\/news\/feed/.test(url)) {
      if (payload.result) {
        payload.result.adlist = [];
        if (Array.isArray(payload.result.insertlist)) {
          payload.result.insertlist = payload.result.insertlist.filter(function (item) {
            return !hasAdMarker(item);
          });
        }
        if (Array.isArray(payload.result.newslist)) {
          payload.result.newslist = payload.result.newslist.filter(function (item) {
            return !hasAdMarker(item);
          });
        }
      }
    }

    if (/\/apic\/v\d+\/gethomepagefeed/.test(url)) {
      if (payload.result && Array.isArray(payload.result.otherlist)) {
        payload.result.otherlist = [];
      }
    }

    $done({ body: JSON.stringify(payload) });
  } catch (error) {
    // Parsing failure should never block an otherwise valid app response.
    $done({});
  }
})();
