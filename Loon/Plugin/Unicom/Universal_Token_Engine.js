/**
 * ==========================================
 * Universal Token Engine V5.0 (Ultimate)
 * 架构：泛型 Provider 路由 / O(1) 账号隔离 / Hooks / IIFE 正则池
 * 修复：正则预编译 / 字符集截断 / $request.body 穿透 / 大 JSON 存储降级
 * 兼容：Loon / Surge / Quantumult X / Shadowrocket
 * ==========================================
 */

// ==========================================
// [Module 1]: Providers (生态配置基座)
// ==========================================
const PROVIDERS = [
    {
        name: "ChinaUnicom",
        hosts: ["10010.com", "10010.cn"],
        storePrefix: "chinaUnicomCookie",
        tokenKeys: ["token_online", "ecs_token", "private_token", "third_token", "t3_token", "accessToken", "token", "loginToken", "Authorization", "Bearer"],
        appIdKeys: ["appId", "appid", "app_id", "AppId", "clientId"],
        phoneKeys: ["mobile", "desmobile", "c_mobile", "phoneNum", "loginNo"],
        priority: ["token_online", "ecs_token", "private_token", "third_token"]
    },
    // 未来可无缝扩展其他平台
    {
        name: "ChinaMobile",
        hosts: ["10086.cn"],
        storePrefix: "chinaMobileCookie",
        tokenKeys: ["token", "SSOToken", "authorization"],
        appIdKeys: ["appId"],
        phoneKeys: ["phone", "mobile"],
        priority: ["SSOToken", "token"]
    }
];

const CONFIG = {
    version: "5.0.0",
    logLevel: 2, // 0:静默, 1:错误, 2:信息, 3:调试
    maxBodySize: 512000,
    sniffKeywords: ['token', 'ticket', 'session', 'access', 'auth', 'credential']
};

// ==========================================
// [Module 2]: Regex Cache (IIFE 预编译正则池)
// ==========================================
// 修复 Bug ① & ②：只在脚本加载时编译一次，且放宽匹配字符集，避免截断
const REGEX_CACHE = (() => {
    const cache = {};
    PROVIDERS.forEach(p => {
        [...p.tokenKeys, ...p.appIdKeys, ...p.phoneKeys].forEach(k => {
            if (!cache[k]) {
                // 匹配直到遇到 引号、&、大括号或空格
                cache[k] = new RegExp(`["']?${k}["']?\\s*[:=]\\s*["']?([^"'&\\s{}]+)["']?`, 'i');
            }
        });
    });
    return cache;
})();

// ==========================================
// [Module 3]: Logger & Utils 
// ==========================================
const Logger = {
    error: (msg) => { if (CONFIG.logLevel >= 1) console.log(`[ERROR 🔴] ${msg}`); },
    warn:  (msg) => { if (CONFIG.logLevel >= 2) console.log(`[WARN  🟠] ${msg}`); },
    info:  (msg) => { if (CONFIG.logLevel >= 2) console.log(`[INFO  🔵] ${msg}`); },
    debug: (msg) => { if (CONFIG.logLevel >= 3) console.log(`[DEBUG 🟣] ${msg}`); }
};

const Utils = {
    safeDecode: (str) => { try { return decodeURIComponent(str); } catch (e) { return str; } },
    formatDate: (d = new Date()) => {
        const pad = n => (n < 10 ? '0' + n : n);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    },
    hash: (str) => {
        let h = 0;
        for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
        return Math.abs(h).toString(16);
    }
};

