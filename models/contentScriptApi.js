const API_PREFIX = 'tabsDiff'

function getNameWithPrefix(name) {
  return `${API_PREFIX}__${name}`
}

export const scrollTopApi = getNameWithPrefix('scrollTop');
export const makeFixedElementsInvisibleApi = getNameWithPrefix('makeFixedElementsInvisible');
export const makeFixedElementsVisibleApi = getNameWithPrefix('makeFixedElementsVisible');
export const scrollOneScreenDownApi = getNameWithPrefix('scrollOneScreenDown');
export const cropAndSaveFirstElementScreenShotApi = getNameWithPrefix('cropAndSaveFirstElementScreenShot');
export const cropAndSaveSecondElementScreenShotApi = getNameWithPrefix('cropAndSaveSecondElementScreenShot');
export const saveFirstImageFromFileApi = getNameWithPrefix('saveFirstImageFromFileApi');
export const saveSecondImageFromFileApi = getNameWithPrefix('saveSecondImageFromFileApi');
export const isElementInViewPortApi = getNameWithPrefix('isElementInViewPortApi');
export const compareScreenShotsAndDownloadApi = getNameWithPrefix('compareScreenShotsAndDownloadApi');
export const compareScreenShotsAndShowApi = getNameWithPrefix('compareScreenShotsAndShowApi');
export const captureVideoApi = getNameWithPrefix('captureVideoApi');
export const consoleLogApi = 'console.log';

export function callApi(apiName,...params) {
  return `${apiName}(${params.map(JSON.stringify).join()})`;
}

export function callApiWithSelectedElement(apiName,...params) {
  return `${apiName}($0, ${params.map(JSON.stringify).join()})`;
}