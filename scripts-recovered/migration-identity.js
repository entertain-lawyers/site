const crypto = require('crypto');
const { v5: uuidv5 } = require('uuid');

// Permanent namespace for WordPress migration deterministic UUIDs
const NAMESPACE_UUID = '1b671a64-40d5-491e-99b0-da01ff1f3341';

/**
 * Normalizes a string for deterministic string derivation
 * e.g., "First Semester" -> "first-semester"
 */
function normalize(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Generates a deterministic Post UUID
 * Format: post:<locale>:<wordpressId>
 */
function generatePostId(locale, wordpressId) {
    const canonical = `post:${locale.toLowerCase()}:${wordpressId}`;
    return uuidv5(canonical, NAMESPACE_UUID);
}

/**
 * Generates a deterministic Resource UUID
 * Format: resource:<locale>:<wordpressId>
 */
function generateResourceId(locale, wordpressId) {
    const canonical = `resource:${locale.toLowerCase()}:${wordpressId}`;
    return uuidv5(canonical, NAMESPACE_UUID);
}

/**
 * Generates a deterministic Document UUID
 * Format: document:<locale>:<wordpressId>
 */
function generateDocumentId(locale, wordpressId) {
    const canonical = `document:${locale.toLowerCase()}:${wordpressId}`;
    return uuidv5(canonical, NAMESPACE_UUID);
}

/**
 * Generates a deterministic Semester UUID
 * Format: semester:<normalized-name>
 */
function generateSemesterId(semesterName) {
    const canonical = `semester:${normalize(semesterName)}`;
    return uuidv5(canonical, NAMESPACE_UUID);
}

/**
 * Generates a deterministic Subject UUID
 * Format: subject:<normalized-semester-name>:<normalized-subject-name>
 */
function generateSubjectId(semesterName, subjectName) {
    const canonical = `subject:${normalize(semesterName)}:${normalize(subjectName)}`;
    return uuidv5(canonical, NAMESPACE_UUID);
}

/**
 * Generates a deterministic Unit UUID
 * Format: unit:<normalized-semester-name>:<normalized-subject-name>:<normalized-unit-name>
 */
function generateUnitId(semesterName, subjectName, unitName) {
    const canonical = `unit:${normalize(semesterName)}:${normalize(subjectName)}:${normalize(unitName)}`;
    return uuidv5(canonical, NAMESPACE_UUID);
}

module.exports = {
    NAMESPACE_UUID,
    generatePostId,
    generateResourceId,
    generateDocumentId,
    generateSemesterId,
    generateSubjectId,
    generateUnitId
};
