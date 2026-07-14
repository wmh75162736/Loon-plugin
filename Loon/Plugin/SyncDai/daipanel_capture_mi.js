/**
 * @name 小米抽奖抓取模块 (异步守卫版)
 */

const url = $request.url;
const body = $request.body || "";
const headers = $request.headers;
const cookie = headers["Cookie"] || headers["cookie"] || "";

(async () => {
    if (url.includes("shop-api.retail.mi.com/mtop/navi/venue/batch")) {
        const actId = getMiActId(body);
        const mishopClientId = headers["mishop-client-id"] || headers["MiShop-Client-Id"] || "";
        
        if (actId && cookie) {
            if (!checkFreq("MI_LOTTERY")) {
                console.log("[小米商城] 提取成功，后台加载核心库...");
                const envValue = mishopClientId ? `${actId}#${cookie}#${mishopClientId}` : `${actId}#${cookie}`;
                await loadAndPush("MI_LOTTERY", envValue, "小米抽奖自动同步");
            }
        }
    }
})().finally(() => {
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

function checkFreq(key) {
    const lastTime = $persistentStore.read(`LAST_PUSH_${key}`);
    if (lastTime && (Date.now() - parseInt(lastTime) < 1000 * 60 * 5)) return true; 
    $persistentStore.write(Date.now().toString(), `LAST_PUSH_${key}`);
    return false;
}
