let typingTimer;
let currentTarget = null;
let currentText = "";
let isCoolingDown = false;
let coolingTimerInterval = null;
let popupNode = null;
let coolingOverlay = null;

let lastAnalyzedText = "";
let analysisGracePeriod = 0;

// Helper to get text from inputs
function getTextFromElement(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        return el.value || "";
    } else if (el.isContentEditable) {
        try {
            const clone = el.cloneNode(true);
            const quotes = clone.querySelectorAll('.gmail_quote, blockquote, .gmail_attr');
            quotes.forEach(q => q.remove());
            return clone.innerText || clone.textContent || "";
        } catch (e) {
            return el.innerText || el.textContent || "";
        }
    }
    return "";
}

// Helper to set text back to inputs
function setTextToElement(el, newText) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        el.value = newText;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (el.isContentEditable) {
        el.innerText = newText;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// Word count
function countWords(str) {
    return str.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// --- Manual Trigger Button ---
let manualBtn = document.createElement('div');
manualBtn.id = "rewordit-manual-btn";
manualBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1a73e8;
    color: #fff;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: none;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    cursor: pointer;
    z-index: 2147483646;
    font-size: 24px;
    transition: all 0.2s ease-in-out;
`;
manualBtn.innerHTML = "✨";
manualBtn.title = "Analyze my text now";
manualBtn.addEventListener('click', () => {
    if (currentTarget) {
        currentText = getTextFromElement(currentTarget);
        if (countWords(currentText) >= 10) {
            triggerAnalysis(true); // force trigger
        } else {
            showToast("RewordIt: Please type at least 10 words first.");
        }
    }
});
document.body.appendChild(manualBtn);

['input', 'keyup', 'focus'].forEach(eventType => {
    document.addEventListener(eventType, (e) => {
        if (isCoolingDown) return;

        let el = e.target;
        if (el.nodeType === 3) el = el.parentNode;

        const editableElement = (el.closest && el.closest('textarea, input, [contenteditable]')) || el;

        if (editableElement.tagName === 'TEXTAREA' || editableElement.tagName === 'INPUT' || editableElement.isContentEditable) {
            let newText = getTextFromElement(editableElement);

            // Validate word count and manage manual button visibility
            if (countWords(newText) >= 10) {
                manualBtn.style.display = 'flex';
            } else {
                manualBtn.style.display = 'none';
            }

            // Only restart the timer if the text actually changed
            // This prevents arrow keys/shift (keyup) or background scripts from infinitely delaying the timer
            if (newText !== currentText) {
                clearTimeout(typingTimer);
                currentText = newText;
                currentTarget = editableElement;

                if (countWords(currentText) >= 10) {
                    typingTimer = setTimeout(() => triggerAnalysis(false), 1000);
                }
            }
        }
    }, true);
});

// Non-blocking toast for errors
function showToast(msg) {
    let oldToast = document.getElementById('rewordit-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.id = "rewordit-toast";
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: #333;
        color: #fff;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 2147483647;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: opacity 0.3s ease;
        max-width: 300px;
        line-height: 1.4;
    `;
    toast.innerText = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Analyze text
async function triggerAnalysis(force = false) {
    if (!currentTarget || countWords(currentText) < 10) return;

    // Avoid spamming the API with the exact same text automatically
    if (!force && currentText === lastAnalyzedText) return;

    // Visual feedback for manual click
    if (force) {
        manualBtn.style.transform = "scale(0.9)";
        manualBtn.innerHTML = "⏳";
        setTimeout(() => {
            manualBtn.style.transform = "scale(1)";
            manualBtn.innerHTML = "✨";
        }, 500);
    }

    lastAnalyzedText = currentText;
    const textToAnalyze = currentText;
    const platform = window.location.hostname;

    try {
        chrome.runtime.sendMessage({ action: 'analyze_text', text: textToAnalyze }, (response) => {
            if (response && response.success && response.data) {
                const data = response.data;
                handleAnalysisResult(data, textToAnalyze, platform);
            } else if (response && !response.success) {
                let errorMsg = "API Error. Try again.";
                if (response.error === "RATE_LIMIT") {
                    errorMsg = "API Rate Limit Exceeded (15/min).\nPlease wait 60s.";
                } else if (response.error === "BLOCKED") {
                    errorMsg = "Blocked by Safety Filters.";
                }

                if (force) {
                    showToast(`RewordIt: ${errorMsg}`);
                }
                console.error("RewordIt Background Error:", response.error);
                lastAnalyzedText = ""; // clear so we can retry!
            } else if (chrome.runtime.lastError) {
                console.error("RewordIt disconnected:", chrome.runtime.lastError);
                lastAnalyzedText = "";
                if (force) showToast("RewordIt Error: Extension unresponsive. Please reload the page.");
            }
        });
    } catch (e) {
        console.error("RewordIt Analysis Error:", e);
        lastAnalyzedText = "";
    }
}

function handleAnalysisResult(data, originalText, platform) {
    // Save to storage
    const record = {
        timestamp: Date.now(),
        stress_score: data.stress_score,
        emotions: data.emotions,
        platform: platform,
        rewrite_accepted: false,
        cooling_triggered: data.stress_score > 85
    };
    chrome.storage.local.get(['rewordHistory'], (storage) => {
        let history = storage.rewordHistory || [];
        history.push(record);
        chrome.storage.local.set({ rewordHistory: history });
    });

    if (data.stress_score > 85) {
        if (popupNode) {
            popupNode.remove();
            popupNode = null;
        }
        activateCoolingPeriod(currentTarget);
    } else if (data.stress_score > 50) {
        showPopup(data, originalText, record);
    }
}

function showPopup(data, originalText, record) {
    if (popupNode) popupNode.remove();
    if (isCoolingDown) return; // don't show normal popup if cooling down

    popupNode = document.createElement('div');
    popupNode.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        background: #fff;
        border: 1px solid #dfe1e5;
        border-radius: 8px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        padding: 16px;
        width: 320px;
        box-sizing: border-box;
        font-family: -apple-system, system-ui, sans-serif;
        color: #333;
    `;

    if (currentTarget) {
        const rect = currentTarget.getBoundingClientRect();

        // Attempt to place below the input
        let topPos = rect.bottom + 10;
        let leftPos = rect.left;

        // If it goes off the bottom of the screen, place it ABOVE the input
        if (topPos + 220 > window.innerHeight) {
            topPos = rect.top - 220 - 10;
        }

        // If it goes off the right edge of the screen
        if (leftPos + 320 > window.innerWidth) {
            leftPos = window.innerWidth - 330;
        }

        // Safe left boundary
        if (leftPos < 10) leftPos = 10;
        // Safe top boundary 
        if (topPos < 10) topPos = 10;

        popupNode.style.top = topPos + 'px';
        popupNode.style.left = leftPos + 'px';
    } else {
        popupNode.style.bottom = '10px';
        popupNode.style.right = '10px';
    }

    const emotionTags = (data.emotions || []).map(e => `<span style="display:inline-block;background:#e8eaed;border-radius:12px;padding:2px 8px;font-size:12px;margin:2px;">${e}</span>`).join('');

    popupNode.innerHTML = `
        <div style="font-weight:bold;margin-bottom:8px;font-size:14px;display:flex;justify-content:space-between;">
            <span>RewordIt Suggestion</span>
            <span style="color:#d93025;">Stress: ${data.stress_score}/100</span>
        </div>
        <div style="width:100%;height:6px;background:#e8eaed;border-radius:3px;margin-bottom:8px;">
            <div style="width:${Math.min(data.stress_score, 100)}%;height:100%;background:#f9ab00;border-radius:3px;"></div>
        </div>
        <div style="margin-bottom:8px;">${emotionTags}</div>
        <div style="font-size:13px;background:#f8f9fa;padding:8px;border-radius:4px;margin-bottom:12px;"><strong>Reworded Option:</strong><br>${data.reworded}</div>
        <div style="display:flex;gap:8px;">
            <button id="rewordit-use-this" style="flex:1;background:#1a73e8;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-weight:bold;">Use This</button>
            <button id="rewordit-keep-mine" style="flex:1;background:#fff;color:#1a73e8;border:1px solid #1a73e8;padding:6px 12px;border-radius:4px;cursor:pointer;font-weight:bold;">Keep Mine</button>
        </div>
    `;

    document.body.appendChild(popupNode);

    document.getElementById('rewordit-use-this').addEventListener('click', () => {
        if (currentTarget) {
            setTextToElement(currentTarget, data.reworded);
            lastAnalyzedText = data.reworded; // prevent immediate re-analysis
        }
        record.rewrite_accepted = true;
        updateLastRecord(record);
        popupNode.remove();
        popupNode = null;
    });

    document.getElementById('rewordit-keep-mine').addEventListener('click', () => {
        lastAnalyzedText = currentText; // Mark kept text so it doesn't instantly re-trigger
        popupNode.remove();
        popupNode = null;
    });
}

function updateLastRecord(record) {
    chrome.storage.local.get(['rewordHistory'], (storage) => {
        let history = storage.rewordHistory || [];
        if (history.length > 0) {
            history[history.length - 1] = record;
            chrome.storage.local.set({ rewordHistory: history });
        }
    });
}

// --- Cooling Period Interception ---
function activateCoolingPeriod(target) {
    if (isCoolingDown) return;
    isCoolingDown = true;
    showCoolingOverlay();
}

function showCoolingOverlay() {
    if (coolingOverlay) return;

    coolingOverlay = document.createElement('div');
    coolingOverlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.85);
        z-index: 2147483647;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-family: -apple-system, system-ui, sans-serif;
    `;

    let timeLeft = 300; // 5 minutes (300 seconds)

    coolingOverlay.innerHTML = `
        <div style="background:#202124;padding:40px;border-radius:12px;text-align:center;max-width:500px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <h2 style="color:#f28b82;margin-top:0;font-size:24px;">Cooling Period Activated</h2>
            <p style="font-size:16px;line-height:1.5;">High stress level (>85) detected. Take a deep breath. You cannot send this message for 5 minutes.</p>
            <div style="font-size:64px;font-weight:bold;margin:30px 0;font-variant-numeric: tabular-nums;" id="rewordit-timer">05:00</div>
            <div style="display:flex;gap:15px;justify-content:center;">
                <button id="rewordit-edit" style="background:#8ab4f8;color:#202124;border:none;padding:12px 24px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:16px;">Edit Message</button>
                <button id="rewordit-send-anyway" style="background:transparent;color:#9aa0a6;border:1px solid #5f6368;padding:12px 24px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:16px;">Send Anyway</button>
            </div>
        </div>
    `;

    document.body.appendChild(coolingOverlay);

    const timerEl = document.getElementById('rewordit-timer');

    coolingTimerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(coolingTimerInterval);
            removeCoolingOverlay();
        } else {
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            timerEl.innerText = `${m}:${s}`;
        }
    }, 1000);

    document.getElementById('rewordit-edit').addEventListener('click', () => {
        removeCoolingOverlay();
        lastAnalyzedText = currentText; // Mark it so we don't instantly loop on focus
        if (currentTarget) currentTarget.focus();
    });

    document.getElementById('rewordit-send-anyway').addEventListener('click', () => {
        removeCoolingOverlay();
        lastAnalyzedText = currentText;
    });
}

