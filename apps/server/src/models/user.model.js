import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Optional for accounts created through Google sign-in (no local password).
    passwordHash: { type: String, required: function () { return !this.googleId; } },
    // Google account subject id ("sub"). Sparse so local accounts (no value) are
    // excluded from the unique index.
    googleId: { type: String, unique: true, sparse: true, index: true },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    // Fixed roles for v1 — public registration always creates "patient".
    // Staff/admin accounts are created by an admin (see future staff management).
    role: { type: String, enum: ['patient', 'staff', 'admin'], default: 'patient' },
    active: { type: Boolean, default: true },
    fullName: { type: String, required: true, trim: true },
    // Patient profile fields are required for patients only — staff/admin
    // accounts are created with just name + email + password (see seed script
    // now, Staff Accounts UI later). Google sign-in creates a patient with an
    // incomplete profile (profileComplete: false) so these stay optional until
    // the patient fills them in.
    profileComplete: { type: Boolean, default: true },
    birthdate: { type: Date, required: function () { return this.requiresPatientProfile(); } },
    sex: {
      type: String,
      required: function () { return this.requiresPatientProfile(); },
      enum: ['Female', 'Male', 'Other', 'Prefer not to say'],
    },
    address: { type: String, required: function () { return this.requiresPatientProfile(); }, trim: true },
    householdNumber: { type: String, required: function () { return this.requiresPatientProfile(); }, trim: true },
    contactNumber: { type: String, required: function () { return this.requiresPatientProfile(); }, trim: true },
    philHealthNumber: { type: String, trim: true, default: '' },
    emergencyName: { type: String, required: function () { return this.requiresPatientProfile(); }, trim: true },
    emergencyNumber: { type: String, required: function () { return this.requiresPatientProfile(); }, trim: true },
  },
  { timestamps: true },
);

// Patient profile fields are optional while a Google-created account is still
// incomplete (profileComplete === false); otherwise patients must supply them.
userSchema.methods.requiresPatientProfile = function () {
  return this.role === 'patient' && this.profileComplete !== false;
};

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
