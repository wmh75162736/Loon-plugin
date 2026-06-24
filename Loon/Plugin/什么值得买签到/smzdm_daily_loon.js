/*
SMZDM daily check-in for Loon.

Capture:
  Open SMZDM app and run daily check-in once. This script captures Cookie from:
  https://user-api.smzdm.com/checkin

Task:
  The cron task signs in with the captured Cookie via user-api.smzdm.com.
*/

var NAME = "什么值得买";
var STORE_KEY = "smzdm_accounts";
var RANDOM_STATE_KEY = "smzdm_random_checkin_state";
var RANDOM_DELAY_MINUTES_MIN = 5;
var RANDOM_DELAY_MINUTES_MAX = 60;
var SIGN_KEY = "apr1$AwP!wRRT$gJ/q.X24poeBInlUJC";
var APP_VERSION = "10.4.1";
var SK = "ierkM0OZZbsuBKLoAgQ6OJneLMXBQXmzX+LXkNTuKch8Ui2jGlahuFyWIzBiDq/L";
var DEFAULT_UA = "smzdm_android_V10.4.1 rv:841 (Android12;zh)smzdmapp";
var OPTIONS = getRuntimeOptions();

main()
  .catch(function (err) {
    log("ERROR: " + (err && err.stack ? err.stack : err));
    if (typeof $request !== "undefined" && $request) {
      notify(NAME, "执行失败", String(err && err.message ? err.message : err));
    } else if (OPTIONS.runMode === "manual") {
      notify(NAME, "执行失败", String(err && err.message ? err.message : err));
    } else {
      notifyAuto("执行失败", String(err && err.message ? err.message : err), false);
    }
  })
  .finally(function () {
    if (typeof $done === "function") $done({});
  });

async function main() {
  if (typeof $request !== "undefined" && $request) {
    captureAccount();
    return;
  }

  if (OPTIONS.runMode === "manage") {
    manageAccounts();
    return;
  }

  var manualRun = OPTIONS.runMode === "manual";
  var gate = manualRun ? { run: true, state: null } : randomScheduleGate();
  if (!gate.run) return;

  var accounts = loadAccounts();
  if (!accounts.length) {
    if (manualRun) {
      notify(NAME, "未找到 Cookie", "打开什么值得买 App，进入签到页并手动签到一次后再运行。");
    } else {
      notifyAuto("未找到 Cookie", "打开什么值得买 App，进入签到页并手动签到一次后再运行。", false);
      markRandomScheduleDone(gate.state);
    }
    return;
  }

  log("Found " + accounts.length + " account(s)");
  var lines = [];
  var allOk = true;
  for (var i = 0; i < accounts.length; i++) {
    try {
      var result = await checkin(accounts[i], i + 1);
      if (!result.ok) allOk = false;
      lines.push("账号" + (i + 1) + ": " + result.message);
      if (i < accounts.length - 1) await delay(OPTIONS.accountIntervalSeconds * 1000 + Math.floor(Math.random() * 2000));
    } catch (err) {
      allOk = false;
      lines.push("账号" + (i + 1) + ": " + String(err && err.message ? err.message : err));
    }
  }

  if (manualRun) {
    notify(NAME, "立即签到完成", lines.join("\n"));
    if (allOk) markTodayDoneByManual();
  } else {
    notifyAuto("签到完成", lines.join("\n"), allOk);
    markRandomScheduleDone(gate.state);
  }
}

function captureAccount() {
  var headers = $request.headers || {};
  var cookie = getHeader(headers, "Cookie");
  var ua = getHeader(headers, "User-Agent") || DEFAULT_UA;
  if (!cookie) {
    notify(NAME, "Cookie 获取失败", "请求头里没有 Cookie。");
    return;
  }

  var accounts = loadAccounts();
  var index = findAccountIndex(accounts, cookie);
  var account = { cookie: cookie, ua: ua, updatedAt: new Date().toISOString() };
  if (index >= 0) {
    accounts[index] = account;
  } else {
    accounts.push(account);
  }

  if (saveAccounts(accounts)) {
    notify(NAME, "Cookie 获取成功", "当前已保存 " + accounts.length + " 个账号。");
  } else {
    notify(NAME, "Cookie 保存失败", "请检查 Loon 持久化存储权限。");
  }
}

