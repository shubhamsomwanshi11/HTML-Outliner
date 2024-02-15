// HTMLOutliner.js
function reset(){
    document.getElementById('direct_input').value = '';
    document.getElementById('output').innerHTML = '';
}

// Section class
function Section(explicit) {
    this.parentSection = null;
    this.childSections = [];
    this.firstChild = null;
    this.lastChild = null;
    this.appendChild = function (section) {
        section.parentSection = this;
        this.childSections.push(section);
        if (this.firstChild === null) this.firstChild = section;
        this.lastChild = section;
    };

    this.explicit = explicit;
    this.associatedNodes = []; // DOM nodes associated with the section

    // this.heading is defined for all sections by the function HTMLOutline:
    // It is either a heading content element or null for an implied heading
}

// Main function
function HTMLOutline(root) {

    // BEGIN OUTLINE ALGORITHM
    // STEP 1
    var currentOutlinee = null; // element whose outline is being created
    // STEP 2
    var currentSection = null; // current section

    // STEP 3
    // Minimal stack object
    var stack = { "lastIndex": -1 };
    stack.isEmpty = function () {
        return stack.lastIndex === -1;
    };
    stack.push = function (e) {
        stack[++stack.lastIndex] = e;
        stack.top = e;
    };
    stack.pop = function () {
        var e = stack.top;
        delete stack[stack.lastIndex--];
        stack.top = stack[stack.lastIndex];
        return e;
    };

    // STEP 4
    // Walk the DOM subtree of root
    var node = root;
    start: while (node) {
        extend(node);
        enter(node);
        if (node.firstChild) {
            node = node.firstChild;
            continue start;
        }
        while (node) {
            exit(node);
            if (node === root) break start;
            if (node.nextSibling) {
                node = node.nextSibling;
                continue start;
            }
            node = node.parentNode;
        }
    }

    // When entering a node
    function enter(node) {
        if (isElement(node)) {
            if (!stack.isEmpty() && (isHeadingContentElement(stack.top) || isHidden(stack.top))) {
                // Do nothing
            } else if (isHidden(node)) {
                stack.push(node);
            } else if (isSectioningContentElement(node)) {
                if (currentOutlinee !== null) {
                    if (hasNoHeading(currentSection)) createImpliedHeading(currentSection);
                    stack.push(currentOutlinee);
                }
                currentOutlinee = node;
                currentSection = new Section(true);
                associateNodeWithSection(currentOutlinee, currentSection);
                currentOutlinee.appendSection(currentSection);
            } else if (isSectioningRootElement(node)) {
                if (currentOutlinee !== null) stack.push(currentOutlinee);
                currentOutlinee = node;
                currentOutlinee.parentSection = currentSection;
                currentSection = new Section(true);
                associateNodeWithSection(currentOutlinee, currentSection);
                currentOutlinee.appendSection(currentSection);
            } else if (currentOutlinee === null) {
                // Do nothing
                // (this step is not in the algorithm but is needed here since root may not be a sectioning element)
            } else if (isHeadingContentElement(node)) {
                if (hasNoHeading(currentSection)) currentSection.heading = node;
                else if (hasImpliedHeading(currentOutlinee.lastSection) || node.rank >= currentOutlinee.lastSection.heading.rank) {
                    currentSection = new Section(false);
                    currentSection.heading = node;
                    currentOutlinee.appendSection(currentSection);
                } else {
                    var candidateSection = currentSection;
                    while (node.rank >= candidateSection.heading.rank) candidateSection = candidateSection.parentSection;
                    currentSection = new Section(false);
                    currentSection.heading = node;
                    candidateSection.appendChild(currentSection);
                }
                stack.push(node);
            } // else {
            // Do nothing
            // }
        }
    }

    // When exiting a node
    function exit(node) {
        if (isElement(node)) {
            if (!stack.isEmpty() && node === stack.top) stack.pop();
            else if (!stack.isEmpty() && (isHeadingContentElement(stack.top) || isHidden(stack.top))) {
                // Do nothing
            } else if (!stack.isEmpty() && isSectioningContentElement(node)) {
                if (hasNoHeading(currentSection)) createImpliedHeading(currentSection);
                currentOutlinee = stack.pop();
                currentSection = currentOutlinee.lastSection;
                for (var i = 0; i < node.sectionList.length; i++) {
                    currentSection.appendChild(node.sectionList[i]);
                }
            } else if (!stack.isEmpty() && isSectioningRootElement(node)) {
                if (hasNoHeading(currentSection)) createImpliedHeading(currentSection);
                currentSection = currentOutlinee.parentSection;
                currentOutlinee = stack.pop();
            } else if (isSectioningContentElement(node) || isSectioningRootElement(node)) {
                if (hasNoHeading(currentSection)) createImpliedHeading(currentSection);
                // If the root is a sectioning element, the walk ends here
                // If not, we reset the algorithm for subsequent top-level sectioning elements
                currentOutlinee = null;
                currentSection = null;
            } // else {
            // Do nothing
            // }
        }
        if (node.associatedSection === null && currentSection !== null) associateNodeWithSection(node, currentSection);
    }

    // STEP 5
    // The heading associated to node is node.associatedSection.heading
    // END OUTLINE ALGORITHM

    // Now we must make the necessary definitions for the above to make sense...

    function associateNodeWithSection(node, section) {
        section.associatedNodes.push(node);
        node.associatedSection = section;
    }

    function hasNoHeading(section) {
        return section.heading === undefined;
    }

    function hasImpliedHeading(section) {
        return section.heading === null;
    }

    function createImpliedHeading(section) {
        section.heading = null;
    }

    // Types of nodes
    function isElement(node) {
        return node.nodeType === 1;
    }

    function isHidden(node) {
        return node.hidden;
    }

    function isSectioningRootElement(node) {
        return ["blockquote", "body", "details", "dialog", "fieldset", "figure", "td"].indexOf(node.nodeName.toLowerCase()) !== -1;
    }

    function isSectioningContentElement(node) {
        return ["article", "aside", "nav", "section"].indexOf(node.nodeName.toLowerCase()) !== -1;
    }

    function isSectioningElement(node) {
        return isSectioningRootElement(node) || isSectioningContentElement(node);
    }

    function isHeadingElement(node) {
        return ["h1", "h2", "h3", "h4", "h5", "h6"].indexOf(node.nodeName.toLowerCase()) !== -1;
    }

    function isHeadingGroupElement(node) {
        return "hgroup" === node.nodeName.toLowerCase();
    }

    function isHeadingContentElement(node) {
        return isHeadingElement(node) || isHeadingGroupElement(node);
    }

    // Add properties to DOM nodes
    function extend(node) {
        if (isSectioningElement(node)) extendSectioningElement(node);
        else if (isHeadingElement(node)) extendHeadingElement(node);
        else if (isHeadingGroupElement(node)) extendHeadingGroupElement(node);
        else extendNode(node);
    }

    function extendNode(node) {
        node.associatedSection = null;
    }

    function extendSectioningElement(node) {
        extendNode(node);
        node.sectionList = [];
        node.firstSection = null;
        node.lastSection = null;

        node.appendSection = function (section) {
            this.sectionList.push(section);
            if (this.firstSection === null) this.firstSection = section;
            this.lastSection = section;
        };
    }

    function extendHeadingContentElement(node) {
        extendNode(node);
        Object.defineProperty(node, "depth", {
            "get": function () {
                var section = node.associatedSection;
                if (section === null) return undefined;
                var depth = 1;
                while (section = section.parentSection) ++depth;
                return depth;
            }, "configurable": true, "enumerable": true
        });
    }

    function extendHeadingElement(node) {
        extendHeadingContentElement(node);
        node.rank = -parseInt(node.nodeName.charAt(1));
        node.text = node.textContent;
    }

    function extendHeadingGroupElement(node) {
        extendHeadingContentElement(node);

        for (var i = 1; i <= 6; i++) {
            var h = node.getElementsByTagName("h" + i);
            if (h.length > 0) {
                node.rank = -i;
                node.text = h[0].textContent;
                break;
            }
        }

        if (node.rank === undefined) {
            node.rank = -1;
            node.text = "";
        }
    }
}

