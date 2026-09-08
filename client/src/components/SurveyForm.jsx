import { useState } from 'react';
import {
  STATES, CATEGORIES, RELIGIONS, RATION_CARD_TYPES, HOUSE_TYPES,
  HOUSE_OWNERSHIP, OCCUPATIONS, GOVT_SCHEMES, ASSET_FIELDS,
} from '../constants/surveyOptions';

export const EMPTY_SURVEY = {
  full_name: '', guardian_name: '', gender: '', dob: '', aadhaar_number: '',
  mobile_number: '', email: '', state: '', district: '', block: '', village_town: '',
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
            <Field label="Gender" error={errors.gender}>
              <select name="gender" value={values.gender} onChange={handleChange}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Date of Birth" error={errors.dob}>
              <input type="date" name="dob" value={values.dob || ''} onChange={handleChange} />
            </Field>
            <Field label="Aadhaar Number" error={errors.aadhaar_number}>
              <input name="aadhaar_number" value={values.aadhaar_number} onChange={handleChange} maxLength={12} placeholder="12-digit UID" />
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
            <Field label="State" error={errors.state}>
              <select name="state" value={values.state} onChange={handleChange}>
                <option value="">Select State</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="District" error={errors.district}>
              <input name="district" value={values.district} onChange={handleChange} />
            </Field>
            <Field label="Block / Mandal / Tehsil" error={errors.block}>
              <input name="block" value={values.block} onChange={handleChange} />
            </Field>
            <Field label="Village / Town" error={errors.village_town}>
              <input name="village_town" value={values.village_town} onChange={handleChange} />
            </Field>
            <Field label="Pincode" error={errors.pincode}>
              <input name="pincode" value={values.pincode} onChange={handleChange} maxLength={6} />
            </Field>
            <Field label="Full Address" error={errors.address}>
              <textarea name="address" value={values.address} onChange={handleChange} rows={2} />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3>Socio-Economic Details</h3>
          <div className="form-grid">
            <Field label="Category" error={errors.category}>
              <select name="category" value={values.category} onChange={handleChange}>
                <option value="">Select</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Religion" error={errors.religion}>
              <select name="religion" value={values.religion} onChange={handleChange}>
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
            <Field label="House Type" error={errors.house_type}>
              <select name="house_type" value={values.house_type} onChange={handleChange}>
                <option value="">Select</option>
                {HOUSE_TYPES.map((h) => <option key={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="House Ownership" error={errors.house_ownership}>
              <select name="house_ownership" value={values.house_ownership} onChange={handleChange}>
                <option value="">Select</option>
                {HOUSE_OWNERSHIP.map((h) => <option key={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="Occupation" error={errors.occupation}>
              <select name="occupation" value={values.occupation} onChange={handleChange}>
                <option value="">Select</option>
                {OCCUPATIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Number of Family Members" error={errors.family_members_count}>
              <input type="number" min="0" name="family_members_count" value={values.family_members_count} onChange={handleChange} />
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
          {values.has_bank_account && (
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
          <h3>Government Scheme &amp; Remarks</h3>
          <div className="form-grid">
            <Field label="Government Scheme Availed" error={errors.govt_scheme_availed}>
              <select name="govt_scheme_availed" value={values.govt_scheme_availed} onChange={handleChange}>
                <option value="">Select</option>
                {GOVT_SCHEMES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
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
