/*
52FRP Loon 自动签到脚本 v1.1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
插件用途
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

本脚本用于在 Loon 中实现 52FRP 每日自动签到。

主要功能：
1. 每日定时检查 52FRP 签到状态
2. 未签到时自动请求签到接口
3. 已签到时直接输出简洁日志，避免重复签到
4. 输出日期、签到状态、累计签到、连续签到、本次获得流量、累计获得流量
5. 支持临时捕获登录态、Token、Cookie、真实签到接口
6. 临时捕获规则默认关闭，避免影响 52FRP 登录页和用户中心页面

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Loon 插件配置
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

把下面内容复制到 Loon 插件配置里。
脚本 Raw 地址：
https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/loon/js/52frp%20checkin/52frpCheckin-v1.js

#!name=52FRP 自动签到
#!desc=52FRP 每日签到 + 临时捕获真实签到接口 v1.1
#!author=ChatGPT
#!homepage=https://www.52frp.com
#!icon=https://www.52frp.com/favicon.ico

[Script]
# 临时捕获接口：默认关闭
# 需要重新抓 Cookie / Token / 签到接口时：
# 1. 先正常登录 52FRP
# 2. 进入个人主页
# 3. 手动开启“52FRP 临时捕获接口”
# 4. 点击一次“立即签到”
# 5. 捕获成功后关闭“52FRP 临时捕获接口”
http-request ^https?:\/\/www\.52frp\.com\/api\/(?!.*(?:auth\/login|auth\/register|login|logout|captcha|verify|sms|password|reset)).* script-path=https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/loon/js/52frp%20checkin/52frpCheckin-v1.js, requires-body=true, timeout=10, tag=52FRP 临时捕获接口, enable=false

# 每日自动签到
cron "10 8 * * *" script-path=https://raw.githubusercontent.com/wmh75162736/Loon-plugin/main/loon/js/52frp%20checkin/52frpCheckin-v1.js, timeout=60, tag=52FRP 每日签到, enable=true

[MITM]
hostname = www.52frp.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
使用方式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

首次使用：
1. 导入脚本文件 52frpCheckin-v1.js
2. 导入上方 Loon 插件配置
3. 保持“52FRP 临时捕获接口”为关闭
4. 打开 52FRP 网站并正常登录
5. 登录后进入个人主页
6. 手动开启“52FRP 临时捕获接口”
7. 点击一次“立即签到”
8. 出现“签到接口已捕获”后关闭“52FRP 临时捕获接口”

日常使用：
- 只开启“52FRP 每日签到”
- 保持“52FRP 临时捕获接口”关闭

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
日志显示格式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

运行后会尽量显示为：

2026 年 6 月 20 日
今日已签到
累计签到：2天
连续签到：2天
本次获得：302.68MB
累计获得：788.61MB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
注意事项
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 52FRP 登录页包含前端路由和验证流程，不建议长期启用临时捕获接口。
2. 临时捕获接口只在需要重新获取 Cookie、Token 或签到接口时开启。
3. 捕获成功后请关闭临时捕获接口，避免影响网页访问。
4. 如果提示登录态失效或“签到未成功”，请重新登录后再开启临时捕获接口重新捕获。
5. 本脚本只用于个人账号的正常签到请求，不包含验证码绕过、破解登录或异常请求逻辑。
*/

const APP_NAME = "52FRP 自动签到";

const USER_URL = "https://www.52frp.com/user/";
const DEFAULT_SIGN_URL = "https://www.52frp.com/api/user/sign";
const SIGN_INFO_URL = "https://www.52frp.com/api/user/sign/info";

const PREFIX = "frp52_v10_";
const LEGACY_PREFIXES = ["frp52_v19_", "frp52_v18_"];

const INFO_NOTICE_INTERVAL = 5 * 60 * 1000;

function key(name) {
  return PREFIX + name;
}

function notify(title, subtitle, message) {
  console.log(`[${title}] ${subtitle || ""}\n${message || ""}`);
  if (typeof $notification !== "undefined") {
    $notification.post(title, subtitle || "", message || "");
  }
}

function readRaw(k) {
  try {
    return $persistentStore.read(k) || "";
  } catch (e) {
    return "";
  }
}

function writeRaw(value, k) {
  try {
    return $persistentStore.write(String(value || ""), k);
  } catch (e) {
    console.log(`写入失败 ${k}: ${e}`);
    return false;
  }
}

function readStore(name) {
  let value = readRaw(key(name));
  if (value) return value;

  for (const prefix of LEGACY_PREFIXES) {
    value = readRaw(prefix + name);
    if (value) return value;
  }

  return "";
}

