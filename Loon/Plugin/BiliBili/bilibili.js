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
  coinBalance: "https://account.bilibili.com/site/getCoin",
  dailyReward: "https://api.bilibili.com/x/member/web/exp/reward",
  coinTodayExp: "https://api.bilibili.com/x/web-interface/coin/today/exp",
  ranking: "https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all",
  videoDetail: "https://api.bilibili.com/x/web-interface/view",
  videoHeartbeat: "https://api.bilibili.com/x/click-interface/web/heartbeat",
  shareVideo: "https://api.bilibili.com/x/web-interface/share/add",
  addCoin: "https://api.bilibili.com/x/web-interface/coin/add",
  archiveCoins: "https://api.bilibili.com/x/web-interface/archive/coins",
  liveSign: "https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign",
  liveWalletStatus: "https://api.live.bilibili.com/xlive/revenue/v1/wallet/getStatus",
  silver2coin: "https://api.live.bilibili.com/xlive/revenue/v1/wallet/silver2coin",
  mangaClockIn: "https://manga.bilibili.com/twirp/activity.v1.Activity/ClockIn?platform=android",
  mangaVipReward: "https://manga.bilibili.com/twirp/user.v1.User/GetVipReward?reason_id=1",
  vipPrivilege: "https://api.bilibili.com/x/vip/privilege/receive",
  vipBigPointSign: "https://api.bilibili.com/pgc/activity/score/task/sign2"
};

var RUN_CACHE = {};
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
  if (String(code) === "0") return name + ": 成功";
  var msg = response && (response.message || response.msg) ? response.message || response.msg : "失败";
  return name + ": " + code + " " + msg;
}

function doneMark(value) {
  return value ? "已完成" : "未完成";
}

function pickField(data, lower, upper, fallback) {
  if (!data) return fallback;
  if (typeof data[lower] !== "undefined") return data[lower];
  if (typeof data[upper] !== "undefined") return data[upper];
  return fallback;
}

function section(results, name) {
  results.push("----开始 " + name + " ----");
}

function vipTypeName(type, status) {
  if (Number(status) !== 1) return "无会员";
  if (Number(type) === 2) return "年度大会员";
  if (Number(type) === 1) return "月度大会员";
  return "大会员";
}

function vipStatusName(status) {
  return Number(status) === 1 ? "正常" : "未开通/已过期";
}

function levelInfo(user) {
  var info = user && user.level_info ? user.level_info : {};
  return {
    level: Number(info.current_level || info.Current_level || 0),
    currentExp: Number(info.current_exp || info.Current_exp || 0),
    nextExp: info.next_exp || info.Next_exp || ""
  };
}

function formatMoney(value) {
  var n = Number(value);
  return isNaN(n) ? "unknown" : String(Math.floor(n * 100) / 100);
}

