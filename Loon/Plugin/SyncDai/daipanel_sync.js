/**
 * @name 呆呆面板全自动抓取同步
 * @desc 自动监听 WPS / 小米抽奖 / 腾讯视频，截取 Cookie 并无感推送到呆呆面板
 */

// ====== 你的呆呆面板专属配置 ======
const HOST = "https://dai.atiny.fun:2";
const APP_KEY = "b758c23de0937a80e2849da5f2457875";
const APP_SECRET = "32fbaf8f175678d0845cbb1ff85b1d50840917a26fcb158a637d327328f8a939";
// ==================================

const url = $request.url;
const body = $request.body || "";
const headers = $request.headers;
// 兼容首字母大写和小写的 cookie
const cookie = headers["Cookie"] || headers["cookie"] || "";

(async () => {
    // 1. 腾讯视频 (TENV_COOKIE)
    if (url.includes("pbaccess.video.qq.com")) {
        if (cookie.includes("vqq_refresh_token=")) {
            if (checkFreq("TENV_COOKIE")) return;
            console.log("成功提取[腾讯视频]Cookie，准备推送至呆呆面板");
            // 这里传入动态备注：腾讯视频自动同步
            await pushToDaiPanel("TENV_COOKIE", cookie, "腾讯视频自动同步");
        }
    }
    // 2. 小米抽奖 (MI_LOTTERY)
    else if (url.includes("shop-api.retail.mi.com/mtop/navi/venue/batch")) {
        const actId = getMiActId(body);
        if (actId && cookie) {
            if (checkFreq("MI_LOTTERY")) return;
            console.log("成功提取[小米抽奖]数据，准备推送至呆呆面板");
            // 这里传入动态备注：小米抽奖自动同步
            await pushToDaiPanel("MI_LOTTERY", `${actId}#${cookie}`, "小米抽奖自动同步");
        }
    }
    // 3. WPS (WPS_SID)
    else if (url.includes("personal-act.wps.cn/activity-rubik/activity/page_info")) {
        const wpsSid = getCookieVal(cookie, "wps_sid");
        if (wpsSid) {
            if (checkFreq("WPS_SID")) return;
            console.log("成功提取[WPS]数据，准备推送至呆呆面板");
            // 这里传入动态备注：WPS自动同步
            await pushToDaiPanel("WPS_SID", wpsSid, "WPS自动同步");
        }
    }
})().finally(() => {
    // 必须调用 $done 放行原始请求
    $done({});
});


// ===== 工具函数区 =====

/**
 * 频率限制：防止短时间内多次触发请求轰炸面板 (冷却时间 5 分钟)
 */
function checkFreq(key) {
    const lastTime = $persistentStore.read(`LAST_PUSH_${key}`);
    if (lastTime && (Date.now() - parseInt(lastTime) < 1000 * 60 * 5)) {
        return true; 
    }
    $persistentStore.write(Date.now().toString(), `LAST_PUSH_${key}`);
    return false;
}

/**
 * 提取单个 Cookie 键值
 */
function getCookieVal(cookieStr, name) {
    const match = new RegExp(`(^|;\\s*)${name}=([^;]+)`).exec(cookieStr);
    return match ? match[2] : null;
}

/**
 * 提取小米抽奖的 actId
 */
function getMiActId(bodyStr) {
    if (!bodyStr || !bodyStr.includes("infinite-task")) return null;
    try {
        const parsed = JSON.parse(bodyStr);
        const list = parsed.query_list || (Array.isArray(parsed) && parsed[1] && parsed[1].query_list) || [];
        for (const item of list) {
            if (!item || item.resolver !== "infinite-task") continue;
            const param = typeof item.parameter === "string" ? JSON.parse(item.parameter) : item.parameter;
            if (param && param.actId) return param.actId;
        }
    } catch (e) {}
    return null;
}

/**
 * 请求包装器 (适配 Loon 的 $httpClient 转换为 Promise)
 */
function request(method, reqUrl, reqHeaders = {}, reqBody = null) {
    return new Promise((resolve, reject) => {
        const req = { url: reqUrl, headers: reqHeaders, body: reqBody };
        const fn = (method === "POST" || method === "PUT") ? $httpClient[method.toLowerCase()] : $httpClient.get;
        fn(req, (error, response, data) => {
            if (error) return reject(error);
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                resolve(data);
            }
        });
    });
}

/**
 * 核心对接逻辑：推送至呆呆面板
 * 增加了 remarkText 参数，接收动态的备注信息
 */
async function pushToDaiPanel(envName, envValue, remarkText) {
    try {
        // 1. 鉴权获取 Token
        const tokenRes = await request("POST", `${HOST}/api/open-api/token`, {
            "Content-Type": "application/json"
        }, JSON.stringify({ appKey: APP_KEY, appSecret: APP_SECRET }));
        
        const token = tokenRes.data?.token || tokenRes.token;
        if (!token) throw new Error("获取 Open API Token 失败，请检查密钥或面板状态");

        const authHeaders = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };

        // 2. 搜索变量是否已存在
        const searchRes = await request("GET", `${HOST}/api/envs?searchValue=${envName}`, authHeaders);
        const envs = searchRes.data || [];
        const existEnv = envs.find(e => e.name === envName);

        // 3. 执行更新或新增
        if (existEnv) {
            // 更新 PUT /api/envs/:id
            await request("PUT", `${HOST}/api/envs/${existEnv.id}`, authHeaders, JSON.stringify({
                name: envName,
                value: envValue,
                remarks: remarkText 
            }));
            console.log(`✅ 呆呆面板: [${envName}] 更新成功`);
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 更新成功`, `已覆盖并备注: ${remarkText}`);
        } else {
            // 新建 POST /api/envs
            await request("POST", `${HOST}/api/envs`, authHeaders, JSON.stringify([{
                name: envName,
                value: envValue,
                remarks: remarkText
            }]));
            console.log(`✅ 呆呆面板: [${envName}] 新增成功`);
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 新建成功`, `已创建并备注: ${remarkText}`);
        }
    } catch (error) {
        console.log(`❌ 推送至面板失败: ${error}`);
        $notification.post("🤖 面板变量同步失败", `❌ ${envName}`, String(error));
    }
}