import { setupToggleSwitch } from '../utils/utils.js';

document.addEventListener('DOMContentLoaded', () => {
    setupInteractions();
    renderReport();
    setupPrintConfig();
    setupLightMode();
    // setupCommentInsertion();
    setupPrint();
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

// --- Report Configuration & Rendering ---
const reportConfig = [
    {
        id: "Patient Info",
        title: "Patient Info",
        rows: [
            [
                { text: "Name", class: "bold no-right-border" },
                { input: { field: "patient_name" }, colspan: 2, class: "no-left-border" },
                { class: "no-left-border no-right-border" },
                { },
                { html: '<img src="/assets/positive_pt.jpg" alt="Logo" class="table-logo">', rowspan: 3, class: "text-center valign-top" }
            ],
            [
                { text: "Involved Limb", class: "bold no-right-border" },
                { input: { field: "involved_limb" }, colspan: 2, class: "no-left-border" },
                { text: "SX Date", class: "bold no-right-border" },
                { input: { field: "sx_date" }, class: "no-left-border" }
            ],
            [
                { text: "SX Details", class: "bold no-right-border" },
                { input: { field: "sx_details" }, colspan: 2, class: "no-left-border" },
                { text: "Months Post Op", class: "bold no-right-border" },
                { input: { field: "months_postop" }, class: "no-left-border" }
            ]
        ]
    },
    {
        id: "Tindeq Header",
        title: "Tindeq Strength",
        type: "header",
        text: "Lower Extremity Isometric Muscle Strength Testing – Tindeq",
        children: ["Tindeq Graphs", "Tindeq Data"]
    },
    {
        id: "Tindeq Graphs",
        title: "Graphs",
        type: "interactive-test",
        tests: [
            { 
                id: "ham", 
                title: "Peak Isometric Hamstring Strength by Trial", 
                graph: {
                    labels: { left: "Left Knee Flexion", right: "Right Knee Flexion" },
                    colors: { left: "#36A2EB", right: "#999999" }
                },
                inputs: { count: 3 }
            },
            { 
                id: "quad", 
                title: "Peak Isometric Quadriceps Strength by Trial", 
                graph: {
                    labels: { left: "Left Knee Extension", right: "Right Knee Extension" },
                    colors: { left: "#36A2EB", right: "#999999" }
                },
                inputs: { count: 3 }
            }
        ]
    },
    {
        id: "Tindeq Data",
        title: "Ham/Quad Symmetry",
        rows: [
            [
                { text: "Test Date", colspan: 2, class: "tiny-text" },
                { input: { field: "tindeq_date", link: "tindeq_date_2" }, class: "tiny-text" },
                { text: "Test Date", colspan: 2, class: "tiny-text" },
                { input: { field: "tindeq_date_2" }, class: "tiny-text" }
            ],
            [
                { text: "Peak Hamstring Limb Symmetry (R:L)", colspan: 2 },
                { input: { calcMode: "symmetry", calcTarget: "ham" }, asterisk: true },
                { text: "Peak Quadricep Limb Symmetry (R:L)", colspan: 2 },
                { input: { calcMode: "symmetry", calcTarget: "quad" }, asterisk: true }
            ],
            [
                { text: "Left Average Mean (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_hamavg" }, class: "tiny-text", asterisk: true },
                { text: "Left Average Mean (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_quadavg" }, class: "tiny-text", asterisk: true }
            ],
            [
                { text: "Right Average Mean (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_hamavg" }, class: "tiny-text", asterisk: true },
                { text: "Right Average Mean (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_quadavg" }, class: "tiny-text", asterisk: true }
            ],
            [
                { text: "Left Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_hammax" }, class: "tiny-text", asterisk: true },
                { text: "Left Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_quadmax" }, class: "tiny-text", asterisk: true }
            ],
            [
                { text: "Right Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_hammax" }, class: "tiny-text", asterisk: true },
                { text: "Right Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_quadmax" }, class: "tiny-text", asterisk: true }
            ],
            [
                { colspan: 3 },
                { text: "(LEFT) Peak Hamstring:Quad Ratio", colspan: 2, class: "tiny-text text-right" },
                { input: { calcMode: "ratio", calcNum: "l_hammax", calcDenom: "l_quadmax" }, class: "tiny-text", asterisk: true }
            ],
            [
                { colspan: 3 },
                { text: "(RIGHT) Peak Hamstring:Quad Ratio", colspan: 2, class: "tiny-text text-right" },
                { input: { calcMode: "ratio", calcNum: "r_hammax", calcDenom: "r_quadmax" }, class: "tiny-text", asterisk: true }
            ]
        ]
    },
    {
        id: "ForceFrame Header",
        title: "ForceFrame Strength",
        type: "header",
        text: "Lower Extremity Isometric Muscle Strength Testing – ForceFrame",
        children: ["Hip Rotation", "Hip Ab/Adduction", "Hip Abduction 60", "Extension / Plantarflexion"]
    },
    {
        id: "Hip Rotation",
        title: "Hip Ex/Internal Rotation",
        rows: [
            [
                { text: "Test Date:", colspan: 2, class: "tiny-text" },
                { input: { field: "forcefram_date", link: "forcefram_date_2" }, class: "tiny-text" },
                { text: "Test Date:", colspan: 2, class: "tiny-text" },
                { input: { field: "forcefram_date_2" }, class: "tiny-text" }
            ],
            [
                { html: 'Peak Hip External Rotation Symmetry (R:L)<br><span class="tiny-text italic">(Prone 90/90 from the ankle)</span>', colspan: 2 },
                { input: { calcMode: "symmetry", calcTarget: "hiper" }, asterisk: true },
                { html: 'Peak Hip Internal Rotation Symmetry (R:L)<br><span class="tiny-text italic">(Prone 90/90 from the ankle)</span>', colspan: 2 },
                { input: { calcMode: "symmetry", calcTarget: "hipir" }, asterisk: true }
            ],
            [
                { text: "Left Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_hipermax" }, class: "tiny-text" },
                { text: "Left Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_hipirmax" }, class: "tiny-text" }
            ],
            [
                { text: "Right Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_hipermax" }, class: "tiny-text" },
                { text: "Right Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_hipirmax" }, class: "tiny-text" }
            ],
            [
                { text: "(LEFT) Ext Rot to Body Weight (kg) Ratio (>0.2):", colspan: 2, class: "tiny-text text-right" },
                { input: { calc: "l_hipertobw" }, class: "tiny-text", asterisk: true },
                { colspan: 3 }
            ],
            [
                { text: "(RIGHT) Ext Rot to Body Weight (kg) Ratio (>0.2):", colspan: 2, class: "tiny-text text-right" },
                { input: { calc: "r_hipertobw" }, class: "tiny-text", asterisk: true },
                { colspan: 3 }
            ],
            [{ colspan: 6, class: "no-border", style: "height: 5px;" }]
        ]
    },
    {
        id: "Hip Ab/Adduction",
        title: "Hip Ab/Adduction",
        rows: [
            [
                { html: 'Peak Hip Abduction Symmetry (R:L)<br><span class="tiny-text italic">(Supine, straight leg from the ankle)</span>', colspan: 2 },
                { input: { calcMode: "symmetry", calcTarget: "hipab" }, asterisk: true },
                { html: 'Peak Hip Adduction Symmetry (R:L)<br><span class="tiny-text italic">(Supine, straight leg from the ankle)</span>', colspan: 2 },
                { input: { calcMode: "symmetry", calcTarget: "hipad" }, asterisk: true }
            ],
            [
                { text: "Left Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_hipabmax" }, class: "tiny-text" },
                { text: "Left Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_hipadmax" }, class: "tiny-text" }
            ],
            [
                { text: "Right Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_hipabmax" }, class: "tiny-text" },
                { text: "Right Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_hipadmax" }, class: "tiny-text" }
            ],
            [
                { text: "(LEFT) Glute Med to Body Weight (kg) Ratio (>0.33):", colspan: 2, class: "tiny-text text-right" },
                { input: { calc: "l_glutemtobw" }, class: "tiny-text", asterisk: true },
                { colspan: 3 }
            ],
            [
                { text: "(RIGHT) Glute Med to Body Weight (kg) Ratio (>0.33):", colspan: 2, class: "tiny-text text-right" },
                { input: { calc: "r_glutemtobw" }, class: "tiny-text", asterisk: true },
                { colspan: 3 }
            ],
            [{ colspan: 6, class: "no-border", style: "height: 5px;" }]
        ]
    },
    {
        id: "Hip Abduction 60",
        title: "Hip Abduction 60",
        rows: [
            [
                { html: 'Peak Hip Abduction <b>60</b> Symmetry (R:L)', colspan: 2 },
                { input: { calcMode: "symmetry", calcTarget: "hipab60" }, asterisk: true },
                { html: 'Peak Hip Adduction <b>60</b> Symmetry (R:L)', colspan: 2 },
                { input: { calcMode: "symmetry", calcTarget: "hipad60" }, asterisk: true }
            ],
            [
                { text: "Left Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_hipab60max" }, class: "tiny-text" },
                { text: "Left Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_hipad60max" }, class: "tiny-text" }
            ],
            [
                { text: "Right Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_hipab60max" }, class: "tiny-text" },
                { text: "Right Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_hipad60max" }, class: "tiny-text" }
            ],
            [{ colspan: 6, class: "no-border", style: "height: 5px;" }]
        ]
    },
    {
        id: "Extension / Plantarflexion",
        title: "Extension / Plantarflexion",
        rows: [
            [
                { text: "Peak Hip Extension Symmetry (R:L)", colspan: 2 },
                { input: { calcMode: "symmetry", calcTarget: "hipex" }, asterisk: true },
                { html: 'Peak Plantarflexion Symmetry (R:L)<br><span class="tiny-text italic">(Seated, 90/90 knee flexion)</span>', colspan: 2 },
                { input: { calcMode: "symmetry", calcTarget: "plantarf" }, asterisk: true }
            ],
            [
                { text: "Left Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_hipexmax" }, class: "tiny-text" },
                { text: "Left Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "l_plantarfmax" }, class: "tiny-text" }
            ],
            [
                { text: "Right Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_hipexmax" }, class: "tiny-text" },
                { text: "Right Peak (Kg)", colspan: 2, class: "tiny-text" },
                { input: { group: "r_plantarfmax" }, class: "tiny-text" }
            ]
        ]
    },
    {
        id: "Comments",
        title: "Comments",
        rows: [
            [{ colspan: 6, class: "no-border", style: "height: 10px;" }],
            [{ html: 'Tester Comments: <span class="tiny-text italic" style="float:right;">asterisk (*) indicates manual entry/override</span>', colspan: 6, class: "no-border" }],
            [{ html: '<textarea class="data-input" data-field="tester_comments"></textarea>', colspan: 6, style: "height: 50px;" }]
        ]
    }
];

