// Names the end-to-end tests give the records they create, so trial
// leftovers can be found and removed without touching real data.

export const TEST_PERSON_PATTERNS = ["عضو اختبار %", "%(اختبار)", "مدير تنفيذي %"];
export const TEST_DEPARTMENT_PATTERN = "إدارة اختبار %";

const like = (pattern: string) => new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`);

/** Whether a person's name is one the tests create. */
export const isTestPerson = (name: string) => TEST_PERSON_PATTERNS.some((p) => like(p).test(name));
/** Whether a department's name is one the tests create. */
export const isTestDepartment = (name: string) => like(TEST_DEPARTMENT_PATTERN).test(name);
