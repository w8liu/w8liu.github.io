document.addEventListener('DOMContentLoaded', () => {
    // Attach listeners to existing inputs
    attachListeners();
    
    // Expose addTrial to global scope for the button onclick
    window.addTrial = addTrial;
    window.deleteTrial = deleteTrial;

    // Initial calculation on load
    processTrials();
    calculateAll();
});

function attachListeners() {
    const inputs = document.querySelectorAll('.data-input');
    const trialInputs = document.querySelectorAll('.trial-input');
    
    inputs.forEach(input => {
        input.removeEventListener('input', calculateAll); // Prevent duplicates
        input.addEventListener('input', calculateAll);
        
        // Track manual edits
        if (!input.dataset.hasManualListener) {
            input.addEventListener('input', (e) => {
                e.target.dataset.manual = 'true';
                handleDateLinking(e.target);
            });
            input.dataset.hasManualListener = 'true';
        }
    });

    trialInputs.forEach(input => {
        input.removeEventListener('input', handleTrialInput); // Prevent duplicates
        input.addEventListener('input', handleTrialInput);
    });
}

function handleDateLinking(target) {
    // Link Date 1 -> Date 2
    const dateMap = {
        'tindeq_date': 'tindeq_date_2',
        'forcefram_date': 'forcefram_date_2'
    };

    if (dateMap[target.dataset.field]) {
        const targetField = document.querySelector(`.data-input[data-field="${dateMap[target.dataset.field]}"]`);
        if (targetField && targetField.dataset.manual !== 'true') {
            targetField.value = target.value;
        }
    }
}

function handleTrialInput() {
    processTrials();
    calculateAll();
}

function addTrial(type) {
    // type is 'ham' or 'quad'
    const container = document.getElementById(`${type}-trials`);
    if (!container) return;

    const lGroup = container.querySelector(`.trial-group[data-trial-group="l_${type}"]`);
    const rGroup = container.querySelector(`.trial-group[data-trial-group="r_${type}"]`);

    if (lGroup && rGroup) {
        const currentCount = lGroup.querySelectorAll('.trial-input').length;
        if (currentCount >= 8) return; // Cap at 8 trials
        
        const newIndex = currentCount;
        const createInput = (side) => {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'trial-input';
            input.dataset.trial = `${side}_${type}`;
            input.dataset.index = newIndex;
            return input;
        };

        lGroup.appendChild(createInput('l'));
        rGroup.appendChild(createInput('r'));

        // Re-attach listeners to new inputs
        attachListeners();
    }
}

function deleteTrial(type) {
    const container = document.getElementById(`${type}-trials`);
    if (!container) return;

    const lGroup = container.querySelector(`.trial-group[data-trial-group="l_${type}"]`);
    const rGroup = container.querySelector(`.trial-group[data-trial-group="r_${type}"]`);

    if (lGroup && rGroup) {
        const lInputs = lGroup.querySelectorAll('.trial-input');
        const rInputs = rGroup.querySelectorAll('.trial-input');

        if (lInputs.length > 0) {
             lGroup.removeChild(lInputs[lInputs.length - 1]);
             rGroup.removeChild(rInputs[rInputs.length - 1]);
             
             processTrials();
             calculateAll();
        }
    }
}

function getVal(group) {
    // Helper to get value by data-group
    const el = document.querySelector(`.data-input[data-group="${group}"]`);
    return el ? parseFloat(el.value) || 0 : 0;
}

