class TextHandler {
    constructor(re, template, settings = {}) {
        this.re = re;
        this.settings = settings;
        if (typeof (template) === "string")
            this.template = template;
        else if (typeof (template) === "function") {
            this.template = template.bind(this.settings);
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
                                template = closeTag.repeat(oldSpacesOrderLength - spacesOrder.length - 1)
                                    + template;
                            }
                        }
                        if (!spacesOrder.includes(spaces.length))
                            spacesOrder.push(spaces.length);
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
                        console.log(result);
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
        this.queue = [
            this.Handler.AntiHTML,
            this.Handler.InCodeReplacer,
            this.Handler.HR,
            this.Handler.Blockquote,
            this.Handler.List,
            this.Handler.Header,
            this.Handler.Paragraph,
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
        result.applyQueue(queue);

        return result;
    }

    get HTML() {
        return this.getHTML(this.text, this.queue);
    }

    
}