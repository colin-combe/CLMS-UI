var CLMSUI = CLMSUI || {};

CLMSUI.Strings = { 
    "strings": {
        "en": {
            "distogram": {
                "within": "within",
                "borderline": "borderline",
                "overlong": "overlong",
            },
        },
    },
    
    "getString": function (descriptor, language) {
        language = language || "en";
        return this[language][descriptor];
    },
};