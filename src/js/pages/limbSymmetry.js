import { setupToggleSwitch } from '../utils/utils.js';

document.addEventListener('DOMContentLoaded', () => {
    setupInteractions();
    setupPrintConfig();
    setupLightMode();
    calculateAll();
});

// --- Interaction Logic ---
function setupInteractions() {
    // Expose for inline HTML handlers
    window.addTrial = (type) => modifyTrial(type, 'add');
    window.deleteTrial = (type) => modifyTrial(type, 'delete');

    document.body.addEventListener('input', ({ target }) => {
        if (target.matches('.data-input, .trial-input')) {
            if (target.classList.contains('data-input')) target.dataset.manual = 'true';
            
            // Date Linking
            const linkTarget = target.dataset.linkTarget;
            if (linkTarget) {
                const linked = document.querySelector(`.data-input[data-field="${linkTarget}"]`);
                if (linked && linked.dataset.manual !== 'true') linked.value = target.value;
            }
            calculateAll();
        }
    });
}

function modifyTrial(type, action) {
    const container = document.getElementById(`${type}-trials`);
    if (!container) return;

    container.querySelectorAll('.trial-group').forEach(group => {
        const inputs = group.querySelectorAll('.trial-input');
        if (action === 'add' && inputs.length < 8) {
            const input = document.createElement('input');
            Object.assign(input, { type: 'number', className: 'trial-input' });
            input.dataset.trial = group.dataset.trialGroup;
            input.dataset.index = inputs.length;
            group.appendChild(input);
        } else if (action === 'delete' && inputs.length > 0) {
            inputs[inputs.length - 1].remove();
        }
    });
    calculateAll();
}

// --- Calculation Core ---
function calculateAll() {
    // 1. Process Trials (Max/Avg)
    document.querySelectorAll('.trial-group').forEach(group => {
        const trials = Array.from(group.querySelectorAll('.trial-input'))
            .map(i => parseFloat(i.value)).filter(v => !isNaN(v) && v !== 0);
        
        setVal(`${group.dataset.trialGroup}max`, trials.length ? Math.max(...trials) : 0);
        setVal(`${group.dataset.trialGroup}avg`, trials.length ? trials.reduce((a, b) => a + b, 0) / trials.length : 0);
    });

    // 2. Update Graphs
    document.querySelectorAll('.graph-container').forEach(el => {
        const { leftGroup, rightGroup } = el.dataset;
        const canvas = el.querySelector('canvas');
        if (canvas && leftGroup && rightGroup) drawGraph(canvas, leftGroup, rightGroup);
    });

    // 3. Derived Calculations
    document.querySelectorAll('.calc-output').forEach(el => {
        const { calcMode, calcTarget, calcNum, calcDenom } = el.dataset;
        let val = 0;

        if (calcMode === 'symmetry') {
            const l = getVal(`l_${calcTarget}max`), r = getVal(`r_${calcTarget}max`);
            val = l ? r / l : 0;
            setVal(el, val, true);
        } else if (calcMode === 'ratio') {
            const d = getVal(calcDenom);
            val = d ? getVal(calcNum) / d : 0;
            setVal(el, val, false);
        }
    });
}

// --- Helpers ---
const getVal = (sel) => {
    const el = document.querySelector(`.data-input[data-group="${sel}"], .data-input[data-calc="${sel}"]`);
    return el ? parseFloat(el.value) || 0 : 0;
};

function setVal(target, value, isPercentage = false) {
    const el = typeof target === 'string' 
        ? document.querySelector(`.data-input[data-group="${target}"], .data-input[data-calc="${target}"]`) 
        : target;
    if (!el) return;

    const isManual = el.dataset.manual === 'true';
    const fmtValue = (value && isFinite(value)) 
        ? (isPercentage ? (value * 100).toFixed(1) + '%' : value.toFixed(2)) 
        : '';

    if (!isManual) el.value = fmtValue;

    updateHighlight(el, value, isManual);
    updateAsterisk(el, fmtValue, isManual);
}

function updateHighlight(el, value, isManual) {
    const parent = el.parentElement;
    if (!parent || !(el.dataset.calcMode === 'symmetry' || el.dataset.calc?.includes('sym'))) return;

    let checkVal = value;
    if (isManual) {
        const v = parseFloat(el.value.replace('%', ''));
        checkVal = !isNaN(v) ? (v > 5 ? v / 100 : v) : 0;
    }

    parent.classList.remove('bg-green', 'bg-yellow', 'bg-red');
    if ((isManual && el.value) || (!isManual && value)) {
        const diff = Math.abs(checkVal - 1);
        parent.classList.add(diff <= 0.1001 ? 'bg-green' : (diff <= 0.2001 ? 'bg-yellow' : 'bg-red'));
    }
}