function renderReport() {
    const tableBody = document.querySelector('.report-table');
    if (!tableBody) return;

    // Clear existing content
    tableBody.innerHTML = '';
    
    // Recreate Colgroup
    const colgroup = document.createElement('colgroup');
    colgroup.innerHTML = `<col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"><col class="c6">`;
    tableBody.appendChild(colgroup);

    // Create THEAD for repeating headers (Patient Info)
    const thead = document.createElement('thead');
    tableBody.appendChild(thead);

    reportConfig.forEach(section => {
        let container;
        
        if (section.id === "Patient Info") {
            container = thead;
        } else {
            container = document.createElement('tbody');
            container.dataset.section = section.id;
            tableBody.appendChild(container);
        }

        if (section.type === 'header') {
            container.innerHTML = `
                <tr><td colspan="6" class="no-border" style="height: 10px;"></td></tr>
                <tr><td colspan="6" class="bg-header text-center bold">${section.text}</td></tr>
                <tr><td colspan="6" class="no-border" style="height: 5px;"></td></tr>`;
        } else if (section.type === 'interactive-test') {
            const tr = document.createElement('tr');
            section.tests.forEach(test => {
                const td = document.createElement('td');
                td.colSpan = 3;
                td.className = 'no-border';
                
                let html = `<div class="graph-container" data-left-group="l_${test.id}" data-right-group="r_${test.id}">`;
                html += `<div class="graph-title">${test.title}</div>`;
                
                if (test.graph) {
                    html += `
                        <div class="graph-key">
                            <span><span class="key-dot" style="background:${test.graph.colors.left}"></span>${test.graph.labels.left}</span>
                            <span><span class="key-dot" style="background:${test.graph.colors.right}"></span>${test.graph.labels.right}</span>
                        </div>
                        <div class="graph-canvas-wrapper"><canvas id="graph_${test.id}"></canvas></div>`;
                }
                
                if (test.inputs) {
                    html += `<div class="trial-inputs" id="${test.id}-trials">`;
                    ['l', 'r'].forEach(side => {
                        html += `<div class="trial-group" data-trial-group="${side}_${test.id}"><span>${side.toUpperCase()}:</span>`;
                        for(let i=0; i<test.inputs.count; i++) {
                            html += `<input type="number" class="trial-input" data-trial="${side}_${test.id}" data-index="${i}">`;
                        }
                        html += `</div>`;
                    });
                    html += `<button class="button button-small green-button" onclick="addTrial('${test.id}')">+</button><button class="button button-small red-button" onclick="deleteTrial('${test.id}')">&times;</button></div>`;
                }
                
                html += `</div>`;
                td.innerHTML = html;
                tr.appendChild(td);
            });
            container.appendChild(tr);
            container.innerHTML += `<tr><td colspan="6" class="no-border" style="height: 5px;"></td></tr>`;
        } else if (section.rows) {
            section.rows.forEach(rowDef => {
                const tr = document.createElement('tr');
                rowDef.forEach(cell => {
                    const td = document.createElement('td');
                    if (cell.colspan) td.colSpan = cell.colspan;
                    if (cell.rowspan) td.rowSpan = cell.rowspan;
                    if (cell.class) td.className = cell.class;
                    if (cell.style) td.style = cell.style;

                    if (cell.html) {
                        td.innerHTML = cell.html;
                    } else if (cell.text) {
                        td.textContent = cell.text;
                    } else if (cell.input) {
                        const inp = document.createElement('input');
                        inp.type = 'text';
                        inp.className = `data-input ${cell.class || ''} ${cell.input.calcMode || cell.input.calc ? 'calc-output' : ''}`;
                        
                        // Map input properties to data attributes
                        if (cell.input.field) inp.dataset.field = cell.input.field;
                        if (cell.input.link) inp.dataset.linkTarget = cell.input.link;
                        if (cell.input.group) inp.dataset.group = cell.input.group;
                        if (cell.input.calc) inp.dataset.calc = cell.input.calc;
                        if (cell.input.calcMode) inp.dataset.calcMode = cell.input.calcMode;
                        if (cell.input.calcTarget) inp.dataset.calcTarget = cell.input.calcTarget;
                        if (cell.input.calcNum) inp.dataset.calcNum = cell.input.calcNum;
                        if (cell.input.calcDenom) inp.dataset.calcDenom = cell.input.calcDenom;

                        td.appendChild(inp);
                        if (cell.asterisk) {
                            const ast = document.createElement('span');
                            ast.className = 'print-asterisk';
                            ast.textContent = '*';
                            td.appendChild(ast);
                        }
                    }
                    tr.appendChild(td);
                });
                container.appendChild(tr);
            });
        }
    });
}

