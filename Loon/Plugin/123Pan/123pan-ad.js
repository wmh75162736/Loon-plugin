// 123云盘去广告
// 更新日期：2026-06-20
// 仅处理广告与推广展示，不处理会员权益、下载限制、流量限制或下载鉴权。

(function () {
  var request = typeof $request !== "undefined" ? $request : {};
  var response = typeof $response !== "undefined" ? $response : {};
  var url = request.url || "";
  var body = response.body || "";

  function log(message) {
    try {
      console.log("[123云盘去广告] " + message);
    } catch (error) {}
  }

  function headers(contentType) {
    var result = Object.assign({}, response.headers || {});
    delete result["Content-Encoding"];
    delete result["content-encoding"];
    delete result["Content-Length"];
    delete result["content-length"];
    delete result["content-type"];
    result["Content-Type"] = contentType;
    return result;
  }

  function parseJson() {
    try {
      return JSON.parse(body);
    } catch (error) {
      return null;
    }
  }

  function doneJson(data, message) {
    if (message) log(message);
    $done({
      headers: headers("application/json; charset=utf-8"),
      body: JSON.stringify(data)
    });
  }

  function isObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function cleanConfig(value) {
    if (Array.isArray(value)) {
      return value.map(cleanConfig);
    }

    if (!isObject(value)) return value;

    var falseKeys = [
      "isOpenSplash",
      "isOpenAbortAd",
      "isOpenDownloadAd",
      "isOpenUploadAd",
      "isOpenMineAd",
      "showAd",
      "showSplash",
      "showInterstitial"
    ];
    var zeroKeys = [
      "isInitAd",
      "showCount",
      "interstitialShowCount",
      "splashInterval",
      "splashIntervalTime",
      "interstitialInterval",
      "androidInter",
      "androidSplash",
      "iosInter",
      "iosSplash"
    ];
    var listKeys = [
      "bannerList",
      "advertList",
      "advertResourceList",
      "adList",
      "splashList"
    ];

    Object.keys(value).forEach(function (key) {
      if (falseKeys.indexOf(key) !== -1) {
        value[key] = false;
      } else if (zeroKeys.indexOf(key) !== -1) {
        value[key] = 0;
      } else if (listKeys.indexOf(key) !== -1 && Array.isArray(value[key])) {
        value[key] = [];
      } else if (isObject(value[key]) || Array.isArray(value[key])) {
        value[key] = cleanConfig(value[key]);
      }
    });

    return value;
  }

  function cleanEnvelope(message, emptyData) {
    var json = parseJson();
    if (!isObject(json)) return $done({});
    json.data = emptyData;
    doneJson(json, message);
  }

  function isSharePage(url) {
    return /^https?:\/\/(?:www\.(?:123pan\.(?:com|cn)|123865\.com|123912\.com)\/(?:s|123pan)\/[^?#]+(?:\?[^#]*)?|[0-9a-zA-Z-]+\.(?:mshare|share)\.(?:123pan\.(?:com|cn)|123865\.com|123912\.com)(?:\/[^\s]*)?)$/i.test(url);
  }

  function isHtmlResponse() {
    var contentType = "";
    var responseHeaders = ($response && $response.headers) || {};

    Object.keys(responseHeaders).some(function (name) {
      if (String(name).toLowerCase() === "content-type") {
        contentType = String(responseHeaders[name] || "");
        return true;
      }
      return false;
    });

    return !contentType || /text\/html|application\/xhtml\+xml/i.test(contentType);
  }

  function cleanWebPage(html) {
    var style = "<style id=\"loon-123pan-ad-clean\">" +
      "[class*=\"advert\"],[id*=\"advert\"]," +
      "[class*=\"promotion\"],[id*=\"promotion\"]," +
      "[class*=\"popup\"],[id*=\"popup\"]," +
      ".btn_reward,#banner_container," +
      ".lHPtZcwKo8DO6XetRyBx:has(#banner_container)," +
      "img[src*=\"bg_h5_banner_vip_\"]{display:none!important}" +
      "</style>";
    var runtime = "<script id=\"loon-123pan-ad-runtime\">(function(){" +
      "function clean(){" +
      "var nodes=document.querySelectorAll('.btn_reward,script[src*=\\\"pcwapad.min.js\\\"]');" +
      "for(var i=0;i<nodes.length;i++){nodes[i].remove();}" +
      "var banners=document.querySelectorAll('#banner_container');" +
      "for(var j=0;j<banners.length;j++){var wrap=banners[j].closest('.lHPtZcwKo8DO6XetRyBx');(wrap||banners[j]).remove();}" +
      "}" +
      "clean();document.addEventListener('DOMContentLoaded',clean);" +
      "setTimeout(clean,300);setTimeout(clean,1200);setTimeout(clean,2800);" +
      "})();</script>";
    var output = html
      .replace(/<script\b[^>]*\bsrc=[\"'][^\"']*\/pcwapad\.min\.js[^\"']*[\"'][^>]*>\s*<\/script>/gi, "")
      .replace(/https?:\/\/statics\.123957\.com\/static-by-custom\/img\/app_ad_[^\"'<>\\\s]+/gi, "");

    if (output.indexOf("loon-123pan-ad-clean") === -1) {
      output = /<\/head>/i.test(output)
        ? output.replace(/<\/head>/i, style + "</head>")
        : style + output;
    }

    if (output.indexOf("loon-123pan-ad-runtime") === -1) {
      output = /<\/body>/i.test(output)
        ? output.replace(/<\/body>/i, runtime + "</body>")
        : output + runtime;
    }

    return output;
  }

  if (/\/api\/(?:app\/)?config\/get(?:\?|$)/i.test(url)) {
    var config = parseJson();
    if (!isObject(config)) return $done({});
    config.data = cleanConfig(config.data || {});
    return doneJson(config, "已净化广告配置");
  }

  if (/\/api\/v2\/advert_resource\/get(?:\?|$)/i.test(url)) {
    return cleanEnvelope("已清空广告资源", []);
  }

  if (/\/api\/v2\/activity\/pop\/is_show(?:\?|$)/i.test(url)) {
    return cleanEnvelope("已关闭活动弹窗", { is_show_pop: false, url: "" });
  }

  if (/\/api\/notice\/announcement(?:\?|$)/i.test(url)) {
    return cleanEnvelope("已清空公告推广", []);
  }

  if (/\/api\/restful\/goapi\/v1\/user\/center\/text(?:\?|$)/i.test(url)) {
    return cleanEnvelope("已清空用户中心推广文案", { title: "", content: [] });
  }

  if (isSharePage(url) && isHtmlResponse()) {
    var page = cleanWebPage(body);
    if (page !== body) {
      log("已净化网页分享页广告层");
      return $done({
        headers: headers("text/html; charset=utf-8"),
        body: page
      });
    }
  }

  $done({});
})();