function removeCoolingOverlay() {
    if (coolingTimerInterval) clearInterval(coolingTimerInterval);
    if (coolingOverlay) {
        coolingOverlay.remove();
        coolingOverlay = null;
    }
    isCoolingDown = false;
}

// Intercept specific 'Send' actions
document.addEventListener('keydown', (e) => {
    if (isCoolingDown) {
        if (e.key === 'Enter') { // Intercepting Slack/WhatsApp/General submit on Enter
            e.preventDefault();
            e.stopPropagation();
        }
    }
}, true); // Use capture phase to intercept early

document.addEventListener('click', (e) => {
    if (isCoolingDown) {
        // Intercept buttons that look like send buttons (Gmail, LinkedIn, Twitter etc.)
        const btn = e.target.closest('button, div[role="button"], input[type="submit"]');
        if (!btn) return;

        const text = (btn.innerText || btn.getAttribute('aria-label') || btn.getAttribute('data-tooltip') || "").toLowerCase();
        const isSendBtn = text.includes('send') ||
            text.includes('tweet') ||
            text.includes('post') ||
            text.includes('reply') ||
            btn.hasAttribute('data-testid') && btn.getAttribute('data-testid').includes('tweet');

        if (isSendBtn || btn.tagName === 'BUTTON' || btn.tagName === 'INPUT') {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}, true);

// Close popup on click outside
document.addEventListener('click', (e) => {
    if (popupNode && !popupNode.contains(e.target) && !isCoolingDown) {
        popupNode.remove();
        popupNode = null;
    }
});
