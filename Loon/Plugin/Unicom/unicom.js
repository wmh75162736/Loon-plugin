/*
 * 中国联通 Token 调试版
 * Author: ChatGPT
 */

const url = $request.url;
const body = $response.body || "";

// 只分析 JSON，避免影响图片、JS 等资源
if (!body || body.length < 20) {
    $done({});
}

try {

    // 打印 URL
    console.log("========== 中国联通 ==========");
    console.log("URL:");
    console.log(url);

    // 如果包含 token_online 或 appId，直接提取
    if (body.includes('"token_online"') || body.includes('"appId"')) {

        console.log("发现 token 字段");

        const json = JSON.parse(body);

        const token =
            json.token_online ||
            json.tokenOnline ||
            "";

        const appId =
            json.appId ||
            "";

        if (token && appId) {

            const result = token + "#" + appId;

            $persistentStore.write(result, "chinaUnicomCookie");

            $notification.post(
                "联通 Token 提取成功",
                "",
                result
            );

            console.log(result);
        }

    } else {

        // 调试：输出前 800 字符
        console.log("Body(800)：");
        console.log(body.substring(0,800));

    }

} catch (e) {

    console.log("解析异常：");
    console.log(e);

}

$done({});