function updateAsterisk(el, calcStr, isManual) {
    const asterisk = el.nextElementSibling?.classList.contains('print-asterisk') ? el.nextElementSibling : null;
    if (!asterisk) return;
    
    const curStr = el.value.replace('%', '').trim();
    const refStr = calcStr.replace('%', '').trim();
    asterisk.classList.toggle('visible', isManual && curStr !== refStr && refStr !== '');
}

// --- Graphing ---
function drawGraph(canvas, leftGroup, rightGroup) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width; canvas.height = height;

    const getData = (g) => Array.from(document.querySelectorAll(`.trial-input[data-trial="${g}"]`)).map(i => parseFloat(i.value) || 0);
    const lData = getData(leftGroup), rData = getData(rightGroup);
    const lAvg = lData.length ? lData.reduce((a,b)=>a+b,0)/lData.length : 0;
    const rAvg = rData.length ? rData.reduce((a,b)=>a+b,0)/rData.length : 0;

    const maxVal = Math.max(...lData, ...rData, lAvg, rAvg, 10) * 1.15;
    const scale = (height - 30) / maxVal;
    
    const groups = Math.max(lData.length, rData.length, 3) + 1; // +1 for Avg
    const groupW = Math.min(width / groups, 80);
    const startX = (width - (groupW * groups)) / 2;
    const barW = (groupW - 10) / 2;

    ctx.textAlign = 'center';
    
    for (let i = 0; i < groups; i++) {
        const isAvg = i === groups - 1;
        const l = isAvg ? lAvg : (lData[i] || 0);
        const r = isAvg ? rAvg : (rData[i] || 0);
        const x = startX + i * groupW + 5;

        drawBar(ctx, l, x, height, scale, barW, '#36A2EB', isAvg);
        drawBar(ctx, r, x + barW, height, scale, barW, '#999999', isAvg);

        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.fillText(isAvg ? 'Avg' : `Trial ${i+1}`, x + barW, height - 5);
    }
}

function drawBar(ctx, val, x, h, scale, w, color, isSolid) {
    if (val <= 0) return;
    const barH = val * scale;
    ctx.globalAlpha = isSolid ? 1 : 0.5;
    ctx.fillStyle = color;
    ctx.fillRect(x, h - barH - 20, w, barH);
    ctx.globalAlpha = 1;

    const text = parseFloat(val.toFixed(2));
    const fontSize = w < 15 ? 7 : (w < 25 ? 8 : 10);
    ctx.font = `bold ${fontSize}px Arial`;
    
    const fitsInside = barH > 15;
    ctx.fillStyle = fitsInside ? '#fff' : '#000';
    ctx.fillText(text, x + w / 2, h - barH - 20 + (fitsInside ? fontSize + 2 : -2));
}

// --- Config UI ---
function setupPrintConfig() {
    const panel = document.getElementById('printConfigPanel');
    const btn = document.getElementById('toggleConfigBtn');
    const container = document.getElementById('configCheckboxes');
    
    if (!panel || !btn || !container) return;

    btn.onclick = (e) => { e.stopPropagation(); panel.classList.toggle('visible'); };
    document.onclick = (e) => { if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('visible'); };
    
    document.getElementById('compactModeToggle')?.addEventListener('change', (e) => 
        document.body.classList.toggle('compact-mode', e.target.checked));

    document.querySelectorAll('tbody[data-section]').forEach(sec => {
        const label = sec.dataset.section;
        const id = `toggle-${label.replace(/\s+/g, '-')}`;
        const div = document.createElement('div');
        div.className = 'config-item';
        div.innerHTML = `<input type="checkbox" id="${id}" checked><label for="${id}">${label}</label>`;
        div.querySelector('input').onchange = (e) => sec.style.display = e.target.checked ? '' : 'none';
        container.appendChild(div);
    });
}

function setupLightMode() {
    const toggle = document.getElementById('lightModeToggle');
    if (toggle) {
        setupToggleSwitch(toggle, (checked) => document.body.classList.toggle('light-mode', checked));
    }
}