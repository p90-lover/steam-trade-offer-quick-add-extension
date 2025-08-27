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


chrome.runtime.onConnect.addListener(function(port) {
    if(port.name == 'worker') {
      port = port
      port.onMessage.addListener(async function(msg) {

        if(msg.connected) {

          //check if db is on or not
            var response = await fetch('http://localhost:16669/api/ping',{method:"GET"})
                var data = await response.json()
            port.postMessage({'connected':data})
        }

        if(msg.price) {
          
        }


      });
    }
  });
