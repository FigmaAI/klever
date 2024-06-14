import { createModelInstance } from './Models';
import { createPromptForTask } from './Prompts';
import config from './config.json';

// Create model instance
const modelInstance = createModelInstance(config);

// Define postData interface
interface PostData {
  nodeId: string;
  taskName: string;
  taskDesc: string;
  personaDesc?: string; // personaDesc is an optional attribute.
}

// Define UIElement interface
interface UIElement {
  id: string;
  type: string;
  name: string;
  bbox: { x: number; y: number; width: number; height: number };
}

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

// Function to generate UT report
const generateReport = async (postData: PostData) => {
  // Load fonts
  await loadFonts();

  // Create variable lastAct, initial value is None
  let lastAct = 'None';
  let roundCount = 0;

  // set uselessList
  // const uselessList: any[] = []

  // let taskComplete = false;

  // Check and create "UT Reports" frame
  const utReportsFrame = getOrCreateUTReportsFrame();

  // Create and append Task frame
  const taskFrame = createTaskFrame(postData.taskName);
  utReportsFrame.appendChild(taskFrame);

  // send taskFrame as a reportNode to the UI
  figma.ui.postMessage({ type: 'reportNode', message: taskFrame.id });

  // Get the information of the selected node.
  const node = (await figma.getNodeByIdAsync(postData.nodeId)) as FrameNode;

  // Create and append Name frame
  const nameFrame = createNameFrame(node.name);
  taskFrame.appendChild(nameFrame);

  // Create and append Task Description frame
  const taskDescFrame = createTaskDescFrame(postData.taskDesc, postData.personaDesc);
  taskFrame.appendChild(taskDescFrame);

  // Create and append Anatomy frame
  const anatomyFrame = createAnatomyFrame(roundCount);
  taskFrame.appendChild(anatomyFrame);

  // Create a preview frame
  const previewFrame = createPreviewFrame();
  anatomyFrame.appendChild(previewFrame);

  // Extract the image hash of the selected node.
  const imageHash = await addNodeImageToPreviewFrame(node);

  // Add an image node to the beforeImage frame.
  const beforeImage = createImageFrameFromHash(imageHash, node.width, node.height, roundCount); // roundCount is an example using 1
  previewFrame.appendChild(beforeImage);

  // Create elemList
  const elemList = await createElemList(node);

  // Create and manage labeled image frame
  const afterImage = await createLabeledImageFrame(elemList, imageHash, node.width, node.height, roundCount); // roundCount is an example using 1
  previewFrame.appendChild(afterImage);

  // Adjust viewport focus 1
  figma.viewport.scrollAndZoomIntoView([taskFrame]);

  // Convert the image of the afterImage frame to a Base64 string
  const afterImageBase64 = await getFrameImageBase64(afterImage);

  // Create prompt
  const prompt = createPromptForTask(postData.taskDesc, postData.personaDesc);

  // Replace <last_act> in prompt with lastAct
  prompt.replace('<last_act>', lastAct);

  // Call GPT model
  figma.notify('Asking AI to generate UT Report...');
  modelInstance
    .getModelResponse(prompt, [afterImageBase64])
    .then((response) => {
      figma.notify('Received response from AI');
      figma.ui.postMessage({ type: 'loading', message: false });

      const res = parseExploreRsp(JSON.stringify(response.data), previewFrame, elemList, roundCount, beforeImage);

      console.log('res:', res);
    })
    .catch((error) => {
      console.error(error);
      figma.notify('Failed to get response from OpenAI');
    });
};

// 폰트 로드 함수
async function loadFonts() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
}

// "UT Reports" 프레임 검사 및 생성 함수
function getOrCreateUTReportsFrame() {
  let frame = figma.currentPage.findOne((n) => n.type === 'FRAME' && n.name === 'UT Reports') as FrameNode;
  if (!frame) {
    frame = createUTReportsFrame();
    figma.currentPage.appendChild(frame);
  }
  return frame;
}

// "UT Reports" 프레임 생성 함수
function createUTReportsFrame() {
  const frame = figma.createFrame();
  frame.name = 'UT Reports';
  frame.layoutMode = 'HORIZONTAL';
  frame.itemSpacing = 128;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.cornerRadius = 16;
  const maxX = figma.currentPage.children.reduce((max, node) => Math.max(max, node.x + node.width), 0);
  frame.x = maxX + 100;
  frame.y = 0;
  return frame;
}