function writeStore(name, value) {
  return writeRaw(value, key(name));
}

function done(value) {
  if (typeof $done !== "undefined") {
    $done(value || {});
  }
}

function getHeader(headers, name) {
  if (!headers) return "";
  const target = String(name).toLowerCase();

  for (const k in headers) {
    if (String(k).toLowerCase() === target) {
      return headers[k];
    }
  }

  return "";
}

function setHeader(headers, name, value) {
  if (!value) return;

  const target = String(name).toLowerCase();

  for (const k in headers) {
    if (String(k).toLowerCase() === target) {
      headers[k] = value;
      return;
    }
  }

  headers[name] = value;
}

function safeJsonParse(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function formatDate(date) {
  const d = date || new Date();
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function formatTraffic(value) {
  const num = Number(value || 0);

  if (!Number.isFinite(num) || num <= 0) {
    return "0MB";
  }

  const KB = 1024;
  const MB = 1024 * 1024;
  const GB = 1024 * 1024 * 1024;

  if (num >= GB) {
    return `${(num / GB).toFixed(2)}GB`;
  }

  if (num >= MB) {
    return `${(num / MB).toFixed(2)}MB`;
  }

  if (num >= KB) {
    return `${(num / KB).toFixed(2)}KB`;
  }

  return `${num}B`;
}

function cleanText(text) {
  if (!text) return "";

  const json = safeJsonParse(text);
  if (json) {
    const msg = json.message || json.msg || json.error || "";
    const status = json.status !== undefined ? json.status : json.code;
    if (msg || status !== undefined) {
      return `status:${status} ${msg}`.trim();
    }
    return JSON.stringify(json).slice(0, 220);
  }

  let t = String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (t.length > 220) {
    t = t.slice(0, 220) + "...";
  }

  return t;
}

function getInfoData(text) {
  const json = safeJsonParse(text);
  if (!json || typeof json !== "object") return null;

  if (json.data && typeof json.data === "object") {
    return json.data;
  }

  return json;
}

function isSignedFromInfo(text) {
  const data = getInfoData(text);
  if (!data) return false;

  return (
    data.signed_today === true ||
    data.signed_today === 1 ||
    data.signed_today === "1" ||
    String(data.signed_today).toLowerCase() === "true"
  );
}

function buildSignSummary(infoText, statusText) {
  const data = getInfoData(infoText) || {};

  const status = statusText || (isSignedFromInfo(infoText) ? "今日已签到" : "今日未签到");

  const totalDays =
    data.total_sign_days !== undefined
      ? data.total_sign_days
      : data.total_days !== undefined
        ? data.total_days
        : "-";

  const consecutiveDays =
    data.consecutive_days !== undefined
      ? data.consecutive_days
      : data.continue_days !== undefined
        ? data.continue_days
        : "-";

  const lastTraffic =
    data.last_traffic !== undefined
      ? data.last_traffic
      : data.today_traffic !== undefined
        ? data.today_traffic
        : data.reward_traffic !== undefined
          ? data.reward_traffic
          : 0;

  const totalTraffic =
    data.total_traffic !== undefined
      ? data.total_traffic
      : data.sign_total_traffic !== undefined
        ? data.sign_total_traffic
        : 0;

  return [
    formatDate(new Date()),
    status,
    `累计签到：${totalDays}天`,
    `连续签到：${consecutiveDays}天`,
    `本次获得：${formatTraffic(lastTraffic)}`,
    `累计获得：${formatTraffic(totalTraffic)}`
  ].join("\n");
}

function isStaticResource(url) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|map)(\?|$)/i.test(url || "");
}

function isAuthOrLoginRequest(url) {
  const u = String(url || "").toLowerCase();

  return (
    u.includes("/auth/login") ||
    u.includes("/auth/register") ||
    u.includes("/login") ||
    u.includes("/logout") ||
    u.includes("/register") ||
    u.includes("/password") ||
    u.includes("/captcha") ||
    u.includes("/verify") ||
    u.includes("/sms") ||
    u.includes("/email") ||
    u.includes("/reset") ||
    u.includes("/oauth")
  );
}

function isSignInfoUrl(url) {
  return /\/api\/user\/sign\/info(?:\?|$)/i.test(String(url || ""));
}

