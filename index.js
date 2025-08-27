//chrome keep presistence background loop
async function createOffscreen() {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['BLOBS'],
    justification: 'keep service worker running',
  }).catch(() => {});
}
chrome.runtime.onStartup.addListener(createOffscreen);
self.onmessage = e => {}; // keepAlive
createOffscreen();


//main code starts here

