import {SET_FIRST_IMAGE, SET_SECOND_IMAGE} from './models/actions';
import pixelMatch from 'pixelmatch';
import {
    captureVideoApi,
    compareScreenShotsAndDownloadApi,
    compareScreenShotsAndShowApi,
    cropAndSaveFirstElementScreenShotApi,
    cropAndSaveSecondElementScreenShotApi,
    isElementInViewPortApi,
    makeFixedElementsInvisibleApi,
    makeFixedElementsVisibleApi, saveFirstImageFromFileApi, saveSecondImageFromFileApi,
    scrollOneScreenDownApi,
    scrollTopApi
} from './models/contentScriptApi';
import mergeImages from 'merge-images';


// here we create a new image
function createImage(dataURL, element) {
    return new Promise(resolve => {
        const {x, y, width, height} = element.getBoundingClientRect();
        const {devicePixelRatio} = window;
        // create a canvas
        var canvas = createCanvas(width * devicePixelRatio, height * devicePixelRatio);
        // get the context of your canvas
        var context = canvas.getContext('2d');
        // create a new image object
        var croppedImage = new Image();

        croppedImage.onload = function () {
            // this is where you manipulate the screenshot (cropping)
            // parameter 1: source image (screenshot)
            // parameter 2: source image x coordinate
            // parameter 3: source image y coordinate
            // parameter 4: source image width
            // parameter 5: source image height
            // parameter 6: destination x coordinate
            // parameter 7: destination y coordinate
            // parameter 8: destination width
            // parameter 9: destination height
            context.drawImage(croppedImage, x * devicePixelRatio, y * devicePixelRatio, width * devicePixelRatio, height * devicePixelRatio, 0, 0, width * devicePixelRatio, height * devicePixelRatio);

            // canvas.toDataURL() contains your cropped image
            resolve(canvas.toDataURL());
        };
        croppedImage.src = dataURL; // screenshot (full image)
    })
}

// creates a canvas element
function createCanvas(canvasWidth, canvasHeight) {
    var canvas = document.createElement("canvas");

    // size of canvas in pixels
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    return canvas;
}


function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

async function getImageData(dataUrl, width, height) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        image.onload = function () {
            context.width = width;
            context.height = height;
            context.drawImage(image, 0, 0);
            resolve(context.getImageData(0, 0, width, height))
        };
        image.src = dataUrl;
    });
}

function getImageSize(dataUrl) {
    return new Promise(resolve => {
        const i = new Image();
        i.onload = function () {
            resolve({
                width: i.width,
                height: i.height
            })
        };
        i.src = dataUrl
    });
}


