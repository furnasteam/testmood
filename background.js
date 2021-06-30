import {SET_FIRST_IMAGE, SET_SECOND_IMAGE} from './models/actions';
import {captureVideo} from './actions/capture-video';

chrome.runtime.onInstalled.addListener(onInstalled);

function onInstalled() {
    console.log('installed5')
}


// window.firstImage = null;
// window.secondImage = null;
// window.firstElementDomain = null;
// window.secondElementDomain = null;
let testMood = false;
//
async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//     if (request.chromeAction === SET_FIRST_IMAGE) {
//         window.firstImage = request.dataUrl;
//         window.firstElementDomain = request.domain;
//     }
// });
//
// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//     if (request.chromeAction === SET_SECOND_IMAGE) {
//         window.secondImage = request.dataUrl;
//         window.secondElementDomain = request.domain;
//     }
// });
//
chrome.action.onClicked.addListener(async function (tab) {
    testMood = !testMood;
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        function: captureVideo
    })
    if (testMood) {
        chrome.action.setIcon({path: "iconTestMood.png"});
    } else {
        chrome.action.setIcon({path: "icon128.png"});
    }
});