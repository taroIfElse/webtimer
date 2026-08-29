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

import {
    TimerController,
    TimerEvent,
    TimerEventType,
} from "../lib/TimerController.js";

export class ControlsDisplay {
    element: HTMLDivElement;

    private controller: TimerController;

    private btnStart: Button;
    private btnPause: Button;
    private btnReset: Button;
    private btnBlack: Button;

    constructor(controller: TimerController) {
        this.controller = controller;
        this.build();
        controller.addListener((event: TimerEvent) => {
            this.handleTimerEvent(event);
        });
    }

    build(): void {
        const div = document.createElement("div");
        div.className = "controls-display";
        this.element = div;

        const main = document.createElement("div");
        main.className = "controls main";
        div.appendChild(main);

        const addButton = (
            tgt: HTMLElement,
            name: string,
            text: string,
            icon: string,
            fn: ButtonHandler,
        ): Button => {
            const btn = new Button(name, text, icon, fn);
            tgt.appendChild(btn.element);
            return btn;
        };

        this.btnReset = addButton(
            main,
            "reset",
            "Reset",
            "template-icon-reset",
            () => {
                this.controller.resetTimer();
            },
        );

        this.btnPause = addButton(
            main,
            "pause",
            "Pause",
            "template-icon-pause",
            () => {
                this.controller.pauseTimer();
            },
        );
        this.btnPause.disable();

        this.btnStart = addButton(
            main,
            "start",
            "Start",
            "template-icon-start",
            () => {
                this.controller.startTimer();
            },
        );

        this.btnBlack = addButton(
            main,
            "black",
            "Black",
            "template-icon-black",
            () => {
                this.controller.toggleBlack();
            },
        );
    }

    handleTimerEvent(event: TimerEvent): void {
        if (event.type == TimerEventType.UpdateRemainingSeconds) {
            this.btnStart.toggleEnabled(!event.running);
            this.btnPause.toggleEnabled(event.running);
            this.btnBlack.toggleOnOff(event.black);
        }
    }
}

type ButtonHandler = (target: Button) => void;

class Button {
    element: HTMLButtonElement;
    handler: ButtonHandler;

    constructor(
        name: string,
        text: string,
        icon?: string,
        handler?: ButtonHandler,
    ) {
        this.build(name, text, icon);
        this.handler = handler;
    }

    build(name: string, text: string, icon: string): void {
        const button = document.createElement("button");
        button.className = `button-${name}`;
        if (!icon) {
            button.innerHTML = text;
        } else {
            button.title = text;
            button.appendChild(
                (
                    document.getElementById(icon) as HTMLTemplateElement
                ).content.cloneNode(true),
            );
            button.classList.add("icon");
        }
        button.addEventListener("click", () => {
            if (this.handler) {
                this.handler(this);
            }
        });
        this.element = button;
    }

    toggleEnabled(enabled: boolean): void {
        this.element.classList.toggle("disabled", !enabled);
    }

    enable(): void {
        this.element.classList.remove("disabled");
    }

    disable(): void {
        this.element.classList.add("disabled");
    }

    toggleOnOff(on: boolean): void {
        this.element.classList.toggle("on", on);
    }

    on(): void {
        this.element.classList.add("on");
    }

    off(): void {
        this.element.classList.remove("on");
    }
}
