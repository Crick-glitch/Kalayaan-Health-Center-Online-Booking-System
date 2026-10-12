# Kalayaan Health Center - Frontend

React 18 + Ant Design 5 + React Router 6. Talks to the Express API in `kalayaan-backend`.

## Run it
1. Start the backend first (`npm run seed`, then `npm run dev` in kalayaan-backend, port 8000).
2. `npm install`, then `npm start` (http://localhost:3000).
3. `.env` holds `REACT_APP_API_URL` (default http://localhost:8000/api).

## Demo logins (password for all: Kalayaan#2026)
Admin paolo@kalayaan.example, Receptionist joy@kalayaan.example, Doctor elena@kalayaan.example, Patient ana.reyes@email.com.
The login page also has a "Demo accounts" panel (turn off in `src/config/clinic.js`).

The frontend uses the Express API at `REACT_APP_API_URL`. In local development, verification/reset codes are displayed in the UI if SMTP is not configured. Real email delivery requires SMTP settings in the backend `.env`.
