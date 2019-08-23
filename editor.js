class LoadAwaiter {
    constructor(target, tag, OnLoad) {
        this.target = target;
        this.tag = tag;
        this.OnLoad = OnLoad;
        this._totalObjects = 0;
        this._loadedObjects = 0;
        this._observerConfig = {
            characterData: true,
            attributes: false,
            childList: true,
            subtree: true,
        };
        // this._togglePrLoader =
        // this._toggleDisplay.bind(null, this.target, this.loader);
        this._loadHandler = (elem) => {
            this._totalObjects++;
            if (this._totalObjects === 1) {
                // this._togglePrLoader(true);
            }
            self = this;
            elem.addEventListener("load", function (event) {
                self._loadedObjects++;
                if (self._loadedObjects >= self._totalObjects) {
                    self.OnLoad(target);
                    // self._togglePrLoader(false);
                }
            });
        }
        this._observer = new MutationObserver(mutations => {
            for (let mutation of mutations) {
                this._totalObjects = 0;
                this._loadedObjects = 0;
                for (let node of mutation.addedNodes) {
                    this.tagSearcher(node, "IMG", this._loadHandler);
                }
            }
        });
        this._observer.observe(this.target, this._observerConfig);
    }
    tagSearcher(node, tag, handler) {
        for (let child of node.childNodes) {
            if (child.tagName === tag) {
                handler(child);
            }

            this.tagSearcher(child, tag, handler);
        }
    }
    _toggleDisplay(el1, el2, open) {
        if (open === false) {
            el1.style.display = "";
            el2.style.display = "none";
        } else {
            el2.style.display = "";
            el1.style.display = "none";
        }
    }
}

function throttle(func, ms) {

    let isThrottled = false,
        savedArgs,
        savedThis;

    function wrapper() {

        if (isThrottled) { // (2)
            savedArgs = arguments;
            savedThis = this;
            return;
        }

        func.apply(this, arguments); // (1)

        isThrottled = true;

        setTimeout(function () {
            isThrottled = false; // (3)
            if (savedArgs) {
                wrapper.apply(savedThis, savedArgs);
                savedArgs = savedThis = null;
            }
        }, ms);
    }

    return wrapper;
}

class ControlElement {
    constructor(controlFunction, handler = null, specSymLength = 0) {
        this._controlFunction = controlFunction;
        this.handler = handler;
        this.specSymLength = specSymLength;
    }

    control() {
        return this._controlFunction(this, arguments);
    }
}

class ControlPanel {
    constructor(controlPanelSelector, mdEditor) {
        this.panel = document.querySelector(controlPanelSelector);
        this.converter = mdEditor.converter;
        this.textarea = mdEditor.textarea;
        this.hisController = mdEditor.hisController;
        this.controlElements = {
            bold: new ControlElement(
                this._ctrTextStyle.bind(this),
                this.converter.Handler.TextStyle,
                2
            ),
            italic: new ControlElement(
                this._ctrTextStyle.bind(this),
                this.converter.Handler.TextStyle,
                1
            ),
            underline: new ControlElement(
                this._ctrTextStyle.bind(this),
                this.converter.Handler.TextDecoration,
                1
            ),
            strikethrough: new ControlElement(
                this._ctrTextStyle.bind(this),
                this.converter.Handler.TextDecoration,
                2
            ),
            undo: new ControlElement(
                this._ctrlUndo.bind(this)
            ),
            redo: new ControlElement(
                this._ctrlRedo.bind(this)
            ),
            clear: new ControlElement(
                this._ctrlClear.bind(this)
            ),
            mark: new ControlElement(
                this._ctrlMarkCode.bind(this),
                this.converter.Handler.MarkCode,
                1
            ),
            code: new ControlElement(
                this._ctrlMarkCode.bind(this),
                this.converter.Handler.MarkCode,
                3,

            ),
            header: new ControlElement(
                this._ctrlHeaderQuote.bind(this),
                this.converter.Handler.Header
            ),
            quote: new ControlElement(
                this._ctrlHeaderQuote.bind(this),
                this.converter.Handler.Blockquote
            )
        }
        this.panel.addEventListener("click", this.onClick.bind(this));
    }