// Task 프레임 생성 함수
function createTaskFrame(taskName: string) {
  const frame = figma.createFrame();
  frame.name = taskName;
  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 64;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  return frame;
}

// Name 프레임 생성 함수
function createNameFrame(nodeName: string) {
  const frame = figma.createFrame();
  frame.name = 'Name';
  frame.layoutMode = 'HORIZONTAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.cornerRadius = 16;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  const text = figma.createText();
  text.characters = nodeName;
  text.fontSize = 64;
  text.fontName = { family: 'Inter', style: 'Bold' };
  text.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(text);

  return frame;
}

// Task Description 프레임 생성 함수
function createTaskDescFrame(taskDesc: string, personaDesc?: string) {
  const frame = figma.createFrame();
  frame.name = 'task_desc';
  frame.layoutMode = 'VERTICAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 48;
  frame.cornerRadius = 16;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  const titleText = createText('Task Description', 48, 'Bold');
  frame.appendChild(titleText);

  const descText = createText(taskDesc, 24, 'Regular');
  frame.appendChild(descText);

  if (personaDesc) {
    const personaText = createText(`As a person who is ${personaDesc}`, 24, 'Regular');
    frame.appendChild(personaText);
  }

  return frame;
}

// 텍스트 노드 생성 함수
function createText(characters: string, fontSize: number, fontStyle: 'Regular' | 'Bold'): TextNode {
  const text = figma.createText();
  text.characters = characters;
  text.fontSize = fontSize;
  text.fontName = { family: 'Inter', style: fontStyle };
  text.textAutoResize = 'WIDTH_AND_HEIGHT';
  return text;
}

// Anatomy 프레임 생성 함수
function createAnatomyFrame(roundCount: number): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'anatomy';
  frame.layoutMode = 'VERTICAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 32; // 상호 간격 설정
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  const titleText = createText(`Round ${roundCount}`, 48, 'Bold');
  frame.appendChild(titleText);

  return frame;
}

// Preview 프레임 생성 함수
function createPreviewFrame(): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'preview';
  frame.layoutMode = 'HORIZONTAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 64; // 상호 간격 설정
  frame.fills = [{ type: 'SOLID', color: { r: 0.8667, g: 0.8667, b: 0.8667 } }]; // 배경색 #ddd 설정
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  return frame;
}

// Preview 프레임에 노드 이미지 추가하는 함수를 이미지 해시를 반환하는 함수로 변경
async function addNodeImageToPreviewFrame(node: FrameNode): Promise<string> {
  const imageBytes = await node.exportAsync({ format: 'PNG' });
  const imageHash = figma.createImage(imageBytes).hash;
  return imageHash;
}

async function createElemList(
  node: SceneNode,
  elemList: UIElement[] = [],
  root: SceneNode = node
): Promise<UIElement[]> {
  // 노드가 숨겨진 상태이면 처리를 건너뜁니다.
  if (!node.visible) {
    return elemList;
  }

  // 'FRAME', 'INSTANCE', 'COMPONENT' 타입의 노드를 처리합니다.
  if (['FRAME', 'INSTANCE', 'COMPONENT'].includes(node.type)) {
    const { x, y, width, height } = node.absoluteBoundingBox;
    elemList.push({
      id: node.id,
      type: node.type,
      name: node.name,
      bbox: {
        x: x - root.absoluteBoundingBox.x,
        y: y - root.absoluteBoundingBox.y,
        width,
        height,
      },
    });
  }

  // 'GROUP' 타입의 노드 또는 'FRAME' 타입의 노드의 자식을 탐색합니다.
  if ('children' in node) {
    for (const child of node.children) {
      await createElemList(child, elemList, root);
    }
  }

  return elemList;
}

// 이미지 해시와 원본 이미지의 크기를 사용하여 이미지 프레임을 생성하는 함수
function createImageFrameFromHash(imageHash: string, width: number, height: number, roundCount: number): FrameNode {
  const imageFrame = figma.createFrame();
  imageFrame.name = `${roundCount}_before_labeled`;

  const imageNode = figma.createRectangle();
  imageNode.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash }];
  imageNode.resize(width, height); // 원본 이미지의 크기로 이미지 노드의 크기를 조정합니다.

  imageFrame.appendChild(imageNode);
  imageFrame.resize(width, height); // 이미지 노드와 동일한 크기로 프레임의 크기를 조정합니다.

  return imageFrame;
}

