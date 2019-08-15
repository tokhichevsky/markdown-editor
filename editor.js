class LoadAwaiter {
    constructor(target, loader, tag, OnLoad) {
        this.target = target;
        this.loader = loader;
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
        this._togglePrLoader =
            this._toggleDisplay.bind(null, this.target, this.loader);
        this._loadHandler = (elem) => {
            console.log(this);
            this._totalObjects++;
            if (this._totalObjects === 1) {
                this._togglePrLoader(true);
            }
            self = this;
            elem.addEventListener("load", function (event) {
                self._loadedObjects++;
                if (self._loadedObjects >= self._totalObjects) {
                    self.OnLoad(target);
                    self._togglePrLoader(false);
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
    tagSearcher (node, tag, handler) {
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

const texteditor = document.querySelector("#markdown");
const preview = document.querySelector("#preview");
const previewloader = document.querySelector(".loader");
previewloader.style.display = "none";
preview.innerHTML = new MarkdownText(texteditor.value).HTML;
// md_text.style.height = md_text.scrollHeight + "px";

document.addEventListener('DOMContentLoaded', (event) => {
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
});

const IMGLoader = new LoadAwaiter(preview, previewloader, "IMG", function(target) {
    target.scrollTop = this.scrollPos;
});

texteditor.addEventListener("input", function () {
    IMGLoader.scrollPos = preview.scrollTop;
    preview.innerHTML = new MarkdownText(this.value).HTML;
    // this.style.height = 100 + "px";
    // this.style.height = this.scrollHeight + "px";
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
});

