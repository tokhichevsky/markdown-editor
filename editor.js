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

togglePrLoader = 
    toggleDisplay.bind(null, preview, previewloader);

md_text.addEventListener("input", function () {
    let scrollPos = preview.scrollTop;
    togglePrLoader();
    preview.innerHTML = new MarkdownText(this.value).HTML;
    // this.style.height = 100 + "px";
    // this.style.height = this.scrollHeight + "px";
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });

        togglePrLoader();
    
});

function toggleDisplay(el1, el2) {
    if (el1.style.display === "none") {
        el1.style.display = "";
        el2.style.display = "none";
    } else {
        el2.style.display = "";
        el1.style.display = "none";
    }
}





