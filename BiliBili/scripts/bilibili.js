/*
 * BiliBili Loon automation template.
 *
 * Credentials are stored only in Loon's local $persistentStore:
 *   bili_cookie
 *   bili_user_agent
 *   bili_uid
 *   bili_csrf
 *
 * Upstream reference:
 *   https://github.com/RayWangQvQ/BiliBiliToolPro
 */

const STORE = {
  cookie: "bili_cookie",
  userAgent: "bili_user_agent",
  uid: "bili_uid",
  csrf: "bili_csrf",
  lastRun: "bili_last_run"
};

const DEFAULT_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BiliApp/80000100";

const API = {
  nav: "https://api.bilibili.com/x/web-interface/nav",
  dailyReward: "https://api.bilibili.com/x/member/web/exp/reward",
  coinTodayExp: "https://api.bilibili.com/x/web-interface/coin/today/exp",
  liveSign: "https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign",
  liveWalletStatus: "https://api.live.bilibili.com/xlive/revenue/v1/wallet/getStatus",
  silver2coin: "https://api.live.bilibili.com/xlive/revenue/v1/wallet/silver2coin",
  mangaClockIn: "https://manga.bilibili.com/twirp/activity.v1.Activity/ClockIn?platform=android",
  mangaVipReward: "https://manga.bilibili.com/twirp/user.v1.User/GetVipReward?reason_id=1",
  vipPrivilege: "https://api.bilibili.com/x/vip/privilege/receive",
  vipBigPointSign: "https://api.bilibili.com/pgc/activity/score/task/sign2",
  vipBigPointCombine: "https://api.bilibili.com/x/vip_point/task/combine"
};

function read(key, fallback = "") {
  return $persistentStore.read(key) || fallback;
}

function write(key, value) {
  if (value === undefined || value === null || value === "") return false;
  return $persistentStore.write(String(value), key);
}

