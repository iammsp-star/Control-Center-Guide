// GAMIFICATION LOGIC (DUOLINGO STYLE)

// State and storage keys
const STORAGE_PREFIX = 'controlCenter_';
const XP_KEY = STORAGE_PREFIX + 'xp';
const STREAK_KEY = STORAGE_PREFIX + 'streak';
const LAST_LOGIN_KEY = STORAGE_PREFIX + 'last_login';
const UNLOCKS_KEY = STORAGE_PREFIX + 'unlocked_modules'; // array of module IDs

// Quiz Data
const quizzes = {
    1: { answer: 'Trigger', xp: 50, nextModule: 2 },
    2: { answer: 'ADS', xp: 100, nextModule: 3 }
    // No quiz for 3, maybe we unlock 4 when 3 is scrolled or pass a quiz. For now, curriculum unlocks resources on scroll.
};

let userState = {
    xp: 0,
    streak: 0,
    unlockedModules: [1] // module 1 is always unlocked
};

function initGamification() {
    loadState();
    checkStreak();
    updateUI();
    applyLocks();
}

function loadState() {
    const savedXp = localStorage.getItem(XP_KEY);
    const savedStreak = localStorage.getItem(STREAK_KEY);
    const savedUnlocks = localStorage.getItem(UNLOCKS_KEY);

    if (savedXp) userState.xp = parseInt(savedXp);
    if (savedStreak) userState.streak = parseInt(savedStreak);
    if (savedUnlocks) userState.unlockedModules = JSON.parse(savedUnlocks);
}

function saveState() {
    localStorage.setItem(XP_KEY, userState.xp);
    localStorage.setItem(STREAK_KEY, userState.streak);
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify(userState.unlockedModules));
}

function checkStreak() {
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);

    if (!lastLogin) {
        // First time
        userState.streak = 1;
        localStorage.setItem(LAST_LOGIN_KEY, today);
    } else if (lastLogin !== today) {
        // Logged in on a different day
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastLogin === yesterday.toDateString()) {
            userState.streak++; // consecutive
        } else {
            userState.streak = 1; // broken streak
        }
        localStorage.setItem(LAST_LOGIN_KEY, today);
    }
    saveState();
}

function updateUI() {
    document.getElementById('xp-counter').textContent = userState.xp;
    document.getElementById('streak-counter').textContent = userState.streak;
}

function applyLocks() {
    const modules = document.querySelectorAll('.module');
    modules.forEach(mod => {
        const modId = parseInt(mod.getAttribute('data-module'));
        if (userState.unlockedModules.includes(modId)) {
            mod.classList.remove('module-locked');
        } else {
            mod.classList.add('module-locked');
        }
    });

    // Special logic for curriculum unlocking resources (no quiz)
    if (userState.unlockedModules.includes(3) && !userState.unlockedModules.includes(4)) {
        // Give them final unlock automatically if they reached 3 for this prototype
        unlockModule(4, false);
    }
}

function checkAnswer(quizId, answer, btnElement) {
    const quizData = quizzes[quizId];
    if (!quizData) return;

    // We get the buttons in this quiz
    const quizBody = document.getElementById(`quiz-${quizId}-body`);
    const buttons = quizBody.querySelectorAll('.quiz-btn');
    const feedbackBox = document.getElementById(`quiz-${quizId}-feedback`);

    // Reset buttons
    buttons.forEach(btn => {
        btn.classList.remove('correct', 'wrong');
        btn.disabled = true; // disable after answer
    });

    if (answer === quizData.answer) {
        // Find clicked button to style it correctly
        if (btnElement) {
            btnElement.classList.add('correct');
        }

        feedbackBox.textContent = `Correct! Awesome job! +${quizData.xp} XP`;
        feedbackBox.className = 'quiz-feedback feedback-success';
        feedbackBox.style.display = 'block';

        // Award XP and Unlock
        if (!userState.unlockedModules.includes(quizData.nextModule)) {
            userState.xp += quizData.xp;
            unlockModule(quizData.nextModule);
            updateUI();
            saveState();
        } else {
            feedbackBox.textContent = `Correct! You already claimed this XP!`;
        }

    } else {
        if (btnElement) {
            btnElement.classList.add('wrong');
        }
        feedbackBox.textContent = `Incorrect. Try re-reading the section!`;
        feedbackBox.className = 'quiz-feedback feedback-error';
        feedbackBox.style.display = 'block';

        // Re-enable to let them try again
        setTimeout(() => {
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('wrong');
            });
            feedbackBox.style.display = 'none';
        }, 3000);
    }
}

