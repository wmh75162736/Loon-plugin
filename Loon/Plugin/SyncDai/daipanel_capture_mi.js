/**
 * @name 小米抽奖抓取模块 (全量 JSON 防风控版)
 */

const url = $request.url;
const body = $request.body || "";
const headers = $request.headers;

(async () => {
    // 拦截指定的抽奖批量请求接口
    if (url.includes("shop-api.retail.mi.com/mtop/navi/venue/batch")) {
        // 确保这是一个有效的任务请求报文
        if (body.includes("infinite-task") && body.includes("sign")) {
            if (!checkFreq("MI_LOTTERY")) {
                console.log("[小米商城] 🚀 提取全量真实报文成功，后台加载核心库...");
                
                // 💎 核心解法：直接将整个真实的请求上下文打包为完整的 JSON
                const fullData = {
                    url: url,
                    headers: headers,
                    body: body
                };
                
                // 将 JSON 对象转为字符串，作为面板的最终环境变量值
                const envValue = JSON.stringify(fullData);
                
                await loadAndPush("MI_LOTTERY", envValue, "小米抽奖全量自动同步");
            }
        }
    }
})().finally(() => {
    // 立即放行原始请求，不卡顿 APP
    $done({});
});

async function loadAndPush(name, val, remark) {
    return new Promise((resolve) => {
        const coreUrl = `https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Plugin/SyncDai/daipanel_sync_core.js?t=${Date.now()}`;
        $httpClient.get(coreUrl, (err, resp, data) => {
            if (!err && data) {
                try {
                    eval(data);
                    if (typeof globalThis.pushToDaiPanel === 'function') {
                        globalThis.pushToDaiPanel(name, val, remark).finally(resolve);
                    } else resolve();
                } catch (e) { console.log("核心执行失败: " + e); resolve(); }
            } else { console.log("核心下载失败: " + err); resolve(); }
        });
    });
}

function checkFreq(key) {
    const lastTime = $persistentStore.read(`LAST_PUSH_${key}`);
    if (lastTime && (Date.now() - parseInt(lastTime) < 1000 * 60 * 5)) return true; 
    $persistentStore.write(Date.now().toString(), `LAST_PUSH_${key}`);
    return false;
}
