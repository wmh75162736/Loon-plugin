/**
 * @name 腾讯视频 抓取业务模块
 */

const url = $request.url;
const headers = $request.headers;
const cookie = headers["Cookie"] || headers["cookie"] || "";

(() => {
    if (url.includes("pbaccess.video.qq.com")) {
        if (cookie.includes("vqq_refresh_token=")) {
            if (checkFreq("TENV_COOKIE")) return;
            console.log("[腾讯视频业务] 🎉 成功提取 Cookie，往总线注入任务并呼叫核心底座");

            const syncPayload = {
                envName: "TENV_COOKIE",
                envValue: cookie,
                remarkText: "腾讯视频自动同步"
            };
            $persistentStore.write(JSON.stringify(syncPayload), "DAIPANEL_SYNC_QUEUE");

            // 执行我们在插件中通过 tag 注册的全局别名，即使是远程运行，Loon 也会在此处正确唤醒
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
