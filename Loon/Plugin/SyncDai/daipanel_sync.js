/**
 * @name 呆呆面板全自动抓取同步 (小米Header强化版)
 */

const HOST = "https://dai.atiny.fun:2"; 
const APP_KEY = "b758c23de0937a80e2849da5f2457875";
const APP_SECRET = "32fbaf8f175678d0845cbb1ff85b1d50840917a26fcb158a637d327328f8a939";

const url = $request.url;
const body = $request.body || "";
const headers = $request.headers;
const cookie = headers["Cookie"] || headers["cookie"] || "";

(async () => {
    // 1. 腾讯视频 (TENV_COOKIE)
    if (url.includes("pbaccess.video.qq.com")) {
        if (cookie.includes("vqq_refresh_token=")) {
            if (checkFreq("TENV_COOKIE")) return;
            console.log("\n========== 触发 [腾讯视频] 同步 ==========");
            await pushToDaiPanel("TENV_COOKIE", cookie, "腾讯视频自动同步");
            console.log("========== 同步流程结束 ==========\n");
        }
    }
    // 2. 小米抽奖 (MI_LOTTERY)
    else if (url.includes("shop-api.retail.mi.com/mtop/navi/venue/batch")) {
        const actId = getMiActId(body);
        // 核心修改：单独提取 mishop-client-id 请求头
        const mishopClientId = headers["mishop-client-id"] || headers["MiShop-Client-Id"] || "";
        
        if (actId && cookie) {
            if (checkFreq("MI_LOTTERY")) return;
            console.log("\n========== 触发 [小米抽奖] 同步 ==========");
            // 核心修改：把 client-id 拼接到环境变量里
            const envValue = mishopClientId ? `${actId}#${cookie}#${mishopClientId}` : `${actId}#${cookie}`;
            await pushToDaiPanel("MI_LOTTERY", envValue, "小米抽奖自动同步");
            console.log("========== 同步流程结束 ==========\n");
        }
    }
    // 3. WPS (WPS_SID)
    else if (url.includes("personal-act.wps.cn/activity-rubik/activity/page_info")) {
        const wpsSid = getCookieVal(cookie, "wps_sid");
        if (wpsSid) {
            if (checkFreq("WPS_SID")) return;
            console.log("\n========== 触发 [WPS] 同步 ==========");
            await pushToDaiPanel("WPS_SID", wpsSid, "WPS自动同步");
            console.log("========== 同步流程结束 ==========\n");
        }
    }
})().finally(() => {
    $done({});
});


// ===== 工具函数区 =====

function checkFreq(key) {
    const lastTime = $persistentStore.read(`LAST_PUSH_${key}`);
    // 5 分钟冷却
    if (lastTime && (Date.now() - parseInt(lastTime) < 1000 * 60 * 5)) {
        return true; 
    }
    $persistentStore.write(Date.now().toString(), `LAST_PUSH_${key}`);
    return false;
}

function getCookieVal(cookieStr, name) {
    const match = new RegExp(`(^|;\\s*)${name}=([^;]+)`).exec(cookieStr);
    return match ? match[2] : null;
}

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
 * 核心对接逻辑
 */
async function pushToDaiPanel(envName, envValue, remarkText) {
    try {
        const tokenPayload = {
            app_key: APP_KEY,
            app_secret: APP_SECRET
        };
        const tokenRes = await request("POST", `${HOST}/api/open-api/token`, { "Content-Type": "application/json" }, JSON.stringify(tokenPayload));
        const token = tokenRes?.data?.access_token || tokenRes?.access_token;
        if (!token) throw new Error(`Token 获取失败: ${JSON.stringify(tokenRes)}`);

        const authHeaders = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };

        const searchUrl = `${HOST}/api/envs?keyword=${envName}&page_size=100`;
        const searchRes = await request("GET", searchUrl, authHeaders);
        const envs = searchRes.data || [];
        const existEnv = envs.find(e => e.name === envName);

        if (existEnv) {
            await request("PUT", `${HOST}/api/envs/${existEnv.id}`, authHeaders, JSON.stringify({
                name: envName, value: envValue, remarks: remarkText 
            }));
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 更新成功`, `已覆盖并备注: ${remarkText}`);
        } else {
            await request("POST", `${HOST}/api/envs`, authHeaders, JSON.stringify({
                name: envName, value: envValue, remarks: remarkText
            }));
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 新建成功`, `已创建并备注: ${remarkText}`);
        }
    } catch (error) {
        $notification.post("🤖 面板变量同步失败", `❌ ${envName}`, String(error));
    }
}
