module.exports = function(api) {
    const isProduction = api.env("production");
    const isTest = api.env("test");
    return {
        presets: isTest ? [
            "@babel/env",
            "@babel/preset-react"
        ] : [
          ["@babel/preset-env", { modules: false }],
          "@babel/preset-react",
          "@babel/preset-flow"
        ],
        plugins: [
          "@babel/plugin-transform-flow-strip-types",
          "@babel/plugin-proposal-object-rest-spread",
          "@babel/plugin-proposal-class-properties",
          "@babel/plugin-syntax-dynamic-import",
          ...(isProduction ? [
            "@babel/plugin-transform-react-constant-elements",
            "@babel/plugin-transform-react-inline-elements"
          ] : [
            "react-hot-loader/babel"
          ])
        ]
    };
};