function headers(extra = {}) {
  const cookie = read(STORE.cookie);
  const ua = read(STORE.userAgent, DEFAULT_UA);
  return Object.assign(
    {
      Cookie: cookie,
      "User-Agent": ua,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh-Hans;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    extra
  );
}

function getCookiePart(cookie, name) {
  const match = String(cookie || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function toForm(data) {
  return Object.keys(data)
    .filter((key) => data[key] !== undefined && data[key] !== null)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
}

function safeJson(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (_) {
    return { raw: body };
  }
}

function shortResult(name, response) {
  const code = response && typeof response.code !== "undefined" ? response.code : "NA";
  const msg = response && (response.message || response.msg) ? response.message || response.msg : "ok";
  return name + ": " + code + " " + msg;
}

function request(method, options) {
  return new Promise((resolve) => {
    const client = method === "POST" ? $httpClient.post : $httpClient.get;
    client(options, (error, response, body) => {
      if (error) {
        resolve({ ok: false, error: String(error), status: response && response.status, data: {} });
        return;
      }
      resolve({
        ok: true,
        status: response && response.status,
        body,
        data: safeJson(body)
      });
    });
  });
}

function get(url, extraHeaders = {}) {
  return request("GET", { url, headers: headers(extraHeaders) });
}

function postForm(url, data = {}, extraHeaders = {}) {
  return request("POST", {
    url,
    headers: headers(extraHeaders),
    body: toForm(data)
  });
}

function postJson(url, data = {}, extraHeaders = {}) {
  return request("POST", {
    url,
    headers: headers(Object.assign({ "Content-Type": "application/json" }, extraHeaders)),
    body: JSON.stringify(data)
  });
}

function notify(title, subtitle, message) {
  $notification.post(title, subtitle || "", message || "");
}

function done(value) {
  if (typeof $done === "function") $done(value || {});
}

function capture() {
  const reqHeaders = ($request && $request.headers) || {};
  const cookie = reqHeaders.Cookie || reqHeaders.cookie || "";
  const ua = reqHeaders["User-Agent"] || reqHeaders["user-agent"] || DEFAULT_UA;

  if (!cookie || cookie.indexOf("SESSDATA=") < 0) {
    notify("BiliBili Cookie", "未捕获到有效 Cookie", "请确认 Loon 已启用 MITM，并重新打开 B 站 App。");
    done();
    return;
  }

  const csrf = getCookiePart(cookie, "bili_jct");
  const uid = getCookiePart(cookie, "DedeUserID");

  write(STORE.cookie, cookie);
  write(STORE.userAgent, ua);
  write(STORE.csrf, csrf);
  write(STORE.uid, uid);

  notify("BiliBili Cookie", "保存成功", "UID: " + (uid || "unknown"));
  done();
}

async function loginCheck(results) {
  const res = await get(API.nav, {
    Referer: "https://www.bilibili.com/",
    Origin: "https://www.bilibili.com"
  });
  const data = res.data || {};
  if (data.code === 0 && data.data) {
    if (data.data.mid) write(STORE.uid, data.data.mid);
    results.push("登录: " + (data.data.uname || data.data.mid || "ok"));
  } else {
    results.push(shortResult("登录", data));
  }
}

async function dailyReward(results) {
  const reward = await get(API.dailyReward, {
    Referer: "https://account.bilibili.com/account/home",
    Origin: "https://account.bilibili.com"
  });
  results.push(shortResult("每日经验状态", reward.data));

  const coinExp = await get(API.coinTodayExp, {
    Referer: "https://www.bilibili.com/",
    Origin: "https://www.bilibili.com"
  });
  if (coinExp.data && coinExp.data.code === 0) {
    results.push("投币经验: " + coinExp.data.data);
  } else {
    results.push(shortResult("投币经验", coinExp.data));
  }
}

async function liveSign(results) {
  const res = await get(API.liveSign, {
    Referer: "https://link.bilibili.com/",
    Origin: "https://link.bilibili.com"
  });
  results.push(shortResult("直播签到", res.data));
}

async function silver2coin(results) {
  const csrf = read(STORE.csrf);
  if (!csrf) {
    results.push("银瓜子兑换: 缺少 csrf");
    return;
  }

  const status = await get(API.liveWalletStatus, {
    Origin: "https://link.bilibili.com"
  });
  const left = status.data && status.data.data && status.data.data.silver_2_coin_left;
  if (left !== undefined && Number(left) <= 0) {
    results.push("银瓜子兑换: 今日无次数");
    return;
  }

  const res = await postForm(
    API.silver2coin,
    {
      csrf,
      csrf_token: csrf,
      visit_id: Math.floor(Math.random() * 9 + 1) + Math.random().toString(36).slice(2, 12) + "0"
    },
    { Origin: "https://link.bilibili.com" }
  );
  results.push(shortResult("银瓜子兑换", res.data));
}

async function mangaSign(results) {
  const res = await postForm(
    API.mangaClockIn,
    {},
    {
      Host: "manga.bilibili.com",
      Origin: "https://manga.bilibili.com"
    }
  );
  results.push(shortResult("漫画签到", res.data));
}

async function mangaVipReward(results) {
  const res = await postForm(
    API.mangaVipReward,
    {},
    {
      Host: "manga.bilibili.com",
      Origin: "https://manga.bilibili.com"
    }
  );
  results.push(shortResult("漫画福利", res.data));
}

async function vipPrivilege(results) {
  const csrf = read(STORE.csrf);
  if (!csrf) {
    results.push("大会员福利: 缺少 csrf");
    return;
  }

  for (const type of [1, 2]) {
    const url = API.vipPrivilege + "?type=" + type + "&csrf=" + encodeURIComponent(csrf);
    const res = await postForm(url, {}, { Referer: "https://account.bilibili.com/" });
    results.push(shortResult("大会员福利 type=" + type, res.data));
  }
}

async function vipBigPointSign(results) {
  const csrf = read(STORE.csrf);
  if (!csrf) {
    results.push("大积分签到: 缺少 csrf");
    return;
  }

  const now = Date.now();
  const url =
    API.vipBigPointSign +
    "?mobi_app=android&platform=android&csrf=" +
    encodeURIComponent(csrf);

  const res = await postJson(
    url,
    {
      device: "phone",
      t: now,
      ts: Math.floor(now / 1000)
    },
    { Referer: "https://big.bilibili.com/mobile/index" }
  );
  results.push(shortResult("大积分签到", res.data));
}

async function runDaily() {
  const cookie = read(STORE.cookie);
  const csrf = getCookiePart(cookie, "bili_jct") || read(STORE.csrf);
  if (!cookie || cookie.indexOf("SESSDATA=") < 0) {
    notify("BiliBili Daily", "未配置 Cookie", "先启用插件并打开 B 站 App 完成 Cookie 捕获。");
    done();
    return;
  }
  if (csrf) write(STORE.csrf, csrf);

  const results = [];
  const tasks = [
    loginCheck,
    dailyReward,
    liveSign,
    mangaSign,
    mangaVipReward,
    vipPrivilege,
    vipBigPointSign,
    silver2coin
  ];

  for (const task of tasks) {
    try {
      await task(results);
    } catch (error) {
      results.push(task.name + ": " + String(error));
    }
  }

  const summary = results.slice(0, 8).join("\n");
  write(STORE.lastRun, new Date().toISOString());
  notify("BiliBili Daily", "任务完成", summary);
  done();
}

const arg = typeof $argument === "string" ? $argument : "";
if (typeof $request !== "undefined" || arg.indexOf("action=capture") >= 0) {
  capture();
} else {
  runDaily();
}
