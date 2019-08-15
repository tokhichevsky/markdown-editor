const md_text = document.querySelector("#markdown");
const preview = document.querySelector("#preview");
const previewloader = document.querySelector(".loader");
previewloader.style.display = "none";
preview.innerHTML = new MarkdownText(md_text.value).HTML;
// md_text.style.height = md_text.scrollHeight + "px";

document.addEventListener('DOMContentLoaded', (event) => {
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
});

let scrollPos = preview.scrollTop;

togglePrLoader =
    toggleDisplay.bind(null, preview, previewloader);

md_text.addEventListener("input", function () {
    scrollPos = preview.scrollTop;
    preview.innerHTML = new MarkdownText(this.value).HTML;
    // this.style.height = 100 + "px";
    // this.style.height = this.scrollHeight + "px";
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
});

function toggleDisplay(el1, el2, close) {
    if (close === false) {
        el1.style.display = "";
        el2.style.display = "none";
    } else {
        el2.style.display = "";
        el1.style.display = "none";
    }
}

let totalImages = 0;
let loadedImages = 0;


function tagSearcher(node, tag, handler) {
    for (let child of node.childNodes) {
        if (child.tagName === tag) {
            handler(child);
        }
        tagSearcher(child, tag, handler);
    }
}

const observer = new MutationObserver(mutations => {
    
    for (let mutation of mutations) {
        totalImages = 0;
        loadedImages = 0;
        for (let node of mutation.addedNodes) {
            tagSearcher(node, "IMG", function(elem) {
                totalImages++;
                if (totalImages === 1) {
                    togglePrLoader(true);
                }
                elem.addEventListener("load", function (event) {
                    loadedImages++;
                    if (loadedImages >= totalImages) {
                        preview.scrollTop = scrollPos;
                        togglePrLoader(false);
                    }
                });
            });
        }
    }
});
const config = {
    characterData: true,
    attributes: false,
    childList: true,
    subtree: true,
};
observer.observe(preview, config);

