class PomodoroTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 1;
        this.maxSessions = 4;
        this.isWorkSession = true;
        this.timeLeft = 25 * 60; // 25 minutes in seconds
        this.totalTime = 25 * 60;
        this.completedSessions = 0;
        this.totalFocusTime = 0;
        this.timer = null;

        this.initializeElements();
        this.loadSettings();
        this.loadStats();
        this.bindEvents();
        this.updateDisplay();
        this.requestNotificationPermission();
    }

    initializeElements() {
        this.timeDisplay = document.getElementById('time-display');
        this.sessionTypeHeader = document.getElementById('session-type-header');
        this.sessionCountHeader = document.getElementById('session-count-header');
        this.progressCircle = document.getElementById('progress-circle');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.skipBtn = document.getElementById('skip-btn');
        this.workDuration = document.getElementById('work-duration');
        this.shortBreak = document.getElementById('short-break');
        this.longBreak = document.getElementById('long-break');
        this.autoStart = document.getElementById('auto-start');
        this.completedSessionsEl = document.getElementById('completed-sessions');
        this.totalTimeEl = document.getElementById('total-time');
        this.streakCountEl = document.getElementById('streak-count');
        this.productivityScoreEl = document.getElementById('productivity-score');
        this.container = document.querySelector('.container');
        this.settingsToggle = document.getElementById('settings-toggle');
        this.settingsPanel = document.getElementById('settings-panel');
        this.closeSettings = document.getElementById('close-settings');
        this.dots = document.querySelectorAll('.dot');
        this.quickSettingBtns = document.querySelectorAll('.quick-setting-btn');
        this.sessionBars = document.querySelectorAll('.session-bar');
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('pomodoroSettings')) || {};
        this.workDuration.value = settings.workDuration || 25;
        this.shortBreak.value = settings.shortBreak || 5;
        this.longBreak.value = settings.longBreak || 15;
        this.autoStart.checked = settings.autoStart || false;
    }

    saveSettings() {
        const settings = {
            workDuration: parseInt(this.workDuration.value),
            shortBreak: parseInt(this.shortBreak.value),
            longBreak: parseInt(this.longBreak.value),
            autoStart: this.autoStart.checked
        };
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    }

    loadStats() {
        const today = new Date().toDateString();
        const stats = JSON.parse(localStorage.getItem('pomodoroStats')) || {};
        
        if (stats.date !== today) {
            stats.completedSessions = 0;
            stats.totalFocusTime = 0;
            stats.date = today;
        }

        this.completedSessions = stats.completedSessions || 0;
        this.totalFocusTime = stats.totalFocusTime || 0;
        this.updateStats();
    }

    saveStats() {
        const stats = {
            date: new Date().toDateString(),
            completedSessions: this.completedSessions,
            totalFocusTime: this.totalFocusTime
        };
        localStorage.setItem('pomodoroStats', JSON.stringify(stats));
    }

    updateStats() {
        this.completedSessionsEl.textContent = this.completedSessions;
        this.totalTimeEl.textContent = Math.floor(this.totalFocusTime / 60);
        
        // Update streak (simple implementation - days with at least 1 session)
        const streak = this.completedSessions > 0 ? 1 : 0;
        this.streakCountEl.textContent = streak;
        
        // Update productivity score (percentage of target sessions completed)
        const targetSessions = 8; // 8 sessions per day target
        const productivity = Math.min(100, Math.round((this.completedSessions / targetSessions) * 100));
        this.productivityScoreEl.textContent = `${productivity}%`;
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.skipBtn.addEventListener('click', () => this.skip());

        // Settings panel events
        this.settingsToggle.addEventListener('click', () => this.openSettings());
        this.closeSettings.addEventListener('click', () => this.closeSettingsPanel());

        // Settings change events
        [this.workDuration, this.shortBreak, this.longBreak, this.autoStart].forEach(input => {
            input.addEventListener('change', () => {
                this.saveSettings();
                if (!this.isRunning) {
                    this.reset();
                }
            });
        });

        // Quick settings buttons
        this.quickSettingBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.isRunning) {
                    const duration = parseInt(btn.dataset.duration);
                    this.workDuration.value = duration;
                    this.saveSettings();
                    this.reset();
                    this.updateQuickSettings();
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isRunning && !this.isPaused) {
                    this.pause();
                } else {
                    this.start();
                }
            } else if (e.code === 'KeyR') {
                this.reset();
            } else if (e.code === 'KeyS') {
                this.skip();
            } else if (e.code === 'Escape') {
                this.closeSettingsPanel();
            }
        });

        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                this.showNotification('Pomodoro Timer', 'Timer is running in background');
            }
        });

        // Close settings when clicking outside
        this.settingsPanel.addEventListener('click', (e) => {
            if (e.target === this.settingsPanel) {
                this.closeSettingsPanel();
            }
        });
    }

    start() {
        if (this.isPaused) {
            this.isPaused = false;
        } else if (!this.isRunning) {
            this.isRunning = true;
        }

        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;

        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();

            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);

        this.playSound('start');
    }

    pause() {
        this.isPaused = true;
        clearInterval(this.timer);
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.playSound('pause');
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.timer);
        
        this.currentSession = 1;
        this.isWorkSession = true;
        this.setSessionTime();
        this.updateDisplay();
        
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
    }

    skip() {
        if (this.isRunning) {
            this.completeSession();
        } else {
            this.nextSession();
        }
    }

    completeSession() {
        clearInterval(this.timer);
        this.isRunning = false;
        this.isPaused = false;

        if (this.isWorkSession) {
            this.completedSessions++;
            this.totalFocusTime += parseInt(this.workDuration.value) * 60;
            this.updateStats();
            this.saveStats();
        }

        this.playSound('complete');
        this.showNotification(
            this.isWorkSession ? 'Work Session Complete!' : 'Break Complete!',
            this.isWorkSession ? 'Time for a break!' : 'Ready for work?'
        );

        this.nextSession();

        if (this.autoStart.checked) {
            setTimeout(() => this.start(), 3000);
        } else {
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
        }
    }

    nextSession() {
        if (this.isWorkSession) {
            // Switch to break
            this.isWorkSession = false;
            if (this.currentSession >= this.maxSessions) {
                // Long break after 4 sessions
                this.currentSession = 1;
            }
        } else {
            // Switch to work
            this.isWorkSession = true;
            if (this.currentSession < this.maxSessions) {
                this.currentSession++;
            }
        }

        this.setSessionTime();
        this.updateDisplay();
    }

    setSessionTime() {
        if (this.isWorkSession) {
            this.timeLeft = parseInt(this.workDuration.value) * 60;
        } else {
            const isLongBreak = this.currentSession === 1 && !this.isWorkSession;
            this.timeLeft = parseInt(isLongBreak ? this.longBreak.value : this.shortBreak.value) * 60;
        }
        this.totalTime = this.timeLeft;
    }

    updateDisplay() {
        // Update time display
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Update session info
        if (this.isWorkSession) {
            this.sessionTypeHeader.textContent = 'Focus Time';
            this.sessionCountHeader.textContent = `Session ${this.currentSession} of 4`;
            this.container.className = 'container work-session';
        } else {
            const isLongBreak = this.currentSession === 1;
            this.sessionTypeHeader.textContent = isLongBreak ? 'Long Break' : 'Break Time';
            this.sessionCountHeader.textContent = isLongBreak ? 'Long Break' : 'Short Break';
            this.container.className = 'container break-session';
        }

        // Update circular progress
        const progressPercent = ((this.totalTime - this.timeLeft) / this.totalTime);
        const circumference = 2 * Math.PI * 140; // radius = 140 for larger circle
        const strokeDashoffset = circumference - (progressPercent * circumference);
        this.progressCircle.style.strokeDashoffset = strokeDashoffset;

        // Update session dots
        this.updateSessionDots();

        // Update session bars
        this.updateSessionBars();

        // Update quick settings
        this.updateQuickSettings();

        // Update page title
        document.title = `${this.timeDisplay.textContent} - ${this.sessionTypeHeader.textContent}`;
    }

    updateSessionDots() {
        this.dots.forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            if (index + 1 < this.currentSession) {
                dot.classList.add('completed');
            } else if (index + 1 === this.currentSession && this.isWorkSession) {
                dot.classList.add('active');
            }
        });
    }

    updateSessionBars() {
        this.sessionBars.forEach((bar, index) => {
            bar.classList.remove('active', 'completed');
            if (index + 1 < this.currentSession) {
                bar.classList.add('completed');
            } else if (index + 1 === this.currentSession && this.isWorkSession) {
                bar.classList.add('active');
            }
        });
    }

    updateQuickSettings() {
        const currentDuration = parseInt(this.workDuration.value);
        this.quickSettingBtns.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.duration) === currentDuration) {
                btn.classList.add('active');
            }
        });
    }

    openSettings() {
        this.settingsPanel.classList.add('open');
    }

    closeSettingsPanel() {
        this.settingsPanel.classList.remove('open');
    }

    playSound(type) {
        // Create audio context for sound effects
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioCtx = AudioContext || webkitAudioContext;
            const audioCtx = new AudioCtx();
            
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            switch (type) {
                case 'start':
                    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
                    break;
                case 'pause':
                    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
                    break;
                case 'complete':
                    oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
                    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
                    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.2);
                    break;
            }
            
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
        }
    }

    showNotification(title, body) {
        // Browser notification
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>'
            });
        }

        // In-page notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `<strong>${title}</strong><br>${body}`;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});

// Service Worker registration for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(registrationError => console.log('SW registration failed'));
    });
}