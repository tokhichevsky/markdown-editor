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
        this.Handler = {};
        this.Handler.Paragraph = new TextHandler(
            /([^\n]+?)(\n\n)/gm,
            "\n<p>$1</p>\n"
        );
        this.Handler.Paragraph2 = new TextHandler(
            /.+?(?:\n\n)/gm,
            "$&<br>"
        );
        this.Handler.Header = new TextHandler(
            /(?: |>)*(#+ )([^\n`]+?)(?:\n|$)/gm,
            function (str, p1, p2, offset, input) {
                const header = `h${p1.length}`

                return `<${header}>${p2}</${header}>`
            }
        );
        this.Handler.TextStyle = new TextHandler(
            /([^`*_])((?:\*|_)+)([^\*\n_]+?)((?:\*|_)+)([^`*_])/gm,
            function (str, undue1, leftStars, text, rightStars, undue2, offset, input) {
                const styles = ["i", "b"];
                const minStars = Math.min(leftStars.length, rightStars.length, 3);
                const leftFreeStars = leftStars.slice(0, -minStars);
                const rightFreeStars = rightStars.slice(minStars);

                if (minStars > 2) {
                    return `${undue1}${leftFreeStars}<${styles[0]}><${styles[1]}>${text}</${styles[0]}></${styles[1]}>${rightFreeStars}${undue2}`;
                }
                return `${undue1}${leftFreeStars}<${styles[minStars - 1]}>${text}</${styles[minStars - 1]}>${rightFreeStars}${undue2}`;
            }
        );
        this.Handler.StrikeThrough = new TextHandler(
            /([^`~])(~+)([^~\n]+?)(~+)([^`~])/gm,
            function (str, undue1, leftStars, text, rightStars, undue2, offset, input) {
                const styles = ["s", "u"];
                const minStars = Math.min(leftStars.length, rightStars.length, 3);
                const leftFreeStars = leftStars.slice(0, -minStars);
                const rightFreeStars = rightStars.slice(minStars);

                if (minStars > 2) {
                    return `${undue1}${leftFreeStars}<${styles[0]}><${styles[1]}>${text}</${styles[0]}></${styles[1]}>${rightFreeStars}${undue2}`;
                }
                return `${undue1}${leftFreeStars}<${styles[minStars - 1]}>${text}</${styles[minStars - 1]}>${rightFreeStars}${undue2}`;
            }
        );
        this.Handler.List = new TextHandler(
            /(?:^ *(\d\.|\*|\+|-) .+\n?)+/gm,
            function (str, listType, offset, input) {
                let spacesOrder = [];
                let tag, closeTag;

                if (/\*|\+|-/g.test(listType)) {
                    tag = "<ul>";
                    closeTag = "</ul>";
                } else {
                    tag = "<ol>";
                    closeTag = "</ol>";
                }
                return tag + str.replace(/( *)(?:\d\.|\*|\+|- )(.+)/gm,
                    function (str, spaces, text, offset, input) {
                        let template = `<li>${text}</li>`;

                        if (spacesOrder.length > 0) {
                            const lastSpaces = spacesOrder[spacesOrder.length - 1];
                            if (spaces.length > lastSpaces) {

                                template = tag + template;
                            } else if (spaces.length < lastSpaces) {
                                const oldSpacesOrderLength = spacesOrder.length;
                                let cutSpaceOrderLength = spacesOrder.filter(x => x <= spaces.length).length - 1;
                                if (cutSpaceOrderLength < 0) cutSpaceOrderLength = 0;
                                spacesOrder = spacesOrder.slice(0, cutSpaceOrderLength);
                                console.log(cutSpaceOrderLength, oldSpacesOrderLength, spacesOrder.length);
                                template = closeTag.repeat(oldSpacesOrderLength - spacesOrder.length - 1)
                                    + template;
                            }
                        }
                        if (!spacesOrder.includes(spaces.length))
                            spacesOrder.push(spaces.length);
                        console.log(spacesOrder, template);
                        return template;
                    }
                ) + closeTag;
            }
        );
        this.Handler.MarkCode = new TextHandler(
            /(`+)([^`]+?)(`+)/gm,
            function (str, leftSpecSim, text, rightSpecSim, offset, input) {
                const minSpecSim = Math.min(leftSpecSim.length, rightSpecSim.length);
                const leftFreeSpecSim = "`".repeat(leftSpecSim.length - minSpecSim);
                const rightFreeSpecSim = "`".repeat(rightSpecSim.length - minSpecSim);
                let tag, closeTag;

                if (minSpecSim < 2) {
                    tag = "<mark>";
                    closeTag = "</mark>"
                } else {
                    tag = "<pre><code>";
                    closeTag = "</code></pre>"
                }
                // console.log(`${undue1}${leftFreeSpecSim}${tag}${text.trim()}${closeTag}${rightFreeSpecSim}${undue2}`)
                return `${leftFreeSpecSim}${tag}${text.trim()}${closeTag}${rightFreeSpecSim}`;
            }
        );
        this.Handler.Picture = new TextHandler(
            /!\[(.+?)\]\((.+?)\)/gm,
            '<p><img src="$2" alt="$1"></p>'
        );
        this.Handler.Link = new TextHandler(
            /\[(.+?)\]\((.+?)\)/gm,
            '<a href="$2">$1</a>'
        );
        this.Handler.Blockquote = new TextHandler(
            /^((?:&gt;)+) (.*)(?:\n|$)/gm,
            function (str, p1, p2, offset, input) {
                const signNum = p1.length / 4;

                return '<blockquote>'.repeat(signNum) + `<p>${p2}</p>` + '</blockquote>'.repeat(signNum);
            }
        );
        this.Handler.BlockquoteUnite = new TextHandler(
            /<\/blockquote><blockquote>/gm,
            ""
        );
        this.Handler.HTMLCode = new TextHandler(
            /&lt;[^`]+&gt;/gm,
            "<p><code>$&</code></p>"
        );
        this.Handler.HR = new TextHandler(
            /^-{3,}$/gm,
            "<hr>"
        );
        this.Handler.AntiHTML = new TextHandler(
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
        );
        this.Handler.InCodeReplacer = new TextHandler(
            /(`+)([^`]+?)(`+)/gm,
            function (str, code, offset, input) {
                const dict = {
                    "\\*": "<!-- star! -->",
                    "_": "<!-- underline! -->",
                    "#": "<!-- hash! -->",
                    "\n": "<!-- newline! -->",
                    "~": "<!-- tilda! -->",
                };

                Object.keys(dict).forEach((el) => {
                    str = str.replace(new RegExp(el, "gm"), dict[el]);
                });
                return str;
            }
        );
        this.Handler.InCodeBackReplacer = new TextHandler(
            /(`+)([^`]+?)(`+)/gm,
            function (str, code, offset, input) {
                const dict = {
                    "\*": "<!-- star! -->",
                    "_": "<!-- underline! -->",
                    "#": "<!-- hash! -->",
                    "\n": "<!-- newline! -->",
                    "~": "<!-- tilda! -->",
                };

                Object.keys(dict).forEach((el) => {
                    str = str.replace(new RegExp(dict[el], "gm"), el);
                });
                return str;
            }
        );

        this.HTML = this.getHTML(this.text);
    }
    getHTML(str) {
        let result = str;
        // console.log("\nClear");
        // console.log("-------------------------------");
        // console.log(result);
        result = this.Handler.AntiHTML.convert(result);
        // result = this.Handler.HTMLCode.convert(result);
        result = this.Handler.InCodeReplacer.convert(result);
        result = this.Handler.HR.convert(result);
        result = this.Handler.Blockquote.convert(result);
        // console.log("\nДо BlockquoteUniteHandler");
        // console.log("-------------------------------");
        // console.log(result);
        result = this.Handler.BlockquoteUnite.convert(result);
        // console.log("\nПосле BlockquoteUniteHandler");
        // console.log("-------------------------------");
        // console.log(result);
        result = this.Handler.List.convert(result);
        result = this.Handler.Header.convert(result);
        // console.log("\nДо ParagraphHandler");
        // console.log("-------------------------------");
        // console.log(result);

        result = this.Handler.Paragraph.convert(result);
        // console.log("\nПосле");
        // console.log("-------------------------------");
        // console.log(result);
        result = this.Handler.TextStyle.convert(result);
        result = this.Handler.StrikeThrough.convert(result);
        result = this.Handler.InCodeBackReplacer.convert(result);
        result = this.Handler.MarkCode.convert(result);

        result = this.Handler.Picture.convert(result);
        result = this.Handler.Link.convert(result);


        return result;
    }
}