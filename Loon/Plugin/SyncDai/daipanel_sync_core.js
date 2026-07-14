/**
 * @name 呆呆面板核心同步模块 (模块化版)
 * @desc 仅负责处理与呆呆面板 Open API 的交互，由其他业务抓包脚本唤醒
 */

const HOST = $config.get("HOST") || "https://dai.atiny.fun:2";
const APP_KEY = $config.get("APP_KEY") || "b758c23de0937a80e2849da5f2457875";
const APP_SECRET = $config.get("APP_SECRET") || "32fbaf8f175678d0845cbb1ff85b1d50840917a26fcb158a637d327328f8a939";

(async () => {
    // 从数据总线读取待同步的数据
    const queueDataStr = $persistentStore.read("DAIPANEL_SYNC_QUEUE");
    if (!queueDataStr) {
        console.log("[核心同步] 队列为空，无须同步。");
        return;
    }

    let queueData;
    try {
        queueData = JSON.parse(queueDataStr);
    } catch (e) {
        console.log("[核心同步] 队列数据解析失败: " + e);
        return;
    }

    const { envName, envValue, remarkText } = queueData;
    if (!envName || !envValue) {
        console.log("[核心同步] 队列数据缺失关键字段，取消同步。");
        return;
    }

    // 清空队列，防止重复执行
    $persistentStore.write("", "DAIPANEL_SYNC_QUEUE");

    console.log(`[核心同步] 🚀 开始处理变量 [${envName}] 的推送...`);
    await pushToDaiPanel(envName, envValue, remarkText || "自动同步");

})().finally(() => {
    $done({});
});

// ===== 呆呆面板 API 通信函数 =====
function request(method, reqUrl, reqHeaders = {}, reqBody = null) {
    return new Promise((resolve, reject) => {
        const req = { url: reqUrl, headers: reqHeaders, body: reqBody };
        const fn = (method === "POST" || method === "PUT") ? $httpClient[method.toLowerCase()] : $httpClient.get;
        fn(req, (error, response, data) => {
            if (error) return reject(error);
            try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
        });
    });
}

async function pushToDaiPanel(envName, envValue, remarkText) {
    try {
        // 1. 获取 Token
        const tokenRes = await request("POST", `${HOST}/api/open-api/token`, { "Content-Type": "application/json" }, JSON.stringify({
            app_key: APP_KEY,
            app_secret: APP_SECRET
        }));
        const token = tokenRes?.data?.access_token || tokenRes?.access_token;
        if (!token) throw new Error(`Token 获取失败: ${JSON.stringify(tokenRes)}`);

        const authHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

        // 2. 搜索已有变量
        const searchRes = await request("GET", `${HOST}/api/envs?keyword=${envName}&page_size=100`, authHeaders);
        const existEnv = (searchRes.data || []).find(e => e.name === envName);

        // 3. 覆盖更新或直接新建
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
        console.log(`[核心同步] ❌ 推送失败: ${error}`);
        $notification.post("🤖 面板变量同步失败", `❌ ${envName}`, String(error));
    }
}