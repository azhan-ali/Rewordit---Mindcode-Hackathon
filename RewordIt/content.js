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
    chrome.storage.local.get(['messages'], (storage) => {
        let history = storage.messages || [];
        history.push(record);
        if (history.length > 1000) {
            history = history.slice(history.length - 1000);
        }
        chrome.storage.local.set({ messages: history });
    });

    if (data.stress_score > 85) {
        if (popupNode) {
            popupNode.remove();
            popupNode = null;
        }
        activateCoolingPeriod(currentTarget, data);
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

    let optionsHtml = '';
    const tones = data.reworded_options || [];

    // Fallback if the new backend format isn't returned for some reason
    if (tones.length === 0 && data.reworded) {
        tones.push({ tone: "Calmer", text: data.reworded });
    }

    // Default primary suggestion (first one, usually Professional)
    let defaultText = tones.length > 0 ? tones[0].text : "No suggestion available.";

    // Generate HTML for the extra tones for the translator mode
    tones.forEach((opt, idx) => {
        let btnColor = idx === 0 ? '#1a73e8' : (idx === 1 ? '#e37400' : '#0f9d58');
        optionsHtml += `
            <div style="margin-bottom: 12px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; background: #fff;">
                <div style="background: #f8f9fa; padding: 6px 10px; font-weight: bold; font-size: 11px; color: ${btnColor}; border-bottom: 1px solid #e0e0e0; text-transform: uppercase;">Tone: ${opt.tone}</div>
                <div style="padding: 10px; font-size: 13px; line-height: 1.4; color: #444;">${opt.text}</div>
                <button class="rewordit-use-this-btn" data-text="${opt.text.replace(/"/g, '&quot;')}" style="width: 100%; background: ${btnColor}; color: #fff; border: none; padding: 8px; cursor: pointer; font-weight: bold; font-size: 12px; transition: opacity 0.2s;">Use This Version</button>
            </div>
        `;
    });

    popupNode.innerHTML = `
        <div style="font-weight:bold;margin-bottom:8px;font-size:14px;display:flex;justify-content:space-between; align-items: center;">
            <span style="display:flex; align-items: center; gap: 6px;">
                <span id="rewordit-title-text">RewordIt Suggestion</span>
            </span>
            <span style="color:#d93025; font-size:12px; font-weight:bold;">Stress: ${data.stress_score}/100</span>
        </div>
        
        <div style="width:100%;height:6px;background:#e8eaed;border-radius:3px;margin-bottom:8px;">
            <div style="width:${Math.min(data.stress_score, 100)}%;height:100%;background:#f9ab00;border-radius:3px;"></div>
        </div>
        <div style="margin-bottom:12px;">${emotionTags}</div>
        
        <!-- DEFAULT VIEW (Single Suggestion) -->
        <div id="rewordit-default-view">
            <div style="font-size:13px;background:#f8f9fa;padding:10px;border-radius:6px;margin-bottom:12px; border: 1px solid #e8eaed;">
                <strong style="color:#1a73e8; font-size:12px; text-transform:uppercase;">Recommended:</strong><br>
                <span style="color:#444; line-height:1.4; display:block; margin-top:4px;">${defaultText}</span>
            </div>
            
            <div style="display:flex;gap:8px; margin-bottom: 12px;">
                <button class="rewordit-use-this-btn" data-text="${defaultText.replace(/"/g, '&quot;')}" style="flex:1;background:#1a73e8;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">Use This</button>
            </div>
        </div>

        <!-- TONE TRANSLATOR TOGGLE -->
        <div style="display:flex; align-items:center; justify-content:space-between; background: #f1f3f4; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;">
            <div style="display:flex; align-items:center; gap: 6px;">
                <span style="font-size: 16px;">✨</span>
                <span style="font-size: 13px; font-weight: 600; color: #3c4043;">Tone Translator</span>
            </div>
            <label style="position: relative; display: inline-block; width: 34px; height: 20px;">
                <input type="checkbox" id="rewordit-tone-toggle" style="opacity: 0; width: 0; height: 0;">
                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px;" id="rewordit-toggle-slider">
                    <span style="position: absolute; content: ''; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%;" id="rewordit-toggle-circle"></span>
                </span>
            </label>
        </div>

        <!-- TONE TRANSLATOR VIEW (Hidden initially) -->
        <div id="rewordit-tones-container" style="display: none; max-height: 250px; overflow-y: auto; padding-right: 4px;">
            ${optionsHtml}
        </div>

        <div>
            <button id="rewordit-keep-mine" style="width:100%;background:#fff;color:#5f6368;border:1px solid #dadce0;padding:8px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;transition: background 0.2s;">Keep Original (Dismiss)</button>
        </div>
    `;

    document.body.appendChild(popupNode);

    // Toggle Logic
    const toneToggle = document.getElementById('rewordit-tone-toggle');
    const tonesContainer = document.getElementById('rewordit-tones-container');
    const defaultView = document.getElementById('rewordit-default-view');
    const titleText = document.getElementById('rewordit-title-text');
    const sliderBg = document.getElementById('rewordit-toggle-slider');
    const sliderCircle = document.getElementById('rewordit-toggle-circle');

    toneToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            // Turn ON Tone Translator
            tonesContainer.style.display = 'block';
            defaultView.style.display = 'none';
            titleText.innerText = "Tone Translator";
            sliderBg.style.backgroundColor = "#0f9d58";
            sliderCircle.style.transform = "translateX(14px)";
        } else {
            // Turn OFF Tone Translator
            tonesContainer.style.display = 'none';
            defaultView.style.display = 'block';
            titleText.innerText = "RewordIt Suggestion";
            sliderBg.style.backgroundColor = "#ccc";
            sliderCircle.style.transform = "translateX(0)";
        }
    });

    document.querySelectorAll('.rewordit-use-this-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedText = e.target.getAttribute('data-text');
            if (currentTarget) {
                setTextToElement(currentTarget, selectedText);
                lastAnalyzedText = selectedText; // prevent immediate re-analysis
            }
            record.rewrite_accepted = true;
            updateLastRecord(record);
            popupNode.remove();
            popupNode = null;
        });
    });

    document.getElementById('rewordit-keep-mine').addEventListener('click', () => {
        lastAnalyzedText = currentText; // Mark kept text so it doesn't instantly re-trigger
        popupNode.remove();
        popupNode = null;
    });
}