    onClick(event) {
        const type = event.target.classList[0];
        const controlEl = this.getControlElement(type);
        if (controlEl)
            controlEl.control();
    }

    getSelectionOptions(startText, endText, handler) {
        let leftSymsLength = 0;
        let rightSymsLength = 0;
        let minSymsLength;
        const restr = "(?:" + handler.settings.specSyms.join("|").replace(/\*/, "\\$&") + ")*";
        const reStart = new RegExp(restr + "$");
        const reEnd = new RegExp("^" + restr);

        leftSymsLength = startText.match(reStart)[0].length;
        rightSymsLength = endText.match(reEnd)[0].length;
        minSymsLength = Math.min(leftSymsLength, rightSymsLength);
        return {
            minSymsLength
        }
    }

    getControlElement(type) {
        return this.controlElements[type];
    }

    _ctrlClear(controlEl) {
        this.textarea.value = "";
        this.textarea.textContent = "";
        this.textarea.dispatchEvent(new Event("input"));
    }

    _ctrlUndo(controlEl) {
        this.hisController._undo();
    }

    _ctrlRedo(controlEl) {
        this.hisController._redo();
    }

    _ctrTextStyle(controlEl) {
        const selectionStart = this.textarea.selectionStart;
        const selectionEnd = this.textarea.selectionEnd;
        const selectedText = this.textarea.value.substring(selectionStart, selectionEnd);

        if (selectedText.length) {
            let startText = this.textarea.value.substring(0, selectionStart);
            let endText = this.textarea.value.substring(selectionEnd);
            let add = false;
            const selectionOptions = this.getSelectionOptions(startText, endText, controlEl.handler);

            switch (selectionOptions.minSymsLength) {
                case 0:
                    add = true;
                    break;
                case 1:
                case 2:
                    if (controlEl.specSymLength === selectionOptions.minSymsLength)
                        add = false;
                    else
                        add = true;
                    break;
                case 3:
                    add = false;
                    break;
                default:
                    add = false;
                    break;
            }
            let sym = controlEl.handler.settings.specSyms[0];
            if (add) {
                this.textarea.value = startText + sym.repeat(controlEl.specSymLength) +
                    selectedText + sym.repeat(controlEl.specSymLength) + endText;
                this.textarea.selectionStart = selectionStart + controlEl.specSymLength;
                this.textarea.selectionEnd = selectionEnd + controlEl.specSymLength;
                this.textarea.focus();
            } else {
                this.textarea.value = startText.slice(0, -controlEl.specSymLength) +
                    selectedText + endText.slice(controlEl.specSymLength);
                this.textarea.selectionStart = selectionStart - controlEl.specSymLength;
                this.textarea.selectionEnd = selectionEnd - controlEl.specSymLength;
                this.textarea.focus();
            }
            this.textarea.dispatchEvent(new Event("input"));

        }
    }

    _ctrlMarkCode(controlEl) {
        const selectionStart = this.textarea.selectionStart;
        const selectionEnd = this.textarea.selectionEnd;
        const selectedText = this.textarea.value.substring(selectionStart, selectionEnd);

        if (selectedText.length) {
            let startText = this.textarea.value.substring(0, selectionStart);
            let endText = this.textarea.value.substring(selectionEnd);
            let add = false;
            const selectionOptions = this.getSelectionOptions(startText, endText, controlEl.handler);

            if (selectionOptions.minSymsLength === 0) {
                add = true;
            }
            let sym = controlEl.handler.settings.specSyms[0];
            if (add) {
                this.textarea.value = startText + sym.repeat(controlEl.specSymLength) +
                    selectedText + sym.repeat(controlEl.specSymLength) + endText;
                this.textarea.selectionStart = selectionStart + controlEl.specSymLength;
                this.textarea.selectionEnd = selectionEnd + controlEl.specSymLength;
                this.textarea.focus();
            } else {
                this.textarea.value = startText.slice(0, -selectionOptions.minSymsLength) +
                    selectedText + endText.slice(selectionOptions.minSymsLength);
                this.textarea.selectionStart = selectionStart - selectionOptions.minSymsLength;
                this.textarea.selectionEnd = selectionEnd - selectionOptions.minSymsLength;
                this.textarea.focus();
            }
            this.textarea.dispatchEvent(new Event("input"));
        }
    }

