import {SET_FIRST_IMAGE, SET_SECOND_IMAGE} from './models/actions';
import {
  callApi,
  callApiWithSelectedElement, captureVideoApi,
  compareScreenShotsAndDownloadApi,
  compareScreenShotsAndShowApi,
  consoleLogApi,
  cropAndSaveFirstElementScreenShotApi,
  cropAndSaveSecondElementScreenShotApi,
  isElementInViewPortApi,
  makeFixedElementsInvisibleApi,
  makeFixedElementsVisibleApi, saveFirstImageFromFileApi, saveSecondImageFromFileApi,
  scrollOneScreenDownApi,
  scrollTopApi
} from './models/contentScriptApi';

const FIRST_ELEMENT_CONTAINER_ID = 'first-element-container';
const SECOND_ELEMENT_CONTAINER_ID = 'second-element-container';

const FIRST_ELEMENT_ADDRESS_ID = 'first-element-address';
const SECOND_ELEMENT_ADDRESS_ID = 'second-element-address';

const FIRST_ELEMENT_SELECT_ID = 'first-element';
const SECOND_ELEMENT_SELECT_ID = 'second-element';
const COMPARE_AND_DOWNLOAD_ID = 'compare-and-download';
const COMPARE_AND_SHOW_ID = 'compare-and-show';

const FIRST_IMAGE_FILE_INPUT_ID = 'first-image-file';
const SECOND_IMAGE_FILE_INPUT_ID = 'second-image-file';

const RESULT_ID = 'result';

const bg = chrome.extension.getBackgroundPage();

let {firstImage, secondImage, firstElementDomain, secondElementDomain} = bg;

function callContentApi(apiName, apiFormatter = callApi, ...params) {
  return new Promise(resolve => {
    chrome.devtools.inspectedWindow.eval(apiFormatter(apiName, ...params),
      {useContentScriptContext: true}, function (result) {
        resolve(result);
      });
  })
}

function sleep500() {
  return new Promise(resolve => {
    setTimeout(function () {
      resolve();
    }, 500);
  })
}

function captureVisibleTab() {
  return new Promise(resolve => {
    chrome.tabs.captureVisibleTab(null, {format: "png"}, function (dataUrl) {
      resolve(dataUrl);
    });
  })
}

const ContentScript = {
  scrollTop: () => callContentApi(scrollTopApi),
  makeFixedElementsInvisible: () => callContentApi(makeFixedElementsInvisibleApi),
  makeFixedElementsVisible: () => callContentApi(makeFixedElementsVisibleApi),
  scrollOneScreenDown: () => callContentApi(scrollOneScreenDownApi),
  compareScreenShotsAndDownload: (firstElementScreenShot, secondElementScreenShot) => callContentApi(compareScreenShotsAndDownloadApi, callApi, firstElementScreenShot, secondElementScreenShot),
  compareScreenShotsAndShow: (firstElementScreenShot, secondElementScreenShot) => callContentApi(compareScreenShotsAndShowApi, callApi, firstElementScreenShot, secondElementScreenShot),
  isElementInViewPort: () => callContentApi(isElementInViewPortApi, callApiWithSelectedElement),
  cropAndSaveFirstElementScreenShot: (screenShots) => callContentApi(cropAndSaveFirstElementScreenShotApi, callApiWithSelectedElement, screenShots),
  cropAndSaveSecondElementScreenShot: (screenShots) => callContentApi(cropAndSaveSecondElementScreenShotApi, callApiWithSelectedElement, screenShots),
  saveFirstImageFromFile: (imageFromFile) => callContentApi(saveFirstImageFromFileApi, callApi, imageFromFile),
  saveSecondImageFromFile: (imageFromFile) => callContentApi(saveSecondImageFromFileApi, callApi, imageFromFile),
  captureVideo: (streamId) => callContentApi(captureVideoApi, callApi, streamId),
  consoleLog: (...params) => callContentApi(consoleLogApi, callApi, ...params)
}

async function collectFullPageScreenShots() {
  const screenShots = [];
  await ContentScript.scrollTop();
  await sleep500();
  screenShots.push(await captureVisibleTab());
  await ContentScript.makeFixedElementsInvisible();
  let reachedBottom = false;
  do {
    reachedBottom = await ContentScript.scrollOneScreenDown();
    await sleep500();
    screenShots.push(await captureVisibleTab());
  } while (!reachedBottom);
  await ContentScript.makeFixedElementsVisible();
  return screenShots;
}