async function checkin(account, index) {
  var token = await getToken(account);
  var ts = Date.now();
  var data = {
    f: "android",
    sk: SK,
    time: ts,
    token: token,
    v: APP_VERSION,
    weixin: 1,
  };
  data.sign = signParams(data);

  var signin = await post("https://user-api.smzdm.com/checkin", data, account);
  var body = parseJson(signin.body);
  var code = String(body.error_code);
  var message = body.error_msg || "无返回消息";

  var rewardText = "";
  if (OPTIONS.queryReward) {
    try {
      var reward = await post("https://user-api.smzdm.com/checkin/all_reward", data, account);
      rewardText = formatReward(parseJson(reward.body));
    } catch (err) {
      rewardText = "";
    }
  }

  if (body.data) {
    var details = [];
    if (body.data.daily_num) details.push("连续" + body.data.daily_num + "天");
    if (body.data.cpoints) details.push("积分" + body.data.cpoints);
    if (body.data.cgold) details.push("金币" + body.data.cgold);
    if (body.data.cexperience) details.push("经验" + body.data.cexperience);
    if (details.length) message += " (" + details.join(" / ") + ")";
  }
  if (rewardText) message += "\n" + rewardText;

  log("Account " + index + " response code: " + code + ", message: " + message);
  return { ok: code === "0" || /已签|已经|成功/.test(message), message: message };
}

async function getToken(account) {
  var ts = Date.now();
  var data = {
    f: "android",
    time: ts,
    v: APP_VERSION,
    weixin: 1,
  };
  data.sign = signParams(data);

  var response = await post("https://user-api.smzdm.com/robot/token", data, account);
  var body = parseJson(response.body);
  if (String(body.error_code) !== "0" || !body.data || !body.data.token) {
    throw new Error("Token 获取失败: " + (body.error_msg || response.body));
  }
  return body.data.token;
}

function post(url, data, account) {
  var body = formEncode(data);
  var options = {
    url: url,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "*/*",
      "Accept-Language": "zh-Hans-CN;q=1",
      "User-Agent": account.ua || DEFAULT_UA,
      "Cookie": account.cookie,
      "request_key": randomRequestKey(),
    },
    body: body,
  };

  return new Promise(function (resolve, reject) {
    $httpClient.post(options, function (error, response, data) {
      if (error) {
        reject(error);
      } else if (!response || response.status < 200 || response.status >= 300) {
        reject(new Error("HTTP " + (response ? response.status : "unknown")));
      } else {
        resolve({ response: response, body: data || "" });
      }
    });
  });
}

function formatReward(body) {
  if (String(body.error_code) !== "0" || !body.data || !body.data.normal_reward) return "";
  var normal = body.data.normal_reward;
  var parts = [];
  if (normal.sub_title) parts.push(normal.sub_title);
  if (normal.reward_add && normal.reward_add.content) {
    parts.push(stripHtml(normal.reward_add.content));
  }
  if (normal.gift && normal.gift.content) {
    parts.push(stripHtml(normal.gift.content));
  }
  return unique(parts).join("\n");
}

function signParams(params) {
  var raw = Object.keys(params)
    .filter(function (key) {
      return key !== "sign" && params[key] !== undefined && params[key] !== null;
    })
    .sort()
    .map(function (key) {
      return key + "=" + params[key];
    })
    .join("&");
  return md5(raw + "&key=" + SIGN_KEY).toUpperCase();
}

function formEncode(data) {
  return Object.keys(data)
    .map(function (key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
    })
    .join("&");
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error("JSON 解析失败: " + text.slice(0, 160));
  }
}

function loadAccounts() {
  var text = storeRead(STORE_KEY);
  if (!text) return [];
  try {
    var accounts = JSON.parse(text);
    return Array.isArray(accounts) ? accounts.filter(function (item) { return item && item.cookie; }) : [];
  } catch (err) {
    return [];
  }
}

function saveAccounts(accounts) {
  return storeWrite(JSON.stringify(accounts), STORE_KEY);
}

