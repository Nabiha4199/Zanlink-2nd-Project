import test from 'node:test';
import assert from 'node:assert/strict';
import {FORM_SCHEMAS, initialForm, formPayload, validateForm, documentFacts} from './requestForms.js';

function complete(type) {
  return Object.fromEntries(FORM_SCHEMAS[type].fields.map(f => [f.key,
    f.type === 'file' ? [] : f.type === 'calculated' ? '' : f.type === 'number' ? '0' : f.type === 'date' ? '2026-09-25' : f.options?.[0] || 'Example']));
}
test('each template validates only its own required fields and retains submitted details', () => {
  for (const type of Object.keys(FORM_SCHEMAS)) {
    assert.notEqual(validateForm(type, initialForm(type)), '', type);
    const values = formPayload(type, complete(type));
    assert.equal(validateForm(type, values), '', type);
    const stored = JSON.parse(JSON.stringify({request_type:type, ...values}));
    for (const field of FORM_SCHEMAS[type].fields.filter(f => f.type !== 'file')) {
      assert.ok(documentFacts(stored).some(([label,value]) => label === field.label && value === stored[field.key]), `${type}: ${field.label}`);
    }
    for (const field of FORM_SCHEMAS[type].fields.filter(f => f.required)) {
      assert.notEqual(validateForm(type, {...values, [field.key]:''}), '', `${type}: ${field.label}`);
    }
  }
});
test('Churn and On Hold do not require replacement capacity or prices', () => {
  for (const type of ['Churn','On Hold']) {
    const payload = formPayload(type, {...complete(type),new_capacity:'stale draft',new_price:'500'});
    assert.equal(payload.new_capacity,undefined);
    assert.equal(payload.new_price,undefined);
    assert.equal(payload.mrr,'0');
    assert.equal(validateForm(type,payload),'');
  }
  assert.equal(FORM_SCHEMAS.Churn.fields.find(f=>f.key==='current_capacity').label,'Package');
  assert.equal(FORM_SCHEMAS['On Hold'].fields.find(f=>f.key==='current_capacity').label,'Original Plan');
});
test('seasonal downgrade calculates signed differences including zero and decimal prices', () => {
  assert.equal(formPayload('Seasonal Downgrade',{current_price:'200',new_price:'100'}).price_difference,-100);
  assert.equal(formPayload('Seasonal Downgrade',{current_price:'0',new_price:'0'}).price_difference,0);
  assert.equal(formPayload('Seasonal Downgrade',{current_price:'10.20',new_price:'10.10'}).price_difference,-0.1);
  assert.equal(formPayload('Seasonal Downgrade',{current_price:'',new_price:'0'}).price_difference,'');
});
test('visible radio choices are specific to the original form', () => {
  const values = complete('Upgrade');
  assert.notEqual(validateForm('Upgrade',{...values,client_segment:'Wholesale'}),'');
  assert.equal(validateForm('Downgrade',{...complete('Downgrade'),client_segment:'Wholesale'}),'');
  assert.equal(validateForm('Churn',{...complete('Churn'),client_segment:'Intercompany'}),'');
  assert.notEqual(validateForm('On Hold',{...complete('On Hold'),mrr:'-1'}),'');
});
test('optional seasonal upgrade files survive JSON persistence', () => {
  const attachments = [{name:'approval.txt',size:2,type:'text/plain',data:'data:text/plain;base64,T0s='}];
  const stored = JSON.parse(JSON.stringify(formPayload('Seasonal Upgrade',{...complete('Seasonal Upgrade'),attachments})));
  assert.deepEqual(stored.attachments,attachments);
  assert.equal(formPayload('Upgrade',{...complete('Upgrade'),attachments}).attachments,undefined);
});