// ==========================================
// [Module 4]: Scanner (多维数据抓取)
// ==========================================
const Scanner = {
    parseQuery: (url) => {
        const query = {};
        if (!url.includes('?')) return query;
        url.split('?')[1].split('&').forEach(param => {
            const idx = param.indexOf('=');
            if (idx !== -1) query[param.substring(0, idx)] = Utils.safeDecode(param.substring(idx + 1));
        });
        return query;
    },
    parseCookies: (headers) => {
        const cookies = {};
        for (const key in headers) {
            if (key.toLowerCase() === 'cookie' || key.toLowerCase() === 'set-cookie') {
                const arr = Array.isArray(headers[key]) ? headers[key] : [headers[key]];
                arr.forEach(str => str.split(';').forEach(pair => {
                    const idx = pair.indexOf('=');
                    if (idx !== -1) cookies[pair.substring(0, idx).trim()] = Utils.safeDecode(pair.substring(idx + 1).trim());
                }));
            }
        }
        return cookies;
    },
    run: (request, response) => {
        // 修复 Bug ⑥：同时穿透捕获 Request Body (应对 Application/x-www-form-urlencoded)
        const reqHeaders = request.headers || {};
        const resHeaders = response.headers || {};
        return {
            url: request.url,
            query: Scanner.parseQuery(request.url),
            headers: { ...reqHeaders, ...resHeaders },
            cookies: { ...Scanner.parseCookies(reqHeaders), ...Scanner.parseCookies(resHeaders) },
            reqBody: typeof request.body === 'string' ? request.body : "",
            resBody: typeof response.body === 'string' ? response.body : ""
        };
    }
};

