// Chrome Extension Background Service Worker
let isCapturing = false;
let currentTabId = null;
let sessionId = null;

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

// State management for popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_STATE') {
        sendResponse({ isCapturing, tabId: currentTabId });
    }
    else if (request.type === 'START_CAPTURE') {
        startCapture(request.streamId, request.tabId)
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ error: err.message }));
        return true; // async response
    }
    else if (request.type === 'STOP_CAPTURE') {
        stopCapture();
        sendResponse({ success: true });
    }
});

async function ensureOffscreenDocument() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });

    if (existingContexts.length > 0) {
        return;
    }

    // Create an offscreen document
    await chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ['USER_MEDIA'],
        justification: 'Recording Meet tab for AI analysis'
    });
}

async function startCapture(streamId, tabId) {
    if (isCapturing) throw new Error('Already capturing.');

    try {
        // 1. Ensure offscreen document exists
        await ensureOffscreenDocument();

        // 2. Generate a unique session ID for this live meeting
        sessionId = "meet_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
        console.log("Starting Capture. Session ID:", sessionId);

        // 3. Command offscreen document to start capturing
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                target: 'offscreen',
                type: 'START_RECORDING',
                streamId: streamId,
                sessionId: sessionId
            }, (res) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (res && res.error) {
                    reject(new Error(res.error));
                } else {
                    resolve(res);
                }
            });
        });

        isCapturing = true;
        currentTabId = tabId;

    } catch (err) {
        console.error('Capture failed:', err);
        throw new Error('Failed to start capture: ' + err.message);
    }
}

let isStopping = false;

async function stopCapture() {
    if (!isCapturing || isStopping) return;
    isStopping = true;

    console.log("Stopping capture...");

    // Tell the offscreen document to manually stop tracks if possible
    chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'STOP_RECORDING'
    }).catch(() => { }); // Ignore errors if already closing

    // Forcefully destroy the offscreen document to guarantee the tabCapture stream is released 
    // and the "Cannot capture a tab with an active stream" error is avoided.
    try {
        await chrome.offscreen.closeDocument();
        console.log("Offscreen document closed.");
    } catch (err) {
        console.warn("Offscreen doc may already be closed:", err);
    }

    // Give Chrome 500ms to completely garbage collect the TabCapture media stream lock 
    // before allowing the user to click Start Capture again.
    await new Promise(r => setTimeout(r, 500));

    isCapturing = false;
    currentTabId = null;
    isStopping = false;
    console.log("Capture fully stopped and stream released.");
}