// HTMLParser.js
// XML and HTML parsers returning documents or document fragments

function parseXML(source) {
    try {
        var xml = (new DOMParser()).parseFromString(source, "text/xml");
        var parserError = !xml;
        if (!parserError) parserError = xml.getElementsByTagName("parsererror")[0];
        if (parserError) throw parserError;
    } catch (parserError) {
        xml = (new DOMParser()).parseFromString("<root>" + source + "</root>", "text/xml");
        if (xml && !xml.getElementsByTagName("parsererror")[0]) {
            var range = xml.createRange();
            range.selectNodeContents(xml.documentElement); // selects content of <root>
            return range.extractContents();
        }
        throw parserError;
    }
    return xml;
}

function parseHTML(source) {
    var html = document.implementation.createHTMLDocument("");
    html.documentElement.innerHTML = source;
    if (/<(?:html|head|body)[ \f\r\n\t>]/i.test(source)) {
        return html;
    } else {
        var range = html.createRange();
        range.selectNodeContents(html.body); // selects content of <body>
        return range.extractContents();
    }
}

// frontend.js
function outline() {

    var url = document.getElementById("url_input").value;
    var text = document.getElementById("direct_input").value;
    var output = document.getElementById("output");
    output.innerHTML = "";

    // Options
    var XML = document.getElementById("xml_parser").checked;

    // Direct input first
    if (text) {
        processInput(text);
    } else {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = function () {
            processInput(xhr.responseText);
        };
        xhr.send(null);
    }

    function processInput(source) {
        try {
            var node;
            if (XML) {
                try {
                    node = parseXML(source);
                } catch (parserError) {
                    if (!(parserError instanceof Node)) throw new Error("Invalid XML"); // Explorer
                    var errorDiv = parserError.getElementsByTagName("div")[0]; // WebKit
                    if (!errorDiv) errorDiv = parserError; // Mozilla, Opera
                    var error = new Error(errorDiv.textContent);
                    var match = errorDiv.textContent.match(/line\s(\d+)/);
                    if (match) error.line = parseInt(match[1]) - 1;
                    match = errorDiv.textContent.match(/column\s(\d+)/);
                    if (match) error.column = parseInt(match[1]) - 1;
                    throw error;
                }
            } else {
                try {
                    node = parseHTML(source);
                } catch (error) {
                    throw new Error("This browser could not parse HTML input");
                }
            }
            processNode(node);
        } catch (error) {
            output.appendChild(printError(error, source));
        }
    }

    function getBody(node) {
        if (node.nodeType === 9) {
            var body = node.getElementsByTagName("body")[0];
            if (body === undefined) {
                body = node.createElement("body");
                while (node.childNodes.length > 0) {
                    if (node.childNodes[0].nodeType === 10) node.removeChild(node.childNodes[0]);
                    else body.appendChild(node.childNodes[0]);
                }
            }
            return body;
        } else if (node.nodeType === 11) {
            for (var i = 0; i < node.childNodes.length; i++) {
                if (node.childNodes[i].nodeType !== 1) continue;
                if (node.childNodes[i].nodeName.toLowerCase() === "body") return node.childNodes[i];
                var body = node.childNodes[i].getElementsByTagName("body")[0];
                if (body !== undefined) return body;
            }
            var body = node.ownerDocument.createElement("body");
            body.appendChild(node);
            return body;
        }
    }

    function processNode(node) {
        var body = getBody(node);

        // Compute outline
        HTMLOutline(body);

        // Add outlines of all sectioning roots to the main outline
        var roots = getSectioningRoots(body);
        for (var i = 1; i < roots.length; i++) {
            // Figure out where the sectioning root is in the outline
            var section = roots[i].parentSection;
            var position = 0;
            while (section.childSections.length > position && (section.childSections[position].root || (section.childSections[position].associatedNodes[0].compareDocumentPosition(roots[i]) & Node.DOCUMENT_POSITION_FOLLOWING))) {
                ++position;
            }
            section.childSections.splice(position, 0, {
                "root": true,
                "childSections": roots[i].sectionList
            });
        }

        output.appendChild(printOutline(body.sectionList));
    }

    function printOutline(outline) {
        var ol = document.createElement("ol");
        ol.className = "outline";
        var n = 0;
        for (var i = 0; i < outline.length; i++) {
            if (outline[i].root) ol.appendChild(printRoot(outline[i]));
            else {
                // create section number
                outline[i].number = outline[i].parentSection !== null ? outline[i].parentSection.number.slice(0) : [];
                outline[i].number.push(++n);
                ol.appendChild(printSection(outline[i]));
            }
        }
        return ol;
    }

    function printRoot(root) {
        var li = document.createElement("li");
        li.className = "root";
        var title = document.createElement("span");
        title.textContent = "root";
        li.appendChild(title);

        var ol = printOutline(root.childSections);
        ol.className += " shadow";
        li.appendChild(ol);
        return li;
    }

    function printSection(section) {
        var li = document.createElement("li");

        // Section number
        var number = section.number.slice(0);
        var span = document.createElement("span");
        span.innerHTML = "<span class=\"sec_prefix\"></span>" + number.pop() + ".";
        span.className = "sec_number";
        if (number.length > 0) span.firstChild.textContent = number.join(".") + ".";
        li.appendChild(span);

        // Section title
        var title = document.createElement("span");
        li.appendChild(title);

        if (section.heading === null) {
            switch (section.associatedNodes[0].nodeName.toLowerCase()) {
                case "blockquote": title.textContent = "Quoted content"; break;
                case "body": title.textContent = "Document"; break;
                case "details": title.textContent = "Widget"; break;
                case "dialog": title.textContent = "Application"; break;
                case "fieldset": title.textContent = "Form controls"; break;
                case "figure": title.textContent = "Figure"; break;
                case "td": title.textContent = "Data cell"; break;
                case "article": title.textContent = "Article"; break;
                case "aside": title.textContent = "Sidebar"; break;
                case "nav": title.textContent = "Navigation"; break;
                case "section": title.textContent = "Section"; break;
            }
            title.className = "no_title";
        } else if (/^[ \r\n\t]*$/.test(section.heading.text)) { // CSS whitespace
            title.textContent = "Empty title";
            title.className = "no_title";
        } else {
            title.textContent = section.heading.text;
        }

        var details = document.createElement("span");
        details.className = "details";
        var s = "<code>";
        if (section.explicit) s += "&lt;" + section.associatedNodes[0].nodeName.toLowerCase() + "&gt;";
        if (section.heading) s += "&lt;h" + (-section.heading.rank) + "&gt;";
        s += "</code>";
        details.innerHTML = s;
        li.appendChild(details);

        li.appendChild(printOutline(section.childSections));
        return li;
    }

    function printError(error, source) {
        var div = document.createElement("div");
        div.innerHTML = "<h4>Error!</h4>";
        var p = document.createElement("p");
        p.className = "error";
        p.textContent = error.message;
        div.appendChild(p);
        if (error.line !== undefined) {
            var line = source.split("\n")[error.line];
            if (line !== undefined) {
                p = document.createElement("pre");
                if (error.column !== undefined) {
                    var caret = document.createElement("span");
                    caret.className = "error_caret";
                    caret.textContent = line.length > error.column ? line.charAt(error.column) : " ";
                    p.appendChild(document.createTextNode(line.substring(0, error.column)));
                    p.appendChild(caret);
                    p.appendChild(document.createTextNode(line.substring(error.column + 1)));
                } else p.textContent = line;
                div.appendChild(p);
            }
        }
        return div;
    }

    function getSectioningRoots(body) {
        var roots = new Array();
        var node = body;
        start: while (node) {
            if (["blockquote", "body", "details", "dialog", "fieldset", "figure", "td"].indexOf(node.nodeName.toLowerCase()) !== -1) roots.push(node);
            if (node.firstChild) {
                node = node.firstChild;
                continue start;
            }
            while (node) {
                if (node === body) break start;
                if (node.nextSibling) {
                    node = node.nextSibling;
                    continue start;
                }
                node = node.parentNode;
            }
        }
        return roots;
    }

}


