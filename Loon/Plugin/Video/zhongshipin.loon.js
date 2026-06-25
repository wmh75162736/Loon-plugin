/*
中视频 - Loon 专用脚本

参数示例：
zsp=备注%23secretId%23secretKey
zsp=账号1%23secretId%23secretKey%0A账号2%23secretId%23secretKey%23固定deviceId

可选参数：
ZSP_CDK=兑换码
maxAds=50
notify=1

也可在 Loon 持久化存储中写入 ZSP / zsp / AD_WATCH_ACCOUNTS。
账号格式保持原青龙脚本一致：备注#secretId#secretKey，可追加 #deviceId。
*/

const ENV_NAME = "中视频";
const USER_AGENT = "Mozilla/5.0 (Linux; Android 15; 23013RK75C Build/AQ3A.250226.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.260 Mobile Safari/537.36 (Immersed/39.42857) Html5Plus/1.0";
const BASE_URL = "https://api.qarfmkp.cn";
const CACHE_KEY = "zsp.device_cache.v1";

let deviceCache = {};
let runtimeConfig = {
  zsp: "",
  accountRemark: "",
  secretId: "",
  secretKey: "",
  deviceId: "",
  cdk: "",
  maxAds: 50,
  notify: true,
  delayMin: 3000,
  delayMax: 6000
};

function isLoonRuntime() {
  const missing = [];
  if (typeof $httpClient === "undefined") missing.push("$httpClient");
  if (typeof $persistentStore === "undefined") missing.push("$persistentStore");
  if (typeof $done !== "function") missing.push("$done");

  if (missing.length > 0) {
    console.log(`[${ENV_NAME}] 当前环境不适合执行此 Loon 脚本，缺少：${missing.join(", ")}`);
    console.log(`[${ENV_NAME}] 请在 Loon 的 [Script] 定时任务中运行，不要放到青龙或普通 Node.js 环境。`);
    return false;
  }
  return true;
}

function safeDone() {
  if (typeof $done === "function") {
    $done();
  }
}

function readStore(key) {
  try {
    return $persistentStore.read(key) || "";
  } catch (_) {
    return "";
  }
}

function writeStore(value, key) {
  try {
    return $persistentStore.write(value, key);
  } catch (_) {
    return false;
  }
}

function parseArguments(raw) {
  const args = {};
  if (!raw || typeof raw !== "string") return args;

  raw.split(/[&,]/).forEach((part) => {
    if (!part) return;
    const index = part.indexOf("=");
    const rawKey = index >= 0 ? part.slice(0, index) : part;
    const rawValue = index >= 0 ? part.slice(index + 1) : "";
    const key = safeDecode(rawKey).trim();
    const value = cleanArgValue(safeDecode(rawValue));
    if (key) args[key] = value;
  });

  return args;
}

function cleanArgValue(value) {
  const str = String(value || "").trim();
  if (/^\{[^{}]+\}$/.test(str)) return "";
  return str;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value).replace(/\+/g, "%20"));
  } catch (_) {
    return String(value);
  }
}

function loadRuntimeConfig() {
  const args = parseArguments(typeof $argument === "string" ? $argument : "");
  runtimeConfig.accountRemark =
    cleanArgValue(args.accountRemark || args.remark || readStore("ZSP_REMARK") || "默认账号");
  runtimeConfig.secretId =
    cleanArgValue(args.secretId || readStore("ZSP_SECRET_ID") || "");
  runtimeConfig.secretKey =
    cleanArgValue(args.secretKey || readStore("ZSP_SECRET_KEY") || "");
  runtimeConfig.deviceId =
    cleanArgValue(args.deviceId || readStore("ZSP_DEVICE_ID") || "");

  runtimeConfig.zsp =
    args.ZSP ||
    args.zsp ||
    args.AD_WATCH_ACCOUNTS ||
    readStore("ZSP") ||
    readStore("zsp") ||
    readStore("AD_WATCH_ACCOUNTS") ||
    "";

  if (!runtimeConfig.zsp && runtimeConfig.secretId && runtimeConfig.secretKey) {
    const parts = [
      runtimeConfig.accountRemark || "默认账号",
      runtimeConfig.secretId,
      runtimeConfig.secretKey
    ];
    if (runtimeConfig.deviceId) {
      parts.push(runtimeConfig.deviceId);
    }
    runtimeConfig.zsp = parts.join("#");
  }

  runtimeConfig.cdk =
    cleanArgValue(args.ZSP_CDK || args.zsp_cdk || readStore("ZSP_CDK") || "");

  runtimeConfig.maxAds = parsePositiveInt(args.maxAds || args.MAX_ADS || readStore("ZSP_MAX_ADS"), 50);
  runtimeConfig.delayMin = parsePositiveInt(args.delayMin || readStore("ZSP_DELAY_MIN"), 3000);
  runtimeConfig.delayMax = parsePositiveInt(args.delayMax || readStore("ZSP_DELAY_MAX"), 6000);
  runtimeConfig.notify = String(args.notify || readStore("ZSP_NOTIFY") || "1") !== "0";

  if (runtimeConfig.delayMax < runtimeConfig.delayMin) {
    runtimeConfig.delayMax = runtimeConfig.delayMin;
  }
}

