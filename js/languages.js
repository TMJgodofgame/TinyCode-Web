// Generated from moodle_html/languages.json by tools/build-amd.cjs.
export const languages = {
    "c": {
        "label": "C",
        "lexer": "c",
        "extensions": [
            ".c",
            ".h"
        ],
        "preprocessor": true
    },
    "cpp": {
        "label": "C++",
        "lexer": "cpp",
        "extensions": [
            ".cpp",
            ".cc",
            ".cxx",
            ".hpp",
            ".hh"
        ],
        "preprocessor": true,
        "raw": "cpp"
    },
    "csharp": {
        "label": "C#",
        "lexer": "csharp",
        "extensions": [
            ".cs"
        ],
        "raw": "csharp"
    },
    "java": {
        "label": "Java",
        "lexer": "java",
        "extensions": [
            ".java"
        ],
        "triple": true
    },
    "kotlin": {
        "label": "Kotlin",
        "lexer": "kotlin",
        "extensions": [
            ".kt",
            ".kts"
        ],
        "triple": true,
        "nestedComments": true
    },
    "swift": {
        "label": "Swift",
        "lexer": "swift",
        "extensions": [
            ".swift"
        ],
        "triple": true,
        "raw": "swift",
        "nestedComments": true
    },
    "go": {
        "label": "Go",
        "lexer": "go",
        "extensions": [
            ".go"
        ],
        "backtick": true
    },
    "rust": {
        "label": "Rust",
        "lexer": "rust",
        "extensions": [
            ".rs"
        ],
        "raw": "rust",
        "nestedComments": true
    },
    "objectivec": {
        "label": "Objective-C",
        "lexer": "objective-c",
        "extensions": [
            ".m",
            ".mm"
        ],
        "preprocessor": true
    },
    "arduino": {
        "label": "Arduino",
        "lexer": "arduino",
        "extensions": [
            ".ino",
            ".pde"
        ],
        "preprocessor": true,
        "raw": "cpp"
    },
    "scala": {
        "label": "Scala",
        "lexer": "scala",
        "extensions": [
            ".scala",
            ".sc"
        ],
        "triple": true,
        "nestedComments": true
    },
    "dart": {
        "label": "Dart",
        "lexer": "dart",
        "extensions": [
            ".dart"
        ],
        "sq": true,
        "triple": true
    },
    "php": {
        "label": "PHP",
        "lexer": "php",
        "extensions": [
            ".php",
            ".phtml"
        ],
        "sq": true,
        "hash": true,
        "heredoc": true
    },
    "perl": {
        "label": "Perl",
        "lexer": "perl",
        "extensions": [
            ".pl",
            ".pm"
        ],
        "sq": true,
        "hash": true,
        "slashComments": false,
        "blockComments": false,
        "heredoc": true
    },
    "r": {
        "label": "R",
        "lexer": "r",
        "extensions": [
            ".r",
            ".R"
        ],
        "sq": true,
        "hash": true,
        "slashComments": false,
        "blockComments": false
    },
    "javascript": {
        "label": "JavaScript",
        "lexer": "javascript",
        "extensions": [
            ".js",
            ".mjs",
            ".cjs",
            ".jsx"
        ],
        "sq": true,
        "backtick": true,
        "regex": true
    },
    "typescript": {
        "label": "TypeScript",
        "lexer": "typescript",
        "extensions": [
            ".ts",
            ".tsx"
        ],
        "sq": true,
        "backtick": true,
        "regex": true
    },
    "json": {
        "label": "JSON",
        "lexer": "json",
        "extensions": [
            ".json"
        ],
        "slashComments": false,
        "blockComments": false,
        "data": true
    },
    "css": {
        "label": "CSS",
        "lexer": "css",
        "extensions": [
            ".css"
        ],
        "sq": true,
        "slashComments": false,
        "style": true
    },
    "scss": {
        "label": "SCSS",
        "lexer": "scss",
        "extensions": [
            ".scss"
        ],
        "sq": true,
        "style": true
    },
    "less": {
        "label": "Less",
        "lexer": "less",
        "extensions": [
            ".less"
        ],
        "sq": true,
        "style": true
    },
    "graphql": {
        "label": "GraphQL",
        "lexer": "graphql",
        "extensions": [
            ".graphql",
            ".gql"
        ],
        "hash": true,
        "slashComments": false,
        "blockComments": false,
        "triple": true,
        "data": true
    },
    "python": {
        "label": "Python",
        "lexer": "python",
        "extensions": [
            ".py",
            ".pyw"
        ],
        "sq": true,
        "hash": true,
        "slashComments": false,
        "blockComments": false,
        "triple": true
    },
    "plaintext": {
        "label": "Texto sin formato",
        "lexer": "text",
        "extensions": [
            ".txt"
        ],
        "data": true
    }
};
export const normaliseLanguage = (name) => ({"c++":"cpp","c#":"csharp","cs":"csharp","objc":"objectivec","objective-c":"objectivec","js":"javascript","ts":"typescript","py":"python","text":"plaintext"}[name] || name);
