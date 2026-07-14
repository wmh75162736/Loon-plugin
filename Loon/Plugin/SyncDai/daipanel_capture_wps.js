/**
 * @name WPS 抓取业务模块
 */

const url = $request.url;
const headers = $request.headers;
const cookie = headers["Cookie"] || headers["cookie"] || "";

(() => {
    if (url.includes("personal-act.wps.cn/activity-rubik/activity/page_info")) {
        const wpsSid = getCookieVal(cookie, "wps_sid");
        if (wpsSid) {
            if (checkFreq("WPS_SID")) return;
            console.log("[WPS业务] 🎉 成功提取 WPS_SID，往总线注入任务并呼叫核心底座");

            const syncPayload = {
                envName: "WPS_SID",
                envValue: wpsSid,
                remarkText: "WPS自动同步"
            };
            $persistentStore.write(JSON.stringify(syncPayload), "DAIPANEL_SYNC_QUEUE");

            // 通过注册的别名唤醒核心同步底座
            $script.execute("daipanel_sync_core.js");
        }
    }
})();

$done({});

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