function clamp(value, min, max) {
  value = Number(value);
  if (isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
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

function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
  section(results, "登录");
  var res = await get(API.nav, { Referer: "https://www.bilibili.com/", Origin: "https://www.bilibili.com" });
  var data = res.data || {};
  if (data.code === 0 && data.data) {
    var user = data.data;
    RUN_CACHE.user = user;
    if (user.mid) write(STORE.uid, user.mid);
    var level = levelInfo(user);
    results.push("【用户名】" + (user.uname || user.mid || "unknown"));
    results.push("【会员类型】" + vipTypeName(user.vipType, user.vipStatus));
    results.push("【会员状态】" + vipStatusName(user.vipStatus));
    results.push("【硬币余额】" + formatMoney(user.money));
    results.push("【当前经验】" + level.currentExp);
    if (level.level >= 6) results.push("您已是 Lv6，大佬模式");
    else results.push("【当前等级】Lv" + level.level + " -> " + level.nextExp);
    results.push("登录成功，经验+5 √");
    return user;
  } else {
    results.push(shortResult("登录", data));
    return null;
  }
}

async function getDailyTaskStatus() {
  var reward = await get(API.dailyReward, {
    Referer: "https://account.bilibili.com/account/home",
    Origin: "https://account.bilibili.com"
  });
  if (!reward.data || reward.data.code !== 0 || !reward.data.data) return { ok: false, response: reward.data };
  var info = reward.data.data;
  return {
    ok: true,
    login: !!pickField(info, "login", "Login", false),
    watch: !!pickField(info, "watch", "Watch", false),
    share: !!pickField(info, "share", "Share", false),
    coins: Number(pickField(info, "coins", "Coins", 0) || 0),
    raw: info
  };
}

function pushDailyTaskStatus(results, status) {
  if (!status || !status.ok) {
    results.push(shortResult("每日任务状态", status && status.response));
    return;
  }
  results.push(
    "每日任务状态: 登录" +
      doneMark(status.login) +
      " 观看" +
      doneMark(status.watch) +
      " 分享" +
      doneMark(status.share) +
      " 投币" +
      status.coins +
      "枚"
  );
}

async function getCoinTodayExp() {
  var coinExp = await get(API.coinTodayExp, { Referer: "https://www.bilibili.com/", Origin: "https://www.bilibili.com" });
  if (coinExp.data && coinExp.data.code === 0) return Number(coinExp.data.data || 0);
  return 0;
}

async function dailyReward(results) {
  var status = await getDailyTaskStatus();
  pushDailyTaskStatus(results, status);
  var exp = await getCoinTodayExp();
  if (exp >= 0) {
    var suffix = boolOpt("taskDonateCoin", false) ? "" : "（投币任务未开启）";
    results.push("今日投币经验: " + exp + suffix);
  }
}

async function getRankingList() {
  if (RUN_CACHE.rankingList && RUN_CACHE.rankingList.length) return RUN_CACHE.rankingList;
  var rank = await get(API.ranking, { Referer: "https://www.bilibili.com/", Origin: "https://www.bilibili.com" });
  var data = rank.data && rank.data.data;
  var list = data && (data.list || data);
  if (!list || !list.length) throw new Error(shortResult("选择视频", rank.data));
  RUN_CACHE.rankingList = list;
  return list;
}

async function hydrateVideo(item) {
  var video = {
    aid: item.aid || item.av,
    bvid: item.bvid || item.bv_id || "",
    title: item.title || "公开视频",
    cid: item.cid || "",
    duration: Number(item.duration || 0),
    copyright: Number(item.copyright || 0)
  };
  if (!video.aid) throw new Error("选择视频: 缺少 aid");

  var detail = await get(API.videoDetail + "?aid=" + encodeURIComponent(video.aid), {
    Referer: "https://www.bilibili.com/",
    Origin: "https://www.bilibili.com"
  });
  if (detail.data && detail.data.code === 0 && detail.data.data) {
    var detailData = detail.data.data;
    video.bvid = detailData.bvid || video.bvid;
    video.title = detailData.title || video.title;
    video.duration = Number(detailData.duration || video.duration || 0);
    video.copyright = Number(detailData.copyright || video.copyright || 0);
    if (detailData.pages && detailData.pages.length) video.cid = detailData.pages[0].cid || video.cid;
  }
  return video;
}

async function getVideoForRun() {
  if (RUN_CACHE.video) return RUN_CACHE.video;
  var list = await getRankingList();
  var item = list[randomInt(0, Math.min(list.length, 10) - 1)] || list[0];
  var video = await hydrateVideo(item);

  RUN_CACHE.video = video;
  return video;
}

async function getDonateCandidateVideo() {
  var list = await getRankingList();
  RUN_CACHE.triedDonateAids = RUN_CACHE.triedDonateAids || {};
  for (var i = 0; i < Math.min(list.length, 30); i++) {
    var item = list[randomInt(0, Math.min(list.length, 30) - 1)] || list[i];
    var aid = item.aid || item.av;
    if (!aid || RUN_CACHE.triedDonateAids[aid]) continue;
    RUN_CACHE.triedDonateAids[aid] = true;
    return hydrateVideo(item);
  }
  return null;
}

function videoReferer(video) {
  return video.bvid ? "https://www.bilibili.com/video/" + video.bvid : "https://www.bilibili.com/video/av" + video.aid;
}

async function uploadHeartbeat(video, played) {
  var csrf = read(STORE.csrf);
  var mid = read(STORE.uid) || getCookiePart(read(STORE.cookie), "DedeUserID");
  if (!csrf) return { data: { code: "NA", message: "缺少 csrf" } };
  if (!mid) return { data: { code: "NA", message: "缺少 UID" } };
  var now = Math.floor(Date.now() / 1000);
  return postForm(
    API.videoHeartbeat + "?aid=" + encodeURIComponent(video.aid) + "&played_time=" + encodeURIComponent(played),
    {
      aid: video.aid,
      bvid: video.bvid,
      cid: video.cid,
      mid: mid,
      csrf: csrf,
      played_time: played,
      real_played_time: played,
      realtime: played,
      start_ts: now - played,
      type: 3,
      dt: 2,
      play_type: 3
    },
    { Referer: videoReferer(video), Origin: "https://www.bilibili.com" }
  );
}

async function videoWatch(results, video) {
  video = video || (await getVideoForRun());
  var open = await uploadHeartbeat(video, 0);
  if (!open.data || open.data.code !== 0) results.push(shortResult("打开视频", open.data));

  var played = randomInt(1, Math.max(2, Math.min(video.duration || 15, 15)));
  var res = await uploadHeartbeat(video, played);
  if (res.data && res.data.code === 0) results.push("观看视频: 成功，已上报 " + played + " 秒");
  else results.push(shortResult("观看视频", res.data));
}

async function videoShare(results, video) {
  var csrf = read(STORE.csrf);
  if (!csrf) {
    results.push("分享视频: 缺少 csrf");
    return;
  }
  video = video || (await getVideoForRun());
  var res = await postForm(
    API.shareVideo,
    {
      aid: video.aid,
      csrf: csrf,
      eab_x: 1,
      ramval: randomInt(3, 20),
      source: "web_normal",
      ga: 1
    },
    { Referer: videoReferer(video), Origin: "https://www.bilibili.com" }
  );
  if (res.data && res.data.code === 0) results.push("分享视频: 成功");
  else results.push(shortResult("分享视频", res.data));
}

async function watchAndShareVideo(results, status) {
  section(results, "观看、分享视频");
  if (!status || !status.ok) status = await getDailyTaskStatus();
  if (status && status.ok && status.watch && status.share) {
    results.push("今天已经观看过了，不需要再看啦");
    results.push("今天已经分享过了，不用再分享啦");
    return;
  }

  var video = await getVideoForRun();
  results.push("【随机视频】" + video.title);
  var watched = false;
  if (boolOpt("taskVideoWatch", true)) {
    if (status && status.ok && status.watch) results.push("今天已经观看过了，不需要再看啦");
    else {
      await videoWatch(results, video);
      watched = true;
    }
  }
  if (boolOpt("taskVideoShare", true)) {
    if (status && status.ok && status.share) results.push("今天已经分享过了，不用再分享啦");
    else {
      if (!watched) await uploadHeartbeat(video, 0);
      await videoShare(results, video);
    }
  }
}

async function getCoinBalance(user) {
  var res = await get(API.coinBalance, {
    Host: "account.bilibili.com",
    Referer: "https://account.bilibili.com/account/coin",
    Origin: "https://account.bilibili.com"
  });
  if (res.data && res.data.code === 0 && res.data.data) return Number(res.data.data.money || res.data.data.Money || 0);
  if (user && typeof user.money !== "undefined") return Number(user.money || 0);
  return 0;
}

async function getDonatedCoinsForVideo(video) {
  var res = await get(API.archiveCoins + "?aid=" + encodeURIComponent(video.aid) + "&jsonp=jsonp", {
    Referer: videoReferer(video),
    Origin: "https://www.bilibili.com"
  });
  if (res.data && res.data.code === 0 && res.data.data) return Number(res.data.data.multiply || res.data.data.Multiply || 0);
  return 2;
}

async function getCanDonateVideo() {
  for (var i = 0; i < 6; i++) {
    var video = await getDonateCandidateVideo();
    if (!video) return null;
    var already = await getDonatedCoinsForVideo(video);
    var limit = Number(video.copyright) === 1 ? 2 : 1;
    if (already < limit) {
      video.canDonate = limit - already;
      return video;
    }
  }
  return null;
}

function donateCanContinue(code) {
  return ["0", "-400", "10003", "34002", "34003", "34004", "34005"].indexOf(String(code)) >= 0;
}

async function donateCoinOnce(results, video, multiply) {
  var csrf = read(STORE.csrf);
  if (!csrf) {
    results.push("投币: 缺少 csrf");
    return false;
  }
  var res = await postForm(
    API.addCoin,
    {
      aid: video.aid,
      multiply: multiply,
      select_like: boolOpt("coinSelectLike", true) ? 1 : 0,
      cross_domain: "true",
      csrf: csrf,
      eab_x: 2,
      ramval: 3,
      source: "web_normal",
      ga: 1
    },
    { Referer: videoReferer(video), Origin: "https://www.bilibili.com" }
  );
  if (res.data && res.data.code === 0) {
    results.push("投币成功，经验+" + multiply * 10 + " √");
    return true;
  }
  results.push(shortResult("投币", res.data));
  if (!donateCanContinue(res.data && res.data.code)) throw new Error("投币发生未预计异常");
  return false;
}

async function donateCoins(results, user) {
  section(results, "投币");
  var target = readInt(OPTIONS.coinTarget || OPTIONS.coinCount, 5);
  target = clamp(target, 0, 5);
  if (target <= 0) {
    results.push("已配置为跳过投币任务");
    return;
  }

  var level = levelInfo(user || RUN_CACHE.user);
  if (boolOpt("saveCoinsWhenLv6", false) && level.level >= 6) {
    results.push("已经为 LV6，按配置跳过投币");
    return;
  }

  var alreadyExp = await getCoinTodayExp();
  var alreadyCoins = Math.floor(alreadyExp / 10);
  var needCoins = Math.max(0, target - alreadyCoins);
  results.push("【今日已投】" + alreadyCoins + "枚");
  results.push("【目标欲投】" + target + "枚");
  results.push("【还需再投】" + needCoins + "枚");
  if (needCoins <= 0) {
    results.push("已完成投币任务，不需要再投啦~");
    return;
  }

  var protectedCoins = Math.max(0, readInt(OPTIONS.protectedCoins, 0));
  var balance = await getCoinBalance(user || RUN_CACHE.user);
  results.push("【投币前余额】 : " + formatMoney(balance));
  if (balance <= 0) {
    results.push("因硬币余额不足，今日暂不执行投币任务");
    return;
  }
  if (balance <= protectedCoins) {
    results.push("因硬币余额达到或低于保留值，今日暂不执行投币任务");
    return;
  }
  if (balance < needCoins) {
    needCoins = Math.floor(balance);
    results.push("因硬币余额不足，目标投币数调整为: " + needCoins);
  }
  if (balance - needCoins <= protectedCoins) {
    var unprotectedCoins = Math.floor(balance - protectedCoins);
    if (unprotectedCoins !== needCoins) {
      needCoins = Math.max(0, unprotectedCoins);
      results.push("因硬币余额投币后将达到或低于保留值，目标投币数调整为: " + needCoins);
    }
  }
  if (needCoins <= 0) return;

  var success = 0;
  var tryCount = clamp(readInt(OPTIONS.maxDonateTries, 6), 1, 10);
  for (var i = 1; i <= tryCount && success < needCoins; i++) {
    var video = await getCanDonateVideo();
    if (!video) continue;
    results.push("【视频】" + video.title);
    var multiply = Math.min(1, needCoins - success, video.canDonate || 1);
    if (await donateCoinOnce(results, video, multiply)) success += multiply;
  }
  if (success >= needCoins) results.push("视频投币任务完成");
  else results.push("投币尝试超过" + tryCount + "次，已终止");

  var afterBalance = await getCoinBalance(user || RUN_CACHE.user);
  results.push("【硬币余额】" + formatMoney(afterBalance));
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
  var user = null;
  var status = null;
  try {
    user = await loginCheck(results);
    status = await getDailyTaskStatus();
    if (boolOpt("taskVideoWatch", true) || boolOpt("taskVideoShare", true)) await watchAndShareVideo(results, status);
    if (boolOpt("taskDonateCoin", false)) await donateCoins(results, user);
    if (boolOpt("taskDailyReward", true)) {
      section(results, "每日任务状态");
      await dailyReward(results);
    }
  } catch (error) {
    results.push("DailyTask: " + String(error));
  }

  var tasks = [];
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

  var hasFailure = /失败|缺少|未配置|非法|下线|不能|异常|终止|Error|NA/i.test(results.join("\n"));
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
