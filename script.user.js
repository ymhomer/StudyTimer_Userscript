// ==UserScript==
// @name         Study Timer
// @namespace    YMHOMER
// @version      1.1
// @description  Records webpage study time and displays a floating timer window in the upper right corner, with exportable study logs
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @license MIT
// ==/UserScript==
 
(function() {
    'use strict';
 
    let timerDisplayed = GM_getValue(location.href + "_timerDisplayed", false);
    let timerActive = GM_getValue(location.href + "_timerActive", false);
    let startTime = Date.now();
    let elapsed = 0;
    let pauseCount = 0;
    let totalPauseTime = 0;
    let interval;
    let focus = document.hasFocus();
    let pauseStartTime = null;
 
    // Reset on load to avoid interference from previous records
    GM_setValue(location.href + "_startTime", startTime);
    GM_setValue(location.href + "_elapsed", elapsed);
    GM_setValue(location.href + "_pauseCount", pauseCount);
    GM_setValue(location.href + "_totalPauseTime", totalPauseTime);
 
    // Initialize the timer window
    const timerWindow = document.createElement('div');
timerWindow.style.position = 'fixed';
timerWindow.style.top = '10px';
timerWindow.style.right = '10px';
timerWindow.style.padding = '10px';
timerWindow.style.zIndex = '9999';
timerWindow.style.background = 'rgba(0, 0, 0, 0.7)';
timerWindow.style.color = '#fff';
timerWindow.style.borderRadius = '5px';
timerWindow.style.cursor = 'move';
timerWindow.style.display = timerDisplayed ? 'block' : 'none';
    timerWindow.innerHTML = `<span id="timeDisplay">00:00:00</span>
                             <button id="toggleTimer" style="margin-left: 5px;">${timerActive ? 'Pause' : 'Start'}</button>
                             <button id="stopTimer" style="margin-left: 5px;">End</button>`;
    document.body.appendChild(timerWindow);
 
    // Enable dragging of the timer window
    timerWindow.onmousedown = function(e) {
        let shiftX = e.clientX - timerWindow.getBoundingClientRect().left;
        let shiftY = e.clientY - timerWindow.getBoundingClientRect().top;
        document.onmousemove = function(e) {
timerWindow.style.left = e.pageX - shiftX + 'px';
timerWindow.style.top = e.pageY - shiftY + 'px';
        };
        document.onmouseup = function() {
            document.onmousemove = null;
            timerWindow.onmouseup = null;
        };
    };
 
    timerWindow.ondragstart = () => false;
 
    // Toggle timer state (start/pause)
    function toggleTimer() {
        if (timerActive) {
            // Pause the timer
            clearInterval(interval);
            pauseCount++;
            pauseStartTime = Date.now();
            elapsed += Date.now() - startTime;
            GM_setValue(location.href + "_elapsed", elapsed);
timerWindow.style.background = 'red';
            document.getElementById('toggleTimer').innerText = 'Resume';
        } else {
            // Resume the timer
            if (pauseStartTime) {
                totalPauseTime += Date.now() - pauseStartTime;
                pauseStartTime = null;
            }
            startTime = Date.now();
timerWindow.style.background = 'rgba(0, 0, 0, 0.7)';
            interval = setInterval(updateTime, 1000);
            document.getElementById('toggleTimer').innerText = 'Pause';
        }
        timerActive = !timerActive;
        GM_setValue(location.href + "_timerActive", timerActive);
        GM_setValue(location.href + "_pauseCount", pauseCount);
        GM_setValue(location.href + "_totalPauseTime", totalPauseTime);
    }
 
    // Update timer display
    function updateTime() {
        let totalTime = elapsed + (Date.now() - startTime);
        document.getElementById('timeDisplay').innerText = new Date(totalTime).toISOString().substr(11, 8);
    }
 
    // Stop timer and export data
    function stopTimer() {
        clearInterval(interval);
        let currentSessionTime = Date.now() - startTime;
        if (timerActive) elapsed += currentSessionTime;
 
        // If paused, add the final pause duration
        if (pauseStartTime) {
            totalPauseTime += Date.now() - pauseStartTime;
            pauseStartTime = null;
        }
 
        let endTime = Date.now();
        let totalElapsed = GM_getValue("total_elapsed", 0) + elapsed;
        GM_setValue("total_elapsed", totalElapsed);
 
        // Prepare the report with additional details
        let report = `URL: ${location.href}\n` +
                     `Start Time: ${new Date(startTime).toLocaleString()}\n` +
                     `End Time: ${new Date(endTime).toLocaleString()}\n` +
                     `Session Study Time: ${new Date(currentSessionTime).toISOString().substr(11, 8)}\n` +
                     `Total Study Time: ${new Date(totalElapsed).toISOString().substr(11, 8)}\n` +
                     `Total Pause Time: ${new Date(totalPauseTime).toISOString().substr(11, 8)}\n` +
                     `Pause Count: ${pauseCount}`;
        alert(report);
 
        // Save and export log
        saveRecord(report);
 
        // Reset timer
        timerActive = false;
        GM_setValue(location.href + "_timerActive", timerActive);
        elapsed = 0; // Reset elapsed time for this session
        pauseCount = 0; // Reset pause count
        totalPauseTime = 0; // Reset total pause time
        document.getElementById('toggleTimer').innerText = 'Start';
timerWindow.style.background = 'rgba(0, 0, 0, 0.7)';
    }
 
    // Save and export the study record
    function saveRecord(data) {
        const blob = new Blob([data], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
link.download = `study_record_${new Date().toISOString().slice(0, 10)}.txt`;
link.click();
    }
 
    // Check if window is in focus
    function focusCheck() {
        focus = document.hasFocus();
        if (focus && timerActive) {
            startTime = Date.now();
            interval = setInterval(updateTime, 1000);
        } else if (!focus && timerActive) {
            clearInterval(interval);
            pauseCount++;
            pauseStartTime = Date.now();
            elapsed += Date.now() - startTime;
        }
    }
 
    // Bind events
    document.getElementById('toggleTimer').addEventListener('click', toggleTimer);
    document.getElementById('stopTimer').addEventListener('click', stopTimer);
    window.addEventListener('focus', focusCheck);
    window.addEventListener('blur', focusCheck);
 
    // Add Tampermonkey menu option to toggle the timer display
    GM_registerMenuCommand("Toggle Study Timer Display", function() {
        timerDisplayed = !timerDisplayed;
        GM_setValue(location.href + "_timerDisplayed", timerDisplayed);
timerWindow.style.display = timerDisplayed ? 'block' : 'none';
    });
 
    // Initialize
    if (timerActive) {
        interval = setInterval(updateTime, 1000);
    }
})();