    _ctrlHeaderQuote(ControlEl) {
        const selectionStart = this.textarea.selectionStart;
        const selectionEnd = this.textarea.selectionEnd;
        const selectedText = this.textarea.value.substring(selectionStart, selectionEnd);
        let startText = this.textarea.value.substring(0, selectionStart);
        let endText = this.textarea.value.substring(selectionEnd);
        const sym = ControlEl.handler.settings.specSyms[0];
        const reStart = new RegExp("([^\\n]*)$");
        let shift = 0;
        startText = startText.replace(reStart, function (str, text, offset, input) {
            return text.replace(new RegExp("^((?:" + ControlEl.handler.settings.specSyms.join("|") + ")*)( *)"),
                function (str, symbols, spaces, offset, input) {
                    if (symbols.length < 6) {
                        const result =  sym + symbols + " ";

                        shift = result.length - str.length;
                        return result;
                    }
                    shift = -str.length;
                    return "";
                });
        });

        this.textarea.value = startText + selectedText + endText;
        this.textarea.selectionStart = selectionStart + shift;
        this.textarea.selectionEnd = selectionEnd + shift;
        this.textarea.focus();

        this.textarea.dispatchEvent(new Event("input"));
    }
}

class ViewChangeButton {
    constructor(button, editor, preview, statuses, startStatus = 0) {
        this.button = button;
        this.editor = editor;
        this.preview = preview;
        this.statuses = statuses.splice(1).concat(statuses);
        this.status = startStatus < this.statuses.length - 1 ? startStatus : this.statuses.length - 1;
        this.viewUpdate(this.status);
        this.button.addEventListener("click", this.change.bind(this));
    }
    change() {
        this.status = this.status < this.statuses.length - 1 ? this.status + 1 : 0;
        this.viewUpdate(this.status);
    }
    viewUpdate(status) {
        this.button.textContent = this.statuses[status];
        switch (status) {
            case 0:
                this.editor.style.display = "none";
                this.preview.style.display = "";
                break;
            case 1:
                this.editor.style.display = "";
                this.preview.style.display = "none";
                break;
            default:
                this.editor.style.display = "";
                this.preview.style.display = "";
                break;
        }
    }
}

class MarkdownEditor {
    constructor(textareaSelector, previewSelector,
        viewChangeButtonSelector = undefined, highlighter = undefined) {
        this.textarea = document.querySelector(textareaSelector);
        this.preview = document.querySelector(previewSelector);
        this.converter = new MarkdownText(this.textarea.value);
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.IMGLoadAwaiter = new LoadAwaiter(this.preview, "IMG",
            function (target) {
                target.scrollTop = this.scrollPos;
            });

        if (viewChangeButtonSelector !== undefined) {
            this.setViewChangeButton(viewChangeButtonSelector);
        }
        if (highlighter !== undefined) {
            this.setCodeHandler(highlighter);
        }
        this.preview.innerHTML = this.converter.HTML;
        if (this.isMobile) {
            this.textarea.style.height = this.textarea.scrollHeight + "px";
            this.textarea.addEventListener('blur', function () {
                setTimeout(function () {
                    window.scrollTo(document.body.scrollLeft, document.body.scrollTop);
                }, 0);
            });
        }
        this.render = throttle(this.onInput, 500);
        this.hisController = new TextareaHistoryController(this.textarea, this.render.bind(this));
        this.textarea.addEventListener("input", this.render.bind(this));

    }

    setViewChangeButton(buttonSelector) {
        const $view_button = document.querySelector(buttonSelector);

        if (this.isMobile) {
            this.viewChangeButton = new ViewChangeButton($view_button, this.textarea, this.preview,
                ["👁️", "✏️"], 1);
        } else {
            this.viewChangeButton = new ViewChangeButton($view_button, this.textarea, this.preview,
                ["👁️", "✏️", "👁️ & ✏️"], 2);
        }
    }