function manageAccounts() {
  var accounts = loadAccounts();
  if (!accounts.length) {
    notify(NAME, "账号管理", "当前没有已保存的账号。");
    return;
  }

  if (OPTIONS.accountAction === "delete") {
    var index = OPTIONS.accountIndex - 1;
    if (index < 0 || index >= accounts.length) {
      notify(NAME, "删除失败", "账号序号无效。当前已保存 " + accounts.length + " 个账号，请填写 1-" + accounts.length + "。");
      return;
    }

    var removed = accounts.splice(index, 1)[0];
    if (saveAccounts(accounts)) {
      notify(NAME, "账号已删除", "已删除账号" + (index + 1) + "（" + accountLabel(removed) + "）。\n当前剩余 " + accounts.length + " 个账号。");
    } else {
      notify(NAME, "删除失败", "无法写入 Loon 持久化存储。");
    }
    return;
  }

  var lines = accounts.map(function (account, index) {
    return "账号" + (index + 1) + "：" + accountLabel(account);
  });
  notify(NAME, "已保存 " + accounts.length + " 个账号", lines.join("\n"));
}

function accountLabel(account) {
  var sess = getCookieValue(account.cookie, "sess");
  var identifier = sess ? "sess " + maskValue(sess) : "会话标识不可用";
  var updatedAt = formatUpdatedAt(account.updatedAt);
  return identifier + (updatedAt ? "，更新于 " + updatedAt : "");
}

function maskValue(value) {
  value = String(value || "");
  if (value.length <= 8) return value.slice(0, 2) + "***";
  return value.slice(0, 4) + "..." + value.slice(-4);
}

function formatUpdatedAt(value) {
  if (!value) return "";
  var date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return formatDate(date) + " " + formatTime(date);
}

function getRuntimeOptions() {
  var args = normalizeArgument(typeof $argument !== "undefined" ? $argument : {});
  var minDelay = readInt(args.minDelay, RANDOM_DELAY_MINUTES_MIN);
  var maxDelay = readInt(args.maxDelay, RANDOM_DELAY_MINUTES_MAX);
  if (minDelay < 0) minDelay = RANDOM_DELAY_MINUTES_MIN;
  if (maxDelay < 0) maxDelay = RANDOM_DELAY_MINUTES_MAX;
  if (maxDelay < minDelay) {
    var tmp = minDelay;
    minDelay = maxDelay;
    maxDelay = tmp;
  }

  return {
    runMode: normalizeRunMode(args.runMode),
    notifyMode: normalizeNotifyMode(args.notifyMode),
    minDelayMinutes: minDelay,
    maxDelayMinutes: maxDelay,
    queryReward: readBool(args.queryReward, true),
    accountIntervalSeconds: Math.max(0, readInt(args.accountInterval, 2)),
    accountAction: normalizeAccountAction(args.accountAction),
    accountIndex: Math.max(1, readInt(cleanArgumentValue(args.accountIndex), 1)),
  };
}

function normalizeArgument(argument) {
  var result = {
    notifyMode: storeRead("notifyMode"),
    minDelay: storeRead("minDelay"),
    maxDelay: storeRead("maxDelay"),
    queryReward: storeRead("queryReward"),
    accountInterval: storeRead("accountInterval"),
    accountAction: "list",
    accountIndex: "1",
  };
  if (!argument) return result;
  if (typeof argument === "object") {
    if (Object.prototype.toString.call(argument) === "[object Array]") {
      var arrayKeys = ["runMode", "notifyMode", "minDelay", "maxDelay", "queryReward", "accountInterval"];
      var offset = 0;
      var first = argument.length ? cleanArgumentValue(argument[0]).toLowerCase() : "";
      if (first === "manage") {
        result.runMode = argument[0];
        result.accountAction = argument[1];
        result.accountIndex = argument[2];
        return result;
      }
      if (argument.length && first !== "auto" && first !== "manual") {
        arrayKeys = ["notifyMode", "minDelay", "maxDelay", "queryReward", "accountInterval"];
      }
      for (var i = 0; i < arrayKeys.length && i + offset < argument.length; i++) {
        result[arrayKeys[i]] = argument[i + offset];
      }
      return result;
    }
    for (var key in argument) {
      if (Object.prototype.hasOwnProperty.call(argument, key)) result[key] = argument[key];
    }
    return result;
  }
  if (typeof argument !== "string") return result;
  if (argument === "manual" || argument === "auto" || argument === "manage") {
    result.runMode = argument;
    return result;
  }
  try {
    var parsed = JSON.parse(argument);
    if (parsed && typeof parsed === "object") {
      var parsedBase = normalizeArgument(parsed);
      parsedBase.runMode = parsedBase.runMode || result.runMode;
      return parsedBase;
    }
  } catch (err) {}

  if (argument.indexOf("manage:") === 0) {
    var manageParts = argument.split(":");
    result.runMode = manageParts[0];
    result.accountAction = manageParts[1];
    result.accountIndex = manageParts[2];
    return result;
  }

  if (argument.indexOf("manage,") === 0) {
    var manageValues = argument.split(",");
    result.runMode = manageValues[0];
    result.accountAction = manageValues[1];
    result.accountIndex = manageValues[2];
    return result;
  }

  var keys = ["runMode", "notifyMode", "minDelay", "maxDelay", "queryReward", "accountInterval"];
  var values = argument.split(",");
  if (values.length && values[0] !== "manual" && values[0] !== "auto") {
    keys = ["notifyMode", "minDelay", "maxDelay", "queryReward", "accountInterval"];
  }
  for (var i = 0; i < keys.length && i < values.length; i++) {
    result[keys[i]] = values[i];
  }
  return result;
}

