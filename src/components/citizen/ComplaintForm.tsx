import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Upload,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  MapPin,
  FileText,
  ArrowRight,
  ShieldAlert,
  Building,
} from 'lucide-react';
import { ComplaintCategory, CreateComplaintInput } from '../../types/complaint';
import { COMPLAINT_CATEGORIES, CIVIC_WARDS } from '../../config/constants';
import { useComplaints } from '../../context/ComplaintContext';
import { useAuth } from '../../context/AuthContext';
import { sanitizeInput } from '../../utils/security';
import { LocationPickerMap } from '../maps/LocationPickerMap';

const CATEGORY_ICONS: Record<string, string> = {
  'Roads and Potholes': '🛣️',
  'Garbage and Sanitation': '🗑️',
  'Water Leakage': '💧',
  'Streetlights and Electricity': '💡',
  'Drainage and Sewage': '🌊',
  'Public Infrastructure': '🏛️',
  'Other': '📋',
};

export const ComplaintForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { submitComplaint } = useComplaints();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [ward, setWard] = useState(user?.wardOrZone || CIVIC_WARDS[4] || 'Ward 14 - Central Zone');
  const [category, setCategory] = useState<ComplaintCategory>('Roads and Potholes');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successId, setSuccessId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrors((prev) => ({ ...prev, image: 'Please select a valid JPG, PNG, or WebP image.' }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image size should not exceed 2MB' }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setErrors((prev) => {
        const { image: _, ...rest } = prev;
        return rest;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    const cleanTitle = sanitizeInput(title);
    if (!cleanTitle) {
      newErrors.title = 'Please enter a clear summary of the issue';
    } else if (cleanTitle.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (cleanTitle.length > 120) {
      newErrors.title = 'Title cannot exceed 120 characters';
    }

    const cleanDesc = sanitizeInput(description);
    if (!cleanDesc) {
      newErrors.description = 'Please provide detailed information about the civic issue';
    } else if (cleanDesc.length < 15) {
      newErrors.description = 'Please describe with more detail (at least 15 characters)';
    } else if (cleanDesc.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }

    const cleanLoc = sanitizeInput(location);
    if (!cleanLoc) {
      newErrors.location = 'Please provide the street address, landmark or pillar number';
    } else if (cleanLoc.length < 3) {
      newErrors.location = 'Location must be at least 3 characters';
    } else if (cleanLoc.length > 150) {
      newErrors.location = 'Location cannot exceed 150 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!isAuthenticated) {
      setErrors({ submit: 'Authentication required: Please sign in to submit a complaint.' });
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const payload: CreateComplaintInput = {
        title: sanitizeInput(title),
        description: sanitizeInput(description),
        location: sanitizeInput(location),
        ward,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        category,
        imageURL: imagePreview || null,
        imageUrl: imagePreview || undefined,
      };

      const result = await submitComplaint(payload);
      setSuccessId(result.id || result.complaintId || 'Registered');
    } catch (err: unknown) {
      const e = err as Error;
      setErrors((prev) => ({
        ...prev,
        submit: e.message || 'Failed to lodge complaint in Cloud Firestore. Please try again.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  // Require Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xl text-white">
        <div className="w-16 h-16 rounded-3xl bg-amber-950/80 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-800/80">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-white">Authentication Required</h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
          To file a verified civic complaint in Cloud Firestore, please sign in to your authenticated citizen account.
        </p>
        <div className="mt-6 flex items-center justify-center space-x-3">
          <Link
            to="/login"
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-navy-950 font-bold rounded-xl text-xs transition-all btn-press shadow-[0_0_15px_rgba(20,184,166,0.3)]"
          >
            Sign In Now
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 bg-[#10243B] hover:bg-[#162A45] border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors btn-press"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  // Success Confirmation
  if (successId) {
    return (
      <div className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-8 sm:p-12 shadow-2xl text-center max-w-xl mx-auto animate-in zoom-in-95 duration-200 text-white">
        <div className="w-20 h-20 rounded-full bg-teal-950/80 border-4 border-teal-500/40 text-teal-400 flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="text-xs font-mono font-bold px-3.5 py-1.5 bg-[#10243B] text-teal-300 rounded-full border border-slate-700 inline-block mb-3">
          Complaint Reference: {successId}
        </span>

        <h3 className="text-2xl font-black text-white">
          Complaint Recorded in Cloud Firestore!
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 mt-2.5 max-w-md mx-auto leading-relaxed">
          Your complaint has been securely registered in the municipal database with automated Gemini AI priority triage and initial status <strong>Reported</strong>.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(`/citizen/complaints/${successId}`)}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all flex items-center justify-center space-x-2 btn-press"
          >
            <span>Track Complaint Live</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSuccessId(null);
              setTitle('');
              setDescription('');
              setLocation('');
              setImagePreview(null);
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#10243B] hover:bg-[#162A45] border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition-colors btn-press"
          >
            Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0D1B2E] rounded-3xl border border-slate-800 p-6 sm:p-10 shadow-2xl space-y-8 text-white">
      {errors.submit && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 flex items-start space-x-3 text-rose-200 text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <span className="font-medium leading-relaxed">{errors.submit}</span>
        </div>
      )}

      {/* Cloud Firestore & AI Triage Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-950/80 via-[#10243B] to-[#0D1B2E] border border-teal-800/80 flex items-start space-x-3.5 shadow-md">
        <div className="p-2.5 rounded-xl bg-teal-500 text-navy-950 flex-shrink-0 mt-0.5 shadow-[0_0_15px_rgba(20,184,166,0.3)]">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-xs">
          <p className="font-bold text-teal-300">
            Automated Gemini AI Triage & Cloud Firestore Dispatch
          </p>
          <p className="text-slate-300 mt-1 leading-relaxed">
            Your complaint is analyzed in real time to assess urgency, recommend the responsible municipal department, and save securely to Cloud Firestore with live tracking.
          </p>
        </div>
      </div>

      {/* Section 1: Category & Title */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
          <span className="w-6 h-6 rounded-full bg-teal-500 text-navy-950 text-xs font-black flex items-center justify-center">
            1
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Category & Issue Summary
          </h3>
        </div>

        {/* Category Visual Grid */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Select Category <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {COMPLAINT_CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  disabled={submitting}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-teal-400 bg-teal-950/80 text-teal-200 shadow-[0_0_15px_rgba(20,184,166,0.3)] ring-2 ring-teal-500/40'
                      : 'border-slate-700/80 hover:border-slate-600 bg-[#071426] hover:bg-[#10243B] text-slate-300'
                  }`}
                >
                  <span className="text-xl mb-1">{CATEGORY_ICONS[cat] || '📋'}</span>
                  <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-teal-300' : 'text-slate-300'}`}>
                    {cat}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Issue Title / Headline <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Broken water pipe flooding sidewalk near market junction"
            disabled={submitting}
            maxLength={120}
            className={`w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border ${
              errors.title ? 'border-rose-400 bg-rose-950/40 text-rose-200' : 'border-slate-700 bg-[#071426] text-white'
            } focus-ring hover:border-slate-600 transition-colors`}
          />
          {errors.title && (
            <p className="text-xs text-rose-400 mt-1.5 flex items-center font-medium">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {errors.title}
            </p>
          )}
        </div>
      </div>

      {/* Section 2: Location & Ward */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
          <span className="w-6 h-6 rounded-full bg-teal-500 text-navy-950 text-xs font-black flex items-center justify-center">
            2
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Location & Municipal Ward
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Municipal Ward / Zone <span className="text-rose-400">*</span></span>
            </label>
            <select
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 focus-ring bg-[#071426] text-white hover:border-slate-600 transition-colors"
            >
              {CIVIC_WARDS.map((w) => (
                <option key={w} value={w} className="bg-[#0D1B2E] text-white">
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Street Address / Landmark <span className="text-rose-400">*</span></span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Cross Cut Rd, Opp Pillar 42"
              disabled={submitting}
              maxLength={150}
              className={`w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border ${
                errors.location ? 'border-rose-400 bg-rose-950/40 text-rose-200' : 'border-slate-700 bg-[#071426] text-white'
              } focus-ring hover:border-slate-600 transition-colors`}
            />
            {errors.location && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errors.location}
              </p>
            )}
          </div>

          {/* Interactive Smart Map Picker */}
          <div className="pt-2">
            <LocationPickerMap
              initialLat={coords?.lat}
              initialLng={coords?.lng}
              onLocationSelect={(selected) => setCoords(selected)}
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Description & Photographic Evidence */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
          <span className="w-6 h-6 rounded-full bg-teal-500 text-navy-950 text-xs font-black flex items-center justify-center">
            3
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Description & Photo Evidence
          </h3>
        </div>

        {/* Detailed Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Detailed Description <span className="text-rose-400">*</span></span>
            </label>
            <span className="text-[11px] text-slate-500 font-mono">
              {description.length}/2000
            </span>
          </div>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the severity, duration, and safety impact on residents or traffic..."
            disabled={submitting}
            maxLength={2000}
            className={`w-full px-4 py-3 text-xs sm:text-sm rounded-2xl border ${
              errors.description ? 'border-rose-400 bg-rose-950/40 text-rose-200' : 'border-slate-700 bg-[#071426] text-white'
            } focus-ring hover:border-slate-600 transition-colors`}
          />
          {errors.description && (
            <p className="text-xs text-rose-400 mt-1.5 flex items-center font-medium">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Drag-and-drop Image Upload Dropzone */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Photographic Evidence (Optional)
            </label>
            <span className="text-[11px] text-slate-500">JPG, PNG, WebP • Max 2MB</span>
          </div>

          {errors.image && (
            <p className="text-xs text-rose-400 mb-2 flex items-center font-medium">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {errors.image}
            </p>
          )}

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-[#071426] max-w-sm shadow-md group">
              <img
                src={imagePreview}
                alt="Complaint evidence preview"
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                disabled={submitting}
                className="absolute top-2.5 right-2.5 p-2 bg-[#071426]/90 hover:bg-[#071426] text-white rounded-full shadow-md transition-colors btn-press"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                isDragging
                  ? 'border-teal-400 bg-teal-950/60 scale-[1.01]'
                  : 'border-slate-700 hover:border-teal-500 bg-[#071426]/60 hover:bg-[#10243B]/60'
              }`}
            >
              <Upload className="w-8 h-8 text-teal-400 mb-2" />
              <p className="text-xs sm:text-sm font-bold text-white text-center">
                Click to attach photo or drag and drop here
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 text-center">
                Attaching photos significantly accelerates field inspection triage
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={submitting}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Processing Shimmer Loading State */}
      {submitting && (
        <div className="p-5 rounded-2xl border border-teal-800 bg-teal-950/80 animate-pulse-subtle">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-teal-300">
              Gemini AI analyzing urgency & allocating department...
            </span>
          </div>
          <p className="text-[11px] text-teal-200/80 leading-relaxed">
            Scanning description for safety hazards, evaluating municipal response SLA, and recording tamper-proof audit trail in Cloud Firestore.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:bg-teal-800 text-navy-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all flex items-center justify-center space-x-2.5 btn-press touch-target"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
              <span>Saving to Cloud Firestore...</span>
            </>
          ) : (
            <>
              <span>Submit Civic Complaint</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