function addListenerOnClick(elementId, callback) {
  document.getElementById(elementId).addEventListener('click', callback);
}

function addListenerOnChange(elementId, callback) {
  document.getElementById(elementId).addEventListener('change', callback);
}

function handleSelectElementClick(cropAndSaveFunction) {
  return async function () {
    const elementIsInViewPort = await ContentScript.isElementInViewPort();
    const screenShots = elementIsInViewPort ? [await captureVisibleTab()] : await collectFullPageScreenShots();
    cropAndSaveFunction(screenShots);
  }
}

function handleCompareElementsAndDownloadClick() {
  ContentScript.compareScreenShotsAndDownload(firstImage, secondImage)
}

function handleCompareElementsAndShowClick() {
  ContentScript.compareScreenShotsAndShow(firstImage, secondImage)
}

function readFileFromFileInput(fileInput) {
  return new Promise(resolve => {
    var file = fileInput.files[0];
    var reader = new FileReader();

    reader.onloadend = function () {
      resolve(reader.result);
    }
    reader.readAsDataURL(file);
  });
}

async function handleFirstImageUpload(event) {
  const dataUrl = await readFileFromFileInput(event.target);
  ContentScript.saveFirstImageFromFile(dataUrl);
}

async function handleSecondImageUpload(event) {
  const dataUrl = await readFileFromFileInput(event.target);
  ContentScript.saveSecondImageFromFile(dataUrl);
}

function addListeners() {
  // addListenerOnClick(FIRST_ELEMENT_SELECT_ID, handleSelectElementClick(ContentScript.cropAndSaveFirstElementScreenShot));
  addListenerOnClick(FIRST_ELEMENT_SELECT_ID, () => {
    ContentScript.captureVideo();
    // chrome.desktopCapture.chooseDesktopMedia(['screen','window', 'tab'], undefined, (streamId, options) => {
    //   ContentScript.captureVideo(streamId);
    //   ContentScript.consoleLog(streamId);
    // })
  });
  addListenerOnClick(SECOND_ELEMENT_SELECT_ID, handleSelectElementClick(ContentScript.cropAndSaveSecondElementScreenShot));
  addListenerOnClick(COMPARE_AND_DOWNLOAD_ID, handleCompareElementsAndDownloadClick);
  addListenerOnClick(COMPARE_AND_SHOW_ID, handleCompareElementsAndShowClick);
  addListenerOnChange(FIRST_IMAGE_FILE_INPUT_ID, handleFirstImageUpload);
  addListenerOnChange(SECOND_IMAGE_FILE_INPUT_ID, handleSecondImageUpload);
}

function activateResult() {
  document.getElementById(RESULT_ID).classList.add('result-text_active');
}

function updateSidebarPage() {
  if (firstImage) {
    renderElementPreview(FIRST_ELEMENT_CONTAINER_ID, firstImage, firstElementDomain);
  }
  if (secondImage) {
    renderElementPreview(SECOND_ELEMENT_CONTAINER_ID, secondImage, secondElementDomain);
  }
  if (firstImage && secondImage) {
    activateResult();
  }
}

function renderElementPreview(containerId, imageDataUrl, domain) {
  document.getElementById(containerId).innerHTML = `
      <img src="${imageDataUrl}" class="element-img">`;
  document.getElementById(containerId).classList.add('card-preview-box_active');
  let pageAddressElement = null;
  switch (containerId) {
    case FIRST_ELEMENT_CONTAINER_ID:
      pageAddressElement = document.getElementById(FIRST_ELEMENT_ADDRESS_ID);
      break;
    case SECOND_ELEMENT_CONTAINER_ID:
      pageAddressElement = document.getElementById(SECOND_ELEMENT_ADDRESS_ID);
      break;
  }
  pageAddressElement.innerHTML = domain;
  pageAddressElement.classList.add('card-address_active');
}

// Once the DOM is ready...
window.addEventListener('DOMContentLoaded', () => {
  addListeners();
  updateSidebarPage();
});

chrome.runtime.onMessage.addListener(request => {
  switch (request.chromeAction) {
    case SET_FIRST_IMAGE:
      firstImage = request.dataUrl;
      firstElementDomain = request.domain;
      break;
    case SET_SECOND_IMAGE:
      secondImage = request.dataUrl;
      secondElementDomain = request.domain;
      break;
  }
  updateSidebarPage();
});