let sessionId = null;
const BACKEND_URL = "http://localhost:8000/live-stream";

let mediaStream = null;
let chunkIntervalId = null;
let lastRecorder = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return false;

    if (message.type === 'START_RECORDING') {
        sessionId = message.sessionId;

        // Call async startCapture without awaiting it here
        startCapture(message.streamId)
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ error: err.message }));

        // Return true to indicate we wish to send a response asynchronously
        return true;
    }
    else if (message.type === 'STOP_RECORDING') {
        stopCapture();
        sendResponse({ success: true });
        return false; // synchronous response
    }
});


async function startCapture(streamId) {
    if (mediaStream) {
        throw new Error('Already capturing in offscreen document.');
    }

    // Obtain the stream using the tabCapture stream ID passed from popup
    mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId
            }
        },
        video: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId,
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080
            }
        }
    });

    // Record standalone fully-headed chunks by restarting MediaRecorder every 5 seconds
    recordStandaloneChunk();
    chunkIntervalId = setInterval(recordStandaloneChunk, 5000);
}

function recordStandaloneChunk() {
    if (!mediaStream) return;

    const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm; codecs=vp8,opus'
    });

    let chunks = [];
    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm; codecs=vp8,opus' });
        sendChunkToBackend(blob);
    };

    recorder.start();
    lastRecorder = recorder;

    // Schedule to stop this recorder after exactly 5 seconds
    setTimeout(() => {
        if (recorder.state === 'recording') {
            recorder.stop();
        }
    }, 4950);
}

function stopCapture() {
    if (chunkIntervalId) {
        clearInterval(chunkIntervalId);
        chunkIntervalId = null;
    }
    if (lastRecorder && lastRecorder.state !== 'inactive') {
        try { lastRecorder.stop(); } catch (e) { }
    }
    lastRecorder = null;

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
            try { track.stop(); } catch (e) { }
        });
        mediaStream = null;
    }

    sessionId = null;

    // As a final safety measure, force the offscreen window to close itself 
    // to guarantee the stream lock is released back to Chrome.
    setTimeout(() => {
        try { window.close(); } catch (e) { }
    }, 100);
}

async function sendChunkToBackend(blob) {
    if (!sessionId) return;

    const formData = new FormData();
    formData.append('file', blob, 'chunk.webm');
    formData.append('session_id', sessionId);
    formData.append('timestamp', Date.now().toString());

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            console.error('Backend returned error:', response.status);
        }
    } catch (err) {
        console.error('Network error sending chunk:', err);
    }
}
