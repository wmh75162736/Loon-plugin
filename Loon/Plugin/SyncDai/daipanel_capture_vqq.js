/**
 * @name 腾讯视频抓取模块 (异步守卫版)
 */

const url = $request.url;
const headers = $request.headers;
const cookie = headers["Cookie"] || headers["cookie"] || "";

(async () => {
    if (url.includes("pbaccess.video.qq.com") && cookie.includes("vqq_refresh_token=")) {
        if (!checkFreq("TENV_COOKIE")) {
            console.log("[腾讯视频] 提取成功，后台加载核心库...");
            await loadAndPush("TENV_COOKIE", cookie, "腾讯视频自动同步");
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

function checkFreq(key) {
    const lastTime = $persistentStore.read(`LAST_PUSH_${key}`);
    if (lastTime && (Date.now() - parseInt(lastTime) < 1000 * 60 * 5)) return true; 
    $persistentStore.write(Date.now().toString(), `LAST_PUSH_${key}`);
    return false;
}
