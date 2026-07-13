/**
 * @name 呆呆面板全自动抓取同步 (终极暴力调试版)
 */

const HOST = "https://dai.atiny.fun:2"; // 请确认端口真的为 2 吗？
const APP_KEY = "b758c23de0937a80e2849da5f2457875";
const APP_SECRET = "32fbaf8f175678d0845cbb1ff85b1d50840917a26fcb158a637d327328f8a939";

const url = $request.url;
const body = $request.body || "";
const headers = $request.headers;
const cookie = headers["Cookie"] || headers["cookie"] || "";

(async () => {
    if (url.includes("shop-api.retail.mi.com/mtop/navi/venue/batch")) {
        const actId = getMiActId(body);
        if (actId && cookie) {
            console.log("\n========== 开始触发小米抽奖同步 ==========");
            await pushToDaiPanel("MI_LOTTERY", `${actId}#${cookie}`, "小米抽奖自动同步");
            console.log("========== 同步流程结束 ==========\n");
        }
    }
})().finally(() => {
    $done({});
});


// ===== 工具函数区 =====

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

// 终极网络请求调试包装器
function request(method, reqUrl, reqHeaders = {}, reqBody = null) {
    return new Promise((resolve, reject) => {
        const req = { url: reqUrl, headers: reqHeaders, body: reqBody };
        console.log(`\n[网络请求] 👉 发起 ${method} ${reqUrl}`);
        if (reqBody) console.log(`[网络请求] Body参数: ${reqBody}`);

        const fn = (method === "POST" || method === "PUT") ? $httpClient[method.toLowerCase()] : $httpClient.get;
        fn(req, (error, response, data) => {
            if (error) {
                console.log(`[网络报错] ❌ 请求底层失败: ${JSON.stringify(error)}`);
                return reject(error);
            }
            console.log(`[网络响应] 状态码: ${response.status}`);
            console.log(`[网络响应] 返回数据: ${data}`);
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
        console.log("-> 步骤1：开始获取Token...");
        const tokenPayload = {
            appKey: APP_KEY,
            appSecret: APP_SECRET
        };
        
        const tokenRes = await request(
            "POST", 
            `${HOST}/api/open-api/token?appKey=${APP_KEY}&appSecret=${APP_SECRET}`, 
            { "Content-Type": "application/json" }, 
            JSON.stringify(tokenPayload)
        );
        
        const token = tokenRes?.data?.access_token || tokenRes?.data?.token || tokenRes?.access_token || tokenRes?.token;
        
        if (!token) {
            throw new Error(`Token提取失败，请检查上方的[网络响应]数据`);
        }
        console.log("-> Token提取成功！");

        const authHeaders = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };

        console.log(`-> 步骤2：搜索面板中是否已存在变量 [${envName}]...`);
        const searchRes = await request("GET", `${HOST}/api/envs?searchValue=${envName}`, authHeaders);
        const envs = searchRes.data || [];
        const existEnv = envs.find(e => e.name === envName);

        if (existEnv) {
            console.log(`-> 步骤3：变量已存在，执行更新(PUT)...`);
            await request("PUT", `${HOST}/api/envs/${existEnv.id}`, authHeaders, JSON.stringify({
                name: envName,
                value: envValue,
                remarks: remarkText 
            }));
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 更新成功`, `已覆盖`);
        } else {
            console.log(`-> 步骤3：变量不存在，执行新建(POST)...`);
            await request("POST", `${HOST}/api/envs`, authHeaders, JSON.stringify([{
                name: envName,
                value: envValue,
                remarks: remarkText
            }]));
            $notification.post("🤖 面板变量自动同步", `✅ ${envName} 新建成功`, `已创建`);
        }
    } catch (error) {
        console.log(`[流程中断] ❌ 推送失败: ${error}`);
        $notification.post("🤖 面板变量同步失败", `❌ ${envName}`, String(error));
    }
}
