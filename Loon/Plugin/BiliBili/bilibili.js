/* upstream: RayWangQvQ/BiliBiliToolPro@d552d69 */
/*
 * BiliBili Loon automation.
 *
 * Cookie can be saved in two ways:
 * 1. Web capture: open https://www.bilibili.com in Safari while Loon MITM is enabled.
 * 2. Manual save: paste Cookie into the plugin Argument "manualCookie" and run saveCookie.
 */

var STORE = {
  cookie: "bili_cookie",
  userAgent: "bili_user_agent",
  uid: "bili_uid",
  csrf: "bili_csrf",
  lastRun: "bili_last_run",
  lastRunDate: "bili_last_run_date"
};

var DEFAULT_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

var API = {
  nav: "https://api.bilibili.com/x/web-interface/nav",
  dailyReward: "https://api.bilibili.com/x/member/web/exp/reward",
  coinTodayExp: "https://api.bilibili.com/x/web-interface/coin/today/exp",
  liveSign: "https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign",
  liveWalletStatus: "https://api.live.bilibili.com/xlive/revenue/v1/wallet/getStatus",
  silver2coin: "https://api.live.bilibili.com/xlive/revenue/v1/wallet/silver2coin",
  mangaClockIn: "https://manga.bilibili.com/twirp/activity.v1.Activity/ClockIn?platform=android",
  mangaVipReward: "https://manga.bilibili.com/twirp/user.v1.User/GetVipReward?reason_id=1",
  vipPrivilege: "https://api.bilibili.com/x/vip/privilege/receive",
  vipBigPointSign: "https://api.bilibili.com/pgc/activity/score/task/sign2"
};

var OPTIONS = parseArgument(typeof $argument === "string" ? $argument : "");

function read(key, fallback) {
  var value = $persistentStore.read(key);
  return value || fallback || "";
}

function write(key, value) {
  if (value === undefined || value === null) return false;
  return $persistentStore.write(String(value), key);
}

function clearStore() {
  write(STORE.cookie, "");
  write(STORE.userAgent, "");
  write(STORE.uid, "");
  write(STORE.csrf, "");
  write(STORE.lastRun, "");
  write(STORE.lastRunDate, "");
}

