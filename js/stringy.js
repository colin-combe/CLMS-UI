var CLMSUI = CLMSUI || {};

CLMSUI.Strings = {
    "strings": {
        "en": {
            "distogram": {
                "short": "Short",
                "within": "Within Distance",
                "overlong": "Overlong",
            },
        },
    },

    "getString": function(descriptor, language) {
        language = language || "en";
        return this[language][descriptor];
    },
};
