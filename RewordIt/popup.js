document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['messages'], (result) => {
        const historyData = result.messages || [];
        const container = document.getElementById('history');

        if (historyData.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#5f6368;font-size:14px;padding:20px 0;">No history yet. Start typing on any website to analyze text and monitor stress!</p>';
            return;
        }

        // Show latest 10 items
        historyData.slice(-10).reverse().forEach(record => {
            const item = document.createElement('div');
            let stressClass = 'low-stress';
            if (record.stress_score > 85) stressClass = 'high-stress';
            else if (record.stress_score > 50) stressClass = 'med-stress';

            item.className = `item ${stressClass}`;

            const date = new Date(record.timestamp);

            item.innerHTML = `
                <div class="item-header">
                    <span>${record.platform}</span>
                    <span>${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="item-score">Stress: ${record.stress_score}/100 
                  ${record.rewrite_accepted ? ' <span style="color:#0f9d58;font-size:11px;">(Accepted Rewrite)</span>' : ''}
                  ${record.cooling_triggered ? ' <span style="color:#d93025;font-size:11px;">(Cooled Down)</span>' : ''}
                </div>
                <div class="emotions">
                    ${(record.emotions || []).map(e => `<span class="emotion">${e}</span>`).join('')}
                </div>
            `;
            container.appendChild(item);
        });
    });
});
