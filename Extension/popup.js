// Chrome Extension Popup Script
document.addEventListener('DOMContentLoaded', async () => {
    const toggleBtn = document.getElementById('toggleBtn');
    const statusEl = document.getElementById('statusText');
    const errorEl = document.getElementById('errorText');

    // Check if we are on a valid Google Meet tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url.startsWith('https://meet.google.com/')) {
        statusEl.innerHTML = `Please open a Google Meet tab first.<br><br>Current: ${tab?.url?.substring(0, 30)}...`;
        return; // Leave button disabled
    }

    // Ask background script for current state
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        updateUI(response.isCapturing);
    });

    // Toggle capturing
    toggleBtn.addEventListener('click', async () => {
        toggleBtn.disabled = true; // prevent double clicks
        errorEl.style.display = 'none';

        chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
            if (state.isCapturing) {
                // Stop capture
                chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' }, (res) => {
                    updateUI(false);
                });
            } else {
                // Start capture
                // We must request tabCapture right from the popup due to Chrome security rules for tab capture
                const tabId = tab.id;

                chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
                    if (!streamId) {
                        const errMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Unknown error';
                        console.error("TabCapture Error:", errMsg);
                        showError('Failed to get media stream ID. Ensure you have permissions. Error: ' + errMsg);
                        toggleBtn.disabled = false;
                        return;
                    }

                    // Send stream ID to background to start WebRTC capture + recording
                    chrome.runtime.sendMessage({
                        type: 'START_CAPTURE',
                        streamId: streamId,
                        tabId: tabId
                    }, (res) => {
                        if (res && res.error) {
                            showError(res.error);
                            toggleBtn.disabled = false;
                        } else {
                            updateUI(true);
                        }
                    });
                });
            }
        });
    });

    function updateUI(isCapturing) {
        toggleBtn.disabled = false;
        if (isCapturing) {
            statusEl.textContent = 'Recording tab audio & video...';
            statusEl.style.color = '#10b981'; // tailwind emerald-500
            statusEl.style.background = '#064e3b';
            statusEl.style.border = '1px solid #047857';
            toggleBtn.textContent = 'Stop Capture';
            toggleBtn.classList.add('stop');
        } else {
            statusEl.textContent = 'Ready to start live assistant.';
            statusEl.style.color = '#94a3b8';
            statusEl.style.background = '#1e293b';
            statusEl.style.border = '1px solid #334155';
            toggleBtn.textContent = 'Start Capture';
            toggleBtn.classList.remove('stop');
        }
    }

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }
});