function isRealSignUrl(url, method) {
  const u = String(url || "").toLowerCase();
  const m = String(method || "GET").toUpperCase();

  if (!u.includes("52frp.com")) return false;
  if (isStaticResource(u)) return false;
  if (isAuthOrLoginRequest(u)) return false;
  if (isSignInfoUrl(u)) return false;
  if (m === "GET") return false;

  const patterns = [
    /\/api\/user\/sign(?:\?|$)/,
    /\/api\/user\/sign\/(?!info)/,
    /checkin/,
    /check-in/,
    /qiandao/,
    /daily.?sign/,
    /sign.?daily/,
    /traffic.*sign/,
    /traffic.*receive/,
    /flow.*sign/,
    /flow.*receive/,
    /task.*receive/,
    /task.*finish/,
    /reward/,
    /award/,
    /receive/,
    /gift/,
    /punch/,
    /clockin/
  ];

  return patterns.some((reg) => reg.test(u));
}

function hasSensitiveBody(body) {
  if (!body) return false;
  return /password|passwd|pwd|captcha|verify|sms|code|login|username|email|account/i.test(String(body));
}

function sanitizeHeaders(headers) {
  const output = {};

  if (!headers) return output;

  const skip = [
    "host",
    "content-length",
    "accept-encoding",
    "connection",
    "proxy-connection",
    "if-none-match",
    "if-modified-since"
  ];

  for (const k in headers) {
    const lower = String(k).toLowerCase();
    if (skip.includes(lower)) continue;

    const value = headers[k];
    if (value === undefined || value === null) continue;

    output[k] = value;
  }

  return output;
}

function saveFullSignRequest(headers, body) {
  const safeHeaders = sanitizeHeaders(headers);
  writeStore("sign_headers_json", JSON.stringify(safeHeaders));

  if (body && !hasSensitiveBody(body)) {
    writeStore("sign_body", body);
  } else {
    writeStore("sign_body", "");
  }
}

function logCapturedSignRequest(method, contentType, body) {
  const type = contentType || "未设置";
  const bodySize = String(body || "").length;
  console.log(`已记录真实签到请求：${method}，Content-Type=${type}，请求体长度=${bodySize}`);
}

function saveAuthHeaders(headers) {
  const cookie = getHeader(headers, "Cookie");
  const ua = getHeader(headers, "User-Agent");
  const authorization = getHeader(headers, "Authorization");
  const xToken = getHeader(headers, "X-Token");
  const xAuthToken = getHeader(headers, "X-Auth-Token");
  const token = getHeader(headers, "Token");
  const satoken = getHeader(headers, "satoken");
  const csrf = getHeader(headers, "X-CSRF-TOKEN");
  const xsrf = getHeader(headers, "X-XSRF-TOKEN");
  const contentType = getHeader(headers, "Content-Type");

  let saved = false;

  if (cookie && cookie.length > 10) {
    writeStore("cookie", cookie);
    saved = true;
  }

  if (ua && ua.length > 10) {
    writeStore("ua", ua);
  }

  if (authorization && authorization.length > 5) {
    writeStore("authorization", authorization);
    saved = true;
  }

  if (xToken && xToken.length > 5) {
    writeStore("x_token", xToken);
    saved = true;
  }

  if (xAuthToken && xAuthToken.length > 5) {
    writeStore("x_auth_token", xAuthToken);
    saved = true;
  }

  if (token && token.length > 5) {
    writeStore("token", token);
    saved = true;
  }

  if (satoken && satoken.length > 5) {
    writeStore("satoken", satoken);
    saved = true;
  }

  if (csrf && csrf.length > 5) {
    writeStore("csrf", csrf);
    saved = true;
  }

  if (xsrf && xsrf.length > 5) {
    writeStore("xsrf", xsrf);
    saved = true;
  }

  if (contentType) {
    writeStore("sign_content_type", contentType);
  }

  if (saved) {
    console.log("已保存登录请求头");
  }

  return saved;
}

function shouldNotifyInfo() {
  const now = Date.now();
  const last = Number(readStore("info_notice_time") || 0);

  if (now - last > INFO_NOTICE_INTERVAL) {
    writeStore("info_notice_time", String(now));
    return true;
  }

  return false;
}

function handleRequest() {
  const url = $request.url || "";
  const method = String($request.method || "GET").toUpperCase();
  const headers = $request.headers || {};
  const body = $request.body || "";

  if (isStaticResource(url)) {
    done({});
    return;
  }

  if (isAuthOrLoginRequest(url)) {
    done({});
    return;
  }

  saveAuthHeaders(headers);

  if (isSignInfoUrl(url)) {
    if (shouldNotifyInfo()) {
      notify(
        APP_NAME,
        "签到信息接口已记录",
        "这是状态接口，不是签到接口；点击“立即签到”时会捕获真正接口"
      );
    }

    done({});
    return;
  }

  if (!isRealSignUrl(url, method)) {
    done({});
    return;
  }

  const contentType = getHeader(headers, "Content-Type");

  writeStore("sign_url", url);
  writeStore("sign_method", method);
  writeStore("sign_content_type", contentType || "");
  saveFullSignRequest(headers, body);
  logCapturedSignRequest(method, contentType, body);

  notify(APP_NAME, "签到接口已捕获", `${method} ${url}`);

  done({});
}

