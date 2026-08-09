export type UserRole = "patient" | "doctor" | "admin";

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UserResponse {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface DoctorUserSummary {
  id: number;
  full_name: string;
  email: string;
}

export interface DoctorResponse {
  id: number;
  user: DoctorUserSummary;
  specialty: string;
  bio: string | null;
  years_of_experience: number;
  // Pydantic serializes Decimal fields as JSON strings, not numbers.
  consultation_fee: string;
  created_at: string;
}

export interface DoctorProfileRequest {
  specialty: string;
  bio: string | null;
  years_of_experience: number;
  consultation_fee: number;
}

export type DoctorProfileUpdateRequest = Partial<DoctorProfileRequest>;

export interface AvailabilityWindowRequest {
  start_time: string;
  end_time: string;
}

export interface AvailabilityWindowResponse {
  id: number;
  doctor_id: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export type AppointmentStatus = "confirmed" | "cancelled";

export interface AppointmentBookRequest {
  doctor_id: number;
  start_time: string;
}

export interface AppointmentPatientSummary {
  id: number;
  full_name: string;
  email: string;
}

export interface AppointmentResponse {
  id: number;
  doctor_id: number;
  patient_id: number;
  patient: AppointmentPatientSummary;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface BookedSlotResponse {
  start_time: string;
  end_time: string;
}

export interface NotificationResponse {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}
