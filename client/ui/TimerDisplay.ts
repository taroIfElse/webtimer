// Copyright (C) 2025 Gijs van Tulder
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import textFit from "textfit";
import { QR } from "qr-svg";

import { formatTime } from "../lib/format.js";
import {
    TimerEvent,
    TimerEventType,
    TimerController,
} from "../lib/TimerController.js";
import { Router } from "./Router.js";

export class TimerDisplay {
    element: HTMLDivElement;

    private controller: TimerController;
    private router: Router;
    private timeDisplay: TimeDisplay;
    private connecting: HTMLDivElement;
    private statusBar: HTMLDivElement;
    private qrContainer: HTMLDivElement;
    private entryInput: HTMLInputElement;
    private running = false;
    private editing = false;
    private entryDigits = "";

    constructor(controller: TimerController, router: Router) {
        this.controller = controller;
        this.router = router;
        this.build();
        controller.addListener((event: TimerEvent) => {
            this.handleTimerEvent(event);
        });
    }

    activate(): void {
        this.renderQR();
    }

    build(): void {
        const div = document.createElement("div");
        div.className = "timer-display";
        this.element = div;

        const card = document.createElement("div");
        card.className = "card";
        div.appendChild(card);

        // countdown showing remaining time
        this.timeDisplay = new TimeDisplay();
        card.appendChild(this.timeDisplay.element);

        // Invisible input layered over the clock so mobile taps focus it
        // directly (keeps the soft keyboard open). Digits render on .time.
        const entryInput = document.createElement("input");
        entryInput.className = "time-entry-input";
        entryInput.type = "text";
        entryInput.inputMode = "numeric";
        entryInput.autocomplete = "off";
        entryInput.autocapitalize = "off";
        entryInput.spellcheck = false;
        entryInput.setAttribute("aria-label", "Type timer digits");
        card.appendChild(entryInput);
        this.entryInput = entryInput;

        entryInput.addEventListener("focus", () => {
            if (this.running) {
                entryInput.blur();
                return;
            }
            this.editing = true;
            this.entryDigits = "";
            entryInput.value = "";
            this.element.classList.add("editing-time");
        });

        entryInput.addEventListener("keydown", (evt) => {
            this.handleEntryKeyDown(evt);
        });

        entryInput.addEventListener("blur", () => {
            this.endEditing();
        });

        document.addEventListener("keydown", (evt) => {
            this.handleGlobalKeyDown(evt);
        });

        // connecting...
        const connecting = document.createElement("div");
        connecting.innerHTML = "Connecting...";
        connecting.className = "connecting";
        div.appendChild(connecting);
        this.connecting = connecting;

        // qr link
        const qr = document.createElement("div");
        qr.className = "qr";
        this.qrContainer = qr;
        div.appendChild(qr);
        qr.addEventListener("click", (evt) => {
            qr.classList.remove("visible");
            evt.stopPropagation();
            evt.preventDefault();
            return false;
        });

        // menu
        const menu = document.createElement("div");
        menu.className = "menu";
        div.appendChild(menu);

        menu.addEventListener("click", (evt) => {
            evt.stopPropagation();
        });

        // menu buttons
        const menuLeft = document.createElement("div");
        menuLeft.className = "left";
        menu.appendChild(menuLeft);

        const statusBar = document.createElement("div");
        statusBar.className = "status";
        statusBar.innerHTML = "";
        menu.appendChild(statusBar);
        this.statusBar = statusBar;

        const menuRight = document.createElement("div");
        menuRight.className = "right";
        menu.appendChild(menuRight);

        // show exit
        const exit = document.createElement("button");
        exit.className = "exit-timer";
        exit.appendChild(
            (
                document.getElementById(
                    "template-icon-exit",
                ) as HTMLTemplateElement
            ).content.cloneNode(true),
        );
        menuLeft.appendChild(exit);
        exit.addEventListener("click", (evt) => {
            this.router.navigateToSplash();
            evt.stopPropagation();
        });

        // show qr code
        const qrShow = document.createElement("button");
        qrShow.className = "qr-show";
        qrShow.appendChild(
            (
                document.getElementById(
                    "template-icon-qr",
                ) as HTMLTemplateElement
            ).content.cloneNode(true),
        );
        menuRight.appendChild(qrShow);
        qrShow.addEventListener("click", (evt) => {
            qr.classList.toggle("visible");
            evt.stopPropagation();
            evt.preventDefault();
            return false;
        });

        // show full screen (handler wired from main.ts)
        const fullScreen = document.createElement("button");
        fullScreen.className = "show-fullscreen";
        fullScreen.type = "button";
        fullScreen.appendChild(
            (
                document.getElementById(
                    "template-icon-expand",
                ) as HTMLTemplateElement
            ).content.cloneNode(true),
        );
        menuRight.appendChild(fullScreen);
        fullScreen.addEventListener("click", (evt) => {
            qr.classList.remove("visible");
            evt.stopPropagation();
        });
    }

