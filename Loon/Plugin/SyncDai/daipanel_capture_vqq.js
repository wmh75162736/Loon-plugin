/**
 * @name 腾讯视频抓取模块
 */

const url = $request.url;
const headers = $request.headers;
const cookie = headers["Cookie"] || headers["cookie"] || "";

(async () => {
    if (url.includes("pbaccess.video.qq.com")) {
        if (cookie.includes("vqq_refresh_token=")) {
            if (checkFreq("TENV_COOKIE")) return;
            console.log("[腾讯视频] 成功提取 Cookie，准备推送");
            await pushToDaiPanel("TENV_COOKIE", cookie, "腾讯视频自动同步");
        }
    }
})().finally(() => {
    $done({});
});

function checkFreq(key) {
    const lastTime = $persistentStore.read(`LAST_PUSH_${key}`);
    if (lastTime && (Date.now() - parseInt(lastTime) < 1000 * 60 * 5)) return true; 
    $persistentStore.write(Date.now().toString(), `LAST_PUSH_${key}`);
    return false;
}