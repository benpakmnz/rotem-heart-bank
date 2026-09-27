import React from 'react';
import { adminUrl } from '../routes';
import { useQrDataUrl } from './screens/common';

// "📱 שליטה מהטלפון": scan to open the admin screen on the game master's phone.
const AdminInvite = ({ code, pin, local, onClose }) => {
  const qr = useQrDataUrl(adminUrl(code, pin, { local }));
  return (
    <div className="hb-settings-backdrop" role="dialog" aria-modal="true" aria-label="שליטה מהטלפון" onClick={onClose}>
      <div className="hb-admin-invite" onClick={(e) => e.stopPropagation()}>
        <h2>📱 שליטה במשחק מהטלפון</h2>
        <p>סרקו עם הטלפון של מנהל/ת המשחק. משם אפשר לקדם שלבים, לשייך לבבות שנמצאו, לסמן קליעות והצלחות בפנטומימה, ולערוך את תוכן המשחק.</p>
        {qr ? <img className="hb-qr" src={qr} alt="QR לכניסת מנהל" /> : <div className="hb-qr hb-qr-empty" />}
        <div className="hb-admin-invite-codes">
          <span>
            קוד משחק: <strong dir="ltr">{code}</strong>
          </span>
          <span>
            קוד מנהל: <strong dir="ltr">{pin}</strong>
          </span>
        </div>
        <p className="hb-admin-invite-note">🤫 רק למנהל/ת - הקוד פותח את כל השליטה במשחק. אפשר לשנות אותו בעריכת התוכן.</p>
        <button type="button" className="hb-btn hb-btn-primary" onClick={onClose}>
          סגירה
        </button>
      </div>
    </div>
  );
};

export default AdminInvite;
