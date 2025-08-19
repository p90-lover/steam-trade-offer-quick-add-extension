chrome.runtime.onMessage.addListener(async (message, sender ,sendResponse) =>{

    if(message.sender == 'content_worker') {

        //content script connected
        if(message.connect) {
            sendResponse({connected:true,id:sender.tab.id})
            console.log('[content_worker] connected')
            chrome.storage.session.set({content_worker:true})
            
        }

    }
});


window.addEventListener('load', async function () {

    let mysteamidregex = /UserYou\.SetSteamId\(\s\'(\d+)\'\s\)/gm
    let mysteamid = mysteamidregex.exec(document.body.innerHTML)[1]

    let themsteamidregex = /UserThem\.SetSteamId\(\s\'(\d+)\'\s\)/gm
    let themsteamid = themsteamidregex.exec(document.body.innerHTML)[1]

    let mynameregex = /g_strYourPersonaName\s\=\s\"(.*)\"/gm
    let myname = mynameregex.exec(document.body.innerHTML)[1]

    let themnameregex = /g_strTradePartnerPersonaName\s\=\s\"(.*)\"/gm
    let themname = themnameregex.exec(document.body.innerHTML)[1]

    console.log(mysteamid,themsteamid,myname,themname)

    let currentinventoryid = null;
    let currentinventory = null;
    let loadinginventory = false;


    //{assets: object, id: array(number)}
    let inventory = {};

    //steam id : appid : { me or them side}
    let intradearray = {}

    window.addEventListener("click",
  function(e) {
    if (e.shiftKey && e.isTrusted) {
        //bulk add item that in inventory
        swapinventory(e,true)
    }


  },

  false);

  function move(item) {
    const clickEvent = document.createEvent("MouseEvents");
        clickEvent.initEvent("dblclick", true, true);
        document.getElementById(item).dispatchEvent(clickEvent);

  }



  async function swapinventory(item,shifted) {


    let intrade = false;

    if(item.target.offsetParent.offsetParent.offsetParent.className === 'trade_item_box') intrade = true


    //to do get item id ,  name , context id , appid , current steamid
    let swapids = []

    let split = item.target.hash && item.target.hash.replace('#','').split('_') ? item.target.hash.replace('#','').split('_') : false;
    if(!split) return false

    let appid = split[0];
    let contextid = split[1];
    let id = split[2];

    //if intrade array doesnt create , create one

    
    let whichsideregex= /(.*)_slot.*/gm

    let whichinv = whichsideregex.exec(item.target.offsetParent.offsetParent.id)
    let steamid = (whichinv && whichinv[1] === 'your') || !intrade ? mysteamid : themsteamid;

    if(!intradearray[steamid]) intradearray[steamid] = {};
    if(!intradearray[steamid][appid]) intradearray[steamid][appid] = [];

    let getInventory = inventory[steamid][appid].id;
    let getintrade = intradearray[steamid][appid];

    let invtoget = intrade ? getintrade : getInventory;
    let invtoswap = intrade ? getInventory : getintrade;


    if(!shifted) swapids.push(id)

//add a same item bulk search using json.strigify to compare 
    if(shifted) {
        //ofc add id first cause its the first item
        swapids.push(id);
    
        let asset = inventory[steamid][appid].assets[id];

        console.log('invtoget length ' + invtoget.length, 'invtoswap length ' + invtoswap.length);

        let notallowedkey = ['classid','position','assetid']

        for(let i = 0; i < invtoget.length; i++) {
            let itemid = invtoget[i];
            if(itemid != id) {
                let notmatch = false;

                let itemasset = inventory[steamid][appid].assets[itemid];


                let itemkey = Object.keys(itemasset)

                for(let a = 0;a < itemkey.length;a++) {
                    let key = itemkey[a];

                    if(notallowedkey.indexOf(key) === -1) {
                        if(JSON.stringify(asset[key]) !== JSON.stringify(itemasset[key])) {
                            notmatch = true;
                        }
                    }
                }
                if(!notmatch) swapids.push(itemid);
            }
        }
    }

    //ps : if want to perform a click on item ,  make it function to call while in loop , without function its not working

    for(let a = 0;a < swapids.length;a++) {
        
        //add to invtoswap

        //double click solution from : https://stackoverflow.com/questions/23926921/how-do-i-double-click-on-objects-using-javascript-do-i-have-to-click-twice

        let swapid = swapids[a];
        let indexid = invtoget.indexOf(swapid);
        invtoswap.push(invtoget.splice(indexid,1)[0]);
        
       move(`item${appid}_${contextid}_${swapid}`)
        
        
    };

    console.log(intrade , getInventory.length , getintrade.length);


  }



    setInterval( async () => {

        let appidregex = /.*\/apps\/(\d*)\/.*/gm
        let appid = appidregex.exec(document.getElementById('appselect_activeapp').children[0].currentSrc)[1]

       let inventory_active =  document.getElementsByClassName('inventory_user_tab active')[0].innerText
       
       //define which inventory steam id 
       currentinventoryid = inventory_active == 'Your inventory' ? mysteamid : themsteamid;
       currentinventory = inventory_active; // text only (your inventory/their inventory) and has nothing in it

        if(!loadinginventory) {

            loadinginventory = true;

       //load inventory code

       if(!inventory[currentinventoryid]) inventory[currentinventoryid] = {}

       if(!inventory[currentinventoryid][appid]) {
       //made this due to csgo has added 3 types of inventory grid , 0 is all items,2 is without trade protected items, 16 is trade protected items only
       // adding this to cover all games (maybe it will works idk)
       let contextid = [1,2]

       for(let i = 0;i < contextid.length;i ++) {
        let id = contextid[i];

        let loadinventory = document.getElementById(`inventory_${currentinventoryid}_${appid}_${id}`);

        //definded 2 types in inventory finding , 1 is class itemHolder , 2 is class itemHolder disabled
        //1 is contain item , 2 is none

        //first filter 

        if(loadinventory && loadinventory.children.length > 0) {

            // if passed then we are in class inventory_page

            //inject get inventory script -- from https://github.com/gergelyszabo94/csgo-trader-extension 
            //using inject script and get inventory function

            const getItemsScript = `
            inventory = User${inventory_active === 'Your inventory' ? 'You' : 'Them'}.getInventory(${appid},${id});

            console.log(inventory)
            
            assets = inventory.rgItemElements;
            steamID = inventory.owner.strSteamId;

            trimmedAssets = {};
            trimmedid = [];

            if (assets.length > 0) {
                for (let i = 0;i < assets.length;i++) {
                let item = assets[i];

                if(item) {

                trimmedid.push(item.rgItem.id)

                let asset = inventory.rgInventory[item.rgItem.id]

                trimmedAssets[item.rgItem.id] = {
                        app_data: asset.app_data,
                        amount: asset.amount,
                        appid:  asset.appid.toString(),
                        assetid: asset.id.toString(),
                        actions: asset.actions,
                        classid: asset.classid,
                        icon: asset.icon_url,
                        instanceid: asset.instanceid.toString(),
                        contextid: asset.contextid.toString(),
                        descriptions: asset.descriptions,
                        market_actions: asset.market_actions,
                        market_hash_name: asset.market_hash_name,
                        marketable: asset.marketable,
                        tradable:asset.tradable,
                        name: asset.name,
                        name_color: asset.name_color,
                        position: asset.pos,
                        type: asset.type,
                        owner: steamID,
                        fraudwarnings: asset.fraudwarnings,
                        tags: asset.tags,
                    }
                }
             }
        }

             
        document.querySelector('body').setAttribute('offerInventoryInfo', JSON.stringify({assets : trimmedAssets , id : trimmedid},null,'\t'));`;

            const tempElement = document.createElement('div');

            tempElement.setAttribute('onreset', `${getItemsScript};`);

            tempElement.dispatchEvent(new CustomEvent('reset'));
            tempElement.removeAttribute('onreset');
            tempElement.remove();

            const result = document.querySelector('body').getAttribute('offerInventoryInfo') ? JSON.parse(document.querySelector('body').getAttribute('offerInventoryInfo')) : null;

            if (result !== null) document.querySelector('body').removeAttribute('offerInventoryInfo');


            //result output = {assets : object , id : array(number) }
            if(!inventory[currentinventoryid]) inventory[currentinventoryid] = {}
            inventory[currentinventoryid][appid] = result 
            
       }


    }
}
}

loadinginventory = false

    } , 1000)


    //add checking for current added both side trade offer
//global detect key usage ----> check parent class/id --------> use specificed function





});