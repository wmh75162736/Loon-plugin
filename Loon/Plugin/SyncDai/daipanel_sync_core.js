/**
 * @name 呆呆面板公共远程同步库 (全局挂载版 - 修复WPS相同值阻断)
 */

globalThis.DAI_HOST = "https://dai.atiny.fun:2"; 
globalThis.DAI_APP_KEY = "b758c23de0937a80e2849da5f2457875";
globalThis.DAI_APP_SECRET = "32fbaf8f175678d0845cbb1ff85b1d50840917a26fcb158a637d327328f8a939";

globalThis.pushToDaiPanel = async function(envName, envValue, remarkText) {
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

    try {
        console.log(`[同步库] 🚀 正在处理变量: ${envName}`);
        const tokenRes = await request("POST", `${globalThis.DAI_HOST}/api/open-api/token`, { "Content-Type": "application/json" }, JSON.stringify({
            app_key: globalThis.DAI_APP_KEY,
            app_secret: globalThis.DAI_APP_SECRET
        }));
        const token = tokenRes?.data?.access_token || tokenRes?.access_token;
        if (!token) throw new Error(`Token获取失败: ${JSON.stringify(tokenRes)}`);

        const authHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

        const searchRes = await request("GET", `${globalThis.DAI_HOST}/api/envs?keyword=${envName}&page_size=100`, authHeaders);
        const existEnv = (searchRes.data || []).find(e => e.name === envName);

        if (existEnv) {
            // 💎 核心修复：对比新旧值。如果完全一致，直接跳过，避免面板报错阻断！
            if (existEnv.value === envValue) {
                console.log(`[同步库] ℹ️ 变量值完全一致，跳过更新。`);
                $notification.post("🤖 面板变量自动同步", `ℹ️ ${envName} 数据无变化`, `面板内数据与抓取完全一致，无需重复更新`);
                return; // 提前结束，不发网络请求
            }

            await request("PUT", `${globalThis.DAI_HOST}/api/envs/${existEnv.id}`, authHeaders, JSON.stringify({
                name: envName, value: envValue, remarks: remarkText 
            }));
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 更新成功`, `已覆盖并备注: ${remarkText}`);
        } else {
            await request("POST", `${globalThis.DAI_HOST}/api/envs`, authHeaders, JSON.stringify({
                name: envName, value: envValue, remarks: remarkText
            }));
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 新建成功`, `已创建并备注: ${remarkText}`);
        }
    } catch (error) {
        console.log(`[同步库] ❌ 同步失败: ${error}`);
        $notification.post("🤖 面板变量同步失败", `❌ ${envName}`, String(error));
    }
};
