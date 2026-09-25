import React, {useState} from 'react';
import {FORM_SCHEMAS, requestTypes, initialForm, formPayload, validateForm} from './requestForms';

function DocumentField({field, value, onChange, managers}) {
  const {key, label, type, required, options = []} = field;
  const id = `document-${key}`;
  const caption = label;
  if (type === 'radio') return <fieldset className="documentRadio"><legend>{caption}</legend><div>{options.map(option =>
    <label key={option}><input type="radio" name={key} value={option} checked={value === option} required={required} onChange={() => onChange(option)}/>{option}</label>
  )}</div></fieldset>;
  if (type === 'select') return <label htmlFor={id}>{caption}<select id={id} required={required} value={value} onChange={e => onChange(e.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
  if (type === 'editable-select') {
    const choices = key === 'account_manager' ? managers : options;
    return <label htmlFor={id}>{caption}<input id={id} list={`${id}-choices`} required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={`Enter or select ${label.toLowerCase()}`}/><datalist id={`${id}-choices`}>{choices.map(option => <option key={option} value={option}/>)}</datalist></label>;
  }
  if (type === 'calculated') return <label htmlFor={id}>{caption}<input id={id} readOnly value={value} placeholder="Calculated from the two prices"/></label>;
  return <label htmlFor={id}>{caption}<input id={id} type={type} required={required} value={value} min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined} onChange={e => onChange(e.target.value)}/></label>;
}

export default function DocumentForm({user, managers, onSubmit}) {
  const [type, setType] = useState('Upgrade');
  const [drafts, setDrafts] = useState({Upgrade:initialForm('Upgrade')});
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const schema = FORM_SCHEMAS[type];
  const values = drafts[type] || initialForm(type);
  const payload = formPayload(type, values);
  const allowed = ['KAM / Commercial','System Admin'].includes(user.role);
  function update(key, value) {setDrafts(previous => ({...previous, [type]:{...(previous[type] || initialForm(type)), [key]:value}}));setError('');}
  async function upload(files) {
    const selected = Array.from(files);
    if (selected.reduce((sum, file) => sum + file.size, 0) > 2 * 1024 * 1024) {setError('Please select files totaling no more than 2 MB.');return;}
    setReading(true);setError('');
    try {
      const attachments = await Promise.all(selected.map(file => new Promise((resolve,reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({name:file.name, size:file.size, type:file.type, data:reader.result});
        reader.onerror = () => reject(new Error('Unable to read the selected file.'));
        reader.readAsDataURL(file);
      })));
      update('attachments', attachments);
    } catch (err) {setError(err.message);} finally {setReading(false);}
  }
  function submit(event) {
    event.preventDefault();
    if (!allowed) {setError('Only KAM / Commercial or System Admin can create requests.');return;}
    const invalid = validateForm(type, payload);
    if (invalid) {setError(invalid);return;}
    setSubmitting(true);
    try {onSubmit({request_type:type, form_version:1, ...payload});}
    catch {setError('The request could not be saved. Browser storage may be full; try removing attachments.');setSubmitting(false);}
  }
  return <><header><div><h1>New Customer Account Request</h1><p>Select a document to fill in its matching form.</p></div></header>
    <section className="panel documentPicker" aria-labelledby="document-type-heading"><h2 id="document-type-heading">Choose a document type</h2><label className="documentTypeLabel" htmlFor="document-type">Select the document you need to submit<select id="document-type" className="documentTypeSelect" value={type} disabled={reading || submitting} onChange={e => {setType(e.target.value);setError('');}}>{requestTypes.map(item => <option key={item} value={item}>{FORM_SCHEMAS[item].title}</option>)}</select></label><p className="documentTypeHelp">The matching form will appear below.</p></section>
    <form className="panel documentForm" onSubmit={submit}>
      <h2>{schema.title}</h2>
      <div className="documentFields">{schema.fields.map(field => field.type === 'file' ? <div key={field.key} className="uploadField"><label htmlFor="document-attachments">{field.label}</label><input key={type} id="document-attachments" type="file" multiple disabled={reading} onChange={e => upload(e.target.files)}/><small>Files are saved in this browser with the request. Maximum 2 MB total.</small>{reading && <p role="status">Reading files…</p>}{values.attachments?.map((file,i) => <div className="attachmentItem" key={`${file.name}-${i}`}><span>{file.name}</span><button type="button" onClick={() => update('attachments',values.attachments.filter((_,index) => index !== i))}>Remove</button></div>)}</div> : <DocumentField key={`${type}-${field.key}`} field={field} value={(field.type === 'calculated' ? payload[field.key] : values[field.key]) ?? ''} managers={managers} onChange={value => update(field.key,value)}/>)}</div>
      {!allowed && <p className="error">Only KAM / Commercial or System Admin can create requests.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions"><button className="primary" disabled={!allowed || reading || submitting}>{submitting ? 'Saving…' : 'Submit Request'}</button></div>
    </form></>;
}
