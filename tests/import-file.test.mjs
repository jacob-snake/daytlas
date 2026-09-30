import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { readOuraFile, parseCsv } from '../src/lib/oura/import-file.ts';
import { mergeWide } from '../src/lib/oura/metrics.ts';
const csv = 'date,Sleep Score,Readiness Score,Activity Score,Steps,Total Sleep Duration,Average HRV,Temperature Deviation (°C)\n2026-01-02,84,80,90,6000,27000,52,-0.2\n2026-01-03,,82,89,7000,,54,0.1';
test('combined Oura CSV preserves units, missing values and main metrics', () => {
 const data = readOuraFile('oura.csv', strToU8(csv));
 assert.equal(data.days, 2);
 const rows = mergeWide({sleep:data.collections.daily_sleep, readiness:data.collections.daily_readiness,activity:data.collections.daily_activity,periods:data.collections.sleep,spo2:[]});
 assert.equal(rows[0].total_sleep, 7.5); assert.equal(rows[0].avg_hrv, 52);
 assert.equal(rows[0].temp_deviation,-0.2); assert.equal(rows[1].sleep_score, undefined);
 assert.equal(rows[1].total_sleep,null); assert.equal(rows[0].bedtime,null);
});
test('ZIP recognizes API-style daily collections and skips unrelated data', () => {
 const data=readOuraFile('export.zip',zipSync({'daily_sleep.csv':strToU8('day,score\n2026-01-02,82'),'daily_activity.csv':strToU8('day,steps,score\n2026-01-02,10000,90'),'personal.csv':strToU8('email,name\nprivate@example.test,Person')}));
 assert.equal(data.days,1); assert.equal(data.collections.daily_activity[0].steps,10000);
 assert.equal(data.warnings.length,1); assert(!JSON.stringify(data).includes('private@example'));
});
test('CSV quoting and semicolon handling, no formula evaluation', () => {
 assert.deepEqual(parseCsv('a,b\n"x,y","two""quotes"\n'),[['a','b'],['x,y','two"quotes']]);
 assert.equal(readOuraFile('daily_sleep.csv',strToU8('day;score\n2026-01-02;82')).days,1);
 assert.throws(()=>readOuraFile('daily_sleep.csv',strToU8('day,score\n2026-01-02,=1+2')));
});
test('invalid/future dates, broken rows, conflicting duplicate records and archives are rejected', () => {
 for(const text of ['day,score\n2026-02-30,82','day,score\n2099-01-01,82','day,score\n2026-01-02,82,3','day,score\n2026-01-02,82\n2026-01-02,90','day,score\n2026-01-02,101']) assert.throws(()=>readOuraFile('daily_sleep.csv',strToU8(text)));
 assert.throws(()=>readOuraFile('export.zip',strToU8('broken')));
 assert.throws(()=>readOuraFile('export.csv',new Uint8Array(10*1024*1024+1)));
 assert.throws(()=>readOuraFile('export.zip',zipSync({'large.csv':new Uint8Array(31*1024*1024)})));
});
test('identical overlapping files deduplicate daily scores',()=>{
 const data=readOuraFile('export.zip',zipSync({'a/daily_sleep.csv':strToU8('day,score\n2026-01-02,82'),'b/daily_sleep.csv':strToU8('day,score\n2026-01-02,82')}));
 assert.equal(data.collections.daily_sleep.length,1);
});
