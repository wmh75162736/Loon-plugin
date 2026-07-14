/**
 * @name 呆呆面板公共远程同步库 (全面排错强化版)
 */

globalThis.DAI_HOST = "https://dai.atiny.fun:2"; 
globalThis.DAI_APP_KEY = "b758c23de0937a80e2849da5f2457875";
globalThis.DAI_APP_SECRET = "32fbaf8f175678d0845cbb1ff85b1d50840917a26fcb158a637d327328f8a939";

globalThis.pushToDaiPanel = async function(envName, envValue, remarkText) {
    function request(method, reqUrl, reqHeaders = {}, reqBody = null) {
        return new Promise((resolve, reject) => {
            const req = { url: reqUrl, headers: reqHeaders, body: reqBody };
            const caller = $httpClient[method.toLowerCase()] || $httpClient.post;
            
            if (!caller) return reject(new Error(`不支持的请求方法: ${method}`));
            
            caller(req, (error, response, data) => {
                if (error) return reject(error);
                // 核心修复：强行拦截面板返回的 400/500 错误，不再静默吞错
                if (response && response.status >= 400) {
                    return reject(new Error(`面板返回报错 (HTTP ${response.status}): ${data}`));
                }
                try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
            });
        });
    }

    try {
        console.log(`[同步库] 🚀 开始处理变量: ${envName}`);
        
        // 1. 获取 Token (完全对齐一体版正常代码)
        const tokenRes = await request("POST", `${globalThis.DAI_HOST}/api/open-api/token`, { 
            "Content-Type": "application/json" 
        }, JSON.stringify({ appKey: globalThis.DAI_APP_KEY, appSecret: globalThis.DAI_APP_SECRET }));
        
        const token = tokenRes?.data?.token || tokenRes?.token || tokenRes?.data?.access_token || tokenRes?.access_token;
        if (!token) throw new Error(`Token获取失败: ${JSON.stringify(tokenRes)}`);

        const authHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

        // 2. 搜索变量 (使用一体正常版的 searchValue 逻辑)
        console.log(`[同步库] 🔎 正在搜索是否存在历史变量...`);
        const searchRes = await request("GET", `${globalThis.DAI_HOST}/api/envs?searchValue=${envName}&page_size=100`, authHeaders);
        const envs = searchRes.data || [];
        const existEnv = envs.find(e => e.name === envName);

        // 3. 更新或新建
        if (existEnv) {
            console.log(`[同步库] 🔄 查找到历史变量 (ID: ${existEnv.id})，准备执行覆盖更新...`);
            const putRes = await request("PUT", `${globalThis.DAI_HOST}/api/envs/${existEnv.id}`, authHeaders, JSON.stringify({
                name: envName, value: envValue, remarks: remarkText 
            }));
            console.log(`[同步库] ✅ 更新成功: ${JSON.stringify(putRes)}`);
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 更新成功`, `已覆盖并备注: ${remarkText}`);
        } else {
            console.log(`[同步库] ➕ 未找到历史变量，准备执行新建...`);
            // 对齐一体版的 POST 数组格式
            const postRes = await request("POST", `${globalThis.DAI_HOST}/api/envs`, authHeaders, JSON.stringify([{
                name: envName, value: envValue, remarks: remarkText
            }]));
            console.log(`[同步库] ✅ 新建成功: ${JSON.stringify(postRes)}`);
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 新建成功`, `已创建并备注: ${remarkText}`);
        }
    } catch (error) {
        console.log(`[同步库] ❌ 同步失败: ${error}`);
        // 增加防干扰判断：如果是因为测试抓包导致的数据一样，不再报严重错误
        if (String(error).includes("未改变") || String(error).includes("未发生变化")) {
            $notification.post("🤖 面板变量自动同步", `ℹ️ ${envName} 数据未变`, `面板提示数据相同，无须更新`);
        } else {
            $notification.post("🤖 面板变量同步失败", `❌ ${envName}`, String(error));
        }
    }
};
