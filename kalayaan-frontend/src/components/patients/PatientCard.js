// PatientCard.js - one selectable patient: name, phone and email on the left, a female or male avatar on the right.
// Used by Create Appointment > Select Patient. The avatar is a simple drawing (no photo); a patient with no sex on file gets a neutral one.
import { CheckCircleFilled } from '@ant-design/icons';
import { fullName } from '../../utils/formatters';

const LOOK = {
  Female: { bg: '#FDF3DC', skin: '#E9B98F', hair: '#8A5A00', top: '#D98E04' },
  Male: { bg: '#E8F3FA', skin: '#E0AE86', hair: '#0B2545', top: '#0E7C86' },
  Neutral: { bg: '#EEF2F6', skin: '#C9D3DC', hair: '#9AA8B5', top: '#9AA8B5' },
};

export function PatientAvatar({ sex, size = 48 }) {
  const c = LOOK[sex] || LOOK.Neutral;
  return (
    <span style={{ display: 'inline-block', width: size, height: size, flex: 'none', borderRadius: '50%', overflow: 'hidden' }}>
      <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={sex ? `${sex} avatar` : 'Patient avatar'}>
        <rect width="48" height="48" fill={c.bg} />
        {sex === 'Female' && <><path d="M15.5 20C12.5 28 13.5 34 17 37l2-8z" fill={c.hair} /><path d="M32.5 20C35.5 28 34.5 34 31 37l-2-8z" fill={c.hair} /></>}
        <path d="M4 48C6 38 14 34 24 34s18 4 20 14z" fill={c.top} />
        <rect x="21" y="28" width="6" height="8" rx="2" fill={c.skin} />
        <ellipse cx="24" cy="21" rx="7.5" ry="8.5" fill={c.skin} />
        {sex === 'Female' && <path d="M15.5 21C15 12 19 9 24 9s9 3 8.5 12C31 16 28 14 24 14s-7 2-8.5 7z" fill={c.hair} />}
        {sex === 'Male' && <path d="M16 19c-.5-7 3-9 8-9s8.5 2 8 9c-2-3.5-5-4.5-8-4.5S18 15.5 16 19z" fill={c.hair} />}
        {sex !== 'Female' && sex !== 'Male' && <path d="M16.5 19c0-5 3-8 7.5-8s7.5 3 7.5 8c-2-3-5-4-7.5-4s-5.5 1-7.5 4z" fill={c.hair} />}
      </svg>
    </span>
  );
}

export default function PatientCard({ patient: p, selected, onSelect }) {
  return (
    <button type="button" role="radio" aria-checked={selected} className={`patient-card${selected ? ' is-selected' : ''}`} onClick={() => onSelect(p)}>
      <span className="patient-card-avatar"><PatientAvatar sex={p.sex} /></span>
      <span className="patient-card-name" title={fullName(p)}>{fullName(p)}</span>
      <span className="patient-card-line patient-card-phone">{p.contactNumber || '—'}</span>
      <span className="patient-card-line patient-card-email" title={p.email}>{p.email}</span>
      {selected && <CheckCircleFilled className="patient-card-check" aria-hidden="true" />}
    </button>
  );
}