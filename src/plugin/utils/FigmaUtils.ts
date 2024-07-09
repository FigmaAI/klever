import { UIElement, PostData } from '../../KleverInstantUT.type';
import { createPromptForTask } from './prompts';

export function createText(characters: string, fontSize: number, fontStyle: 'Regular' | 'Bold'): TextNode {
  const text = figma.createText();
  text.characters = characters;
  text.fontSize = fontSize;
  text.fontName = { family: 'Inter', style: fontStyle };
  text.textAutoResize = 'WIDTH_AND_HEIGHT';
  return text;
}

export function createBoundingBox(selectedElem: UIElement, x: number, y: number): RectangleNode {
  const bboxRect = figma.createRectangle();
  bboxRect.x = selectedElem.bbox.x + (x || 0);
  bboxRect.y = selectedElem.bbox.y + (y || 0);
  bboxRect.resize(selectedElem.bbox.width, selectedElem.bbox.height);
  bboxRect.strokeWeight = 4;
  bboxRect.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 0 } }]; // Yellow color
  bboxRect.fills = [];
  return bboxRect;
}

export function createTouchPoint(selectedElem: UIElement, x: number, y: number): EllipseNode {
  const touchPoint = figma.createEllipse();
  touchPoint.x = selectedElem.bbox.x + selectedElem.bbox.width / 2 + (x || 0);
  touchPoint.y = selectedElem.bbox.y + selectedElem.bbox.height / 2 + (y || 0);
  touchPoint.resize(10, 10); // Adjust the size as needed
  touchPoint.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]; // Red color
  return touchPoint;
}

