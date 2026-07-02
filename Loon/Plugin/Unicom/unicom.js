// Unicom Loon Auto Extract (fixed)
let body = $response.body;

if (!body) {
  $done({});
}

let data = {};
try {
  data = JSON.parse(body);
} catch (e) {
  $done({});
}

let token = data.token_online || "";
let appId = data.appId || "";

if (token && appId) {
  let result = `${token}#${appId}`;
  $persistentStore.write(result, "chinaUnicomCookie");
  $notification.post("联通Token提取成功", "", result);
}

$done({});
