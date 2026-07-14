/**
 * @name 北京移动抓取模块 v3 (自动合并推送版)
 *
 * 拦截北京移动 APP 签到请求，分两步抓取 token + constid，
 * 当两者齐全后自动推送至呆呆面板。
 *
 * v3 更新 (2026-07-14):
 *   - 新增: getSignIn 阶段增加轻量通知，提示用户点击签到完成后续同步
 *
 * 抓取流程:
 *   1. 打开 APP 进入签到页 -> getSignIn 请求, 脚本提取并缓存 token
 *   2. 点击签到 -> doPrize 请求, 脚本提取 constid, 与缓存 token 合并推送
 *
 * @version v3
 * @updated 2026-07-14
 */

const url = $request.url || '';
const FREQ_COOLDOWN_MS = 1000 * 60 * 5;
const STORE_KEY_TOKEN = "CMCCBJ_PENDING_TOKEN";
const STORE_KEY_TIME = "LAST_PUSH_CMCCBJ";

(async () => {
    if (url.includes("h5.bj.10086.cn/ActSignIn2023")) {
        const token = (url.match(/[?&]token=([^&]+)/) || [])[1];
        const constid = (url.match(/[?&]constid=([^&]+)/) || [])[1];

        if (!token) return;

        // === 请求 1: getSignIn (仅有 token, 无 constid) ===
        if (url.includes("/getSignIn/")) {
            console.log("[北京移动] 抓到 getSignIn 请求, 缓存 token");
            $persistentStore.write(decodeURIComponent(token), STORE_KEY_TOKEN);
            // 轻量通知：提示用户点击签到按钮完成后续同步
            $notification.post("🤖 面板变量自动同步", "ℹ️ 北京移动 token 已缓存", "请点击签到按钮，完成 constid 抓取与推送");
            return;
        }

        // === 请求 2: doPrize (有 token + constid) ===
        if (url.includes("/doPrize/") && constid) {
            // 读取之前缓存的 token (优先使用当前 URL 中的, 再读缓存)
            const cachedToken = $persistentStore.read(STORE_KEY_TOKEN);
            const finalToken = decodeURIComponent(token);

            if (!cachedToken) {
                console.log("[北京移动] ⚠️ 未找到缓存 token, 请重新进入签到页");
                return;
            }

            // 组装完整凭证
            const envValue = JSON.stringify({
                token: finalToken,
                constid: decodeURIComponent(constid)
            });

            console.log("[北京移动] ✅ 凭证完整 (token + constid), 开始同步...");

            // 频率控制: 推送成功后才写入时间戳
            if (!checkFreq(STORE_KEY_TIME)) {
                try {
                    await loadAndPush("CMCCBJ_DATA", envValue, "北京移动自动同步");
                    markFreq(STORE_KEY_TIME);  // ← 成功后才写入时间戳
                    // 推送成功后清除缓存 token, 避免下次用旧值
                    $persistentStore.write("", STORE_KEY_TOKEN);
                } catch (e) {
                    console.log("[北京移动] ❌ 同步失败, 未更新频率限制");
                }
            } else {
                console.log("[北京移动] ℹ️ 5 分钟内已推送过, 跳过");
            }
        }
    }
})().finally(() => {
    $done({});
});

// ==============================
// 下载核心库并执行推送
// ==============================

async function loadAndPush(name, val, remark) {
    return new Promise((resolve) => {
        const coreUrl = `https://raw.githubusercontent.com/wmh75162736/Loon-plugin/refs/heads/main/Loon/Plugin/SyncDai/daipanel_sync_core.js?t=${Date.now()}`;
        $httpClient.get(coreUrl, (err, resp, data) => {
            if (!err && data) {
                try {
                    eval(data);
                    if (typeof globalThis.pushToDaiPanel === 'function') {
                        globalThis.pushToDaiPanel(name, val, remark).finally(resolve);
                    } else {
                        console.log("[北京移动] ⚠️ 核心库已下载但 pushToDaiPanel 未挂载");
                        resolve();
                    }
                } catch (e) {
                    console.log("[北京移动] ⚠️ 核心库执行失败: " + e);
                    resolve();
                }
            } else {
                console.log("[北京移动] ⚠️ 核心库下载失败: " + err);
                resolve();
            }
        });
    });
}

// ==============================
// 频率控制 (仅在推送成功后写入时间戳)
// ==============================

function checkFreq(timeKey) {
    const lastTime = $persistentStore.read(timeKey);
    if (lastTime && (Date.now() - parseInt(lastTime) < FREQ_COOLDOWN_MS)) return true;
    return false;
}

function markFreq(timeKey) {
    $persistentStore.write(Date.now().toString(), timeKey);
}