// --- Config UI ---
function setupPrintConfig() {
    const panel = document.getElementById('printConfigPanel');
    const btn = document.getElementById('toggleConfigBtn');
    const container = document.getElementById('configCheckboxes');
    
    if (!panel || !btn || !container) return;

    // Toggle Panel Visibility
    btn.onclick = (e) => { e.stopPropagation(); panel.classList.toggle('visible'); };
    document.onclick = (e) => { if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('visible'); };
    
    // Generate Config Structure from reportConfig
    const configStructure = reportConfig.map(section => {
        // If it's a header, it might have children defined in the JSON or we infer them
        if (section.children) {
            return {
                label: section.title,
                selector: `tbody[data-section="${section.id}"]`,
                children: section.children.map(childId => {
                    const childConfig = reportConfig.find(c => c.id === childId);
                    return { 
                        label: childConfig ? childConfig.title : childId, 
                        selector: `tbody[data-section="${childId}"]` 
                    };
                })
            };
        } else if (!reportConfig.some(s => s.children && s.children.includes(section.id))) {
            return { label: section.title, selector: `tbody[data-section="${section.id}"]` };
        }
    }).filter(Boolean);

    // Render Config UI
    configStructure.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'config-group';
        groupDiv.style.marginBottom = '10px';

        // Parent Toggle
        const parentId = `toggle-${group.label.replace(/\s+/g, '-')}`;
        const parentHtml = `
            <div class="config-item" style="font-weight: bold;">
                <input type="checkbox" id="${parentId}" checked>
                <label for="${parentId}">${group.label}</label>
            </div>`;
        groupDiv.innerHTML = parentHtml;

        const parentInput = groupDiv.querySelector('input');
        const childInputs = [];

        // Children Toggles
        if (group.children) {
            const childrenContainer = document.createElement('div');
            childrenContainer.style.marginLeft = '20px';
            
            group.children.forEach(child => {
                const childId = `toggle-${child.label.replace(/\s+/g, '-')}`;
                const childDiv = document.createElement('div');
                childDiv.className = 'config-item';
                childDiv.innerHTML = `<input type="checkbox" id="${childId}" checked><label for="${childId}">${child.label}</label>`;
                childrenContainer.appendChild(childDiv);
                childInputs.push({ input: childDiv.querySelector('input'), selector: child.selector });
            });
            groupDiv.appendChild(childrenContainer);
        }

        // Logic: Update Visibility
        const updateVisibility = () => {
            const parentEl = document.querySelector(group.selector);
            if (parentEl) parentEl.style.display = parentInput.checked ? '' : 'none';

            childInputs.forEach(({ input, selector }) => {
                const childEl = document.querySelector(selector);
                if (childEl) {
                    // Child is visible only if Parent is checked AND Child is checked
                    const isVisible = parentInput.checked && input.checked;
                    childEl.style.display = isVisible ? '' : 'none';
                    // Optional: Disable child checkbox if parent is unchecked
                    input.disabled = !parentInput.checked;

                    // Handle linked comment sections (triggers and bodies)
                    const sectionId = selector.match(/data-section="([^"]+)"/)[1];
                    const linkedEls = document.querySelectorAll(`[data-linked-section="${sectionId}"]`);
                    linkedEls.forEach(el => el.style.display = isVisible ? '' : 'none');
                }
            });
        };

        // Bind Events
        parentInput.addEventListener('change', updateVisibility);
        childInputs.forEach(({ input }) => input.addEventListener('change', updateVisibility));

        container.appendChild(groupDiv);
    });
}

