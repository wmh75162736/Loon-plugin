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
            console.log("[WPS业务] 🎉 成功提取 WPS_SID，向核心模块派发同步任务");

            // 1. 组装标准规范数据，推入数据总线
            const syncPayload = {
                envName: "WPS_SID",
                envValue: wpsSid,
                remarkText: "WPS自动同步"
            };
            $persistentStore.write(JSON.stringify(syncPayload), "DAIPANEL_SYNC_QUEUE");

            // 2. 核心魔法：直接拉起核心同步脚本执行
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