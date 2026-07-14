/**
 * @name 呆呆面板核心同步模块 (远程模块化版)
 * @desc 负责 Open API 的交互，由业务抓包模块注入总线数据后，通过别名唤醒执行
 */

const HOST = "https://dai.atiny.fun:2"; 
const APP_KEY = "b758c23de0937a80e2849da5f2457875";
const APP_SECRET = "32fbaf8f175678d0845cbb1ff85b1d50840917a26fcb158a637d327328f8a939";

(async () => {
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

    // 读完立刻清空队列，防止网络重试导致多次发送
    $persistentStore.write("", "DAIPANEL_SYNC_QUEUE");

    console.log(`[核心同步] 🚀 开始处理变量 [${envName}] 的推送...`);
    await pushToDaiPanel(envName, envValue, remarkText || "自动同步");

})().finally(() => {
    $done({});
});

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
        const tokenRes = await request("POST", `${HOST}/api/open-api/token`, { "Content-Type": "application/json" }, JSON.stringify({
            app_key: APP_KEY,
            app_secret: APP_SECRET
        }));
        const token = tokenRes?.data?.access_token || tokenRes?.access_token;
        if (!token) throw new Error(`Token 获取失败: ${JSON.stringify(tokenRes)}`);

        const authHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

        const searchRes = await request("GET", `${HOST}/api/envs?keyword=${envName}&page_size=100`, authHeaders);
        const existEnv = (searchRes.data || []).find(e => e.name === envName);

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
