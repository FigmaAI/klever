import { PostData } from '../KleverInstantUT.type';
import {
  createTaskFrameWithNameAndDesc,
  getGenerateReportPrompt,
  getImage,
  generateReportResult,
} from './utils/FigmaUtils';
import { createModelInstance } from './api';
import config from '../config.json';

const openAIConfig = {
  model: 'OpenAI',
  openaiApiModel: config.OPENAI_API_MODEL,
  maxTokens: 300,
  temperature: 0.0,
  requestInterval: 10,
  docRefine: false,
  maxRounds: 20,
  minDist: 30,
  baseUrl: config.OPENAI_API_BASE,
  apiKey: config.OPENAI_API_KEY,
};

// Create model instance
const modelInstance = createModelInstance(openAIConfig);

figma.showUI(__html__, { width: 480 + 32, height: 240 + 32 });
checkTrialAndInitiatePayment();

figma.on('selectionchange', async () => {
  const node = figma.currentPage.selection[0];

  if (node) {
    if ('layoutMode' in node && node.type === 'FRAME' && node.layoutMode !== 'HORIZONTAL') {
      figma.ui.postMessage({
        type: 'nodeInfo',
        message: {
          name: node.name,
          id: node.id,
        },
      });
    } else {
      figma.notify('Please select a vertical frame to continue.', { timeout: 2000 });
    }
  } else {
    figma.ui.postMessage({
      type: 'clear',
    });
  }
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
    const { prompt, previewFrameId, beforeImageId, afterImageId, elemList }: any = await getGenerateReportPrompt(
      postData,
      taskFrame.id,
      0 // round count set to "0"
    );

    console.log(prompt)

    const response = await requestAIModelAndProcessResponse(prompt, afterImageId, modelInstance);

    if (response.data) {
      await generateReportResult(
        response.data,
        previewFrameId,
        beforeImageId,
        elemList,
        0, // round count set to "0". It will be used in future update.
        taskFrame.id
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

async function checkTrialAndInitiatePayment() {
  if (figma.payments.status.type === 'PAID') {
    // 사용자가 이미 결제를 완료한 경우
    figma.ui.postMessage({ type: 'userStatus', message: 'PAID' });
  } else {
    const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
    const secondsSinceFirstRun = figma.payments.getUserFirstRanSecondsAgo();
    const daysSinceFirstRun = secondsSinceFirstRun / ONE_DAY_IN_SECONDS;
    if (daysSinceFirstRun > 3) {
      // 트라이얼 기간이 종료된 경우
      await figma.payments.initiateCheckoutAsync({ interstitial: 'TRIAL_ENDED' });
      // 결제 상태를 다시 확인
      if (figma.payments.status.type === 'UNPAID') {
        figma.ui.postMessage({ type: 'userStatus', message: { status: 'TRIAL_ENDED' } });
      } else {
        figma.ui.postMessage({ type: 'userStatus', message: { status: 'PAID' } });
      }
    } else {
      // 트라이얼 기간 중인 경우
      figma.ui.postMessage({ type: 'userStatus', message: { status: 'IN_TRIAL', trialDays: 3 - daysSinceFirstRun } });
    }
  }
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

  if (msg.type === 'errorMessage') {
    errorMessageHandler(msg.data);
  }

  if (msg.type === 'payment') {
    // if (figma.payments.status.type === 'UNPAID') {
    //   figma.payments.initiateCheckoutAsync( { interstitial: 'PAID_FEATURE' } );
    // }
    figma.notify('Payment API is under review. Please try again later.', { timeout: 3000 });
  }
};
