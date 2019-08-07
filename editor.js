class TextHandler {
    constructor(re, template) {
        this.re = re;
        this.template = template;
    }
    convert(str) {
        return str.replace(this.re, this.template);
    }
}
class MarkdownText {
    constructor(text) {
        this.text = text;
        this.ParagraphHandler = new TextHandler(
            /.+?(?:\n\n)/gm,
            "<p>$&</p>"
        );

        this.ParagraphHandler2 = new TextHandler(
            /.+?(?:\n\n)/gm,
            "$&<br>"
        );

        this.HeaderHandler = new TextHandler(
            / *(#+ )(.+?)(?:\n|$)/gm,
            function (str, p1, p2, offset, input) {
                const header = `h${p1.length}`
                return `<${header}>${p2}</${header}>`
            }
        );

        this.TextStyleHandler = new TextHandler(
            /(\*+)([^\*\n]+?)(\*+)/gm,
            function (str, p1, p2, p3, offset, input) {
                const styles = ["i", "b"];
                const minStars = Math.min(p1.length, p3.length, 3);
                const leftFreeStars = "*".repeat(p1.length - minStars);
                const rightFreeStars = "*".repeat(p3.length - minStars);
                const innerText = leftFreeStars + p2 + rightFreeStars;

                if (minStars > 2) {
                    return `<${styles[0]}><${styles[1]}>${innerText}</${styles[0]}></${styles[1]}>`;
                }
                return `<${styles[minStars - 1]}>${innerText}</${styles[minStars - 1]}>`;
            }
        )

        this.OrderedListHandler = new TextHandler(
            /(?:^ *\d+\. .+\n)+/gm,
            function (str, offset, input) {
                return "<ol>" + str.replace(/(?: *\d+\. )(.+)/gm,
                    "<li>$1</li>") + "</ol>";
            }
        )

        this.UnorderedListHandler = new TextHandler(
            /(?:^ *\* .+\n)+/gm,
            function (str, offset, input) {
                return "<ul>" + str.replace(/(?: *\* )(.+)/gm,
                    "<li>$1</li>") + "</ul>";
            }
        )

        this.SelectionHandler = new TextHandler(
            /`([^`\n]+?)`/gm,
            "<mark>$1</mark>"
        )

        this.PictureHandler = new TextHandler(
            /!\[(.+?)\]\((.+?)\)/gm,
            '<p><img src="$2" alt="$1"></p>'
        )

        this.LinkHandler = new TextHandler(
            /\[(.+?)\]\((.+?)\)/gm,
            '<a href="$2">$1</a>'
        )

        this.BlockquoteHandler = new TextHandler(
            /^(»+) (.*)(?:\n|$)/gm, function (str, p1, p2, offset, input) {
                const signNum = p1.length;
                let br = "";
                // if (p2.length === 0) br = "<br>";
                return '<blockquote>\n'.repeat(signNum) + p2 + br + '\n</blockquote>'.repeat(signNum);
            }
        )

        this.BlockquoteUniteHandler = new TextHandler(
            /<\/blockquote><blockquote>/gm,
            ""
        )

        this.AntiHTMLHandler = new TextHandler(
            /<|>/gm, function (str, offset, input) {
                switch (str) {
                    case ">":
                        return "»";
                    case "<":
                        return "«";
                    default:
                        return str;
                }
            }
        )

        this.HTML = this.getHTML(this.text);
    }
    getHTML(str) {
        let result = str;
        result = this.AntiHTMLHandler.convert(result);
        console.log(result);
        result = this.BlockquoteHandler.convert(result);
        console.log(result);
        result = this.BlockquoteUniteHandler.convert(result);
        result = this.OrderedListHandler.convert(result);
        result = this.UnorderedListHandler.convert(result);
        result = this.HeaderHandler.convert(result);
        
        result = this.ParagraphHandler.convert(result);
        result = this.SelectionHandler.convert(result);
        result = this.TextStyleHandler.convert(result);
        result = this.PictureHandler.convert(result);
        result = this.LinkHandler.convert(result);
        console.log(result);

        return result;
    }
}

const md_text = document.querySelector("#markdown");
const preview = document.querySelector("#preview");
preview.innerHTML = new MarkdownText(md_text.value).HTML;

md_text.addEventListener("input", function () {
    preview.innerHTML = new MarkdownText(md_text.value).HTML;

});


