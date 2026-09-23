# ZanLink Project 2

Customer Account Change & Approval System. This is a separate project from the original ZanLink project.

## Business workflow

KAM / Commercial -> Head of SDU & Network -> Head of Commercial -> Finance -> Completed

Request categories:
- Capacity: Upgrade, Downgrade, Seasonal Upgrade, Seasonal Downgrade
- Service status: Disconnection, Reconnection

The request form includes customer/account information, service details, effective/billing date, current/new capacity or plan, current/new price, reason and comments. The workflow keeps an audit history of submission, approvals, returns, rejection and Finance implementation.

## Run the project

### 1. Backend (optional)
```powershell
cd server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Backend: http://localhost:5000

The frontend now handles demo login, requests and approval history in browser `localStorage`. The backend is optional and only keeps lightweight demo user endpoints for development checks.

### 2. Frontend (new terminal)
```powershell
cd client
npm install
npm run dev
```
Open the Vite URL shown in the terminal (normally http://localhost:5173).

## Demo accounts
All passwords: `demo123`

| Role | Email |
|---|---|
| KAM / Commercial | kam@zanlink.co.tz |
| Head of SDU & Network | sdu@zanlink.co.tz |
| Head of Commercial | commercial@zanlink.co.tz |
| Finance | finance@zanlink.co.tz |
| System Admin | admin@zanlink.co.tz |

## Test the full workflow
1. Login as KAM and create a request.
2. Logout and login as Head of SDU & Network; open the request and approve it.
3. Login as Head of Commercial and approve it.
4. Login as Finance and choose Mark Implemented.
5. The request becomes Completed and the request page retains the full approval history.

## Notes
- Uses React + Vite frontend and Flask backend.
- Uses browser `localStorage` for request and approval history persistence.
- This first version is intended for local development/prototyping. Production authentication, attachment storage, notifications and deployment configuration can be added next.
