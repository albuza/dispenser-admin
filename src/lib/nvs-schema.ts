// NVS 설정 스키마 정의 - 카테고리별로 그룹화

export interface NvsField {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'select';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | boolean;
  options?: { value: number; label: string }[];
}

export interface NvsCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  fields: NvsField[];
}

export const nvsSchema: NvsCategory[] = [
  {
    id: 'timing_normal',
    title: '기본 타이밍',
    description: 'Normal 모드 서빙 시간 설정',
    icon: '⏱️',
    fields: [
      { key: 'st0_duration', label: 'ST0 대기', type: 'number', unit: 'ms', min: 0, max: 5000, step: 100, defaultValue: 500 },
      { key: 'st1_duration', label: 'ST1 시간', type: 'number', unit: 'ms', min: 0, max: 10000, step: 100, defaultValue: 3000 },
      { key: 'st2_duration', label: 'ST2 시간', type: 'number', unit: 'ms', min: 0, max: 15000, step: 100, defaultValue: 5000 },
      { key: 'st3_duration', label: 'ST3 시간', type: 'number', unit: 'ms', min: 0, max: 10000, step: 100, defaultValue: 2000 },
    ],
  },
  {
    id: 'timing_tasting',
    title: '시음 타이밍',
    description: 'Tasting 모드 서빙 시간 설정',
    icon: '🍺',
    fields: [
      { key: 'tasting_st1_duration', label: '시음 ST1', type: 'number', unit: 'ms', min: 0, max: 5000, step: 100, defaultValue: 1500 },
      { key: 'tasting_st2_duration', label: '시음 ST2', type: 'number', unit: 'ms', min: 0, max: 10000, step: 100, defaultValue: 2500 },
      { key: 'tasting_st3_duration', label: '시음 ST3', type: 'number', unit: 'ms', min: 0, max: 5000, step: 100, defaultValue: 1000 },
    ],
  },
  {
    id: 'st2_steps_normal',
    title: 'ST2 단계 시간 (패키징)',
    description: '패키징 모드 ST2 세부 단계',
    icon: '📦',
    fields: [
      { key: 'st2_m1_duration', label: 'ST2 M1', type: 'number', unit: 'ms', min: 0, max: 5000, step: 100, defaultValue: 2000 },
      { key: 'st2_m2_duration', label: 'ST2 M2', type: 'number', unit: 'ms', min: 0, max: 5000, step: 100, defaultValue: 2000 },
      { key: 'st2_m3_duration', label: 'ST2 M3', type: 'number', unit: 'ms', min: 0, max: 5000, step: 100, defaultValue: 1000 },
    ],
  },
  {
    id: 'st2_steps_tasting',
    title: 'ST2 단계 시간 (시음)',
    description: '시음 모드 ST2 세부 단계',
    icon: '🥤',
    fields: [
      { key: 'tasting_st2_m1_duration', label: '시음 ST2 M1', type: 'number', unit: 'ms', min: 0, max: 3000, step: 100, defaultValue: 1000 },
      { key: 'tasting_st2_m2_duration', label: '시음 ST2 M2', type: 'number', unit: 'ms', min: 0, max: 3000, step: 100, defaultValue: 1000 },
      { key: 'tasting_st2_m3_duration', label: '시음 ST2 M3', type: 'number', unit: 'ms', min: 0, max: 3000, step: 100, defaultValue: 500 },
    ],
  },
  {
    id: 'packing',
    title: '패킹 프로세스',
    description: '패킹 모드 CO2/맥주 시간',
    icon: '🫧',
    fields: [
      { key: 'pack_co2_duration', label: '패킹 CO2', type: 'number', unit: 'ms', min: 0, max: 10000, step: 100, defaultValue: 2000 },
      { key: 'pack_beer_duration', label: '패킹 맥주', type: 'number', unit: 'ms', min: 0, max: 10000, step: 100, defaultValue: 3000 },
    ],
  },
  {
    id: 'servo_angles',
    title: '서보 각도',
    description: '서보 모터 위치 설정',
    icon: '🔧',
    fields: [
      { key: 'servo1_origin', label: '서보1 원점', type: 'number', unit: '°', min: 0, max: 180, step: 1, defaultValue: 0 },
      { key: 'servo1_pour', label: '서보1 따르기', type: 'number', unit: '°', min: 0, max: 180, step: 1, defaultValue: 90 },
      { key: 'servo1_cream', label: '서보1 크림', type: 'number', unit: '°', min: 0, max: 180, step: 1, defaultValue: 45 },
      { key: 'servo1_midstop', label: '서보1 중간멈춤', type: 'number', unit: '°', min: 0, max: 180, step: 1, defaultValue: 30 },
      { key: 'servo2_origin', label: '서보2 원점', type: 'number', unit: '°', min: 0, max: 180, step: 1, defaultValue: 0 },
      { key: 'servo2_45', label: '서보2 45도', type: 'number', unit: '°', min: 0, max: 180, step: 1, defaultValue: 45 },
    ],
  },
  {
    id: 'servo_st2_positions',
    title: 'ST2 서보 위치',
    description: 'ST2 단계별 서보2 위치',
    icon: '📐',
    fields: [
      { key: 'servo2_m1', label: '서보2 M1', type: 'number', unit: '°', min: 0, max: 180, step: 1, defaultValue: 15 },
      { key: 'servo2_m2', label: '서보2 M2', type: 'number', unit: '°', min: 0, max: 180, step: 1, defaultValue: 30 },
      { key: 'servo2_m3', label: '서보2 M3', type: 'number', unit: '°', min: 0, max: 180, step: 1, defaultValue: 45 },
    ],
  },
  {
    id: 'servo_settings',
    title: '서보 설정',
    description: '서보 속도 및 ST2 단계 수',
    icon: '⚙️',
    fields: [
      { key: 'servo1_speed', label: '서보1 속도', type: 'number', unit: '', min: 1, max: 255, step: 1, defaultValue: 100 },
      { key: 'servo2_speed', label: '서보2 속도', type: 'number', unit: '', min: 1, max: 255, step: 1, defaultValue: 100 },
      { key: 'st2_step', label: 'ST2 단계 수', type: 'select', defaultValue: 3, options: [
        { value: 1, label: '1단계' },
        { value: 2, label: '2단계' },
        { value: 3, label: '3단계' },
      ]},
    ],
  },
  {
    id: 'system',
    title: '시스템 설정',
    description: '모드 및 로그 설정',
    icon: '💻',
    fields: [
      { key: 'online_mode', label: '온라인 모드', type: 'boolean', defaultValue: false },
      { key: 'log_transmission_enabled', label: '로그 전송', type: 'boolean', defaultValue: false },
      { key: 'log_info_enabled', label: 'Log Info 활성화', type: 'boolean', defaultValue: true },
      { key: 'pack_mode', label: '팩 모드', type: 'select', defaultValue: 2, options: [
        { value: 1, label: '패키징' },
        { value: 2, label: '시음' },
        { value: 3, label: '퀵' },
      ]},
    ],
  },
  {
    id: 'co2_basic',
    title: 'CO2 기본 설정',
    description: 'CO2 압력 기본 파라미터',
    icon: '🎛️',
    fields: [
      { key: 'co2_lock_serve', label: '서빙중 잠금', type: 'boolean', defaultValue: true },
      { key: 'co2_vent_valve', label: '벤트밸브 활성화', type: 'boolean', defaultValue: false },
      { key: 'co2_3stage', label: '3단계 압력', type: 'boolean', defaultValue: true },
      { key: 'co2_p_min', label: '최소 압력', type: 'number', unit: 'PSI', min: 0, max: 30, step: 0.5, defaultValue: 5.0 },
      { key: 'co2_p_max', label: '최대 압력', type: 'number', unit: 'PSI', min: 0, max: 40, step: 0.5, defaultValue: 25.0 },
      { key: 'co2_volume', label: 'CO2 볼륨', type: 'number', unit: 'vol', min: 1, max: 5, step: 0.1, defaultValue: 2.5 },
    ],
  },
  {
    id: 'co2_3stage',
    title: 'CO2 3단계 압력',
    description: '3단계 압력 제어 설정',
    icon: '📊',
    fields: [
      { key: 'co2_p_hi_tower', label: '타워 고압', type: 'number', unit: 'PSI', min: 10, max: 35, step: 0.5, defaultValue: 20.0 },
      { key: 'co2_p_hi_cool', label: '냉각 고압', type: 'number', unit: 'PSI', min: 10, max: 40, step: 0.5, defaultValue: 25.0 },
      { key: 'co2_t1_high', label: 'T1 고잔량', type: 'number', unit: '분', min: 1, max: 120, step: 1, defaultValue: 30 },
      { key: 'co2_t1_mid', label: 'T1 중잔량', type: 'number', unit: '분', min: 1, max: 60, step: 1, defaultValue: 15 },
      { key: 'co2_t1_low', label: 'T1 저잔량', type: 'number', unit: '분', min: 1, max: 30, step: 1, defaultValue: 5 },
      { key: 'co2_t2_min', label: 'T2', type: 'number', unit: '분', min: 30, max: 300, step: 10, defaultValue: 120 },
      { key: 'co2_rem_hi', label: '고잔량 임계', type: 'number', unit: '%', min: 30, max: 80, step: 5, defaultValue: 50 },
      { key: 'co2_rem_lo', label: '저잔량 임계', type: 'number', unit: '%', min: 5, max: 40, step: 5, defaultValue: 20 },
    ],
  },
  {
    id: 'co2_pulse',
    title: 'CO2 펄스 제어',
    description: '적응형 펄스 파라미터',
    icon: '⚡',
    fields: [
      { key: 'co2_stab_delay', label: '안정화 딜레이', type: 'number', unit: 'ms', min: 100, max: 1000, step: 50, defaultValue: 400 },
      { key: 'co2_p_tol', label: '압력 허용오차', type: 'number', unit: 'PSI', min: 0.1, max: 2, step: 0.1, defaultValue: 0.5 },
    ],
  },
  {
    id: 'co2_keg',
    title: 'CO2 케그 설정',
    description: '케그 용량 및 맥주 스타일',
    icon: '🛢️',
    fields: [
      { key: 'co2_keg_cap', label: '케그 용량', type: 'number', unit: 'mL', min: 5000, max: 50000, step: 1000, defaultValue: 19000 },
      { key: 'co2_beer_style', label: '맥주 스타일', type: 'select', defaultValue: 0, options: [
        { value: 0, label: 'Lager (2.5 vol)' },
        { value: 1, label: 'Pilsner (2.5 vol)' },
        { value: 2, label: 'Ale (2.2 vol)' },
        { value: 3, label: 'Stout (1.8 vol)' },
        { value: 4, label: 'Wheat (2.8 vol)' },
        { value: 5, label: 'IPA (2.4 vol)' },
        { value: 6, label: 'Sour (3.0 vol)' },
        { value: 7, label: 'Custom' },
      ]},
    ],
  },
  {
    id: 'co2_flowmeter',
    title: 'CO2 유량계 감지',
    description: '케그 Empty/New 감지 설정',
    icon: '💧',
    fields: [
      { key: 'co2_fm_k', label: 'K팩터', type: 'number', unit: 'ml/pulse', min: 0.1, max: 10, step: 0.1, defaultValue: 1.0 },
      { key: 'co2_fm_emult', label: 'Empty 배수', type: 'number', unit: 'x', min: 1.5, max: 10, step: 0.5, defaultValue: 3.0 },
      { key: 'co2_fm_edur', label: 'Empty 지속', type: 'number', unit: 'ms', min: 500, max: 5000, step: 100, defaultValue: 2000 },
      { key: 'co2_fm_ndur', label: '정상 지속', type: 'number', unit: 'ms', min: 500, max: 5000, step: 100, defaultValue: 2000 },
    ],
  },
];

// 기본값으로 초기 NVS 설정 생성
export function getDefaultNvsSettings(): Record<string, number | boolean> {
  const settings: Record<string, number | boolean> = {};
  for (const category of nvsSchema) {
    for (const field of category.fields) {
      settings[field.key] = field.defaultValue;
    }
  }
  return settings;
}
