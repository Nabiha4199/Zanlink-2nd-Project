from flask import Flask,request,jsonify
from flask_cors import CORS
import sqlite3,os
from datetime import datetime
from uuid import uuid4
BASE=os.path.dirname(os.path.abspath(__file__)); DB=os.path.join(BASE,'zanlink_project_2.db')
app=Flask(__name__); CORS(app)
USERS=[
 {'id':'u-kam','name':'Amina KAM','email':'kam@zanlink.co.tz','password':'demo123','role':'KAM / Commercial'},
 {'id':'u-sdu','name':'Head SDU & Network','email':'sdu@zanlink.co.tz','password':'demo123','role':'Head of SDU & Network'},
 {'id':'u-com','name':'Head of Commercial','email':'commercial@zanlink.co.tz','password':'demo123','role':'Head of Commercial'},
 {'id':'u-fin','name':'Finance Officer','email':'finance@zanlink.co.tz','password':'demo123','role':'Finance'},
 {'id':'u-admin','name':'System Administrator','email':'admin@zanlink.co.tz','password':'demo123','role':'System Admin'}]
def db():
 c=sqlite3.connect(DB);c.row_factory=sqlite3.Row;return c
def now():return datetime.now().strftime('%Y-%m-%d %H:%M')
def user():
 uid=request.headers.get('X-User-Id');return next((u for u in USERS if u['id']==uid),None)
def init():
 c=db();c.executescript('''CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,ref TEXT,request_type TEXT,customer_name TEXT,customer_id TEXT,month TEXT,ip_radius TEXT,radius_username TEXT,client_segment TEXT,revenue_type TEXT,mode_of_service TEXT,effective_date TEXT,current_capacity TEXT,new_capacity TEXT,current_price TEXT,new_price TEXT,reason TEXT,comments TEXT,status TEXT,created_by TEXT,created_by_name TEXT,created_at TEXT,updated_at TEXT);CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY AUTOINCREMENT,request_id TEXT,action TEXT,actor_id TEXT,actor_name TEXT,actor_role TEXT,comment TEXT,created_at TEXT);''');c.commit();c.close()
def hydrate(row,c):
 d=dict(row);d['history']=[dict(x) for x in c.execute('SELECT * FROM history WHERE request_id=? ORDER BY id',(d['id'],)).fetchall()];return d
@app.post('/api/login')
def login():
 p=request.json or {};u=next((x for x in USERS if x['email'].lower()==str(p.get('email','')).lower() and x['password']==p.get('password')),None)
 if not u:return jsonify(error='Invalid email or password'),401
 return jsonify({k:v for k,v in u.items() if k!='password'})
@app.get('/api/requests')
def list_requests():
 if not user():return jsonify(error='Unauthorized'),401
 c=db();rows=[hydrate(r,c) for r in c.execute('SELECT * FROM requests ORDER BY created_at DESC').fetchall()];c.close();return jsonify(rows)
@app.post('/api/requests')
def create_request():
 u=user()
 if not u:return jsonify(error='Unauthorized'),401
 if u['role'] not in ['KAM / Commercial','System Admin']:return jsonify(error='Only KAM / Commercial can create requests'),403
 p=request.json or {};required=['request_type','customer_name','customer_id','effective_date','reason']
 if any(not str(p.get(k,'')).strip() for k in required):return jsonify(error='Please complete all required fields'),400
 if p['request_type'] not in ['Disconnection','Reconnection'] and any(not str(p.get(k,'')).strip() for k in ['current_capacity','new_capacity','current_price','new_price']):return jsonify(error='Capacity and price fields are required for upgrade/downgrade requests'),400
 c=db();rid=str(uuid4());n=c.execute('SELECT COUNT(*) n FROM requests').fetchone()['n']+1;ref=f'ZP2-{datetime.now().year}-{n:04d}';t=now()
 fields=['request_type','customer_name','customer_id','month','ip_radius','radius_username','client_segment','revenue_type','mode_of_service','effective_date','current_capacity','new_capacity','current_price','new_price','reason','comments']
 vals=[str(p.get(k,'')) for k in fields];c.execute(f"INSERT INTO requests(id,ref,{','.join(fields)},status,created_by,created_by_name,created_at,updated_at) VALUES ({','.join(['?']*(len(fields)+7))})",[rid,ref,*vals,'Pending SDU & Network',u['id'],u['name'],t,t]);c.execute('INSERT INTO history(request_id,action,actor_id,actor_name,actor_role,comment,created_at) VALUES(?,?,?,?,?,?,?)',(rid,'Request submitted',u['id'],u['name'],u['role'],'',t));c.commit();row=hydrate(c.execute('SELECT * FROM requests WHERE id=?',(rid,)).fetchone(),c);c.close();return jsonify(row),201
@app.post('/api/requests/<rid>/action')
def action(rid):
 u=user()
 if not u:return jsonify(error='Unauthorized'),401
 c=db();r=c.execute('SELECT * FROM requests WHERE id=?',(rid,)).fetchone()
 if not r:c.close();return jsonify(error='Request not found'),404
 status=r['status'];expected={'Pending SDU & Network':'Head of SDU & Network','Pending Head of Commercial':'Head of Commercial','Pending Finance':'Finance'}
 if u['role']!='System Admin' and expected.get(status)!=u['role']:c.close();return jsonify(error='This request is not awaiting action from your role'),403
 p=request.json or {};a=p.get('action');comment=str(p.get('comment','')).strip()
 if a=='approve':
  nxt={'Pending SDU & Network':'Pending Head of Commercial','Pending Head of Commercial':'Pending Finance','Pending Finance':'Completed'}.get(status)
  if not nxt:c.close();return jsonify(error='Request cannot be approved from this status'),400
  label='Implemented by Finance' if nxt=='Completed' else 'Approved'
 elif a=='return':nxt='Returned';label='Returned to KAM'
 elif a=='reject':nxt='Rejected';label='Rejected'
 else:c.close();return jsonify(error='Invalid action'),400
 t=now();c.execute('UPDATE requests SET status=?,updated_at=? WHERE id=?',(nxt,t,rid));c.execute('INSERT INTO history(request_id,action,actor_id,actor_name,actor_role,comment,created_at) VALUES(?,?,?,?,?,?,?)',(rid,label,u['id'],u['name'],u['role'],comment,t));c.commit();row=hydrate(c.execute('SELECT * FROM requests WHERE id=?',(rid,)).fetchone(),c);c.close();return jsonify(row)
@app.get('/api/users')
def users():return jsonify([{k:v for k,v in u.items() if k!='password'} for u in USERS])
if __name__=='__main__':init();app.run(debug=True,port=5000)
else:init()