function addStoredAuthHeaders(headers) {
  const cookie = readStore("cookie");
  const ua = readStore("ua");
  const authorization = readStore("authorization");
  const xToken = readStore("x_token");
  const xAuthToken = readStore("x_auth_token");
  const token = readStore("token");
  const satoken = readStore("satoken");
  const csrf = readStore("csrf");
  const xsrf = readStore("xsrf");

  if (cookie) setHeader(headers, "Cookie", cookie);
  if (ua) setHeader(headers, "User-Agent", ua);

  if (authorization) setHeader(headers, "Authorization", authorization);
  if (xToken) setHeader(headers, "X-Token", xToken);
  if (xAuthToken) setHeader(headers, "X-Auth-Token", xAuthToken);
  if (token) setHeader(headers, "Token", token);
  if (satoken) setHeader(headers, "satoken", satoken);
  if (csrf) setHeader(headers, "X-CSRF-TOKEN", csrf);
  if (xsrf) setHeader(headers, "X-XSRF-TOKEN", xsrf);

  return headers;
}

function buildRequestHeaders() {
  let headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh-Hans;q=0.9",
    "Referer": USER_URL,
    "Origin": "https://www.52frp.com",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
  };

  const savedHeadersText = readStore("sign_headers_json");
  const savedHeaders = safeJsonParse(savedHeadersText);

  if (savedHeaders && typeof savedHeaders === "object") {
    headers = Object.assign(headers, sanitizeHeaders(savedHeaders));
  }

  headers = addStoredAuthHeaders(headers);

  delete headers["Host"];
  delete headers["host"];
  delete headers["Content-Length"];
  delete headers["content-length"];
  delete headers["Accept-Encoding"];
  delete headers["accept-encoding"];
  delete headers["Connection"];
  delete headers["connection"];

  return headers;
}

function hasAnyLoginState() {
  return Boolean(
    readStore("cookie") ||
    readStore("authorization") ||
    readStore("x_token") ||
    readStore("x_auth_token") ||
    readStore("token") ||
    readStore("satoken") ||
    readStore("sign_headers_json")
  );
}

function request(options) {
  return new Promise((resolve) => {
    const cb = function(error, response, data) {
      resolve({
        error,
        status: response && response.status ? response.status : 0,
        headers: response && response.headers ? response.headers : {},
        data: data || ""
      });
    };

    if (String(options.method || "GET").toUpperCase() === "POST") {
      $httpClient.post(options, cb);
    } else {
      $httpClient.get(options, cb);
    }
  });
}

function getJsonMessage(json) {
  if (!json || typeof json !== "object") return "";

  return String(
    json.message ||
    json.msg ||
    json.error ||
    json.errmsg ||
    json.detail ||
    ""
  );
}

function getBusinessStatus(json) {
  if (!json || typeof json !== "object") return "";

  if (json.status !== undefined) return json.status;
  if (json.code !== undefined) return json.code;
  if (json.errcode !== undefined) return json.errcode;

  return "";
}

function stringifyForJudge(text) {
  const json = safeJsonParse(text);

  if (json) {
    return JSON.stringify(json);
  }

  return String(text || "");
}

function isSuccessText(text) {
  const json = safeJsonParse(text);
  const msg = getJsonMessage(json);
  const biz = Number(getBusinessStatus(json));
  const all = `${stringifyForJudge(text)} ${msg}`;

  if (json && json.success === true) return true;

  if (biz === 200 && !/失败|错误|过期|未登录|未授权/i.test(all)) {
    return true;
  }

  return /签到成功|领取成功|成功签到|成功领取|获得.*流量|赠送.*流量|success["']?\s*:\s*true|code["']?\s*:\s*200|status["']?\s*:\s*200/i.test(all);
}

function isAlreadySignedText(text) {
  const all = stringifyForJudge(text);

  return /今日已签到|已经签到|已签到|重复签到|请勿重复|明天再来|今日已领取|已领取/i.test(all);
}

function isLoginExpired(text, status) {
  if (status === 401 || status === 403) return true;

  const all = stringifyForJudge(text);

  return /请先登录|重新登录|登录后|用户登录|登录已过期|token.*失效|token.*过期|未授权|unauthorized|unauthenticated|login required|sign in/i.test(all) &&
         !/签到|领取|流量|已签到|成功/i.test(all);
}

