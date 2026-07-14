/**
 * @name WPS抓取模块
 */

const url = $request.url;
const headers = $request.headers;
const cookie = headers["Cookie"] || headers["cookie"] || "";

(async () => {
    if (url.includes("personal-act.wps.cn/activity-rubik/activity/page_info")) {
        const wpsSid = getCookieVal(cookie, "wps_sid");
        if (wpsSid) {
            if (checkFreq("WPS_SID")) return;
            console.log("[WPS] 成功提取 wps_sid，准备推送");
            await pushToDaiPanel("WPS_SID", wpsSid, "WPS自动同步");
        }
    }
})().finally(() => {
    $done({});
});

function getCookieVal(cookieStr, name) {
    const match = new RegExp(`(^|;\\s*)${name}=([^;]+)`).exec(cookieStr);
    return match ? match[2] : null;
}

function checkFreq(key) {
    const lastTime = $persistentStore.read(`LAST_PUSH_${key}`);
    if (lastTime && (Date.now() - parseInt(lastTime) < 1000 * 60 * 5)) return true; 
    $persistentStore.write(Date.now().toString(), `LAST_PUSH_${key}`);
    return false;
}