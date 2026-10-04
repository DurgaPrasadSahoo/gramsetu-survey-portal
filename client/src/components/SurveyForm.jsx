import { useState } from 'react';
import {
  ODISHA_DISTRICTS, getPanchayatsForDistrict, BHUBANESWAR_LOCALITIES, CATEGORIES, RELIGIONS,
  RATION_CARD_TYPES, HOUSE_TYPES, HOUSE_OWNERSHIP, OCCUPATIONS, ASSET_FIELDS, CENTRAL_SCHEMES, ODISHA_SCHEMES,
} from '../constants/surveyOptions';
import { formatAadhaar } from '../utils/aadhaar';

export const EMPTY_SURVEY = {
  full_name: '', guardian_name: '', gender: '', dob: '', aadhaar_number: '',
  mobile_number: '', email: '', state: 'Odisha', district: 'Khordha', panchayat: '', village_town: '',
  address: '', pincode: '', category: '', religion: '', ration_card_type: '',
  house_type: '', house_ownership: '', family_members_count: '', monthly_income: '',
  occupation: '', land_owned_acres: '', bank_name: '', bank_account_number: '',
  govt_scheme_availed: '', remarks: '',
  has_two_wheeler: false, has_four_wheeler: false, has_fridge: false, has_tv: false,
  has_ac: false, has_gas_connection: false, has_washing_machine: false, has_computer: false,
  has_smartphone: false, has_bank_account: false, has_water_pump: false,
};

