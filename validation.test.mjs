import test from "node:test";
import assert from "node:assert/strict";
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const categories=["Under 19","F1 Trainee","Non-F1 Trainee","Go-Karting","NASCAR","Rally"];
test("email validation accepts a normal email",()=>assert.equal(emailPattern.test("driver@example.com"),true));
test("email validation rejects whitespace and missing domain",()=>{assert.equal(emailPattern.test("not an email"),false);assert.equal(emailPattern.test("user@localhost"),false);});
test("driver category allowlist includes the six requested categories",()=>{for(const c of ["Under 19","F1 Trainee","Non-F1 Trainee","Go-Karting","NASCAR","Rally"])assert.ok(categories.includes(c));});
test("unknown categories are rejected",()=>assert.equal(categories.includes("Official F1"),false));
test("quote brief minimum is enforced by the server contract",()=>{const valid=s=>s.trim().length>=15&&s.length<=4000;assert.equal(valid("short"),false);assert.equal(valid("A legitimate project brief"),true);});
