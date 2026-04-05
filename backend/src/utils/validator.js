"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCalculations = exports.isExtractionEmpty = void 0;
// Thin wrapper that re-exports the compiled validator implementation
// located in `dist`. This keeps tests importing from `src/utils/...`
// while preserving the original runtime logic (no changes to behavior).
// Require the compiled JS implementation from `dist` at runtime. Using
// `require` keeps TypeScript from trying to perform a typed import against
// the JS-only artifact and avoids changing any validator logic.
const compiled = require("../../dist/services/agent/validator");
exports.isExtractionEmpty = compiled.isExtractionEmpty;
exports.validateCalculations = compiled.validateCalculations;
exports.default = {
    isExtractionEmpty: exports.isExtractionEmpty,
    validateCalculations: exports.validateCalculations,
};
