import test from 'node:test';
import assert from 'node:assert/strict';
import {splitClientPhone,quoteDraft,validateWizardStep} from '../js/skybike/quote-draft.js';
test('separa código y WhatsApp de clientes internacionales guardados sin adivinar prefijos ambiguos',()=>{
 assert.deepEqual(splitClientPhone('+34 600000001'),{countryCode:'+34',customerPhone:'600000001'});
 assert.deepEqual(splitClientPhone('+51900000001'),{countryCode:'+51',customerPhone:'900000001'});
 assert.deepEqual(splitClientPhone('900000001'),{countryCode:'+51',customerPhone:'900000001'});
 assert.throws(()=>validateWizardStep(quoteDraft({customerName:'Demo',customerDocument:'DEMO',customerPhone:'900000001',countryCode:'+0'}),1));
});