    renderQR(): void {
        const div = this.qrContainer;
        div.innerHTML = QR(window.location.href, "M");
        const qrp = document.createElement("p");
        qrp.textContent = window.location.href
            .replace(/^https:\/\/(?=[a-z])/, "")
            .replace(/\/$/, "");
        div.appendChild(qrp);
        const qrClose = document.createElement("button");
        qrClose.appendChild(
            (
                document.getElementById(
                    "template-icon-x-mark",
                ) as HTMLTemplateElement
            ).content.cloneNode(true),
        );
        div.append(qrClose);
    }

    showTime(seconds: number): void {
        this.timeDisplay.showTime(seconds);
    }

    beginEditing(): void {
        if (this.running || !document.body.classList.contains("show-timer")) {
            return;
        }
        this.entryInput.focus({ preventScroll: true });
    }

    endEditing(): void {
        if (!this.editing) {
            return;
        }
        this.editing = false;
        this.element.classList.remove("editing-time");
    }

    private handleGlobalKeyDown(evt: KeyboardEvent): void {
        if (this.running || !document.body.classList.contains("show-timer")) {
            return;
        }
        if (this.isTypingElsewhere(evt.target)) {
            return;
        }
        if (this.editing && document.activeElement === this.entryInput) {
            return;
        }

        if (/^[0-9]$/.test(evt.key) || evt.key === "Backspace") {
            evt.preventDefault();
            this.beginEditing();
            this.applyEntryKey(evt.key);
        }
    }

    private handleEntryKeyDown(evt: KeyboardEvent): void {
        if (evt.key === "Enter" || evt.key === "Escape") {
            evt.preventDefault();
            this.entryInput.blur();
            return;
        }

        if (/^[0-9]$/.test(evt.key) || evt.key === "Backspace") {
            evt.preventDefault();
            this.applyEntryKey(evt.key);
            return;
        }

        // Block other characters from landing in the hidden input.
        if (evt.key.length === 1) {
            evt.preventDefault();
        }
    }

    private applyEntryKey(key: string): void {
        if (key === "Backspace") {
            this.entryDigits = this.entryDigits.slice(0, -1);
        } else if (/^[0-9]$/.test(key)) {
            if (this.entryDigits.length >= 6) {
                return;
            }
            this.entryDigits += key;
        } else {
            return;
        }

        const seconds = digitsToSeconds(this.entryDigits);
        this.showTime(seconds);
        this.controller.setRemainingSeconds(seconds);
    }

    private isTypingElsewhere(target: EventTarget): boolean {
        if (!(target instanceof HTMLElement)) {
            return false;
        }
        const tag = target.tagName;
        return (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            target.isContentEditable
        );
    }

    handleTimerEvent(event: TimerEvent): void {
        if (event.type == TimerEventType.UpdateRemainingSeconds) {
            this.running = !!(event.active && event.running);

            if (this.running && this.editing) {
                this.entryInput.blur();
            }

            if (!this.editing) {
                this.showTime(event.active ? event.remainingSeconds : 0);
            }

            this.element.classList.toggle("black", event.black);
            this.element.classList.toggle("countdown", event.countdown);
            this.element.classList.toggle(
                "running",
                event.active && event.running,
            );
            this.element.classList.toggle(
                "timeout",
                event.active &&
                    event.countdown &&
                    event.remainingSeconds !== null &&
                    event.remainingSeconds <= 0,
            );
            this.element.classList.toggle(
                "warning",
                event.active &&
                    event.countdown &&
                    event.remainingSeconds !== null &&
                    event.remainingSeconds <= 60 &&
                    event.remainingSeconds > 0,
            );

            if (event.clients == 2) {
                this.statusBar.innerHTML = "+1 connected";
            } else if (event.clients > 2) {
                this.statusBar.innerHTML = `+${event.clients - 1} connected`;
            } else {
                this.statusBar.innerHTML = "";
            }

            this.connecting.classList.remove("disconnected");
        } else if (event.type == TimerEventType.Connecting) {
            this.connecting.classList.add("disconnected");
        }
    }
}

/**
 * Interprets typed digits as a shifting HHMMSS value.
 * e.g. "1" → 0:01, "15" → 0:15, "1500" → 15:00
 */
export function digitsToSeconds(digits: string): number {
    if (!digits) {
        return 0;
    }
    const padded = digits.padStart(6, "0").slice(-6);
    const hours = parseInt(padded.slice(0, 2), 10);
    const minutes = parseInt(padded.slice(2, 4), 10);
    const seconds = parseInt(padded.slice(4, 6), 10);
    return hours * 3600 + minutes * 60 + seconds;
}

class TimeDisplay {
    element: HTMLDivElement;

    private currentText: string;

    constructor() {
        this.build();

        window.addEventListener("resize", () => {
            this.updateTextFit();
        });
        new ResizeObserver(() => {
            this.updateTextFit();
        }).observe(this.element);
    }

    build(): void {
        const div = document.createElement("div");
        div.className = "time";
        this.element = div;
    }

    showTime(seconds: number): void {
        const newString = seconds === null ? "" : formatTime(seconds);
        if (newString != this.currentText) {
            this.element.innerHTML = this.currentText = newString;
            this.updateTextFit();
        }
    }

    updateTextFit(): void {
        try {
            textFit(this.element, {
                alignVert: true,
                alignHoriz: true,
                detectMultiLine: false,
                maxFontSize: 10000,
            });
        } catch {
            // ignore
        }
    }
}
