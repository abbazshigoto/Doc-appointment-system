import type {
  AppointmentBookRequest,
  AppointmentResponse,
  AvailabilityWindowResponse,
  DoctorResponse,
  NotificationResponse,
  RegisterRequest,
  TokenResponse,
  UserResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function extractErrorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item === "object" && item !== null && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : JSON.stringify(item)
        )
        .join(", ");
    }
  }
  return "Something went wrong";
}

interface RequestOptions {
  method?: string;
  token?: string;
  json?: unknown;
  form?: Record<string, string>;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.form !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(options.form).toString();
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });

  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(data));
  }

  return data as T;
}

export function register(data: RegisterRequest): Promise<UserResponse> {
  return apiFetch<UserResponse>("/auth/register", { method: "POST", json: data });
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    form: { username: email, password },
  });
}

export function getMe(token: string): Promise<UserResponse> {
  return apiFetch<UserResponse>("/auth/me", { token });
}

export function listDoctors(token: string): Promise<DoctorResponse[]> {
  return apiFetch<DoctorResponse[]>("/doctors", { token });
}

export function getDoctor(token: string, doctorId: number): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>(`/doctors/${doctorId}`, { token });
}

export function listDoctorAvailability(
  token: string,
  doctorId: number
): Promise<AvailabilityWindowResponse[]> {
  return apiFetch<AvailabilityWindowResponse[]>(`/availability/doctors/${doctorId}`, { token });
}

export function bookAppointment(
  token: string,
  data: AppointmentBookRequest
): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>("/appointments", { method: "POST", token, json: data });
}

export function listMyAppointments(token: string): Promise<AppointmentResponse[]> {
  return apiFetch<AppointmentResponse[]>("/appointments/me", { token });
}

export function cancelAppointment(token: string, appointmentId: number): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>(`/appointments/${appointmentId}/cancel`, {
    method: "POST",
    token,
  });
}

export function listMyNotifications(token: string): Promise<NotificationResponse[]> {
  return apiFetch<NotificationResponse[]>("/notifications/me", { token });
}
