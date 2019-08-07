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
            /([^\n]+?)(\n\n)/gm,
            "\n<p>$1</p>\n"
        );

        this.ParagraphHandler2 = new TextHandler(
            /.+?(?:\n\n)/gm,
            "$&<br>"
        );

        this.HeaderHandler = new TextHandler(
            /(?: |>)*(#+ )([^\n`]+?)(?:\n|$)/gm,
            function (str, p1, p2, offset, input) {
                const header = `h${p1.length}`
                return `<${header}>${p2}</${header}>`
            }
        );

        this.TextStyleHandler = new TextHandler(
            /([^`*])(\*+)([^\*\n]+?)(\*+)([^`*])/gm,
            function (str, undue1, leftStars, text, rightStars, undue2, offset, input) {
                const styles = ["i", "b"];
                const minStars = Math.min(leftStars.length, rightStars.length, 3);
                const leftFreeStars = "*".repeat(leftStars.length - minStars);
                const rightFreeStars = "*".repeat(rightStars.length - minStars);
                const innerText = leftFreeStars + text + rightFreeStars;
                console.log(undue1, leftStars, text, rightStars, undue2);
                if (minStars > 2) {
                    return `${undue1}<${styles[0]}><${styles[1]}>${innerText}</${styles[0]}></${styles[1]}>${undue2}`;
                }
                return `${undue1}<${styles[minStars - 1]}>${innerText}</${styles[minStars - 1]}>${undue2}`;
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
            /^((?:&gt;)+) (.*)(?:\n|$)/gm, function (str, p1, p2, offset, input) {
                const signNum = p1.length / 4;
                return '<blockquote>'.repeat(signNum) + `<p>${p2}</p>` + '</blockquote>'.repeat(signNum);
            }
        )

        this.BlockquoteUniteHandler = new TextHandler(
            /<\/blockquote><blockquote>/gm,
            ""
        )
        this.CodeHandler = new TextHandler(
            /&lt;[^`]+&gt;/gm,
            "<code>$&</code>"
        )

        this.HRHandler = new TextHandler(
            /^---$/gm,
            "<hr>"
        )

        this.AntiHTMLHandler = new TextHandler(
            /<|>/gm, function (str, offset, input) {
                switch (str) {
                    case ">":
                        return "&gt;";
                    case "<":
                        return "&lt;";
                    default:
                        return str;
                }
            }
        )

        this.HTML = this.getHTML(this.text);
    }
    getHTML(str) {
        let result = str;
        // console.log("\nClear");
        // console.log("-------------------------------");
        // console.log(result);
        result = this.AntiHTMLHandler.convert(result);
        result = this.CodeHandler.convert(result);

        result = this.HRHandler.convert(result);
        result = this.BlockquoteHandler.convert(result);
        // console.log("\nДо BlockquoteUniteHandler");
        // console.log("-------------------------------");
        // console.log(result);
        result = this.BlockquoteUniteHandler.convert(result);
        // console.log("\nПосле BlockquoteUniteHandler");
        // console.log("-------------------------------");
        // console.log(result);
        result = this.OrderedListHandler.convert(result);
        result = this.UnorderedListHandler.convert(result);
        result = this.HeaderHandler.convert(result);
        // console.log("\nДо ParagraphHandler");
        // console.log("-------------------------------");
        // console.log(result);

        result = this.ParagraphHandler.convert(result);
        // console.log("\nПосле");
        // console.log("-------------------------------");
        // console.log(result);
        result = this.TextStyleHandler.convert(result);
        result = this.SelectionHandler.convert(result);

        result = this.PictureHandler.convert(result);
        result = this.LinkHandler.convert(result);

        return result;
    }
}

const md_text = document.querySelector("#markdown");
const preview = document.querySelector("#preview");

preview.innerHTML = new MarkdownText(md_text.value).HTML;
md_text.style.height = md_text.scrollHeight + "px"

md_text.addEventListener("input", function () {
    preview.innerHTML = new MarkdownText(this.value).HTML;
    this.style.height = 100 + "px";
    this.style.height = this.scrollHeight + "px";

});