function classifyResult(text, httpStatus) {
  const json = safeJsonParse(text);
  const biz = Number(getBusinessStatus(json));

  if (isLoginExpired(text, httpStatus)) {
    return {
      state: "expired",
      title: "登录态可能失效"
    };
  }

  if (isSuccessText(text)) {
    return {
      state: "success",
      title: "签到完成"
    };
  }

  if (isAlreadySignedText(text)) {
    return {
      state: "already",
      title: "今日已签到"
    };
  }

  if (json && !Number.isNaN(biz) && biz >= 400) {
    return {
      state: "business_fail",
      title: "签到未成功"
    };
  }

  if (httpStatus >= 200 && httpStatus < 400) {
    return {
      state: "unknown_ok",
      title: "已请求签到接口"
    };
  }

  return {
    state: "fail",
    title: "签到可能失败"
  };
}

async function checkSignInfo(headers) {
  const infoHeaders = Object.assign({}, headers);

  delete infoHeaders["Content-Type"];
  delete infoHeaders["content-type"];

  const res = await request({
    url: SIGN_INFO_URL,
    method: "GET",
    headers: infoHeaders,
    timeout: 30000
  });

  return res;
}

async function runCheckin() {
  if (!hasAnyLoginState()) {
    notify(
      APP_NAME,
      "未保存登录态",
      "请登录 52FRP 后开启“临时捕获接口”，再点击一次签到"
    );
    done({});
    return;
  }

  let signUrl = readStore("sign_url");
  let signMethod = readStore("sign_method") || "POST";
  const signContentType = readStore("sign_content_type");
  const signBody = readStore("sign_body");

  if (!signUrl || !/^https?:\/\//i.test(signUrl)) {
    signUrl = DEFAULT_SIGN_URL;
    signMethod = "POST";
  }

  let headers = buildRequestHeaders();

  // 仅使用真实签到请求捕获到的 Content-Type。空 POST 不应伪装为 JSON 请求。
  if (signContentType) {
    setHeader(headers, "Content-Type", signContentType);
  } else {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }

  console.log("先检查签到状态...");

  const infoRes = await checkSignInfo(headers);

  if (!infoRes.error && infoRes.status >= 200 && infoRes.status < 400) {
    if (isSignedFromInfo(infoRes.data)) {
      const summary = buildSignSummary(infoRes.data, "今日已签到");
      writeStore("last_result", summary);
      notify(APP_NAME, "今日已签到", summary);
      done({});
      return;
    }
  } else {
    console.log(`签到状态检查失败，继续尝试签到。HTTP=${infoRes.status}`);
  }

  const options = {
    url: signUrl,
    method: signMethod,
    headers,
    timeout: 30000
  };

  if (String(signMethod).toUpperCase() === "POST" && signBody) {
    options.body = signBody;
  }

  console.log(`开始签到：${signMethod} ${signUrl}`);

  const res = await request(options);

  if (res.error) {
    notify(APP_NAME, "签到请求失败", String(res.error));
    done({});
    return;
  }

  const classified = classifyResult(res.data, res.status);

  if (classified.state === "expired") {
    notify(
      APP_NAME,
      "登录态可能失效",
      "请重新登录后开启临时捕获接口，再点击一次签到"
    );
    done({});
    return;
  }

  /*
  签到后复查状态，用状态接口生成简洁摘要
  */
  const afterInfo = await checkSignInfo(headers);

  if (!afterInfo.error && afterInfo.status >= 200 && afterInfo.status < 400) {
    if (isSignedFromInfo(afterInfo.data)) {
      const title = classified.state === "success" ? "签到完成" : "今日已签到";
      const statusText = classified.state === "success" ? "签到完成" : "今日已签到";
      const summary = buildSignSummary(afterInfo.data, statusText);

      writeStore("last_result", summary);
      notify(APP_NAME, title, summary);
      done({});
      return;
    }
  }

  const failureHint = classified.state === "business_fail" && res.status === 400
    ? "服务端未确认签到成功。请重新开启临时捕获接口，在网页点击一次“立即签到”后关闭，再运行脚本。"
    : "";

  const fallback = [
    formatDate(new Date()),
    classified.title,
    cleanText(res.data),
    failureHint
  ].filter(Boolean).join("\n");

  writeStore("last_result", fallback);
  notify(APP_NAME, classified.title, fallback);
  done({});
}

if (typeof $request !== "undefined") {
  handleRequest();
} else {
  runCheckin();
}