async function createLabeledImageFrame(
  elemList: UIElement[],
  imageHash: string,
  width: number,
  height: number,
  roundCount: number
) {
  // 라벨링된 이미지를 담을 새로운 프레임 생성
  const imageNode = figma.createRectangle();
  imageNode.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash }];
  imageNode.resize(width, height);
  const labeledFrame = figma.createFrame();
  labeledFrame.name = `${roundCount}_after_labeled`;
  labeledFrame.resize(width, height);
  labeledFrame.appendChild(imageNode); // 이미지 노드 추가

  elemList.forEach((elem, index) => {
    // 각 UI 요소를 나타내는 프레임 생성
    const elemFrame = figma.createFrame();
    elemFrame.name = elem.name;
    elemFrame.layoutMode = 'HORIZONTAL';
    elemFrame.paddingTop = elemFrame.paddingBottom = elemFrame.paddingLeft = elemFrame.paddingRight = 4; // 패딩 설정
    elemFrame.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 0.5 }]; // 반투명의 짙은 회색 배경
    // sizing은 AUTO로 설정하여 프레임 크기가 자동으로 조정되도록 합니다.
    elemFrame.primaryAxisSizingMode = 'AUTO';
    elemFrame.counterAxisSizingMode = 'AUTO';
    // bbox의 정 가운데에 위치하도록 x, y 값을 조정
    elemFrame.x = elem.bbox.x + elem.bbox.width / 2 - 8;
    elemFrame.y = elem.bbox.y + elem.bbox.height / 2 - 8;

    // 번호를 표시하는 텍스트 생성 및 프레임에 추가
    const textNode = figma.createText();
    textNode.characters = (index + 1).toString();
    textNode.fontSize = 12;
    textNode.fontName = { family: 'Inter', style: 'Regular' };
    textNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // 텍스트 색상 설정

    elemFrame.appendChild(textNode);

    // 라벨링된 이미지 프레임에 UI 요소 프레임 추가
    labeledFrame.appendChild(elemFrame);
  });

  // Labeled Frame을 반환합니다.
  return labeledFrame;
}

// 이미지를 Base64 문자열로 변환하는 함수
async function getFrameImageBase64(node: SceneNode): Promise<string> {
  const imageBytes = await node.exportAsync({ format: 'JPG' });
  const base64Encode = figma.base64Encode(imageBytes);
  return base64Encode;
}

