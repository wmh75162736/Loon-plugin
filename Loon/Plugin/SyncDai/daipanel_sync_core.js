/**
 * @name 呆呆面板公共远程同步库 (参数完美对齐版)
 */

globalThis.DAI_HOST = "https://dai.atiny.fun:2"; 
globalThis.DAI_APP_KEY = "b758c23de0937a80e2849da5f2457875";
globalThis.DAI_APP_SECRET = "32fbaf8f175678d0845cbb1ff85b1d50840917a26fcb158a637d327328f8a939";

globalThis.pushToDaiPanel = async function(envName, envValue, remarkText) {
    function request(method, reqUrl, reqHeaders = {}, reqBody = null) {
        return new Promise((resolve, reject) => {
            const req = { url: reqUrl, headers: reqHeaders, body: reqBody };
            const caller = $httpClient[method.toLowerCase()];
            if (!caller) return reject(new Error(`Loon不支持的请求方法: ${method}`));
            
            caller(req, (error, response, data) => {
                if (error) return reject(error);
                // 拦截 HTTP 400 级报错，直接抛出后端真实提示
                if (response && response.status >= 400) {
                    return reject(new Error(`HTTP ${response.status} -> ${data}`));
                }
                try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
            });
        });
    }

    try {
        console.log(`[同步库] 🚀 开始处理变量: ${envName}`);
        
        // 1. 获取 Token (严格对齐一体版 appKey 命名)
        const tokenRes = await request("POST", `${globalThis.DAI_HOST}/api/open-api/token`, { 
            "Content-Type": "application/json" 
        }, JSON.stringify({ appKey: globalThis.DAI_APP_KEY, appSecret: globalThis.DAI_APP_SECRET }));
        
        const token = tokenRes?.data?.token || tokenRes?.token;
        if (!token) throw new Error(`Token获取失败: ${JSON.stringify(tokenRes)}`);

        const authHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

        // 2. 搜索变量 (核心修复：还原回 searchValue，去除 page_size)
        const searchRes = await request("GET", `${globalThis.DAI_HOST}/api/envs?searchValue=${envName}`, authHeaders);
        const envs = searchRes.data || [];
        const existEnv = envs.find(e => e.name === envName);

        // 3. 更新或新建 (严格对齐一体版的数据结构)
        if (existEnv) {
            await request("PUT", `${globalThis.DAI_HOST}/api/envs/${existEnv.id}`, authHeaders, JSON.stringify({
                name: envName,
                value: envValue,
                remarks: remarkText 
            }));
            console.log(`[同步库] ✅ 面板更新成功`);
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 更新成功`, `已覆盖并备注: ${remarkText}`);
        } else {
            await request("POST", `${globalThis.DAI_HOST}/api/envs`, authHeaders, JSON.stringify([{
                name: envName,
                value: envValue,
                remarks: remarkText
            }]));
            console.log(`[同步库] ✅ 面板新建成功`);
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 新建成功`, `已创建并备注: ${remarkText}`);
        }
    } catch (error) {
        console.log(`[同步库] ❌ 同步失败: ${error}`);
        // 友好拦截青龙/呆呆的值相同报错
        if (String(error).includes("值未发生变化") || String(error).includes("未改变")) {
            $notification.post("🤖 面板变量自动同步", `ℹ️ ${envName} 数据无变化`, `面板提示抓取的数据与旧数据一致`);
        } else {
            $notification.post("🤖 面板变量同步失败", `❌ ${envName}`, String(error));
        }
    }
};