function normalizeRunMode(value) {
  value = cleanArgumentValue(value || "auto").toLowerCase();
  if (value === "manual" || value === "manage") return value;
  return "auto";
}

function normalizeAccountAction(value) {
  return cleanArgumentValue(value || "list").toLowerCase() === "delete" ? "delete" : "list";
}

function cleanArgumentValue(value) {
  return String(value === undefined || value === null ? "" : value)
    .trim()
    .replace(/^[\[\]\s"']+|[\[\]\s"']+$/g, "");
}

function normalizeNotifyMode(value) {
  value = String(value || "failure").toLowerCase();
  if (value === "always" || value === "never" || value === "failure") return value;
  return "failure";
}

function readInt(value, fallback) {
  var parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function readBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  value = String(value).toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function randomScheduleGate() {
  var now = new Date();
  var today = formatDate(now);
  var state = loadRandomScheduleState();
  if (!state || state.date !== today) {
    var delayMinutes = randomInt(OPTIONS.minDelayMinutes, OPTIONS.maxDelayMinutes);
    state = {
      date: today,
      delayMinutes: delayMinutes,
      minDelayMinutes: OPTIONS.minDelayMinutes,
      maxDelayMinutes: OPTIONS.maxDelayMinutes,
      targetAt: now.getTime() + delayMinutes * 60 * 1000,
      done: false,
    };
    storeWrite(JSON.stringify(state), RANDOM_STATE_KEY);
    log("Random check-in target: " + formatTime(new Date(state.targetAt)) + " (delay " + delayMinutes + " min)");
    return { run: false, state: state };
  }
  if (state.done) {
    log("Random check-in already done today.");
    return { run: false, state: state };
  }
  if (Date.now() < Number(state.targetAt)) {
    log("Random check-in waits until " + formatTime(new Date(Number(state.targetAt))) + ".");
    return { run: false, state: state };
  }
  return { run: true, state: state };
}

function loadRandomScheduleState() {
  var text = storeRead(RANDOM_STATE_KEY);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

function markRandomScheduleDone(state) {
  if (!state) return;
  state.done = true;
  state.doneAt = Date.now();
  storeWrite(JSON.stringify(state), RANDOM_STATE_KEY);
}

function markTodayDoneByManual() {
  var now = new Date();
  var state = {
    date: formatDate(now),
    delayMinutes: 0,
    minDelayMinutes: OPTIONS.minDelayMinutes,
    maxDelayMinutes: OPTIONS.maxDelayMinutes,
    targetAt: now.getTime(),
    done: true,
    doneAt: now.getTime(),
    runMode: "manual",
  };
  storeWrite(JSON.stringify(state), RANDOM_STATE_KEY);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function formatDate(date) {
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

function formatTime(date) {
  return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
}

function pad(value) {
  return value < 10 ? "0" + value : String(value);
}

function findAccountIndex(accounts, cookie) {
  var sess = getCookieValue(cookie, "sess");
  for (var i = 0; i < accounts.length; i++) {
    if (sess && getCookieValue(accounts[i].cookie, "sess") === sess) return i;
    if (accounts[i].cookie === cookie) return i;
  }
  return -1;
}

function getCookieValue(cookie, name) {
  var re = new RegExp("(?:^|;\\s*)" + escapeRegExp(name) + "=([^;]*)");
  var match = String(cookie || "").match(re);
  return match ? match[1] : "";
}

function getHeader(headers, name) {
  var target = name.toLowerCase();
  for (var key in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, key) && key.toLowerCase() === target) {
      return headers[key];
    }
  }
  return "";
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(items) {
  var seen = {};
  return items.filter(function (item) {
    item = String(item || "").trim();
    if (!item || seen[item]) return false;
    seen[item] = true;
    return true;
  });
}

function randomRequestKey() {
  return String(Math.floor(100000000000000000 + Math.random() * 900000000000000000));
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function storeRead(key) {
  if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
  return null;
}

function storeWrite(value, key) {
  if (typeof $persistentStore !== "undefined") return $persistentStore.write(value, key);
  return false;
}

function notifyAuto(subtitle, body, ok) {
  if (OPTIONS.runMode === "manual") {
    notify(NAME, subtitle, body);
    return;
  }
  if (OPTIONS.notifyMode === "never") return;
  if (OPTIONS.notifyMode === "failure" && ok) {
    log([NAME, subtitle, body].filter(Boolean).join(" - "));
    return;
  }
  notify(NAME, subtitle, body);
}

function notify(title, subtitle, body) {
  if (typeof $notification !== "undefined") {
    $notification.post(title, subtitle, body || "");
  }
  log([title, subtitle, body].filter(Boolean).join(" - "));
}

function log(message) {
  if (typeof console !== "undefined" && console.log) console.log(message);
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function md5(input) {
  function rotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX, lY) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = lX & 0x80000000;
    lY8 = lY & 0x80000000;
    lX4 = lX & 0x40000000;
    lY4 = lY & 0x40000000;
    lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  }
  function f(x, y, z) { return (x & y) | (~x & z); }
  function g(x, y, z) { return (x & z) | (y & ~z); }
  function h(x, y, z) { return x ^ y ^ z; }
  function i(x, y, z) { return y ^ (x | ~z); }
  function ff(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function gg(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function hh(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function ii(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(str) {
    var lWordCount;
    var lMessageLength = str.length;
    var lNumberOfWordsTemp1 = lMessageLength + 8;
    var lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
    var lWordArray = Array(lNumberOfWords - 1);
    var lBytePosition = 0;
    var lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue) {
    var wordToHexValue = "";
    var wordToHexValueTemp = "";
    var lByte;
    var lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValueTemp = "0" + lByte.toString(16);
      wordToHexValue += wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2);
    }
    return wordToHexValue;
  }
  function utf8Encode(str) {
    return unescape(encodeURIComponent(str));
  }

  var x = [];
  var k;
  var AA;
  var BB;
  var CC;
  var DD;
  var a;
  var b;
  var c;
  var d;
  var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  var S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  input = utf8Encode(input);
  x = convertToWordArray(input);
  a = 0x67452301;
  b = 0xefcdab89;
  c = 0x98badcfe;
  d = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    AA = a;
    BB = b;
    CC = c;
    DD = d;
    a = ff(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = ff(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = ff(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = ff(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = ff(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = ff(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = ff(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = ff(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = ff(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = ff(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = ff(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = ff(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = ff(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = ff(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = ff(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = ff(b, c, d, a, x[k + 15], S14, 0x49b40821);
    a = gg(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = gg(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = gg(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = gg(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = gg(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = gg(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = gg(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = gg(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = gg(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = gg(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = gg(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = gg(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = gg(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = gg(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = gg(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = gg(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
    a = hh(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = hh(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = hh(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = hh(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = hh(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = hh(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = hh(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = hh(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = hh(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = hh(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = hh(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = hh(b, c, d, a, x[k + 6], S34, 0x04881d05);
    a = hh(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = hh(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = hh(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = hh(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
    a = ii(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = ii(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = ii(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = ii(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = ii(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = ii(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = ii(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = ii(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = ii(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = ii(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = ii(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = ii(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = ii(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = ii(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = ii(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = ii(b, c, d, a, x[k + 9], S44, 0xeb86d391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}