function parsePositiveInt(value, fallback) {
  const num = parseInt(value, 10);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function loadCache() {
  try {
    const data = readStore(CACHE_KEY);
    deviceCache = data ? JSON.parse(data) : {};
  } catch (_) {
    deviceCache = {};
  }
}

function saveCache() {
  writeStore(JSON.stringify(deviceCache), CACHE_KEY);
}

function createDevice() {
  let str = "";
  const arr = "0123456789abcdef";
  for (let i = 0; i < 32; i++) {
    str += arr[Math.floor(Math.random() * 16)];
  }
  return str;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequest(options) {
  return new Promise((resolve, reject) => {
    const method = (options.method || "GET").toUpperCase();
    const request = {
      url: options.url,
      headers: options.headers || {}
    };

    if (options.body !== undefined) {
      request.body = options.body;
    }

    const callback = (error, response, data) => {
      if (error) {
        reject(new Error(typeof error === "string" ? error : JSON.stringify(error)));
        return;
      }

      const statusCode = response && (response.status || response.statusCode) ? (response.status || response.statusCode) : 0;
      const headers = response && response.headers ? response.headers : {};
      let body = "";

      if (typeof data === "string") {
        body = data;
      } else if (data === undefined || data === null) {
        body = "";
      } else {
        body = JSON.stringify(data);
      }

      if (statusCode === 403) {
        console.log(`响应体: ${body.substring(0, 200)}...`);
      }

      resolve({ statusCode, headers, body });
    };

    if (method === "GET") {
      $httpClient.get(request, callback);
    } else if (method === "POST") {
      $httpClient.post(request, callback);
    } else {
      reject(new Error(`Loon 适配层暂不支持 ${method} 请求`));
    }
  });
}

function decodeUnicode(str) {
  if (!str) return "";
  return String(str).replace(/\\u[\dA-F]{4}/gi, (match) =>
    String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16))
  );
}

function parseJson(body, fallback) {
  try {
    return JSON.parse(body);
  } catch (_) {
    return fallback;
  }
}

function buildDeviceHeader(account) {
  return JSON.stringify({
    id: account.deviceId,
    brand: "xiaomi",
    model: "23013RK75C",
    platform: "android",
    system: "Android 15"
  });
}