// ==========================================
// [Module 5]: Detector (高级泛型嗅探)
// ==========================================
const Detector = {
    sniff: (key, value, provider) => {
        const lowerKey = String(key).toLowerCase();
        const valStr = String(value);
        
        // 修复 Bug ③：更广泛的敏感词拦截 (Ticket, Session, Auth, Credential)
        const isSuspicious = CONFIG.sniffKeywords.some(kw => lowerKey.includes(kw));
        
        if (isSuspicious && !provider.tokenKeys.includes(key)) {
            if (valStr.length > 20 && /^[^"'&\s{}]+$/.test(valStr)) {
                Logger.warn(`[Detector] 🚨 ${provider.name} 嗅探到潜在票据: [${key}]`);
            }
        }
    }
};

// ==========================================
// [Module 6]: Parser (核心提取)
// ==========================================
const Parser = {
    deepSearch: (obj, targetKeys, provider) => {
        let results = {};
        const visited = new WeakSet();

        const recurse = (current) => {
            if (current === null || current === undefined) return;
            if (typeof current === 'object') {
                if (visited.has(current)) return;
                visited.add(current);
            }

            if (typeof current === 'string') {
                try {
                    const parsed = JSON.parse(current);
                    if (typeof parsed === 'object' && parsed !== null) { recurse(parsed); return; }
                } catch (e) {
                    const safeStr = Utils.safeDecode(current);
                    targetKeys.forEach(key => {
                        const match = safeStr.match(REGEX_CACHE[key]);
                        if (match && match[1]) results[key] = match[1].trim();
                    });
                }
            } else if (Array.isArray(current)) {
                current.forEach(item => recurse(item));
            } else if (typeof current === 'object') {
                for (let k in current) {
                    Detector.sniff(k, current[k], provider);
                    if (targetKeys.includes(k)) results[k] = current[k];
                    recurse(current[k]);
                }
            }
        };
        recurse(obj);
        return results;
    }
};

// ==========================================
// [Module 7]: Extractor & Validator
// ==========================================
const Extractor = {
    run: (context, provider) => {
        const allKeys = [...provider.tokenKeys, ...provider.appIdKeys, ...provider.phoneKeys];
        let found = {};
        
        // 短路优化：从高可能性的 payload 逐级回退
        const layers = [context.resBody, context.reqBody, context.headers, context.cookies, context.query];
        for (const layer of layers) {
            found = { ...found, ...Parser.deepSearch(layer, allKeys, provider) };
            const hasToken = provider.priority.some(k => found[k]);
            const hasAppId = provider.appIdKeys.some(k => found[k]);
            if (hasToken && hasAppId) break; 
        }
        return found;
    }
};

const Validator = {
    run: (rawData) => {
        let validData = {};
        for (let key in rawData) {
            const val = String(rawData[key]).trim();
            if (!val || val === "undefined" || val === "null") continue;
            
            const lowerKey = key.toLowerCase();
            // 修复 Bug ④：放宽 AppId 判断至 >= 6 字符，应对未来业务变动
            if (lowerKey.includes('app') || lowerKey.includes('client')) {
                if (val.length >= 6) validData[key] = val;
            } else if (CONFIG.sniffKeywords.some(kw => lowerKey.includes(kw))) {
                if (val.length >= 16) validData[key] = val;
            } else {
                validData[key] = val;
            }
        }
        return validData;
    }
};

// ==========================================
// [Module 8]: Formatter & Storage (O(1) 数据基座)
// ==========================================
const Formatter = {
    build: (validData, provider) => {
        let finalToken = null, finalAppId = null, hitType = null, phone = null;

        for (const k of provider.appIdKeys) { if (validData[k]) { finalAppId = validData[k]; break; } }
        for (const k of provider.phoneKeys) { if (validData[k]) { phone = validData[k]; break; } }
        for (const k of provider.priority)  { if (validData[k]) { finalToken = validData[k]; hitType = k; break; } }
        
        if (!finalToken) {
            for (const k of provider.tokenKeys) { if (validData[k]) { finalToken = validData[k]; hitType = k; break; } }
        }

        if (finalToken && finalAppId) {
            return { providerName: provider.name, token: finalToken, appId: finalAppId, type: hitType, phone: phone };
        }
        return null;
    }
};

const Storage = {
    save: (data, provider) => {
        const payload = `${data.token}#${data.appId}`;
        const uid = data.phone || Utils.hash(payload); 
        const nowTime = Utils.formatDate();
        
        // 修复 Bug ⑦：废弃大 JSON，采用 O(1) 前缀隔离设计
        // 例如: chinaUnicomCookie_138xxxx = a3xxx#912xxx
        const accKey = `${provider.storePrefix}_${uid}`;
        
        $persistentStore.write(payload, provider.storePrefix); // 永远保存最新的一份给单号玩家
        $persistentStore.write(payload, accKey);               // 保存独立副本给多号玩家
        $persistentStore.write(nowTime, `${provider.storePrefix}_Time`);

        return { key: accKey, payload: payload, uid: uid, time: nowTime };
    }
};

// ==========================================
// [Module 9]: Notifier (精简通知)
// ==========================================
const Notifier = {
    dispatch: (data, saved) => {
        if (typeof $notification === "undefined") return;
        
        // 修复 Bug ⑧：截断超长 JSON，使用精简复制格式
        const shortToken = data.token.length > 25 ? data.token.substring(0, 25) + "..." : data.token;
        const exportCmd = `export ${saved.key}="${saved.payload}"`;
        
        $notification.post(
            `[${data.providerName}] 凭证捕获成功`,
            `🟢 账号: ${data.phone || '未提取手机号'} | 类型: ${data.type}`,
            `🔑 Token: ${shortToken}\n` +
            `⏰ 时间: ${saved.time}\n\n` +
            `📦 QL 变量 (点击通知横幅展开复制):\n${exportCmd}`
        );
    }
};

// ==========================================
// [Main]: Provider 引擎控制 (Hooks Enabled)
// ==========================================
function main() {
    const startTime = Date.now();
    
    // 前置环境判定 (非文本流直接放行)
    const cType = $response.headers['Content-Type'] || $response.headers['content-type'] || "";
    if (cType && !/json|text|xml|html|urlencoded/i.test(cType)) return $done({});
    if (($response.body || "").length > CONFIG.maxBodySize) return $done({});

    // 智能路由：匹配 Provider
    const reqUrl = $request.url;
    const provider = PROVIDERS.find(p => p.hosts.some(h => reqUrl.includes(h)));
    if (!provider) return $done({}); // 非目标域名，迅速放行

    Logger.info(`========== Provider Engine Start: ${provider.name} ==========`);

    try {
        const context = Scanner.run($request, $response);
        const rawData = Extractor.run(context, provider);
        const validData = Validator.run(rawData);
        const finalData = Formatter.build(validData, provider);
        
        if (finalData) {
            // [Hook]: BeforeSave 预留锚点
            const saved = Storage.save(finalData, provider);
            Notifier.dispatch(finalData, saved);
            // [Hook]: AfterNotify 预留锚点
            
            Logger.info(`🎉 处理完毕，耗时: ${Date.now() - startTime}ms`);
        }
    } catch (e) {
        Logger.error(`Engine Crash: ${e.message}`);
    }
    
    $done({});
}

main();