function parseExploreRsp(
  rsp: string,
  previewFrame: FrameNode,
  elemList: UIElement[],
  roundCount: number,
  beforeImage: FrameNode
): (string | number)[] | null {
  // 뷰포트 포커스 조정 2
  figma.viewport.scrollAndZoomIntoView([previewFrame]);
  try {
    const parsedResponse = parseModelResponse(rsp);
    if (!parsedResponse) {
      console.error('ERROR: Failed to parse the model response');
      return null;
    }

    const { observation, thought, action, summary } = parsedResponse;

    // Create a new frame for the model response
    const modelResponseFrame = figma.createFrame();
    // set background color to transparent
    modelResponseFrame.fills = [];
    modelResponseFrame.name = 'AppAgent UT Response';
    modelResponseFrame.layoutMode = 'VERTICAL';
    modelResponseFrame.itemSpacing = 32;
    modelResponseFrame.primaryAxisSizingMode = 'AUTO';
    modelResponseFrame.counterAxisSizingMode = 'AUTO';

    // Add the observation, thought, action, and summary to the model response frame
    modelResponseFrame.appendChild(createTextFrame('Observation', observation));
    modelResponseFrame.appendChild(createTextFrame('Thought', thought));
    modelResponseFrame.appendChild(createTextFrame('Action', action));
    modelResponseFrame.appendChild(createTextFrame('Summary', summary));

    // Create a new frame for the action image
    const actionImageFrame = beforeImage.clone();
    actionImageFrame.name = `${roundCount}_before_labeled_action`;

    // Highlight the selected UI element
    if (action.includes('tap') || action.includes('long_press')) {
      const area = parseInt(action.match(/\((.*?)\)/)[1]);
      const selectedElem = elemList[area - 1];

      // Create a rectangle for the bounding box
      const bboxRect = createBoundingBox(selectedElem);

      // Create a touch point
      const touchPoint = createTouchPoint(selectedElem);

      // Add the bounding box and touch point to the action image frame
      actionImageFrame.appendChild(bboxRect);
      actionImageFrame.appendChild(touchPoint);
    } else if (action.includes('swipe')) {
      const params = action.match(/swipe\((.*?)\)/)[1].split(',');
      const area = parseInt(params[0]);
      const direction = params[1].trim();
      const distance = params[2].trim();
      const selectedElem = elemList[area - 1];

      // Create a rectangle for the bounding box
      const bboxRect = createBoundingBox(selectedElem);

      // Create a line for the swipe direction
      const swipeLine = createSwipeArrow(selectedElem, direction, distance);

      // Add the bounding box and swipe line to the action image frame
      actionImageFrame.appendChild(bboxRect);
      actionImageFrame.appendChild(swipeLine);
    } else if (action.includes('text')) {
      const inputStr = action.match(/text\((.*?)\)/)[1].slice(1, -1);
      const area = parseInt(action.match(/text\((.*?)\)/)[1]);
      const selectedElem = elemList[area - 1];

      // Create a rectangle for the bounding box
      const bboxRect = createBoundingBox(selectedElem);

      // Create a speech bubble for the input text
      const speechBubble = createSpeechBubble(selectedElem, inputStr);

      // Add the bounding box and speech bubble to the action image frame
      actionImageFrame.appendChild(bboxRect);
      actionImageFrame.appendChild(speechBubble);
    }
    // Add the action image frame and model response frame to the preview frame
    previewFrame.appendChild(actionImageFrame);
    previewFrame.appendChild(modelResponseFrame);

    if (action.includes('FINISH')) {
      return ['FINISH'];
    }

    const actionName = action.split('(')[0];

    switch (actionName) {
      case 'tap': {
        const area = parseInt(action.match(/tap\((.*?)\)/)[1]);
        return [actionName, area, summary];
      }
      case 'text': {
        const inputStr = action.match(/text\((.*?)\)/)[1].slice(1, -1);
        return [actionName, inputStr, summary];
      }
      case 'long_press': {
        const area = parseInt(action.match(/long_press\((.*?)\)/)[1]);
        return [actionName, area, summary];
      }
      case 'swipe': {
        const params = action.match(/swipe\((.*?)\)/)[1].split(',');
        const area = parseInt(params[0]);
        const direction = params[1].trim();
        return [actionName, area, direction, summary];
      }
      default: {
        console.error(`ERROR: Unknown action name: ${actionName}`);
        return null;
      }
    }
  } catch (error) {
    console.error(`ERROR: An exception occurs while parsing the model response: ${error}`);
    console.error(rsp);
    return null;
  }
}

// 텍스트 프레임 생성 함수
function createTextFrame(title: string, content: string): FrameNode {
  const frame = figma.createFrame();
  frame.name = title;

  const titleText = createText(title, 32, 'Bold');

  // content를 디코딩합니다. 예시: "To complete the task of booking a ride, I need to tap the \"Book JustGrab\" button." -> "To complete the task of booking a ride, I need to tap the "Book JustGrab" button."
  const decodedContent = content.replace(/\\(.)/g, '$1');

  const contentText = createText(decodedContent, 24, 'Regular');

  frame.appendChild(titleText);
  frame.appendChild(contentText);

  // set auto-layouy and maxWidth 1000px
  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 16;
  frame.counterAxisSizingMode = 'FIXED';
  frame.resize(1000, frame.height);
  frame.primaryAxisSizingMode = 'AUTO';
  // Set background color to transparent
  frame.fills = [];

  titleText.layoutSizingHorizontal = 'FILL';
  contentText.layoutSizingHorizontal = 'FILL';

  return frame;
}

function parseModelResponse(
  rsp: string
): { observation: string; thought: string; action: string; summary: string } | null {
  const observationMatch = rsp.match(/Observation: (.*?)(?=\\n\\nThought:|$)/s);
  const thoughtMatch = rsp.match(/Thought: (.*?)(?=\\n\\nAction:|$)/s);
  const actionMatch = rsp.match(/Action: (.*?)(?=\\n\\nSummary:|$)/s);
  const summaryMatch = rsp.match(/Summary: (.*?)(?="$)/s);

  if (!observationMatch || !thoughtMatch || !actionMatch || !summaryMatch) {
    console.error('ERROR: Failed to parse the model response', rsp);
    return null;
  }

  return {
    observation: observationMatch[1],
    thought: thoughtMatch[1],
    action: actionMatch[1],
    summary: summaryMatch[1],
  };
}

// Bounding box를 생성하는 함수
function createBoundingBox(selectedElem: UIElement): RectangleNode {
  const bboxRect = figma.createRectangle();
  bboxRect.x = selectedElem.bbox.x;
  bboxRect.y = selectedElem.bbox.y;
  bboxRect.resize(selectedElem.bbox.width, selectedElem.bbox.height);
  bboxRect.strokeWeight = 4;
  bboxRect.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 0 } }]; // Yellow color
  bboxRect.fills = [];
  return bboxRect;
}