document.addEventListener('DOMContentLoaded', () => {
    if (location.search) {
        function parseWithRegExp(string, regex) {
            var match;
            var obj = new Object();
            while ((match = regex.exec(string)) !== null) {
                obj[match[1]] = match[2];
            }
            return obj;
        }
        var queryOptions = parseWithRegExp(location.search.substr(1), /([^&=]*)=([^&]*)/g);

        if (queryOptions.url) {
            document.getElementById("url_input").value = decodeURIComponent(queryOptions.url);
            document.getElementById("direct_input").value = "";
        }
        if (queryOptions.input) document.getElementById("direct_input").value = decodeURIComponent(queryOptions.input);
        if (queryOptions.xml !== undefined) document.getElementById("xml_parser").checked = true;

        if (queryOptions.url || queryOptions.input) outline();
    }

    var input = document.getElementById("direct_input");
    var output = document.getElementById("output");

    if (window.FileReader) {
        var reader = new FileReader();
        reader.onload = function () {
            input.value = reader.result;
        }
        document.getElementById("file_input").addEventListener("change", function (event) {
            reader.readAsText(event.target.files[0]);
        }, false);
    } else {
        document.getElementById("file_input").disabled = true;
    }

    document.getElementById("output_options").addEventListener("change", function (event) {
        switch (event.target.id) {
            case "show_elements":
                output.classList.toggle("show_elements");
                break;
            case "show_roots":
                output.classList.toggle("show_roots");
                break;
            case "numbering":
                output.setAttribute("data-numbering", event.target.value);
                break;
        }
    }, false);
})