function downloadURI(uri, name) {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function compareImages(firstImage, secondImage) {
    const firstImageSize = await getImageSize(firstImage);
    const secondImageSize = await getImageSize(secondImage);
    const diffCanvas = document.createElement("canvas");
    const width = Math.max(firstImageSize.width, secondImageSize.width);
    const height = Math.max(firstImageSize.height, secondImageSize.height);
    const firstImageData = await getImageData(firstImage, width, height);
    const secondImageData = await getImageData(secondImage, width, height);
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffContext = diffCanvas.getContext("2d");
    diffContext.width = width;
    diffContext.height = height;
    const diffImageData = diffContext.createImageData(width, height);
    const mismatchedPixelsCount = pixelMatch(firstImageData.data, secondImageData.data, diffImageData.data, width, height, {threshold: 0.1})
    diffContext.putImageData(diffImageData, 0, 0, 0, 0, width, height);
    return {
        dataUrl: diffCanvas.toDataURL(), mismatchedPixelsPercentage: 100 * mismatchedPixelsCount / (width * height)
    };
}

async function compareImagesAndDownload(firstImage, secondImage) {
    const {dataUrl} = await compareImages(firstImage, secondImage);
    downloadURI(dataUrl, 'diff.png');
}

async function compareImagesAndShow(firstImage, secondImage) {
    const {dataUrl, mismatchedPixelsPercentage} = await compareImages(firstImage, secondImage);
    const popover = document.createElement("div");
    popover.id = 'popover';
    popover.style = "position:fixed; width: 100vw; height: 100vh; background: rgb(0 0 0 / 0.8); top: 0; z-index: 2147483647;display:flex;justify-content: center;align-items:center";
    popover.innerHTML = `
    <div style="
    width: auto;
    display: inline-block;
    height: auto;
    border-radius: 3px;
    background: white;">
        <div id="hide-popover-button" style="
        position: relative;
    left: calc(100% + 16px);
    top: -29px;
    color: #fff;
    font-weight: 300;
    font-family: Arial, sans-serif;
    font-size: 29px;
    opacity: 0.6;
    cursor: pointer;
    height: 16px;
    width: 16px;
    line-height: 16px;
}">×</div>
        <div style="
        margin: 0 16px 8px;
        border: 1px solid #E8E8E8;display: flex;
    align-items: center;
    justify-content: center;">
            <img src="${dataUrl}" style="    object-fit: contain;
    object-position: center;
    max-width: calc(100vw - 200px);
    max-height: calc(100vh - 200px);"/>
        </div>
        <div style="margin: 8px 16px; font-family: HelveticaNeue, Arial, sans-serif; font-size: 18px">
            Result
        </div>
        <div style="display: flex;
    font-family: HelveticaNeue, Arial, sans-serif;
    margin: 8px 16px 16px;
    font-size: 12px;">
            <div>Percentage of mismatch</div><div style="margin-left: 8px; color: #FF852F" >${Math.round(mismatchedPixelsPercentage)}%</div><div id='download-result' style="margin-left: 32px; color: #308FFF;cursor: pointer;">Download</div> 
        </div>
    </div>
  `
    document.getElementsByTagName('body')[0].appendChild(popover);
    document.getElementById('hide-popover-button').addEventListener('click', () => {
        const popover = document.getElementById('popover');
        popover.parentNode.removeChild(popover);
    });
    document.getElementById('download-result').addEventListener('click', () => {
        downloadURI(dataUrl, 'diff.png');
    });
}

function scrollTop() {
    window.scrollTo(0, 0);
}

function scrollOnePageDown() {
    window.scrollBy(0, window.innerHeight);
    return document.documentElement.scrollTop + window.innerHeight === document.documentElement.scrollHeight;
}

function mapAllFixedElements(iteratee) {
    const elems = document.body.getElementsByTagName("*");
    const len = elems.length

    for (var i = 0; i < len; i++) {

        if (window.getComputedStyle(elems[i], null).getPropertyValue('position') == 'fixed') {
            iteratee(elems[i]);
        }

    }
}

function makeFixedElementsInvisible() {
    mapAllFixedElements(element => {
        element.style = 'opacity:0'
    })
}

function makeFixedElementsVisible() {
    mapAllFixedElements(element => {
        element.style = 'opacity:1'
    })
}

async function cropAndSaveElementScreenShot(element, screenShots, chromeAction) {
    const {devicePixelRatio} = window;
    let fullScreenShot = screenShots[0];
    if (screenShots.length > 1) {
        function calculateLastScreenShotYOffset(screenShot, index) {
            const {height} = getImageSize(screenShot);
            return window.innerHeight * devicePixelRatio * (index - 1) + document.documentElement.scrollHeight % (window.innerHeight * devicePixelRatio);
        }

        const mergeOptions = [screenShots.map((screenShot, index) => ({
            src: screenShot,
            x: 0,
            y: index === screenShots.length - 1 ? calculateLastScreenShotYOffset(screenShot, index) : window.innerHeight * index * devicePixelRatio
        })), {
            height: document.documentElement.scrollHeight * devicePixelRatio
        }]

        fullScreenShot = await mergeImages(...mergeOptions);
        scrollTop();
    }

    const croppedImageDataUrl = await createImage(fullScreenShot, element);
    chrome.runtime.sendMessage({chromeAction, dataUrl: croppedImageDataUrl, domain: document.domain});
}

function saveImageFromFile(imageFromFile, chromeAction) {
    chrome.runtime.sendMessage({chromeAction, dataUrl: imageFromFile, domain: 'from file'});
}


async function captureVideo() {
    console.log('hi we are here');
    const chunks = [];
    const stream = await navigator.mediaDevices.getDisplayMedia({video: true})
    console.log('stream', stream);
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = function(e) {
        console.log('ondataavailable')
        chunks.push(e.data);
        function download() {
            console.log('download')
            var blob = new Blob(chunks, {
                type: "video/webm"
            });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            a.href = url;
            a.download = "test.webm";
            a.click();
            window.URL.revokeObjectURL(url);
        }
        download();
    }
    mediaRecorder.start();
    setTimeout(() => {
        mediaRecorder.stop();
    }, 5000)
    // navigator.mediaDevices.getUserMedia({
    //     video: {
    //         mandatory: {
    //             // chromeMediaSource: 'desktop',
    //             chromeMediaSourceId: streamId,
    //             // // You can provide additional constraints. For example,
    //             // maxWidth: 1920,
    //             // maxHeight: 1080,
    //             // maxFrameRate: 10,
    //             // minAspectRatio: 1.77
    //         }
    //     }
    // });
}

//API

window[isElementInViewPortApi] = function (element) {
    return isInViewport(element);
}

window[scrollTopApi] = function () {
    scrollTop();
}

window[makeFixedElementsInvisibleApi] = function () {
    makeFixedElementsInvisible();
}

window[makeFixedElementsVisibleApi] = function () {
    makeFixedElementsVisible();
}

window[scrollOneScreenDownApi] = function () {
    return scrollOnePageDown();
}

window[cropAndSaveFirstElementScreenShotApi] = function (element, screenShots) {
    cropAndSaveElementScreenShot(element, screenShots, SET_FIRST_IMAGE);
}

window[cropAndSaveSecondElementScreenShotApi] = async function (element, screenShots) {
    cropAndSaveElementScreenShot(element, screenShots, SET_SECOND_IMAGE);
}

window[saveFirstImageFromFileApi] = async function (imageFromFile) {
    saveImageFromFile(imageFromFile, SET_FIRST_IMAGE);
}

window[saveSecondImageFromFileApi] = async function (imageFromFile) {
    saveImageFromFile(imageFromFile, SET_SECOND_IMAGE);
}

window[compareScreenShotsAndDownloadApi] = function (firstElementScreenShot, secondElementScreenShot) {
    compareImagesAndDownload(firstElementScreenShot, secondElementScreenShot);
}

window[compareScreenShotsAndShowApi] = function (firstElementScreenShot, secondElementScreenShot) {
    compareImagesAndShow(firstElementScreenShot, secondElementScreenShot);
}

window[captureVideoApi] = function (streamId) {
    console.log('here');
    captureVideo(streamId);
}