function buildHeaders(account, token) {
  const headers = {
    Accept: "*/*",
    "User-Agent": USER_AGENT,
    "app-device": buildDeviceHeader(account),
    "Content-Type": "application/json",
    Host: "api.qarfmkp.cn"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function notify(subtitle, message) {
  if (!runtimeConfig.notify || typeof $notification === "undefined") return;
  $notification.post(ENV_NAME, subtitle, message);
}

async function main() {
  console.log(`脚本开始运行，时间: ${new Date().toLocaleString()}\n`);

  loadRuntimeConfig();
  const accounts = loadAccounts();

  if (accounts.length === 0) {
    const message = "未找到有效账号配置，请检查 zsp/ZSP 参数。";
    console.log(message);
    notify("运行失败", message);
    return;
  }

  console.log(`找到 ${accounts.length} 个账号\n`);

  const summaries = [];
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    console.log(`\n开始处理账号 ${i + 1}: ${account.remark}`);
    console.log("=".repeat(30));

    try {
      const summary = await processAccount(account);
      summaries.push(`${account.remark}: 成功 ${summary.successCount}/${summary.maxAds}, 奖励 ${summary.totalReward}`);
    } catch (error) {
      console.log(`处理账号 ${account.remark} 时出错: ${error.message}`);
      summaries.push(`${account.remark}: 异常 ${error.message}`);
    }

    if (i < accounts.length - 1) {
      console.log("\n等待5秒后处理下一个账号...");
      await wait(5000);
    }
  }

  console.log("\n所有账号处理完成！");
  notify("运行完成", summaries.join("\n"));
}

function loadAccounts() {
  loadCache();
  const accounts = [];
  const envValue = normalizeAccountConfig(runtimeConfig.zsp);

  if (!envValue) {
    console.log("请设置 zsp/ZSP 账号配置。");
    return accounts;
  }

  const accountStrs = envValue.split("\n").filter((str) => str.trim());

  for (const str of accountStrs) {
    const parts = str.split("#");
    if (parts.length >= 3) {
      const remark = parts[0] || "未命名账号";
      const secretId = parts[1];
      const secretKey = parts[2];
      const cacheKey = `${secretId}_${secretKey}`;
      let deviceId;

      if (parts[3] && parts[3].trim()) {
        deviceId = parts[3].trim();
        deviceCache[cacheKey] = deviceId;
      } else if (deviceCache[cacheKey]) {
        deviceId = deviceCache[cacheKey];
        console.log("读取已固定设备码");
      } else {
        deviceId = createDevice();
        deviceCache[cacheKey] = deviceId;
        console.log("首次生成设备码，已永久保存");
      }

      accounts.push({ remark, secretId, secretKey, deviceId });
      console.log(`加载账号: ${remark}`);
    } else {
      console.log(`忽略格式错误的账号配置: ${str}`);
    }
  }

  saveCache();
  return accounts;
}

function normalizeAccountConfig(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\|\|/g, "\n")
    .trim();
}

async function processAccount(account) {
  let token = await login(account);
  if (!token) {
    console.log("登录失败，跳过此账号");
    return emptySummary();
  }
  console.log("登录成功，token获取完成");

  if (runtimeConfig.cdk) {
    console.log("\n检测到CDK，自动执行兑换");
    await exchangeCdk(token, account, runtimeConfig.cdk);
  } else {
    console.log("\n未配置CDK，跳过兑换");
  }

  const signed = await checkAndSign(token, account);
  if (!signed) {
    console.log("签到失败，跳过后续任务");
    return emptySummary();
  }

  console.log("\n开始执行每日抽奖");
  await checkAndDraw(token, account);

  console.log("\n开始执行广告观看任务");
  console.log("-".repeat(30));

  let successCount = 0;
  let failCount = 0;
  let totalReward = 0;
  let consecutiveErrors = 0;
  const maxAds = runtimeConfig.maxAds;

  for (let adCount = 0; adCount < maxAds; adCount++) {
    console.log(`\n第 ${adCount + 1}/${maxAds} 次广告任务`);

    if (consecutiveErrors >= 3) {
      console.log("连续3次错误，尝试重新登录...");
      const newToken = await login(account);
      if (newToken) {
        token = newToken;
        console.log("重新登录成功，继续任务");
        consecutiveErrors = 0;
      } else {
        console.log("重新登录失败，跳过此账号");
        break;
      }
    }

    try {
      const adInfo = await getNextAd(token, account);
      if (!adInfo) {
        console.log("   获取广告失败");
        failCount++;
        consecutiveErrors++;
        await wait(3000);
        continue;
      }

      console.log(`   广告标题: ${adInfo.title}`);
      console.log(`   需要观看: ${adInfo.duration}秒`);
      console.log(`   预期奖励: ${adInfo.reward || 0}`);

      console.log("   开始播放广告...");
      const playResult = await claimReward(token, account, adInfo.id, adInfo.duration);

      if (playResult && playResult.success) {
        console.log("   广告观看成功!");
        console.log(`   获得奖励: ${playResult.reward || 0}`);

        successCount++;
        totalReward += parseInt(playResult.reward, 10) || 0;
        consecutiveErrors = 0;

        if (adCount < maxAds - 1) {
          const randomDelay = Math.floor(Math.random() * (runtimeConfig.delayMax - runtimeConfig.delayMin + 1)) + runtimeConfig.delayMin;
          console.log(`   等待${Math.round(randomDelay / 1000)}秒后处理下一个广告...`);
          await wait(randomDelay);
        }
      } else {
        console.log("   广告观看失败");
        failCount++;
        consecutiveErrors++;
        await wait(3000);
      }
    } catch (error) {
      console.log(`   广告任务出错: ${error.message}`);
      failCount++;
      consecutiveErrors++;
      await wait(3000);
    }
  }

  console.log("\n" + "=".repeat(30));
  console.log("任务完成统计:");
  console.log(`   成功: ${successCount} 次`);
  console.log(`   失败: ${failCount} 次`);
  console.log(`   总计奖励: ${totalReward}`);
  console.log(`   成功率: ${((successCount / maxAds) * 100).toFixed(1)}%`);

  return { successCount, failCount, totalReward, maxAds };
}

