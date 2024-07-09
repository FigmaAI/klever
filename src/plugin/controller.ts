import { PostData } from '../KleverInstantUT.type';
import {
  createTaskFrameWithNameAndDesc,
  getGenerateReportPrompt,
  getImage,
  generateReportResult,
  sendNodeInfoToUI,
} from './utils/FigmaUtils';
import { createModelInstance } from './api';
import { openAIConfig, updateOpenAIConfig, resetOpenAIConfig } from './config';

// Create model instance
let modelInstance = createModelInstance(openAIConfig);

figma.showUI(__html__, { width: 480 + 32, height: 240 + 32 });

// Send key and selection when the UI is loaded
async function sendApiKeyAndNodeInfoToUI() {
  const apiKey = await figma.clientStorage.getAsync('openaiApiKey');
  if (apiKey) {
    updateAndSendApiKey(apiKey);
  } else {
    figma.ui.postMessage({ type: 'apiKey', message: '' });
  }
  await sendNodeInfoToUI();
}

// send key and selection when the UI is loaded
figma.on('run', async () => {
  await sendApiKeyAndNodeInfoToUI();
});

figma.on('selectionchange', async () => {
  await sendNodeInfoToUI();
});

async function generateReport(postData: PostData, modelInstance: any) {
  try {
    // set loading setLoading(true);
    figma.ui.postMessage({ type: 'loading', message: true });

    // 1. load font data
    await loadFonts();

    // 2. create report template
    const { taskFrame } = await createTaskFrameWithNameAndDesc(postData);
    console.log('taskFrame:', taskFrame);
    // send taskFrame as a reportNode to the UI
    figma.ui.postMessage({ type: 'reportNode', message: taskFrame.id });

    // 3. create report
    const { prompt, previewFrameId, beforeImageId, afterImageId, elemList, elementStartX, elementStartY }: any = await getGenerateReportPrompt(
      postData,
      taskFrame.id,
      0 // round count set to "0"
    );

    const response = await requestAIModelAndProcessResponse(prompt, afterImageId, modelInstance);

    if (response.data) {
      await generateReportResult(
        response.data,
        previewFrameId,
        beforeImageId,
        elemList,
        0, // round count set to "0". It will be used in future update.
        taskFrame.id,
        elementStartX,
        elementStartY

      );
    } else {
      errorMessageHandler('Failed to get response from AI');
    }

    // 4. turn off loading  setLoading(false);
    figma.ui.postMessage({ type: 'loading', message: false });

    // 5. notify user
    figma.notify('Report generated successfully', { timeout: 3000 });
  } catch (error) {
    // turn off loading setLoading(false);
    figma.ui.postMessage({ type: 'loading', message: false });
    console.error(error);
    errorMessageHandler(error.message || 'An unexpected error occurred');
  }
}

// 폰트 로드 함수
async function loadFonts() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
}

const requestAIModelAndProcessResponse = async (prompt: string, afterImageId: string, modelInstance: any) => {
  try {
    // convert the afterImage to base64
    const afterImageBase64: string = await getImage(afterImageId);
    // request the AI model and get the response
    const response = await modelInstance.getModelResponse(prompt, [afterImageBase64]);
    return response;
  } catch (error) {
    console.error('Error in requestAIModelAndProcessResponse:', error);
    figma.notify('An error occurred while processing AI model response', { timeout: 3000 });
  }
};

function updateAndSendApiKey(apiKey: string) {
  figma.clientStorage.setAsync('openaiApiKey', apiKey);
  updateOpenAIConfig(apiKey);
  modelInstance = createModelInstance(openAIConfig);
  figma.ui.postMessage({ type: 'apiKey', message: apiKey });
  figma.notify('API key has been updated', { timeout: 2000 });
}

// Error message handler 함수
function errorMessageHandler(errorMessage: string) {
  console.error('Error:', errorMessage);
  figma.notify(errorMessage, { error: true });
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'submit') {
    // 수신된 메시지를 콘솔에 로그합니다.
    const postData: PostData = msg.data;
    console.log('Received from UI:', postData);

    await generateReport(postData, modelInstance);
  }

  if (msg.type === 'moveFocus') {
    const nodeId: string = msg.data;
    figma
      .getNodeByIdAsync(nodeId)
      .then((node) => {
        figma.viewport.scrollAndZoomIntoView([node]);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }

  if (msg.type === 'saveApiKey') {
    const apiKey: string = msg.data;
    updateAndSendApiKey(apiKey);
  }

  if (msg.type === 'deleteApiKey') {
    await figma.clientStorage.deleteAsync('openaiApiKey');
    resetOpenAIConfig();
    modelInstance = createModelInstance(openAIConfig);
    figma.ui.postMessage({ type: 'apiKey', message: '' });
    figma.notify('API key has been deleted', { timeout: 2000 });
  }

  if (msg.type === 'errorMessage') {
    errorMessageHandler(msg.data);
  }
};
