class TextHandler {
    constructor(re, template = "", settings = {}) {
        this.re = re;
        this.settings = settings;
        this.settings.parent = this;
        if (typeof (template) === "string")
            this.template = template;
        else if (typeof (template) === "function") {
            this.template = template.bind(this.settings);
            this.template._str = this.str;
        }
    }
    convert(str) {
        return str.replace(this.re, this.template);
    }
    toString() {
        return str.replace(this.re, this.template);
    }
}

class ProcessedText {
    constructor(text) {
        this.text = text;
        this.apply = (handler) => {
            this.text = handler.convert(this.text);
        }
        this.applyQueue = (handlers) => {
            for (let handler of handlers) {
                this.apply(handler);
            }
        }
    }
    toString() {
        return this.text;
    }
}

class MarkdownText {
    constructor(text) {
        const self = this;

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
            /(?: |(?:&gt;))*(#+) ([^\n`<>]+)(?:\n|$)?/gm,
            function (str, p1, p2, offset, input) {
                // console.log(str);
                const header = `h${p1.length}`

                const result = `<${header}>${p2}</${header}>\n`;
                // console.log(result);
                return result;
            }
        );
        function _decorator(str, undue1, leftStars, text, rightStars, undue2, offset, input) {
            const minStars = Math.min(leftStars.length, rightStars.length, 3);
            const leftFreeStars = leftStars.slice(0, -minStars);
            const rightFreeStars = rightStars.slice(minStars);

            if (minStars > this.styles.length) {
                return `${undue1}${leftFreeStars}<${this.styles[0]}><${this.styles[1]}>${text}</${this.styles[0]}></${this.styles[1]}>${rightFreeStars}${undue2}`;
            }
            return `${undue1}${leftFreeStars}<${this.styles[minStars - 1]}>${text}</${this.styles[minStars - 1]}>${rightFreeStars}${undue2}`;
        };
        this.Handler.TextStyle = new TextHandler(
            /([^`*_])((?:\*|_)+)([^\*\n_]+?)((?:\*|_)+)([^`*_])/gm,
            _decorator,
            {
                styles: ["i", "b"],
                get specSyms() {
                    return ["*", "_"];
                }
            }
        );
        this.Handler.TextDecoration = new TextHandler(
            /([^`~])(~+)([^~\n]+?)(~+)([^`~])/gm,
            _decorator,
            {
                styles: ["u", "s"],
                get specSyms() {
                    return ["~"];
                }
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

                let result = tag + str.replace(/( *)(?:\d\.|\*|\+|- )(.+)/gm,
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
                                template = closeTag.repeat(oldSpacesOrderLength - spacesOrder.length - 1)
                                    + template;
                            }
                        }
                        if (!spacesOrder.includes(spaces.length))
                            spacesOrder.push(spaces.length);
                        return template;
                    }
                ) + closeTag.repeat(spacesOrder.length);
                // console.log(result);
                return result;
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
                return `${leftFreeSpecSim}${tag}${text.trim()}${closeTag}${rightFreeSpecSim}`;
            }
        );
        this.Handler.Picture = new TextHandler(
            /!\[(.+?)\]\((.+?)\)/gm,
            '<p><img src="$2" title="$1"></p>'
        );
        this.Handler.Link = new TextHandler(
            /\[([^\n\]\[]+?)\]\((.+?)\)/gm,
            '<a href="$2">$1</a>'
        );
        this.Handler.Blockquote = new TextHandler(
            /(?:^(?:&gt;)+ .*(?:\n|$))+/gm,
            function (str, offset, input) {
                let lastSymNum = 0;
                let a = '<blockquote>' + str.replace(
                    /^((?:&gt;)+) (.*)(?:\n|$)/gm,
                    function (str, symbols, text, offset, input) {
                        const len = symbols.length / 4;
                        let result;
                        const formatedText = `<p>${text}</p>`;

                        if (lastSymNum === 0)
                            lastSymNum = len;
                        if (lastSymNum < len) {
                            result = '<blockquote>'.repeat(len - lastSymNum) +
                                formatedText;
                        } else if (lastSymNum > len) {
                            result = '</blockquote>\n'.repeat(lastSymNum - len) +
                                formatedText;
                        } else {
                            result = formatedText;
                        }
                        lastSymNum = len;

                        return result;
                    }
                ) + '</blockquote>';

                return a;
            }
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
                    "\\[": "<!-- squarebracket1! -->",
                    "\\]": "<!-- squarebracket2! -->",
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
                    "\[": "<!-- squarebracket1! -->",
                    "\]": "<!-- squarebracket2! -->",
                };

                Object.keys(dict).forEach((el) => {
                    str = str.replace(new RegExp(dict[el], "gm"), el);
                });
                return str;
            }
        );
        this.Handler.FootnotesToLinks = new TextHandler(
            /[^]+/gm,
            function (str, offset, input) {
                const foundData = {};
                str = str.replace(
                    /\[([^\^\n\]\[]+)\]: ([^\n\s]+) ?(.*)$/gm,
                    function (str, footnote, link, title, offset, input) {
                        foundData[footnote] = {
                            link,
                            title,
                        };
                        return "";
                    }
                )
                str = str.replace(
                    /\[([^\^\n\]\[]+)\]\[(.+)\]/gm,
                    function (str, text, footnote, offset, input) {
                        const fn = foundData[footnote];
                        if (fn) {
                            return `<a href="${fn.link}" title="${fn.title}">${text}</a>`
                        }
                        return str;
                    }
                )
                console.log(foundData)
                return str;
            }
        );
        this.Handler.Footnotes = new TextHandler(
            /[^]+/gm,
            function (str, offset, input) {
                let end = "\n<hr>\n";
                const foundData = [];

                str = str.replace(
                    /\[\^([^\n\]\[]+)\]: (.+)/gm,
                    function(str, footnote, text, offset, input) {
                        foundData.push(footnote);
                        end += `<p><a id="${footnote}"></a>[${footnote}]:  ${text}</p>\n`
                        return "";
                    }
                );
                str = str.replace(
                    /\[\^([^\n\]\[]+)\]/gm,
                    function(str, footnote, offset, input) {
                        console.log(footnote);
                        if (foundData.indexOf(footnote) !== -1) {
                            return `<sup><a href="#${footnote}">${footnote}</a></sup>`;
                        }
                        return str;
                    }
                )
                if (foundData.length > 0)
                    return str + end;
                return str;
            }
        );

        this.queue = [
            this.Handler.AntiHTML,
            this.Handler.InCodeReplacer,
            this.Handler.HR,
            this.Handler.Blockquote,
            this.Handler.List,
            this.Handler.Header,
            this.Handler.Paragraph,
            this.Handler.Footnotes,
            this.Handler.FootnotesToLinks,
            this.Handler.TextStyle,
            this.Handler.TextDecoration,
            this.Handler.InCodeBackReplacer,
            this.Handler.MarkCode,
            this.Handler.Picture,
            this.Handler.Link,
            
        ];
    }

    getHTML(str = this.text, queue = this.queue) {

        let result = new ProcessedText(str);
        // console.log(result.text);
        result.applyQueue(queue);
        // console.log(result.text);
        return result;
    }

    get HTML() {
        return this.getHTML(this.text, this.queue);
    }


}