function emptySummary() {
  return { successCount: 0, failCount: 0, totalReward: 0, maxAds: runtimeConfig.maxAds };
}

async function login(account) {
  const url = `${BASE_URL}/api/app/v1/auth/secretKeyLogin`;
  const body = {
    secretId: account.secretId,
    secretKey: account.secretKey
  };

  try {
    const response = await httpRequest({
      url,
      method: "POST",
      headers: buildHeaders(account),
      body: JSON.stringify(body)
    });

    if (response.statusCode !== 200) {
      console.log(`登录请求失败，状态码: ${response.statusCode}`);
      return null;
    }

    const data = parseJson(response.body, {});
    if (data.code === 0 && data.data && data.data.token) {
      return data.data.token;
    }

    console.log(`登录失败: ${data.message || "未知错误"}`);
    return null;
  } catch (error) {
    console.log(`登录请求失败: ${error.message}`);
    return null;
  }
}

async function checkAndSign(token, account) {
  const url = `${BASE_URL}/api/app/v1/device/userSign`;

  try {
    const response = await httpRequest({
      url,
      method: "POST",
      headers: buildHeaders(account, token),
      body: "{}"
    });

    if (response.statusCode !== 200) {
      console.log(`签到请求失败，状态码: ${response.statusCode}`);
      return false;
    }

    const data = parseJson(response.body, {});
    if (data.code === 0) {
      const message = decodeUnicode(data.message);
      console.log(`签到结果: ${message}`);

      if (data.data) {
        console.log(`   获得签到金币: ${data.data.qiandao_money || 0}`);
        console.log(`   连续签到天数: ${data.data.continuousDays || 1}`);
      }

      return true;
    }

    const errorMsg = decodeUnicode(data.message || "未知错误");
    console.log(`签到失败: ${errorMsg}`);
    if (errorMsg && errorMsg.includes("已签到")) {
      console.log("今日已签到，继续执行抽奖");
      return true;
    }

    return false;
  } catch (error) {
    console.log(`签到请求失败: ${error.message}`);
    return false;
  }
}

async function exchangeCdk(token, account, cdk) {
  const url = `${BASE_URL}/api/app/v1/cdk/exchange`;
  const body = JSON.stringify({ cdk });

  try {
    const response = await httpRequest({
      url,
      method: "POST",
      headers: buildHeaders(account, token),
      body
    });

    if (response.statusCode !== 200) {
      console.log(`CDK兑换请求失败，状态码：${response.statusCode}`);
      return false;
    }

    const data = parseJson(response.body, {});
    const msg = decodeUnicode(data.message || "");
    if (data.code === 0) {
      console.log(`CDK兑换成功：${msg}`);
      if (data.data) {
        console.log(`兑换奖励：${JSON.stringify(data.data)}`);
      }
      return true;
    }

    console.log(`CDK兑换失败：${msg}`);
    return false;
  } catch (err) {
    console.log(`CDK兑换异常：${err.message}`);
    return false;
  }
}

async function checkAndDraw(token, account) {
  const url = `${BASE_URL}/api/app/v1/device/turntable`;

  try {
    const response = await httpRequest({
      url,
      method: "POST",
      headers: buildHeaders(account, token),
      body: "{}"
    });

    if (response.statusCode !== 200) {
      console.log(`抽奖请求失败，状态码: ${response.statusCode}`);
      return false;
    }

    const data = parseJson(response.body, {});
    const message = decodeUnicode(data.message);
    console.log(`抽奖结果: ${message}`);

    if (data.data) {
      console.log(`   抽奖奖励: ${data.data.reward || 0}`);
    }

    if (data.code !== 0) {
      const errorMsg = decodeUnicode(data.message || "未知错误");
      console.log(`抽奖失败: ${errorMsg}`);
      if (errorMsg && errorMsg.includes("次数")) {
        console.log("今日抽奖次数已用完");
        return true;
      }
      return false;
    }

    return true;
  } catch (error) {
    console.log(`抽奖请求失败: ${error.message}`);
    return false;
  }
}

