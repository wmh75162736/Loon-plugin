(() => {
  const url = String($request.url || "");
  let payload;

  try {
    payload = JSON.parse($response.body);
  } catch (_) {
    $done({});
    return;
  }

  const data = payload && typeof payload.data === "object" && payload.data ? payload.data : {};

  if (url.includes("/popup/start/")) {
    payload.data = {};
  } else if (url.includes("/service/advert/config")) {
    data.screenHotBoot = 0;
    data.screenColdBoot = 0;
    data.screenSign = 0;
    data.hotScreenTimeout = 0;
    data.startUpPopLimit = 0;
    payload.data = data;
  } else if (url.includes("/advert/free/config")) {
    data.freeSplash = false;
    payload.data = data;
  }

  console.log(`[MusicAd] Updated Bodian splash settings: ${url.split("?")[0]}`);
  $done({ body: JSON.stringify(payload) });
})();
