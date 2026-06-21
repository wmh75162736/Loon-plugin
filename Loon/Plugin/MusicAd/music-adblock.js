(() => {
const url = String($request.url || "");

if (url.includes("kuwo.cn")) {
  let payload;

  try {
    payload = JSON.parse($response.body);
  } catch (_) {
    $done({});
    return;
  }

  if (url.includes("/service/banner/positions")) {
    const positions = payload.data && typeof payload.data === "object" ? payload.data : {};
    for (const key of Object.keys(positions)) positions[key] = [];
    payload.data = positions;
  } else {
    payload.data = {};
  }

  console.log(`[MusicAd] Cleared Bodian promotion config: ${url.split("?")[0]}`);
  $done({ body: JSON.stringify(payload) });
  return;
}

const body = typeof $request.body === "string" ? $request.body : String($request.body || "");
const blockedModules = [
  "GetFreeModeOpenScreenConfig",
  "GetFreeModeMaterialConfig",
  "GetFreeModeInitInfo",
];
const matchedModule = blockedModules.find((name) => body.includes(name));

if (!matchedModule) {
  $done({});
  return;
}

console.log(`[MusicAd] Blocked QQMusic ${matchedModule}`);
$done({
  response: {
    status: 200,
    headers: { "Content-Type": "application/octet-stream" },
    body: "",
  },
});
})();
