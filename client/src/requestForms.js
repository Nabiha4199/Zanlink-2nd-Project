// Field order, labels and required markers transcribed from the supplied forms.
const field = (key, label, type = 'text', required = true, options) => ({key, label, type, required, options});
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const month = field('month', 'Month', 'select', true, months);
const client = field('customer_name', 'Client Name');
const ipOptions = ['IP','Radius','Local Loop','IP and Radius'];
const ip = (type = 'radio') => field('ip_radius', 'IP/Radius', type, true, ipOptions);
const radius = field('radius_username', 'Radius Username', 'text', false);
const segment = (label = 'Client Segmentation', options = ['Enterprise','Retail'], type = 'radio') => field('client_segment', label, type, true, options);
const revenue = (label = 'Revenue type', options = ['DIA'], type = 'radio') => field('revenue_type', label, type, true, options);
const mode = (type = 'radio') => field('mode_of_service', 'Mode of service', type, true, ['Fiber','Wireless']);
const date = label => field('effective_date', label, 'date');
const plan = (key, label, options = []) => field(key, label, 'editable-select', true, options);
const price = (key, label) => field(key, label, 'number');
const currency = field('currency', 'Currency', 'select', true, ['TZS','USD']);
const manager = field('account_manager', 'Account Manager', 'editable-select');
const reason = field('reason', 'Reason', 'editable-select');
const comments = field('comments', 'Comments', 'text', false);
const common = [month, client, ip(), radius];
// Closed dropdowns in the PDFs do not reveal their option lists. Do not invent them.
export const FORM_SCHEMAS = {
  Upgrade: {title:'Upgrade Request', source:'Upgrade Request.pdf', fields:[
    ...common, segment(), revenue(), mode(), date('Billing Date'),
    plan('current_capacity','Current Plan'), plan('new_capacity','New Upgrade'), currency,
    price('current_price','Current Price'), price('new_price','Upgrade Price'), manager
  ]},
  Downgrade: {title:'Downgrade Request', source:'Downgrade Request.pdf', fields:[
    ...common, segment('Client Segmentation',['Enterprise','Retail','Wholesale']),
    revenue('Revenue type',['DIA','Local Loop','Seasonal Downgrade']), mode(), date('Effective Billing Date'),
    plan('current_capacity','Original Plan'), plan('new_capacity','New Plan'), currency,
    price('current_price','Original Price'), price('new_price','New Price'), manager, field('reason','Reason')
  ]},
  'Seasonal Upgrade': {title:'Seasonal Upgrade', source:'Seasonal Upgrade 21.pdf', fields:[
    month, client, field('client_segment','Client Segmentation','editable-select'), ip('editable-select'), radius,
    field('revenue_type','Revenue type','editable-select'), field('mode_of_service','Mode of service','editable-select'), date('Billing Date'),
    plan('current_capacity','Current Plan'), plan('new_capacity','New Downgrade'), currency,
    price('current_price','Current Price'), price('new_price','Downgrade Price'), manager,
    field('attachments','File Upload','file',false)
  ]},
  'Seasonal Downgrade': {title:'Seasonal Downgrade', source:'Seasonal Downgrade 24.xlsx', spreadsheet:true, fields:[
    month, client, segment('Client Segmentation',['Enterprise','Retail'],'editable-select'), ip('editable-select'),
    field('service_no','Service No'), revenue('Revenue type',['DIA'],'editable-select'), mode('editable-select'), date('Billing Date'),
    plan('current_capacity','Current Plan'), plan('new_capacity','New Downgrade'), currency,
    price('current_price','Current Price'), price('new_price','Downgrade Price'),
    field('price_difference','Price Difference','calculated',false), manager
  ]},
  Churn: {title:'Churn', source:'Churn.pdf', fields:[
    ...common, plan('current_capacity','Package'), field('revenue_type','Revenue','editable-select'),
    segment('Category',['Enterprise','Intercompany','Retail']), date('Billing End'), reason, comments,
    currency, price('mrr','MRR'), manager
  ]},
  'On Hold': {title:'On Hold', source:'On Hold 20.pdf', fields:[
    ...common, segment('Segment'), revenue('Revenue Type',['DIA','Local Loop']), date('Billing End'), reason, comments,
    plan('current_capacity','Original Plan'), currency, price('mrr','MRR'), manager
  ]},
  // Existing actions remain available for users of the original workflow.
  Disconnection: {title:'Disconnection', fields:[client, field('customer_id','Customer ID'), date('Effective / Billing Date'),
    field('disconnection_type','Disconnection Type','select',true,['Termination - device retrieval required','Temporary Suspension']),
    field('reason','Reason'), comments]},
  Reconnection: {title:'Reconnection', fields:[client, field('customer_id','Customer ID'), date('Effective / Billing Date'),
    plan('new_capacity','New Capacity / Plan'), currency, price('new_price','New Price'), field('reason','Reason'), comments]}
};
export const requestTypes = Object.keys(FORM_SCHEMAS);
export function initialForm(type) {
  return Object.fromEntries(FORM_SCHEMAS[type].fields.map(f => [f.key, f.type === 'file' ? [] : '']));
}
export function formPayload(type, values) {
  const fields = FORM_SCHEMAS[type].fields;
  const result = Object.fromEntries(fields.filter(f => f.type !== 'calculated').map(f => [f.key,
    typeof values[f.key] === 'string' ? values[f.key].trim() : values[f.key] ?? (f.type === 'file' ? [] : '')]));
  if (fields.some(f => f.key === 'price_difference')) {
    result.price_difference = result.current_price !== '' && result.new_price !== ''
      ? Math.round((Number(result.new_price) - Number(result.current_price)) * 100) / 100 : '';
  }
  return result;
}
export function validateForm(type, values) {
  for (const f of FORM_SCHEMAS[type].fields) {
    const value = values[f.key];
    if (f.required && !String(value ?? '').trim()) return `Please complete ${f.label}.`;
    if (f.type === 'number' && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0)) return `${f.label} must be a non-negative number.`;
    if (['radio','select'].includes(f.type) && value && !f.options.includes(value)) return `Please select a valid ${f.label}.`;
  }
  return '';
}
export function documentFacts(row) {
  const schema = FORM_SCHEMAS[row.request_type];
  if (!schema) return [];
  return schema.fields.filter(f => f.type !== 'file').map(f => [f.label, row[f.key] ?? '']);
}