function setVal(calc, value) {
    // Helper to set value by data-calc (now inputs)
    // Also handles data-group if we want to set calculated averages/maxes
    let el = document.querySelector(`.calc-output[data-calc="${calc}"]`);
    let asterisk = null;
    
    if (el && el.nextElementSibling && el.nextElementSibling.classList.contains('print-asterisk')) {
        asterisk = el.nextElementSibling;
    }
    
    // If not found by data-calc, try data-group (for max/avg fields)
    if (!el) {
        el = document.querySelector(`.data-input[data-group="${calc}"]`);
    }

    if (el) {
        const parent = el.parentElement;
        let calculatedValueStr = '';
        let numericValue = 0;
        let checkValue = numericValue;

        // If value is 0 or invalid, set to empty string
        if (isFinite(value) && !isNaN(value) && value !== 0) {
            numericValue = value;
            checkValue = value; // Update checkValue for highlighting logic
            // Check if it's a percentage (contains 'sym' or 'ratio')
            if (calc.includes('sym') || calc.includes('ratio') || calc.includes('tobw')) {
                 // For ratios/symmetry, user might want % or decimal. 
                 // Request said "peak symmetry calculations to return as a %"
                 // Ratios like 'ham_sym' are typically R/L. 
                 // Ratios like 'tobw' are usually decimals.
                 if (calc.includes('sym')) {
                     calculatedValueStr = (value * 100).toFixed(1) + '%';
                 } else {
                     calculatedValueStr = value.toFixed(2);
                 }
            } else {
                calculatedValueStr = value.toFixed(2);
            }
        }

        // Update value if not manually edited
        if (el.dataset.manual !== 'true') {
            el.value = calculatedValueStr;
        }

        // Symmetry Highlighting Logic (Runs for both manual and calculated)
        if (calc.includes('sym') && parent) {
            // If manual, parse the input value to determine highlighting
            if (el.dataset.manual === 'true') {
                let valStr = el.value.replace('%', '').trim();
                let val = parseFloat(valStr);
                if (!isNaN(val)) {
                    // Heuristic to handle user inputting "95" vs "0.95".
                    // If the number is large, assume it's a percentage.
                    if (val > 5.0) { // Assuming no ratio will be > 500%
                        checkValue = val / 100.0;
                    } else {
                        checkValue = val;
                    }
                } else {
                    checkValue = 0; // Invalid input
                }
            }

            parent.classList.remove('bg-green', 'bg-yellow', 'bg-red');
            
            // Only highlight if there is a value (calculated or manual)
            const hasValue = el.dataset.manual === 'true' ? el.value.trim() !== '' : (value !== 0);

            if (hasValue) {
                const diff = Math.abs(checkValue - 1.0);
                
                if (diff <= 0.1 + Number.EPSILON) { // Within 10% (0.9 - 1.1)
                    parent.classList.add('bg-green');
                } else if (diff <= 0.2 + Number.EPSILON) { // Within 20% (0.8 - 1.2)
                    parent.classList.add('bg-yellow');
                } else {
                    parent.classList.add('bg-red');
                }
            }
        }

        // Discrepancy Check (for Print Asterisk)
        if (asterisk) {
            // Normalize values for comparison (strip % and trim)
            const currentVal = el.value.replace('%', '').trim();
            const calcVal = calculatedValueStr.replace('%', '').trim();
            
            // Show asterisk if manually edited and the value differs from the calculated one.
            if (el.dataset.manual === 'true' && currentVal !== calcVal && calcVal !== '') {
                asterisk.classList.add('visible');
            } else {
                asterisk.classList.remove('visible');
            }
        }
    }
}

function setInputVal(group, value) {
    const el = document.querySelector(`.data-input[data-group="${group}"]`);
    if (el) {
        el.value = isFinite(value) && !isNaN(value) && value !== 0 ? value.toFixed(2) : '';
    }
}

function processTrials() {
    // Groups to process: l_ham, r_ham, l_quad, r_quad
    const groups = ['l_ham', 'r_ham', 'l_quad', 'r_quad'];

    groups.forEach(group => {
        const trials = Array.from(document.querySelectorAll(`.trial-input[data-trial="${group}"]`))
            .map(input => parseFloat(input.value))
            .filter(val => !isNaN(val) && val !== 0); // Ignore blanks and zeros for average? Or just blanks? User said "blank should not throw off".

        if (trials.length > 0) {
            const max = Math.max(...trials);
            const sum = trials.reduce((a, b) => a + b, 0);
            const avg = sum / trials.length;

            setInputVal(`${group}max`, max);
            setInputVal(`${group}avg`, avg);
        } else {
            // If cleared, maybe reset? Or leave as is if user wants to manually override.
            // For now, let's not clear manual inputs if trials are empty, 
            // but if they are typing in trials, it will overwrite.
        }
    });

    drawGraph('graph1', 'l_ham', 'r_ham');
    drawGraph('graph2', 'l_quad', 'r_quad');
}

