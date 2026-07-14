// Oura API v2 response types (subset we use). Source: openapi-1.35.json

export interface OuraListResponse<T> {
  data: T[];
  next_token: string | null;
}

export interface DailySleep {
  id: string;
  day: string;
  score: number | null;
  timestamp: string;
  contributors: {
    deep_sleep: number | null;
    efficiency: number | null;
    latency: number | null;
    rem_sleep: number | null;
    restfulness: number | null;
    timing: number | null;
    total_sleep: number | null;
  };
}

export interface DailyReadiness {
  id: string;
  day: string;
  score: number | null;
  temperature_deviation: number | null;
  temperature_trend_deviation: number | null;
  contributors: {
    activity_balance: number | null;
    body_temperature: number | null;
    hrv_balance: number | null;
    previous_day_activity: number | null;
    previous_night: number | null;
    recovery_index: number | null;
    resting_heart_rate: number | null;
    sleep_balance: number | null;
  };
}

export interface DailyActivity {
  id: string;
  day: string;
  score: number | null;
  steps: number;
  active_calories: number;
  total_calories: number;
  target_calories: number;
  sedentary_time: number;
  resting_time: number;
  non_wear_time: number;
  average_met_minutes: number;
  equivalent_walking_distance: number | null;
  high_activity_time: number;
  medium_activity_time: number;
  low_activity_time: number;
}

export interface SleepPeriod {
  id: string;
  day: string;
  period: number;
  type: string;
  bedtime_start: string;
  bedtime_end: string;
  total_sleep_duration: number | null;
  deep_sleep_duration: number | null;
  light_sleep_duration: number | null;
  rem_sleep_duration: number | null;
  awake_time: number | null;
  latency: number | null;
  efficiency: number | null;
  time_in_bed: number;
  average_heart_rate: number | null;
  lowest_heart_rate: number | null;
  average_hrv: number | null;
  average_breath: number | null;
  sleep_phase_5_min: string | null;
}

export interface HeartRateSample {
  bpm: number;
  source: "awake" | "workout" | "rest" | "sleep" | "live" | "session";
  timestamp: string;
}

export interface DailyStress {
  id: string;
  day: string;
  stress_high: number | null;
  recovery_high: number | null;
  day_summary: string | null;
}

export interface DailySpo2 {
  id: string;
  day: string;
  spo2_percentage: { average: number | null } | null;
  breathing_disturbance_index: number | null;
}

export interface EnhancedTag {
  id: string;
  tag_type_code: string | null;
  custom_name: string | null;
  comment: string | null;
  start_day: string;
  end_day: string | null;
}

export type DailyEndpoint =
  | "daily_sleep"
  | "daily_readiness"
  | "daily_activity"
  | "daily_stress"
  | "daily_spo2"
  | "daily_resilience"
  | "daily_cardiovascular_age"
  | "sleep"
  | "workout"
  | "session"
  | "enhanced_tag"
  | "sleep_time";
