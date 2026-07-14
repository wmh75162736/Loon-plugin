/**
 * @name 腾讯视频 抓取业务模块
 */

const url = $request.url;
const headers = $request.headers;
// 兼容首字母大写和小写的 cookie
const cookie = headers["Cookie"] || headers["cookie"] || "";

(() => {
    if (url.includes("pbaccess.video.qq.com")) {
        // 确保包含关键的刷新令牌才视为有效 Cookie
        if (cookie.includes("vqq_refresh_token=")) {
            if (checkFreq("TENV_COOKIE")) return;
            console.log("[腾讯视频业务] 🎉 成功提取腾讯视频 Cookie，向核心模块派发同步任务");

            // 1. 组装标准规范数据，推入数据总线
            const syncPayload = {
                envName: "TENV_COOKIE",
                envValue: cookie,
                remarkText: "腾讯视频自动同步"
            };
            $persistentStore.write(JSON.stringify(syncPayload), "DAIPANEL_SYNC_QUEUE");

            // 2. 核心魔法：直接拉起你之前创建的核心同步脚本执行
            $script.execute("daipanel_sync_core.js");
        }
    }
})();

$done({});

function checkFreq(key) {
    const lastTime = $persistentStore.read(`LAST_PUSH_${key}`);
    if (lastTime && (Date.now() - parseInt(lastTime) < 1000 * 60 * 5)) return true; 
    $persistentStore.write(Date.now().toString(), `LAST_PUSH_${key}`);
    return false;
}