function getCookiePart(cookie, name) {
  var match = String(cookie || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function validCookie(cookie) {
  return !!cookie && cookie.indexOf("SESSDATA=") >= 0 && cookie.indexOf("bili_jct=") >= 0;
}

function headers(extra) {
  var cookie = read(STORE.cookie);
  var ua = read(STORE.userAgent, DEFAULT_UA);
  var base = {
    Cookie: cookie,
    "User-Agent": ua,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh-Hans;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded"
  };
  extra = extra || {};
  for (var key in extra) base[key] = extra[key];
  return base;
}

function toForm(data) {
  var pairs = [];
  data = data || {};
  for (var key in data) {
    if (data[key] !== undefined && data[key] !== null) {
      pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(data[key]));
    }
  }
  return pairs.join("&");
}

function safeJson(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (err) {
    return { raw: body };
  }
}

function shortResult(name, response) {
  var code = response && typeof response.code !== "undefined" ? response.code : "NA";
  var msg = response && (response.message || response.msg) ? response.message || response.msg : "ok";
  return name + ": " + code + " " + msg;
}

function request(method, options) {
  return new Promise(function (resolve) {
    var client = method === "POST" ? $httpClient.post : $httpClient.get;
    client(options, function (error, response, body) {
      if (error) {
        resolve({ ok: false, error: String(error), status: response && response.status, data: {} });
        return;
      }
      resolve({ ok: true, status: response && response.status, body: body, data: safeJson(body) });
    });
  });
}

function get(url, extraHeaders) {
  return request("GET", { url: url, headers: headers(extraHeaders) });
}

function postForm(url, data, extraHeaders) {
  return request("POST", { url: url, headers: headers(extraHeaders), body: toForm(data) });
}

function postJson(url, data, extraHeaders) {
  extraHeaders = extraHeaders || {};
  extraHeaders["Content-Type"] = "application/json";
  return request("POST", { url: url, headers: headers(extraHeaders), body: JSON.stringify(data || {}) });
}

function notify(title, subtitle, message, force) {
  if (!force && OPTIONS.notifyMode === "never") return;
  $notification.post(title, subtitle || "", message || "");
}

function done(value) {
  if (typeof $done === "function") $done(value || {});
}

function saveCredential(cookie, ua, source) {
  cookie = clean(cookie);
  ua = clean(ua) || DEFAULT_UA;
  if (!validCookie(cookie)) {
    notify("BiliBili Cookie", "保存失败", "Cookie 必须包含 SESSDATA 和 bili_jct。", true);
    return false;
  }
  var csrf = getCookiePart(cookie, "bili_jct");
  var uid = getCookiePart(cookie, "DedeUserID");
  write(STORE.cookie, cookie);
  write(STORE.userAgent, ua);
  write(STORE.csrf, csrf);
  write(STORE.uid, uid);
  notify("BiliBili Cookie", "保存成功", "来源: " + source + "\nUID: " + (uid || "unknown"), true);
  return true;
}

function captureFromWebRequest() {
  if (typeof $request === "undefined" || !$request || !$request.headers) {
    notify(
      "BiliBili Cookie",
      "请用网页或手动方式获取",
      "打开 Safari 登录 www.bilibili.com 后刷新页面，或在插件设置里填写手动 Cookie 再运行保存。",
      true
    );
    done();
    return;
  }
  var h = $request.headers || {};
  var cookie = h.Cookie || h.cookie || "";
  var ua = h["User-Agent"] || h["user-agent"] || DEFAULT_UA;
  saveCredential(cookie, ua, "网页捕获");
  done();
}

function saveManualCookie() {
  saveCredential(OPTIONS.cookie || OPTIONS.manualCookie, OPTIONS.userAgent || OPTIONS.manualUserAgent, "手动填写");
  done();
}

function showStatus() {
  var cookie = read(STORE.cookie);
  var uid = read(STORE.uid) || getCookiePart(cookie, "DedeUserID") || "unknown";
  var csrf = read(STORE.csrf) || getCookiePart(cookie, "bili_jct");
  var message = [
    "Cookie: " + (validCookie(cookie) ? "已保存" : "未保存/不完整"),
    "UID: " + uid,
    "CSRF: " + (csrf ? "已保存" : "缺失"),
    "上次运行: " + (read(STORE.lastRun) || "无")
  ].join("\n");
  notify("BiliBili 状态", "", message, true);
  done();
}

function clearCookie() {
  clearStore();
  notify("BiliBili Cookie", "已清除", "本地保存的 Cookie、UA、UID、CSRF 和运行记录已清空。", true);
  done();
}

function todayString() {
  var d = new Date();
  var m = String(d.getMonth() + 1);
  var day = String(d.getDate());
  if (m.length < 2) m = "0" + m;
  if (day.length < 2) day = "0" + day;
  return d.getFullYear() + "-" + m + "-" + day;
}

function shouldRunNow(manual) {
  if (manual) return true;
  var today = todayString();
  if (read(STORE.lastRunDate) === today) return false;
  var now = new Date();
  var current = now.getHours() * 60 + now.getMinutes();
  var target = readInt(OPTIONS.startHour, 9) * 60 + readInt(OPTIONS.startMinute, 15);
  return current >= target;
}

async function loginCheck(results) {
  var res = await get(API.nav, { Referer: "https://www.bilibili.com/", Origin: "https://www.bilibili.com" });
  var data = res.data || {};
  if (data.code === 0 && data.data) {
    if (data.data.mid) write(STORE.uid, data.data.mid);
    results.push("登录: " + (data.data.uname || data.data.mid || "ok"));
  } else {
    results.push(shortResult("登录", data));
  }
}

async function dailyReward(results) {
  var reward = await get(API.dailyReward, {
    Referer: "https://account.bilibili.com/account/home",
    Origin: "https://account.bilibili.com"
  });
  results.push(shortResult("每日经验状态", reward.data));
  var coinExp = await get(API.coinTodayExp, { Referer: "https://www.bilibili.com/", Origin: "https://www.bilibili.com" });
  if (coinExp.data && coinExp.data.code === 0) results.push("投币经验: " + coinExp.data.data);
  else results.push(shortResult("投币经验", coinExp.data));
}

async function liveSign(results) {
  var res = await get(API.liveSign, { Referer: "https://link.bilibili.com/", Origin: "https://link.bilibili.com" });
  results.push(shortResult("直播签到", res.data));
}

async function silver2coin(results) {
  var csrf = read(STORE.csrf);
  if (!csrf) {
    results.push("银瓜子兑换: 缺少 csrf");
    return;
  }
  var status = await get(API.liveWalletStatus, { Origin: "https://link.bilibili.com" });
  var left = status.data && status.data.data && status.data.data.silver_2_coin_left;
  if (left !== undefined && Number(left) <= 0) {
    results.push("银瓜子兑换: 今日无次数");
    return;
  }
  var res = await postForm(
    API.silver2coin,
    {
      csrf: csrf,
      csrf_token: csrf,
      visit_id: Math.floor(Math.random() * 9 + 1) + Math.random().toString(36).slice(2, 12) + "0"
    },
    { Origin: "https://link.bilibili.com" }
  );
  results.push(shortResult("银瓜子兑换", res.data));
}

async function mangaSign(results) {
  var res = await postForm(API.mangaClockIn, {}, { Host: "manga.bilibili.com", Origin: "https://manga.bilibili.com" });
  results.push(shortResult("漫画签到", res.data));
}

async function mangaVipReward(results) {
  var res = await postForm(API.mangaVipReward, {}, { Host: "manga.bilibili.com", Origin: "https://manga.bilibili.com" });
  results.push(shortResult("漫画福利", res.data));
}

async function vipPrivilege(results) {
  var csrf = read(STORE.csrf);
  if (!csrf) {
    results.push("大会员福利: 缺少 csrf");
    return;
  }
  for (var i = 0; i < 2; i++) {
    var type = i + 1;
    var url = API.vipPrivilege + "?type=" + type + "&csrf=" + encodeURIComponent(csrf);
    var res = await postForm(url, {}, { Referer: "https://account.bilibili.com/" });
    results.push(shortResult("大会员福利 type=" + type, res.data));
  }
}

async function vipBigPointSign(results) {
  var csrf = read(STORE.csrf);
  if (!csrf) {
    results.push("大积分签到: 缺少 csrf");
    return;
  }
  var now = Date.now();
  var url = API.vipBigPointSign + "?mobi_app=android&platform=android&csrf=" + encodeURIComponent(csrf);
  var res = await postJson(
    url,
    { device: "phone", t: now, ts: Math.floor(now / 1000) },
    { Referer: "https://big.bilibili.com/mobile/index" }
  );
  results.push(shortResult("大积分签到", res.data));
}

async function runTasks(manual) {
  if (!shouldRunNow(manual)) {
    done();
    return;
  }
  var cookie = read(STORE.cookie);
  var csrf = getCookiePart(cookie, "bili_jct") || read(STORE.csrf);
  if (!validCookie(cookie)) {
    notify("BiliBili Daily", "未配置 Cookie", "请先网页捕获或手动保存 Cookie。", true);
    done();
    return;
  }
  if (csrf) write(STORE.csrf, csrf);

  var results = [];
  var tasks = [loginCheck];
  if (boolOpt("taskDailyReward", true)) tasks.push(dailyReward);
  if (boolOpt("taskLiveSign", true)) tasks.push(liveSign);
  if (boolOpt("taskMangaSign", true)) tasks.push(mangaSign);
  if (boolOpt("taskMangaReward", false)) tasks.push(mangaVipReward);
  if (boolOpt("taskVipPrivilege", false)) tasks.push(vipPrivilege);
  if (boolOpt("taskVipPoint", true)) tasks.push(vipBigPointSign);
  if (boolOpt("taskSilver2Coin", false)) tasks.push(silver2coin);

  for (var i = 0; i < tasks.length; i++) {
    try {
      await tasks[i](results);
    } catch (error) {
      results.push(tasks[i].name + ": " + String(error));
    }
  }

  var hasFailure = results.join("\n").indexOf(": 0 ") < 0 || /失败|缺少|未配置|NA/.test(results.join("\n"));
  var summary = results.join("\n");
  write(STORE.lastRun, new Date().toISOString());
  if (!manual) write(STORE.lastRunDate, todayString());
  if (OPTIONS.notifyMode === "always" || manual || (OPTIONS.notifyMode === "failure" && hasFailure)) {
    notify("BiliBili Daily", "任务完成", summary, true);
  }
  done();
}

function parseArgument(argument) {
  var result = {
    action: "auto",
    notifyMode: "always",
    startHour: "9",
    startMinute: "15"
  };
  if (!argument) return result;
  argument = String(argument);
  if (argument.indexOf("action=") < 0 && argument.indexOf("=") < 0) {
    result.action = clean(argument);
    return result;
  }
  var parts = argument.split(",");
  for (var i = 0; i < parts.length; i++) {
    var item = parts[i];
    var idx = item.indexOf("=");
    if (idx <= 0) continue;
    var key = clean(item.slice(0, idx));
    var value = clean(item.slice(idx + 1));
    result[key] = value;
  }
  result.action = clean(result.action || "auto");
  result.notifyMode = normalizeNotifyMode(result.notifyMode);
  return result;
}

function clean(value) {
  value = String(value === undefined || value === null ? "" : value).trim();
  value = value.replace(/^[\[\]\s"']+|[\[\]\s"']+$/g, "");
  try {
    return decodeURIComponent(value);
  } catch (err) {
    return value;
  }
}

function normalizeNotifyMode(value) {
  value = String(value || "always").toLowerCase();
  if (value === "always" || value === "failure" || value === "never") return value;
  return "always";
}

function readInt(value, fallback) {
  var n = parseInt(clean(value), 10);
  return isNaN(n) ? fallback : n;
}

function boolOpt(key, fallback) {
  var value = OPTIONS[key];
  if (value === undefined || value === null || value === "") return fallback;
  value = String(value).toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

(function main() {
  var action = (OPTIONS.action || "auto").toLowerCase();
  if (typeof $request !== "undefined" && $request) action = "capture";
  if (action === "capture") return captureFromWebRequest();
  if (action === "savecookie" || action === "save") return saveManualCookie();
  if (action === "clearcookie" || action === "clear") return clearCookie();
  if (action === "status") return showStatus();
  if (action === "manual" || action === "daily") return runTasks(true);
  return runTasks(false);
})();