    onInput(event) {

        this.IMGLoadAwaiter.scrollPos = this.preview.scrollTop;
        // this.preview.innerHTML = this.converter.getHTML(this.textarea.value);
        const self = this;
        async function htmlUpdate() {
            self.preview.innerHTML = await self.converter.getHTML(self.textarea.value);
            await self.updateCodeBlocks();
        }
        htmlUpdate();
        if (this.isMobile && this.textarea.style.display !== "none") {
            this.textarea.style.height = 100 + "px";
            this.textarea.style.height = this.textarea.scrollHeight + "px";
        }
    }

    setCodeHandler(highlighter) {
        if (typeof (highlighter) !== "undefined") {
            this.highlighter = highlighter;
            document.addEventListener('DOMContentLoaded', (event) => {
                document.querySelectorAll('pre code').forEach((block) => {
                    this.highlighter.highlightBlock(block);
                });
            });
        }
    }

    updateCodeBlocks() {
        if (typeof (this.highlighter) !== "undefined") {
            document.querySelectorAll('pre code').forEach((block) => {
                this.highlighter.highlightBlock(block);
            });
        }
    }
}

class MemoryStack {
    constructor(current = undefined) {
        this._size = 0;
        this._storage = {}
        this._current = current;
    }

    push(data) {
        const size = ++this._size;
        this._storage[size] = this._current;
        this._current = data;
    }

    pop() {
        const size = this._size;
        if (size) {
            this._current = this._storage[size];

            delete this._storage[size];
            this._size--;

            return this._current;
        }
    }

    clear() {
        let size = this._size;

        while (size) {
            this.pop();
            size = this._size;
        }

    }

    get last() {
        if (this._size > 0)
            return this._storage[this._size];
        return null;
    }

}

class TextareaState {
    constructor(textarea) {
        this.value = textarea.value;
        this.selectionStart = textarea.selectionStart;
        this.selectionEnd = textarea.selectionEnd;
    }

    apply(textarea) {
        textarea.value = this.value;
        textarea.selectionStart = this.selectionStart;
        textarea.selectionEnd = this.selectionEnd;
        textarea.focus();

    }
}

class TextareaHistoryController {
    constructor(textarea, render, historyLength = -1) {
        this.textarea = textarea;
        this.historyLength = historyLength;
        const state = new TextareaState(this.textarea)
        this.history = new MemoryStack(state);
        this.deletedHistory = new MemoryStack();
        this.render = render;

        document.addEventListener("keydown", this.onKeyDown.bind(this));
        this.textarea.addEventListener("input", throttle(this.onInput.bind(this), 200));
        this.textarea.addEventListener("select", this.onSelect.bind(this))
    }

    _undo() {
        if (this.history._size > 0) {
            const state = this.history.pop();
            state.apply(this.textarea);
            this.deletedHistory.push(state);
        }
        this.render();
    }

    _redo() {
        if (this.deletedHistory._size > 0) {
            const state = this.deletedHistory.pop();
            state.apply(this.textarea);
            this.history.push(state);
        }
        this.render();
    }

    onInput(event) {
        const state = new TextareaState(event.target)
        delete this.deletedHistory;
        this.deletedHistory = new MemoryStack(state);
        this.history.push(state);

    }

    onSelect(event) {
        this.history._current.selectionStart = event.target.selectionStart;
        this.history._current.selectionEnd = event.target.selectionEnd;
    }

    onKeyDown(event) {
        if (event.ctrlKey && event.keyCode === 90 && !event.shiftKey) {
            event.preventDefault();
            this._undo();
        } else if (event.ctrlKey && event.keyCode === 90 && event.shiftKey) {
            event.preventDefault();
            this._redo();
        }

    }
}

const mdEditor = new MarkdownEditor(
    "#markdown",
    "#preview",
    ".menu #view-button",
    hljs);

const controlPanel = new ControlPanel(
    ".menu .control-buttons",
    mdEditor
)