function drawGraph(canvasId, leftGroup, rightGroup) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;

    // Get Data
    const getTrials = (group) => Array.from(document.querySelectorAll(`.trial-input[data-trial="${group}"]`))
        .map(input => parseFloat(input.value) || 0);

    const leftData = getTrials(leftGroup);
    const rightData = getTrials(rightGroup);

    // Calculate Averages
    const calcAvg = (arr) => {
        const valid = arr.filter(v => v > 0);
        if (valid.length === 0) return 0;
        return valid.reduce((a, b) => a + b, 0) / valid.length;
    };

    const leftAvg = calcAvg(leftData);
    const rightAvg = calcAvg(rightData);
    
    // Add 15% buffer to max value to prevent top cutoff
    const maxVal = Math.max(...leftData, ...rightData, leftAvg, rightAvg, 10) * 1.15; 
    const scale = (height - 30) / maxVal; // Leave room for labels

    ctx.clearRect(0, 0, width, height);

    // Dynamic Groups: Trials + Average
    const trialCount = Math.max(leftData.length, rightData.length, 3); // At least 3 columns space
    const groupCount = trialCount + 1; // +1 for Average
    
    // Limit bar width to prevent stretching
    const maxGroupWidth = 80; 
    let groupWidth = width / groupCount;
    if (groupWidth > maxGroupWidth) groupWidth = maxGroupWidth;

    const totalContentWidth = groupWidth * groupCount;
    const startX = (width - totalContentWidth) / 2; // Center the graph

    const barWidth = (groupWidth - 10) / 2; // 2 bars per group + spacing

    for (let i = 0; i < groupCount; i++) {
        let lVal, rVal, label;
        let isAvg = false;

        if (i < groupCount - 1) {
            lVal = leftData[i] || 0;
            rVal = rightData[i] || 0;
            label = `Trial ${i + 1}`;
        } else {
            lVal = leftAvg;
            rVal = rightAvg;
            label = 'Avg';
            isAvg = true;
        }

        const xBase = startX + i * groupWidth + 5;
        
        // Helper to format number: max 2 decimals, strip trailing zeros
        const fmt = (n) => parseFloat(n.toFixed(2));

        // Helper to draw bar and label
        const drawBar = (val, xPos, color) => {
            if (!isAvg) ctx.globalAlpha = 0.5; // Fade trial bars
            else ctx.globalAlpha = 1.0; // Solid average bars
            
            ctx.fillStyle = color;
            let h = val * scale;
            ctx.fillRect(xPos, height - h - 20, barWidth, h);
            
            ctx.globalAlpha = 1.0; // Reset alpha

            if (val > 0) {
                const text = fmt(val);
                
                // Dynamic font size to fit bar width
                let fontSize = 10;
                if (barWidth < 25) fontSize = 8;
                if (barWidth < 15) fontSize = 7;
                
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.textAlign = 'center';
                
                // If bar is tall enough (>15px), draw inside in white. Else on top in black.
                if (h > 15) {
                    ctx.fillStyle = '#fff';
                    ctx.fillText(text, xPos + barWidth / 2, height - h - 20 + fontSize + 2); 
                } else {
                    ctx.fillStyle = '#000';
                    ctx.fillText(text, xPos + barWidth / 2, height - h - 22); // Just above bar
                }
            }
        };

        // Draw Left Bar (Blue)
        drawBar(lVal, xBase, '#36A2EB');

        // Draw Right Bar (Grey)
        drawBar(rVal, xBase + barWidth, '#999999');

        // Axis Label
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, xBase + barWidth, height - 5);
    }
}

function calculateAll() {
    // --- Get all peak values to avoid repeated DOM queries ---
    const l_hammax = getVal('l_hammax');
    const r_hammax = getVal('r_hammax');
    const l_quadmax = getVal('l_quadmax');
    const r_quadmax = getVal('r_quadmax');
    const l_hipermax = getVal('l_hipermax');
    const r_hipermax = getVal('r_hipermax');
    const l_hipirmax = getVal('l_hipirmax');
    const r_hipirmax = getVal('r_hipirmax');
    const l_hipabmax = getVal('l_hipabmax');
    const r_hipabmax = getVal('r_hipabmax');
    const l_hipadmax = getVal('l_hipadmax');
    const r_hipadmax = getVal('r_hipadmax');
    const l_hipab60max = getVal('l_hipab60max');
    const r_hipab60max = getVal('r_hipab60max');
    const l_hipad60max = getVal('l_hipad60max');
    const r_hipad60max = getVal('r_hipad60max');
    const l_hipexmax = getVal('l_hipexmax');
    const r_hipexmax = getVal('r_hipexmax');
    const l_plantarfmax = getVal('l_plantarfmax');
    const r_plantarfmax = getVal('r_plantarfmax');

    // --- Perform calculations ---

    // Limb Symmetry (Right / Left)
    setVal('ham_sym', l_hammax !== 0 ? r_hammax / l_hammax : 0);
    setVal('quad_sym', l_quadmax !== 0 ? r_quadmax / l_quadmax : 0);

    // Hamstring:Quad Ratio (Ham / Quad)
    setVal('l_hamtoquad', l_quadmax !== 0 ? l_hammax / l_quadmax : 0);
    setVal('r_hamtoquad', r_quadmax !== 0 ? r_hammax / r_quadmax : 0);

    // Hip Rotation Symmetry
    setVal('hiper_sym', l_hipermax !== 0 ? r_hipermax / l_hipermax : 0);
    setVal('hipir_sym', l_hipirmax !== 0 ? r_hipirmax / l_hipirmax : 0);

    // Hip Ab/Adduction Symmetry
    setVal('hipab_sym', l_hipabmax !== 0 ? r_hipabmax / l_hipabmax : 0);
    setVal('hipad_sym', l_hipadmax !== 0 ? r_hipadmax / l_hipadmax : 0);

    // Hip Abduction 60 Symmetry
    setVal('hipab60_sym', l_hipab60max !== 0 ? r_hipab60max / l_hipab60max : 0);
    setVal('hipad60_sym', l_hipad60max !== 0 ? r_hipad60max / l_hipad60max : 0);

    // Extension / Plantarflexion Symmetry
    setVal('hipex_sym', l_hipexmax !== 0 ? r_hipexmax / l_hipexmax : 0);
    setVal('plantarf_sym', l_plantarfmax !== 0 ? r_plantarfmax / l_plantarfmax : 0);
}