function Field({ label, error, required, children }) {
  return (
    <label className="form-field">
      <span className="form-label">
        {label}
        {required && <span className="required-mark">*</span>}
      </span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export default function SurveyForm({ initialValues = EMPTY_SURVEY, onSubmit, submitting, submitLabel = 'Submit', errors = {}, readOnly = false }) {
  const [values, setValues] = useState({ ...EMPTY_SURVEY, ...initialValues });

  const update = (key, val) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    update(name, type === 'checkbox' ? checked : value);
  };

  const handleAadhaarChange = (e) => update('aadhaar_number', formatAadhaar(e.target.value));

  const panchayatOptions = getPanchayatsForDistrict(values.district);

  const handleDistrictChange = (district) => {
    setValues((prev) => ({
      ...prev,
      district,
      // The previously selected panchayat may not exist in the new district's list.
      panchayat: getPanchayatsForDistrict(district).includes(prev.panchayat) ? prev.panchayat : '',
    }));
  };

  const selectedSchemes = values.govt_scheme_availed
    ? values.govt_scheme_availed.split(', ').filter(Boolean)
    : [];

  const toggleScheme = (label) => {
    const next = selectedSchemes.includes(label)
      ? selectedSchemes.filter((s) => s !== label)
      : [...selectedSchemes, label];
    update('govt_scheme_availed', next.join(', '));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (readOnly) return;
    onSubmit(values);
  };

  return (
    <form className="survey-form" onSubmit={handleSubmit}>
      <fieldset disabled={readOnly}>
        <section className="form-section">
          <h3>Personal Details</h3>
          <div className="form-grid">
            <Field label="Full Name" required error={errors.full_name}>
              <input name="full_name" value={values.full_name} onChange={handleChange} required />
            </Field>
            <Field label="Father's / Husband's Name" error={errors.guardian_name}>
              <input name="guardian_name" value={values.guardian_name} onChange={handleChange} />
            </Field>
            <Field label="Gender" required error={errors.gender}>
              <select name="gender" value={values.gender} onChange={handleChange} required>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Date of Birth" required error={errors.dob}>
              <input type="date" name="dob" value={values.dob || ''} onChange={handleChange} required />
            </Field>
            <Field label="Aadhaar Number" required error={errors.aadhaar_number}>
              <input
                name="aadhaar_number"
                value={values.aadhaar_number}
                onChange={handleAadhaarChange}
                maxLength={14}
                placeholder="xxxx-xxxx-xxxx"
                inputMode="numeric"
                required
              />
            </Field>
            <Field label="Mobile Number" required error={errors.mobile_number}>
              <input name="mobile_number" value={values.mobile_number} onChange={handleChange} maxLength={10} required placeholder="10-digit mobile" />
            </Field>
            <Field label="Email (optional)" error={errors.email}>
              <input type="email" name="email" value={values.email} onChange={handleChange} />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3>Address Details</h3>
          <div className="form-grid">
            <Field label="State">
              <input value="Odisha" disabled />
            </Field>
            <Field label="District" required error={errors.district}>
              <select name="district" value={values.district} onChange={(e) => handleDistrictChange(e.target.value)} required>
                <option value="">Select District</option>
                {ODISHA_DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Panchayat" required error={errors.panchayat}>
              <select name="panchayat" value={values.panchayat} onChange={handleChange} required disabled={!values.district}>
                <option value="">{values.district ? 'Select Panchayat' : 'Select a district first'}</option>
                {panchayatOptions.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Village" required error={errors.village_town}>
              <input name="village_town" value={values.village_town} onChange={handleChange} list="bhubaneswar-localities" placeholder="e.g. Patia" required />
              <datalist id="bhubaneswar-localities">
                {BHUBANESWAR_LOCALITIES.map((l) => <option key={l} value={l} />)}
              </datalist>
            </Field>
            <Field label="Pincode" required error={errors.pincode}>
              <input name="pincode" value={values.pincode} onChange={handleChange} maxLength={6} placeholder="e.g. 751001" required />
            </Field>
            <Field label="Full Address" error={errors.address}>
              <textarea name="address" value={values.address} onChange={handleChange} rows={2} placeholder="House no., street, locality/colony" />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3>Socio-Economic Details</h3>
          <div className="form-grid">
            <Field label="Category" required error={errors.category}>
              <select name="category" value={values.category} onChange={handleChange} required>
                <option value="">Select</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Religion" required error={errors.religion}>
              <select name="religion" value={values.religion} onChange={handleChange} required>
                <option value="">Select</option>
                {RELIGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Ration Card Type" error={errors.ration_card_type}>
              <select name="ration_card_type" value={values.ration_card_type} onChange={handleChange}>
                <option value="">Select</option>
                {RATION_CARD_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="House Type" required error={errors.house_type}>
              <select name="house_type" value={values.house_type} onChange={handleChange} required>
                <option value="">Select</option>
                {HOUSE_TYPES.map((h) => <option key={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="House Ownership" required error={errors.house_ownership}>
              <select name="house_ownership" value={values.house_ownership} onChange={handleChange} required>
                <option value="">Select</option>
                {HOUSE_OWNERSHIP.map((h) => <option key={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="Occupation" required error={errors.occupation}>
              <select name="occupation" value={values.occupation} onChange={handleChange} required>
                <option value="">Select</option>
                {OCCUPATIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Number of Family Members" required error={errors.family_members_count}>
              <input type="number" min="0" name="family_members_count" value={values.family_members_count} onChange={handleChange} required />
            </Field>
            <Field label="Monthly Household Income (₹)" error={errors.monthly_income}>
              <input type="number" min="0" name="monthly_income" value={values.monthly_income} onChange={handleChange} />
            </Field>
            <Field label="Land Owned (Acres)" error={errors.land_owned_acres}>
              <input type="number" min="0" step="0.01" name="land_owned_acres" value={values.land_owned_acres} onChange={handleChange} />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3>Household Assets</h3>
          <div className="asset-grid">
            {ASSET_FIELDS.map((a) => (
              <label key={a.key} className="checkbox-tile">
                <input type="checkbox" name={a.key} checked={!!values[a.key]} onChange={handleChange} />
                <span>{a.label}</span>
              </label>
            ))}
          </div>
          {!!values.has_bank_account && (
            <div className="form-grid" style={{ marginTop: '0.75rem' }}>
              <Field label="Bank Name" error={errors.bank_name}>
                <input name="bank_name" value={values.bank_name} onChange={handleChange} />
              </Field>
              <Field label="Bank Account Number" error={errors.bank_account_number}>
                <input name="bank_account_number" value={values.bank_account_number} onChange={handleChange} />
              </Field>
            </div>
          )}
        </section>

        <section className="form-section">
          <h3>Government Schemes Availed</h3>
          <p className="muted" style={{ marginTop: '-0.4rem', marginBottom: '0.75rem' }}>
            Select every scheme this household currently benefits from. See the{' '}
            <a href="/schemes" target="_blank" rel="noreferrer">Government Schemes</a> page for details on each.
          </p>

          <h4 className="scheme-group-title">Central Government Schemes</h4>
          <div className="asset-grid">
            {CENTRAL_SCHEMES.map((s) => (
              <label key={s.key} className="checkbox-tile" title={s.description}>
                <input
                  type="checkbox"
                  checked={selectedSchemes.includes(s.label)}
                  onChange={() => toggleScheme(s.label)}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </div>

          <h4 className="scheme-group-title">Odisha State Government Schemes</h4>
          <div className="asset-grid">
            {ODISHA_SCHEMES.map((s) => (
              <label key={s.key} className="checkbox-tile" title={s.description}>
                <input
                  type="checkbox"
                  checked={selectedSchemes.includes(s.label)}
                  onChange={() => toggleScheme(s.label)}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h3>Remarks</h3>
          <div className="form-grid">
            <Field label="Remarks / Notes" error={errors.remarks}>
              <textarea name="remarks" value={values.remarks} onChange={handleChange} rows={2} />
            </Field>
          </div>
        </section>
      </fieldset>

      {!readOnly && (
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
