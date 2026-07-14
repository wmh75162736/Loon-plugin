/**
 * @name 北京移动抓取模块 (异步守卫版)
 *
 * 拦截北京移动 APP 签到请求，自动提取 token + constid，
 * 通过核心库推送到呆呆面板。
 *
 * 依赖: daipanel_sync_core.js (通过 .plugin 的 requires-by-js 预加载)
 */

const url = $request.url || '';

(async () => {
    if (url.includes("h5.bj.10086.cn/ActSignIn2023")) {
        const token = (url.match(/[?&]token=([^&]+)/) || [])[1];
        const constid = (url.match(/[?&]constid=([^&]+)/) || [])[1];

        if (!token) return;

        // 组装完整凭证 JSON (与青龙脚本约定的格式一致)
        const ckData = { token: decodeURIComponent(token) };
        if (constid) ckData.constid = decodeURIComponent(constid);

        const envValue = JSON.stringify(ckData);

        // 仅当有 constid 时才推送 (确保凭证完整)
        if (ckData.constid) {
            if (!checkFreq("CMCCBJ")) {
                console.log("[北京移动] 提取成功 (token + constid)，开始同步...");
                if (typeof globalThis.pushToDaiPanel === 'function') {
                    await globalThis.pushToDaiPanel("CMCCBJ_DATA", envValue, "北京移动自动同步");
                } else {
                    console.log("[北京移动] ⚠️ 核心库未加载，跳过同步");
                }
            }
        } else {
            console.log("[北京移动] 仅抓到 token，等待 constid (需点一次签到)");
        }
    }
})().finally(() => {
    $done({});
});

/**
 * 频率控制: 5 分钟内只推送一次
 * 注意: 时间戳在推送前写入，若推送失败则下次重试需等 5 分钟
 * (与 SyncDai 项目其他模块保持一致的行为)
 */
function checkFreq(key) {
    const FREQ_COOLDOWN_MS = 1000 * 60 * 5;
    const lastTime = $persistentStore.read(`LAST_PUSH_${key}`);
    if (lastTime && (Date.now() - parseInt(lastTime) < FREQ_COOLDOWN_MS)) return true;
    $persistentStore.write(Date.now().toString(), `LAST_PUSH_${key}`);
    return false;
}
