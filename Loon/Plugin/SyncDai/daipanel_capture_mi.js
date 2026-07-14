/**
 * @name 小米抽奖抓取模块
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
            if (checkFreq("MI_LOTTERY")) return;
            console.log("[小米商城] 成功提取数据，准备推送");
            const envValue = mishopClientId ? `${actId}#${cookie}#${mishopClientId}` : `${actId}#${cookie}`;
            await pushToDaiPanel("MI_LOTTERY", envValue, "小米抽奖自动同步");
        }
    }
})().finally(() => {
    $done({});
});

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