function createSwipeArrow(selectedElem: UIElement, direction: string, distance: string): LineNode {
  // Remove backslashes and quotes(\") from the direction string
  direction = direction.replace(/\\/g, '').replace(/"/g, '');
  distance = distance.replace(/\\/g, '').replace(/"/g, '');

  const swipeLine = figma.createLine();

  // Set the length of the line based on the swipe strength
  let lineLength;
  switch (distance) {
    case 'low':
      lineLength = 40;
      break;
    case 'medium':
      lineLength = 80;
      break;
    case 'high':
      lineLength = 120;
      break;
    default:
      lineLength = 80; // Default to 'medium' if no valid strength is provided
  }
  swipeLine.resize(lineLength, 0);

  swipeLine.strokeCap = 'ARROW_LINES';
  swipeLine.strokeWeight = 4;
  swipeLine.strokes = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]; // Red color
  swipeLine.x = selectedElem.bbox.x + selectedElem.bbox.width / 2;
  swipeLine.y = selectedElem.bbox.y + selectedElem.bbox.height / 2;

  // Set the end point of the line based on the swipe direction
  switch (direction) {
    case 'up':
      swipeLine.rotation = -90;
      swipeLine.y -= lineLength / 2;
      break;
    case 'down':
      swipeLine.rotation = 90;
      swipeLine.y += lineLength / 2;
      break;
    case 'left':
      swipeLine.rotation = 180;
      swipeLine.x -= lineLength / 2;
      break;
    case 'right':
      swipeLine.rotation = 0;
      swipeLine.x += lineLength / 2;
      break;
  }
  return swipeLine;
}

// 터치 포인트를 그리는 함수
function createTouchPoint(selectedElem: UIElement): EllipseNode {
  const touchPoint = figma.createEllipse();
  touchPoint.x = selectedElem.bbox.x + selectedElem.bbox.width / 2;
  touchPoint.y = selectedElem.bbox.y + selectedElem.bbox.height / 2;
  touchPoint.resize(10, 10); // Adjust the size as needed
  touchPoint.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]; // Red color
  return touchPoint;
}

function createSpeechBubble(selectedElem: UIElement, text: string): FrameNode {
  const bubble = figma.createFrame();
  bubble.name = 'Speech Bubble';
  bubble.layoutMode = 'VERTICAL';
  bubble.primaryAxisSizingMode = 'AUTO';
  bubble.counterAxisSizingMode = 'AUTO';
  bubble.paddingTop = bubble.paddingBottom = bubble.paddingLeft = bubble.paddingRight = 8;
  bubble.itemSpacing = 4;
  bubble.cornerRadius = 8;
  bubble.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White color
  bubble.x = selectedElem.bbox.x + selectedElem.bbox.width / 2;
  bubble.y = selectedElem.bbox.y + selectedElem.bbox.height / 2;

  const textNode = figma.createText();
  textNode.characters = text;
  textNode.fontSize = 12;
  textNode.fontName = { family: 'Inter', style: 'Regular' };
  textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
  textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // Black color

  bubble.appendChild(textNode);

  return bubble;
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

// Error message handler 함수
function errorMessageHandler(errorMessage: string) {
  console.error('Error:', errorMessage);
  figma.notify(errorMessage, { error: true });
}
figma.ui.onmessage = (msg) => {
  if (msg.type === 'submit') {
    // 수신된 메시지를 콘솔에 로그합니다.
    const postData: PostData = msg.data;
    console.log('Received from UI:', postData);

    // UT 리포트 생성 함수 호출
    generateReport(postData);
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

  // if (msg.type === 'payment') {
  //   if (figma.payments.status.type === 'UNPAID') {
  //     figma.payments.initiateCheckoutAsync( { interstitial: 'PAID_FEATURE' } );
  //   }
  // }
};