async function getNextAd(token, account) {
  const url = `${BASE_URL}/api/app/v1/ad/next`;

  try {
    const response = await httpRequest({
      url,
      method: "GET",
      headers: buildHeaders(account, token)
    });

    if (response.statusCode !== 200) {
      console.log(`   获取广告失败，状态码: ${response.statusCode}`);
      if (response.body) {
        const errorData = parseJson(response.body, {});
        console.log(`   错误信息: ${errorData.message || "未知错误"}`);
      }
      return null;
    }

    const data = parseJson(response.body, {});
    if (data.code === 0 && data.data && data.data.result) {
      const ad = data.data.result;
      return {
        id: ad.id,
        title: decodeUnicode(ad.title),
        description: decodeUnicode(ad.description),
        duration: parseInt((ad.video && ad.video.duration) || 30, 10),
        videoUrl: (ad.video && ad.video.url) || "",
        playUrl: (ad.video && ad.video.play_url) || "",
        reward: ad.reward
      };
    }

    const errorMsg = decodeUnicode(data.message || "未知错误");
    console.log(`   获取广告失败: ${errorMsg}`);
    return null;
  } catch (error) {
    console.log(`   获取广告请求失败: ${error.message}`);
    return null;
  }
}

async function claimReward(token, account, adId, duration) {
  const startTime = new Date().toISOString();
  const playResult = await startVideoPlay(token, account, adId, startTime);

  if (!playResult || !playResult.playRecordId) {
    console.log("   广告播放开始失败");
    return { success: false };
  }

  console.log(`   播放开始成功! 记录ID: ${playResult.playRecordId}`);
  console.log(`   初始奖励: ${playResult.initialReward || 0}`);

  const waitTime = duration * 1000;
  console.log(`   广告播放中，等待 ${duration} 秒...`);
  await wait(waitTime);

  const endResult = await endVideoPlay(token, account, playResult.playRecordId);
  if (endResult.success) {
    console.log("   广告观看完整流程完成!");
    return {
      success: true,
      reward: playResult.reward || 0,
      playRecordId: playResult.playRecordId
    };
  }

  console.log("   广告观看完成，但结束确认失败");
  return {
    success: true,
    reward: playResult.reward || 0,
    playRecordId: playResult.playRecordId
  };
}

async function startVideoPlay(token, account, adId, playTime) {
  const url = `${BASE_URL}/api/app/v1/ad/video/play`;
  const body = {
    clientIp: "",
    deviceInfo: {
      deviceId: account.deviceId,
      platform: "android"
    },
    id: adId.toString(),
    playTime
  };

  try {
    const response = await httpRequest({
      url,
      method: "POST",
      headers: buildHeaders(account, token),
      body: JSON.stringify(body)
    });

    if (response.statusCode !== 200) {
      console.log(`   开始播放广告失败，状态码: ${response.statusCode}`);
      return null;
    }

    const data = parseJson(response.body, {});
    if (data.code === 0 && data.data) {
      return {
        playRecordId: data.data.id,
        initialReward: data.data.reward || 0,
        reward: data.data.reward || 0
      };
    }

    console.log(`   开始播放广告失败: ${data.message || "未知错误"}`);
    return null;
  } catch (error) {
    console.log(`   开始播放广告请求失败: ${error.message}`);
    return null;
  }
}

async function endVideoPlay(token, account, playRecordId) {
  const url = `${BASE_URL}/api/app/v1/ad/video/ended`;
  const endTime = new Date().toISOString();
  const body = {
    clientIp: "",
    deviceInfo: {
      deviceId: account.deviceId,
      platform: "android"
    },
    id: playRecordId.toString(),
    playTime: endTime
  };

  try {
    const response = await httpRequest({
      url,
      method: "POST",
      headers: buildHeaders(account, token),
      body: JSON.stringify(body)
    });

    if (response.statusCode !== 200) {
      console.log(`   广告结束确认失败，状态码: ${response.statusCode}`);
      return { success: true };
    }

    const data = parseJson(response.body, {});
    return { success: data.code === 0 };
  } catch (error) {
    console.log(`   广告结束确认请求失败: ${error.message}`);
    return { success: false };
  }
}

if (isLoonRuntime()) {
  main()
    .then(safeDone)
    .catch((error) => {
      console.log(`脚本异常: ${error.message}`);
      notify("脚本异常", error.message);
      safeDone();
    });
} else {
  safeDone();
}