function setupLightMode() {
    const toggle = document.getElementById('lightModeToggle');
    const label = document.getElementById('themeLabel');

    if (toggle) {
        const updateLabel = (checked) => {
            if (label) label.textContent = checked ? 'Light Mode' : 'Dark Mode';
        };

        updateLabel(toggle.checked);
        setupToggleSwitch(toggle, (checked) => {
            document.body.classList.toggle('light-mode', checked);
            updateLabel(checked);
        });
    }
}

/*
function setupCommentInsertion() {
    // Insert "Add Comment" buttons between major sections
    const targets = [
        'tbody[data-section="Tindeq Data"]',
        'tbody[data-section="Extension / Plantarflexion"]'
    ];

    targets.forEach(selector => {
        const targetSection = document.querySelector(selector);
        if (!targetSection) return;

        // Extract ID for linking
        const sectionId = selector.match(/data-section="([^"]+)"/)[1];

        // Create the trigger row (hidden in print)
        const triggerBody = document.createElement('tbody');
        triggerBody.className = 'no-print comment-trigger';
        triggerBody.dataset.linkedSection = sectionId;
        triggerBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-border text-center" style="padding: 10px;">
                    <button class="button button-small blue-button" style="border-radius: 12px;">+ Add Comment Section</button>
                </td>
            </tr>`;
        
        targetSection.after(triggerBody);

        // Handle Click
        const btn = triggerBody.querySelector('button');
        let commentBody = null;

        btn.onclick = () => {
            if (commentBody) {
                commentBody.remove();
                commentBody = null;
                btn.textContent = '+ Add Comment Section';
                btn.classList.replace('red-button', 'blue-button');
            } else {
                commentBody = document.createElement('tbody');
                commentBody.className = 'comment-body';
                commentBody.dataset.linkedSection = sectionId;
                commentBody.innerHTML = `
                    <tr><td colspan="6" class="no-border" style="height: 10px;"></td></tr>
                    <tr><td colspan="6" style="height: 50px;"><textarea class="data-input" placeholder="Additional Comments..."></textarea></td></tr>`;
                triggerBody.after(commentBody);
                
                btn.textContent = '- Remove Comment Section';
                btn.classList.replace('blue-button', 'red-button');
            }
        };
    });
}
*/

function setupPrint() {
    const btn = document.getElementById('printBtn');
    if (btn) {
        btn.onclick = () => window.print();
    }
}