function unlockModule(moduleId, scroll = true) {
    if (!userState.unlockedModules.includes(moduleId)) {
        userState.unlockedModules.push(moduleId);
        saveState();

        const targetModule = document.querySelector(`.module[data-module="${moduleId}"]`);
        if (targetModule) {
            targetModule.classList.remove('module-locked');
            targetModule.classList.add('unlocked-anim');

            if (scroll) {
                setTimeout(() => {
                    targetModule.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 1500);
            }
        }

        // cascade unlock for resources mapped to curriculum viewing
        applyLocks();
    }
}


// DOM CONTENT LOADED
document.addEventListener('DOMContentLoaded', () => {

    // Init Gamification
    initGamification();

    // Interactive Map - Genre Tabs Logic
    const tabs = document.querySelectorAll('.genre-tab');
    const contents = document.querySelectorAll('.layout-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            contents.forEach(content => {
                content.classList.remove('active');
            });

            const targetId = `layout-${tab.dataset.genre}`;
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Smooth Scrolling for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });
});

// GAMEPAD API LOGIC & CYBER-TECH VISUALIZER
let animationFrameId = null;

function initGamepadVisualizer() {
    window.addEventListener('gamepadconnected', (e) => {
        console.log('Gamepad connected:', e.gamepad.id);
        const statusText = document.getElementById('gamepad-status');
        if (statusText) {
            statusText.textContent = 'LIVE SYNC';
            statusText.classList.replace('offline', 'online');
        }
        const awaiting = document.querySelector('.awaiting-text');
        if (awaiting) awaiting.style.display = 'none';
        const connectedViz = document.getElementById('connected-viz');
        if (connectedViz) connectedViz.style.display = 'flex';
        const coachPanel = document.getElementById('coach-panel');
        if (coachPanel) coachPanel.style.display = 'block';
        
        pollGamepad();
    });

    window.addEventListener('gamepaddisconnected', (e) => {
        console.log('Gamepad disconnected:', e.gamepad.id);
        const statusText = document.getElementById('gamepad-status');
        if (statusText) {
            statusText.textContent = 'OFFLINE';
            statusText.classList.replace('online', 'offline');
        }
        const awaiting = document.querySelector('.awaiting-text');
        if (awaiting) awaiting.style.display = 'block';
        const connectedViz = document.getElementById('connected-viz');
        if (connectedViz) connectedViz.style.display = 'none';
        const coachPanel = document.getElementById('coach-panel');
        if (coachPanel) coachPanel.style.display = 'none';
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    });
}

function pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    const activeGamepad = Array.from(gamepads).find(gp => gp !== null);
    
    if (activeGamepad) {
        // Update Action Button (Cross/A = index 0)
        const btnCross = document.getElementById('btn-cross');
        if (btnCross) {
            if (activeGamepad.buttons[0] && activeGamepad.buttons[0].pressed) {
                btnCross.classList.add('active');
            } else {
                btnCross.classList.remove('active');
            }
        }
        
        // Update Trigger (R2/RT = index 7)
        const r2Value = activeGamepad.buttons[7] ? activeGamepad.buttons[7].value : 0;
        const triggerFill = document.getElementById('trigger-fill-r2');
        const triggerText = document.getElementById('trigger-text-r2');
        if (triggerFill) triggerFill.style.height = `${r2Value * 100}%`;
        if (triggerText) triggerText.textContent = `${Math.round(r2Value * 100)}%`;
        
        // Coach Logic Example
        const coachMsg = document.getElementById('coach-message');
        if (coachMsg) {
            if (r2Value > 0.1 && r2Value < 1.0) {
                coachMsg.textContent = "Coach: Smooth actuation detected. Keep your pulls deliberate.";
            } else if (r2Value === 1.0) {
                coachMsg.textContent = "Coach: Max actuation reached (100%). Good for fast scoping.";
            } else if (activeGamepad.buttons[0] && activeGamepad.buttons[0].pressed) {
                coachMsg.textContent = "Coach: Jump/Action recorded. Great timing!";
            } else {
                coachMsg.textContent = "Coach: Awaiting input...";
            }
        }
    }
    
    animationFrameId = requestAnimationFrame(pollGamepad);
}

document.addEventListener('DOMContentLoaded', () => {
    initGamepadVisualizer();
});