function updateLastRecord(record) {
    chrome.storage.local.get(['messages'], (storage) => {
        let history = storage.messages || [];
        if (history.length > 0) {
            history[history.length - 1] = record;
            chrome.storage.local.set({ messages: history });
        }
    });
}

// --- Cooling Period Interception ---
function activateCoolingPeriod(target, data) {
    if (isCoolingDown) return;
    isCoolingDown = true;
    showCoolingOverlay(data);
}

function showCoolingOverlay(data) {
    if (coolingOverlay) return;

    coolingOverlay = document.createElement('div');
    coolingOverlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.9);
        z-index: 2147483647;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-family: -apple-system, system-ui, sans-serif;
        backdrop-filter: blur(8px);
    `;

    let timeLeft = 300; // 5 minutes (300 seconds)

    // Safely extract the first calm tone (Professional) for the extreme popup
    let rewordedText = "No suggestion available.";
    if (data && data.reworded_options && data.reworded_options.length > 0) {
        rewordedText = data.reworded_options[0].text;
    } else if (data && data.reworded) {
        rewordedText = data.reworded;
    }

    coolingOverlay.innerHTML = `
        <div style="background:#1e1e24;padding:40px;border-radius:16px;text-align:center;max-width:550px;width:90%;box-shadow: 0 20px 50px rgba(0,0,0,0.8); border: 1px solid rgba(255,59,59,0.2);">
            <div style="width:60px;height:60px;border-radius:50%;background:rgba(255,59,59,0.1);display:flex;align-items:center;justify-content:center;margin: 0 auto 20px;">
                <span style="font-size:30px;">😤</span>
            </div>
            <h2 style="color:#ff5f56;margin-top:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Cooling Period Activated</h2>
            <p style="font-size:16px;line-height:1.6;color:#a0a0a5;margin-bottom:20px;">Your message triggered a high stress alert (Score: ${data ? data.stress_score : '>85'}). Science shows waiting 5 minutes prevents regret. Take a deep breath.</p>
            
            <div style="font-size:60px;font-weight:800;margin:20px 0;font-variant-numeric: tabular-nums;color:#fff;letter-spacing:2px;text-shadow: 0 0 20px rgba(255,255,255,0.2);" id="rewordit-timer">05:00</div>
            
            <div style="background:rgba(74, 222, 128, 0.05);border:1px solid rgba(74, 222, 128, 0.2);padding:20px;border-radius:12px;margin-bottom:30px;text-align:left;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#4ade80;font-weight:700;margin-bottom:8px;">✨ Calmer Alternative</div>
                <div style="font-size:15px;line-height:1.5;color:#f9f9f9;font-style:italic;">"${rewordedText}"</div>
            </div>

            <div style="display:flex;gap:15px;justify-content:center;flex-wrap:wrap;">
                <button id="rewordit-use-suggestion" style="background:#4ade80;color:#000;border:none;padding:14px 24px;border-radius:8px;cursor:pointer;font-weight:700;font-size:15px;transition:transform 0.2s;">Accept Alternative</button>
                <button id="rewordit-edit" style="background:rgba(255,255,255,0.1);color:#fff;border:none;padding:14px 24px;border-radius:8px;cursor:pointer;font-weight:600;font-size:15px;transition:background 0.2s;">Edit Mine Manually</button>
                <button id="rewordit-send-anyway" style="background:transparent;color:#666;border:1px solid #444;padding:14px 24px;border-radius:8px;cursor:not-allowed;font-weight:600;font-size:15px;opacity:0.5;transition:all 0.3s;" disabled>Wait 5s to Send</button>
            </div>
        </div>
    `;

    document.body.appendChild(coolingOverlay);

    const timerEl = document.getElementById('rewordit-timer');
    const sendAnywayBtn = document.getElementById('rewordit-send-anyway');
    let penaltyTimer = 5;

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

        if (penaltyTimer > 0) {
            penaltyTimer--;
            sendAnywayBtn.innerText = `Wait ${penaltyTimer}s to Send`;
            if (penaltyTimer === 0) {
                sendAnywayBtn.innerText = "Send Anyway";
                sendAnywayBtn.style.opacity = "1";
                sendAnywayBtn.style.cursor = "pointer";
                sendAnywayBtn.style.color = "#ff5f56";
                sendAnywayBtn.style.borderColor = "rgba(255,95,86,0.3)";
                sendAnywayBtn.disabled = false;
            }
        }
    }, 1000);

    // Hover effects
    document.getElementById('rewordit-use-suggestion').onmouseover = function () { this.style.transform = 'scale(1.03)'; }
    document.getElementById('rewordit-use-suggestion').onmouseout = function () { this.style.transform = 'scale(1)'; }
    document.getElementById('rewordit-edit').onmouseover = function () { this.style.background = 'rgba(255,255,255,0.15)'; }
    document.getElementById('rewordit-edit').onmouseout = function () { this.style.background = 'rgba(255,255,255,0.1)'; }

    // Handlers
    document.getElementById('rewordit-use-suggestion').addEventListener('click', () => {
        if (currentTarget && data && data.reworded) {
            setTextToElement(currentTarget, data.reworded);
            lastAnalyzedText = data.reworded;
        }
        removeCoolingOverlay();
    });

    document.getElementById('rewordit-edit').addEventListener('click', () => {
        lastAnalyzedText = currentText; // Mark it so we don't instantly loop on focus
        removeCoolingOverlay();
        if (currentTarget) currentTarget.focus();
    });

    document.getElementById('rewordit-send-anyway').addEventListener('click', function () {
        if (this.disabled) return;
        lastAnalyzedText = currentText;
        removeCoolingOverlay();
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
        const btn = e.target.closest('button, div[role="button"], input[type="submit"]');
        if (!btn) return;

        // CRITICAL FIX: DO NOT BLAME OVERLAY BUTTONS! Let them click the overlay elements!
        if (btn.id === 'rewordit-use-suggestion' || btn.id === 'rewordit-edit' || btn.id === 'rewordit-send-anyway') {
            return;
        }

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
