/**
 * @name 呆呆面板公共远程同步库
 */

const HOST = "https://dai.atiny.fun:2"; 
const APP_KEY = "b758c23de0937a80e2849da5f2457875";
const APP_SECRET = "32fbaf8f175678d0845cbb1ff85b1d50840917a26fcb158a637d327328f8a939";

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
        console.log(`[同步库] 开始向面板推送: ${envName}`);
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
        console.log(`[同步库] ❌ 推送失败: ${error}`);
        $notification.post("🤖 面板变量同步失败", `❌ ${envName}`, String(error));
    }
}