export function createTextFrame(title: string, content: string): FrameNode {
  const frame = figma.createFrame();
  frame.name = title;

  const titleText = createText(title, 32, 'Bold');

  // decode 'content' e.g. "To complete the task of booking a ride, I need to tap the \"Book JustGrab\" button." -> "To complete the task of booking a ride, I need to tap the "Book JustGrab" button."
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

export function createSwipeArrow(
  selectedElem: UIElement,
  direction: string,
  distance: string,
  x: number,
  y: number
): LineNode {
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
  swipeLine.x = selectedElem.bbox.x + selectedElem.bbox.width / 2 + (x || 0);
  swipeLine.y = selectedElem.bbox.y + selectedElem.bbox.height / 2 + (y || 0);

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

export function createSpeechBubble(selectedElem: UIElement, text: string, x: number, y: number): FrameNode {
  const bubble = figma.createFrame();
  bubble.name = 'Speech Bubble';
  bubble.layoutMode = 'VERTICAL';
  bubble.primaryAxisSizingMode = 'AUTO';
  bubble.counterAxisSizingMode = 'AUTO';
  bubble.paddingTop = bubble.paddingBottom = bubble.paddingLeft = bubble.paddingRight = 8;
  bubble.itemSpacing = 4;
  bubble.cornerRadius = 8;
  bubble.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White color
  bubble.x = selectedElem.bbox.x + selectedElem.bbox.width / 2 + (x || 0);
  bubble.y = selectedElem.bbox.y + selectedElem.bbox.height / 2 + (y || 0);

  const textNode = figma.createText();
  textNode.characters = text;
  textNode.fontSize = 12;
  textNode.fontName = { family: 'Inter', style: 'Regular' };
  textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
  textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // Black color

  bubble.appendChild(textNode);

  return bubble;
}

// "UT Reports" 프레임 검사 및 생성 함수
export async function getOrCreateUTReportsFrame() {
  let frame = figma.currentPage.findOne((n) => n.type === 'FRAME' && n.name === 'UT Reports') as FrameNode;
  if (!frame) {
    frame = createUTReportsFrame();
    figma.currentPage.appendChild(frame);
  }
  return frame;
}

export function createUTReportsFrame() {
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

export function createTaskFrame(taskName: string) {
  const frame = figma.createFrame();
  frame.name = taskName;
  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 64;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  return frame;
}

export function createNameFrame(nodeName: string) {
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

export function createTaskDescFrame(taskDesc: string, personaDesc?: string) {
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

export function createAnatomyFrame(roundCount: number): FrameNode {
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

export function createPreviewFrame(): FrameNode {
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

export async function addNodeImageToPreviewFrame(
  node: SceneNode
): Promise<{ imageHash: string; imageBytes: Uint8Array }> {
  const imageBytes = await node.exportAsync({ format: 'PNG' });
  const imageHash = figma.createImage(imageBytes).hash;
  return { imageHash, imageBytes };
}

export async function createElemList(
  node: SceneNode,
  elemList: UIElement[] = [],
  root: SceneNode = node
): Promise<UIElement[]> {
  // if the node is not visible, return the elemList
  if (!node.visible) {
    return elemList;
  }

  // Only 'FRAME', 'INSTANCE', 'COMPONENT' types are considered as UI elements
  if (['FRAME', 'INSTANCE', 'COMPONENT'].includes(node.type)) {
    // check if the node has absoluteBoundingBox property
    if (node.absoluteBoundingBox !== null && root.absoluteBoundingBox !== null) {
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
  }

  // if the node has children, recursively call createElemList for each child
  if ('children' in node) {
    for (const child of node.children) {
      await createElemList(child, elemList, root);
    }
  }

  return elemList;
}

export function createImageFrameFromHash(
  imageHash: string,
  width: number,
  height: number,
  roundCount: number
): FrameNode {
  const imageFrame = figma.createFrame();
  imageFrame.name = `${roundCount}_before_labeled`;

  const imageNode = figma.createRectangle();
  imageNode.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash }];
  imageNode.resize(width, height);

  imageFrame.appendChild(imageNode);
  imageFrame.resize(width, height);

  return imageFrame;
}

export async function createImageFrameFromBytes(imageBytes: Uint8Array, roundCount: number): Promise<FrameNode> {
  const imageFrame = figma.createFrame();
  imageFrame.name = `${roundCount}_before_labeled`;

  const image = figma.createImage(imageBytes);
  const { width, height } = await image.getSizeAsync();
  imageFrame.resize(width, height);
  imageFrame.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];

  return imageFrame;
}

export async function createLabeledImageFrame(
  elemList: UIElement[],
  imageBytes: Uint8Array,
  elementWidth: number,
  elementHeight: number,
  roundCount: number
) {
  // create a labeled frame with the image and UI elements
  const image = figma.createImage(imageBytes);
  const { width, height } = await image.getSizeAsync();
  const elementStartX: number = (width - elementWidth) / 2;
  const elementStartY: number = (height - elementHeight) / 2;

  const labeledFrame = figma.createFrame();
  labeledFrame.name = `${roundCount}_after_labeled`;
  labeledFrame.resize(width, height);
  labeledFrame.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];

  elemList.forEach((elem, index) => {
    const elemFrame = figma.createFrame();
    elemFrame.name = elem.name;
    elemFrame.layoutMode = 'HORIZONTAL';
    elemFrame.paddingTop = elemFrame.paddingBottom = elemFrame.paddingLeft = elemFrame.paddingRight = 4;
    elemFrame.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 0.5 }];

    elemFrame.primaryAxisSizingMode = 'AUTO';
    elemFrame.counterAxisSizingMode = 'AUTO';

    elemFrame.x = elem.bbox.x + elem.bbox.width / 2 - 8 + elementStartX;
    elemFrame.y = elem.bbox.y + elem.bbox.height / 2 - 8 + elementStartY;
    const textNode = figma.createText();
    textNode.characters = (index + 1).toString();
    textNode.fontSize = 12;
    textNode.fontName = { family: 'Inter', style: 'Regular' };
    textNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    elemFrame.appendChild(textNode);

    labeledFrame.appendChild(elemFrame);
  });

  return { labeledFrame, elementStartX, elementStartY };
}

export async function getFrameImageBase64(node: SceneNode): Promise<string> {
  const imageBytes = await node.exportAsync({ format: 'JPG' });
  const base64Encode = figma.base64Encode(imageBytes);
  return base64Encode;
}

export async function createTaskFrameWithNameAndDesc(postData: PostData) {
  const utReportsFrame = await getOrCreateUTReportsFrame();
  const taskFrame = createTaskFrame(postData.taskName);
  utReportsFrame.appendChild(taskFrame);
  const node = (await figma.getNodeByIdAsync(postData.nodeId)) as FrameNode;
  const nameFrame = createNameFrame(node.name);
  taskFrame.appendChild(nameFrame);
  const taskDescFrame = createTaskDescFrame(postData.taskDesc, postData.personaDesc);
  taskFrame.appendChild(taskDescFrame);
  return { taskFrame, node };
}

export async function getGenerateReportPrompt(postData: PostData, taskFrameId: string, roundCount: number) {
  try {
    // set initial variables (for the future use)
    // let lastAct = 'None';
    // get the task frame and node
    const taskFrame = (await figma.getNodeByIdAsync(taskFrameId)) as FrameNode;
    const node = (await figma.getNodeByIdAsync(postData.nodeId)) as SceneNode;
    // create frames for the task and the image
    const { previewFrame, beforeImage, afterImage, elemList, elementStartX, elementStartY } =
      await createPreviewAndImageFrames(node, taskFrame, roundCount);
    // request AI model and process response
    const prompt = createPromptForTask(postData.taskDesc, postData.personaDesc);

    return {
      prompt,
      previewFrameId: previewFrame.id,
      beforeImageId: beforeImage.id,
      afterImageId: afterImage.id,
      elemList,
      elementStartX,
      elementStartY,
    };
  } catch (error) {
    console.error('Error in generateReport:', error);
    figma.notify('Failed to generate report', { timeout: 3000 });
  }
}

export async function getImage(frameId: string) {
  const image = await figma.getNodeByIdAsync(frameId);
  return getFrameImageBase64(image as any);
}

export async function generateReportResult(
  data: any,
  previewFrameId: string,
  beforeImageId: string,
  elemList: UIElement[],
  roundCount: number,
  taskFrameId: string,
  elementStartX: number,
  elementStartY: number
) {
  try {
    if (data) {
      const taskFrame = (await figma.getNodeByIdAsync(taskFrameId)) as FrameNode;
      // if the response is successful, parse the response
      figma.notify('Received response from AI');
      const previewFrame = (await figma.getNodeByIdAsync(previewFrameId)) as FrameNode;
      const beforeImage = (await figma.getNodeByIdAsync(beforeImageId)) as FrameNode;
      const res = await parseExploreRsp(
        JSON.stringify(data),
        previewFrame,
        elemList,
        roundCount,
        beforeImage,
        elementStartX,
        elementStartY
      );
      console.log('AI Model Response:', res);
      // move focus to the task Frame report
      figma.viewport.scrollAndZoomIntoView([taskFrame]);
      console.log('Report generated successfully', taskFrame.id);
    } else {
      // if the response is not successful, show an error message
      figma.notify('Failed to get response from AI', { timeout: 3000 });
    }
  } catch (error) {
    console.error('Error in generateReport:', error);
    figma.notify('Failed to generate report', { timeout: 3000 });
  }
}

function parseExploreRsp(
  rsp: string,
  previewFrame: FrameNode,
  elemList: UIElement[],
  roundCount: number,
  beforeImage: FrameNode,
  elementStartX: number,
  elementStartY: number
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
      const bboxRect = createBoundingBox(selectedElem, elementStartX, elementStartY);

      // Create a touch point
      const touchPoint = createTouchPoint(selectedElem, elementStartX, elementStartY);

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
      const bboxRect = createBoundingBox(selectedElem, elementStartX, elementStartY);

      // Create a line for the swipe direction
      const swipeLine = createSwipeArrow(selectedElem, direction, distance, elementStartX, elementStartY);

      // Add the bounding box and swipe line to the action image frame
      actionImageFrame.appendChild(bboxRect);
      actionImageFrame.appendChild(swipeLine);
    } else if (action.includes('text')) {
      const inputStr = action.match(/text\((.*?)\)/)[1].slice(1, -1);
      const area = parseInt(action.match(/text\((.*?)\)/)[1]);
      const selectedElem = elemList[area - 1];

      // Create a rectangle for the bounding box
      const bboxRect = createBoundingBox(selectedElem, elementStartX, elementStartY);

      // Create a speech bubble for the input text
      const speechBubble = createSpeechBubble(selectedElem, inputStr, elementStartX, elementStartY);

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

function parseModelResponse(
  rsp: string
): { observation: string; thought: string; action: string; summary: string } | null {
  const observationMatch = rsp.match(/Observation: ([\s\S]*?)(?:\\n\\nThought:|$)/);
  const thoughtMatch = rsp.match(/Thought: ([\s\S]*?)(?:\\n\\nAction:|$)/);
  const actionMatch = rsp.match(/Action: ([\s\S]*?)(?:\\n\\nSummary:|$)/);
  const summaryMatch = rsp.match(/Summary: ([\s\S]*?)(?="$)/);

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

async function createPreviewAndImageFrames(node: SceneNode, taskFrame: FrameNode, roundCount: number) {
  const anatomyFrame = createAnatomyFrame(roundCount);
  taskFrame.appendChild(anatomyFrame);
  const previewFrame = createPreviewFrame();
  anatomyFrame.appendChild(previewFrame);
  const { imageBytes } = await addNodeImageToPreviewFrame(node);
  const beforeImage = await createImageFrameFromBytes(imageBytes, roundCount);
  previewFrame.appendChild(beforeImage);
  // Create elemList
  const elemList = await createElemList(node);
  // Create and manage labeled image frame
  const {
    labeledFrame: afterImage,
    elementStartX,
    elementStartY,
  } = await createLabeledImageFrame(elemList, imageBytes, node.width, node.height, roundCount);
  // set time delay for the afterImage to load
  await delay(500);
  previewFrame.appendChild(afterImage);
  return { previewFrame, beforeImage, afterImage, elemList, elementStartX, elementStartY };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendNodeInfoToUI() {
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
}
