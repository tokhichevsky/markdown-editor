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
            /([^]+?)\n\n/gm,
            function(str, text, offset, input) {
                const trText = text.trim();

                if (trText.length > 0) {
                    return  `<p>\n${trText}\n</p>`;
                }
                return "";
            }
            
        );
        this.Handler.Paragraph2 = new TextHandler(
            /.+?(?:\n\n)/gm,
            "$&<br>"
        );
        this.Handler.Header = new TextHandler(
            /(?: |(?:&gt;))*(#+) ([^\n`<>\[\]]+)(?:\n|$)/gm,
            function (str, p1, p2, offset, input) {
                this.specSyms = ["#"];
                const header = `h${p1.length}`

                const result = `<${header}><a id="${p2}"></a>${p2}</${header}>\n`;
                return result;
            }
        );
        function _decorator(str, stars, text, offset, input) {
            if (stars.length > this.styles.length) {
                return `<${this.styles[0]}><${this.styles[1]}>${text}</${this.styles[0]}></${this.styles[1]}>`;
            }
            return `<${this.styles[stars.length - 1]}>${text}</${this.styles[stars.length - 1]}>`;
        };
        this.Handler.TextStyle = new TextHandler(
            /((?:\*|_)+)([^\*\n_]+?)\1/gm,
            _decorator,
            {
                styles: ["i", "b"],
                get specSyms() {
                    return ["*", "_"];
                }
            }
        );
        this.Handler.TextDecoration = new TextHandler(
            /(~+)([^~\n]+?)\1/gm,
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

                let result = tag + str.replace(/( *)(?:(?:\d\.|\*|\+|-) +)(.+)/gm,
                    function (str, spaces, text, offset, input) {
                        let template = `<li>${text}`;

                        if (spacesOrder.length > 0) {
                            const lastSpaces = spacesOrder[spacesOrder.length - 1];
                            if (spaces.length > lastSpaces) {

                                template = tag + template;
                            } else if (spaces.length < lastSpaces) {
                                const oldSpacesOrderLength = spacesOrder.length;
                                let cutSpaceOrderLength = spacesOrder.filter(x => x <= spaces.length).length - 1;
                                if (cutSpaceOrderLength < 0) cutSpaceOrderLength = 0;
                                spacesOrder = spacesOrder.slice(0, cutSpaceOrderLength);
                                template = "</li>"+closeTag.repeat(oldSpacesOrderLength - spacesOrder.length - 1) + "</li>"
                                    + template;
                            } else {
                                template = "</li>" + template;
                            }
                        }
                        if (!spacesOrder.includes(spaces.length))
                            spacesOrder.push(spaces.length);
                        return template;
                    }
                ) + "</li>"+closeTag.repeat(spacesOrder.length);
                return result;
            }
        );
        this.Handler.MarkCode = new TextHandler(
            /(`+)(?:([^\n\s`]+)\n)?([^`]+?)\1/gm,
            function (str, specSymbols, codetype, text, offset, input) {
                this.specSyms = ["`"];
                let tag, closeTag, codeclass = "";
                if (codetype !== undefined)
                    codeclass = codetype;
                if (specSymbols.length < 2) {
                    tag = "<mark>";
                    closeTag = "</mark>"
                } else {
                    tag = `<pre><code class="${codeclass}">`;
                    closeTag = "</code></pre>"
                }
                return `${tag}${text.trim()}${closeTag}`;
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
                this.specSyms = [">"];
                let lastSymNum = 0;
                let a = '<blockquote>' + str.replace(
                    /^((?:&gt;)+) (.*)(?:\n|$)/gm,
                    function (str, symbols, text, offset, input) {
                        const len = symbols.length / 4;
                        let result;
                        const formatedText = `<p>\n${text}\n</p>`;

                        if (lastSymNum === 0)
                            lastSymNum = len;
                        if (lastSymNum < len) {
                            result = '<blockquote>\n'.repeat(len - lastSymNum) +
                                formatedText;
                        } else if (lastSymNum > len) {
                            result = '\n</blockquote>\n'.repeat(lastSymNum - len) +
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
                        end += `<p><a id="${footnote}"></a>&emsp;${footnote}. ${text}</p>\n`
                        return "";
                    }
                );
                str = str.replace(
                    /\[\^([^\n\]\[]+)\]/gm,
                    function(str, footnote, offset, input) {
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
        this.Handler.SpecSymbols = new TextHandler(
            /\\(.)/gm,
            function(str, symbol, offset, input) {
                const newsymbol = this.specSymbols[symbol];
                if (newsymbol !== undefined) {
                    return newsymbol;
                }
                else return str;
            },
            {
                specSymbols: {
                    "`": "&#96;",
                }
            }
        )

        this.queue = [
            this.Handler.AntiHTML,
            this.Handler.SpecSymbols,
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
            
            this.Handler.Picture,
            this.Handler.Link,
            this.Handler.InCodeBackReplacer,
            this.Handler.MarkCode,
            
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