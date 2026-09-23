from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

USERS = [
    {'id': 'u-kam', 'name': 'Amina KAM', 'email': 'kam@zanlink.co.tz', 'password': 'demo123', 'role': 'KAM / Commercial'},
    {'id': 'u-sdu', 'name': 'Head SDU & Network', 'email': 'sdu@zanlink.co.tz', 'password': 'demo123', 'role': 'Head of SDU & Network'},
    {'id': 'u-com', 'name': 'Head of Commercial', 'email': 'commercial@zanlink.co.tz', 'password': 'demo123', 'role': 'Head of Commercial'},
    {'id': 'u-fin', 'name': 'Finance Officer', 'email': 'finance@zanlink.co.tz', 'password': 'demo123', 'role': 'Finance'},
    {'id': 'u-admin', 'name': 'System Administrator', 'email': 'admin@zanlink.co.tz', 'password': 'demo123', 'role': 'System Admin'},
]


def public_user(user):
    return {key: value for key, value in user.items() if key != 'password'}


@app.post('/api/login')
def login():
    payload = request.json or {}
    user = next(
        (
            item for item in USERS
            if item['email'].lower() == str(payload.get('email', '')).lower()
            and item['password'] == payload.get('password')
        ),
        None,
    )
    if not user:
        return jsonify(error='Invalid email or password'), 401
    return jsonify(public_user(user))


@app.get('/api/users')
def users():
    return jsonify([public_user(user) for user in USERS])


@app.get('/api/requests')
@app.post('/api/requests')
def local_requests():
    return jsonify(error='Requests are stored in the browser localStorage now.'), 410


@app.post('/api/requests/<rid>/action')
def local_request_action(rid):
    return jsonify(error='Request actions are stored in the browser localStorage now.'), 410


if __name__ == '__main__':
    app.run(debug=True, port=5000)
