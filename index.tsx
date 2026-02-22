import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  MapPin, Cloud, Sun, Umbrella, Coffee, Utensils, Moon, 
  Car, Info, Navigation, CloudRain, Thermometer, Clock, PenLine, Footprints, Bus,
  ChevronRight, ChevronLeft, CheckSquare, Trash2
} from 'lucide-react';

// --- 타입 정의 ---

type Slot = 'morning' | 'afternoon' | 'evening' | 'night';
type ItemType = 'place' | 'food' | 'activity' | 'transport' | 'rest';

interface GrabEstimate {
  min: number;
  max: number;
}

interface FareEstimate {
  grab4: GrabEstimate;
  grab7: GrabEstimate;
}

interface RouteInfo {
  distanceMeters: number;
  durationSec: number;
  durationWalkingSec?: number;
  durationPublicTransportSec?: number;
  fareEstimateVND: FareEstimate;
}

interface ItineraryItem {
  id: string;
  day: number;
  date: string;
  slot: Slot;
  name: string;
  type: ItemType;
  lat: number;
  lng: number;
  mapQuery: string;
  dirMapUrl: string;
  placeUrl?: string;
  durationMin: number;
  costVND: { min: number; max: number };
  why: string;
  tips: string[];
  rainAlternative: AlternativeItem | null;
  reservationUrl?: string; // 예약 홈페이지 추가
  businessHours?: string; // 영업시간 추가
  breakTime?: string;     // 브레이크 타임 추가
  closedDays?: string;    // 휴무일 추가
  routeFromPrev?: RouteInfo;
}

interface AlternativeItem {
  name: string;
  type: ItemType;
  lat: number;
  lng: number;
  mapQuery: string;
  placeUrl?: string;
  why: string;
  tips: string[];
  businessHours?: string;
  breakTime?: string;
  closedDays?: string;
  reservationUrl?: string;
}

interface DayHeader {
  day: number;
  date: string;
  representativeLat: number;
  representativeLng: number;
}

interface TripData {
  tripId: string;
  days: number;
  nights: number;
  dayHeaders: DayHeader[];
  itinerary: ItineraryItem[];
}

// --- 모의 데이터 (백엔드 시뮬레이션) ---

const MOCK_TRIP_DATA: TripData = {
  tripId: "DN-3N4D-20260403",
  days: 4,
  nights: 3,
  dayHeaders: [
    { day: 1, date: "2026-04-03", representativeLat: 16.0544, representativeLng: 108.2022 },
    { day: 2, date: "2026-04-04", representativeLat: 15.9964, representativeLng: 107.9965 },
    { day: 3, date: "2026-04-05", representativeLat: 15.8801, representativeLng: 108.3380 },
    { day: 4, date: "2026-04-06", representativeLat: 16.0667, representativeLng: 108.2241 },
  ],
  itinerary: [
    {
      id: "DN-D1-001", day: 1, date: "2026-04-03", slot: "morning",
      name: "다낭 국제공항 도착 (10:45)",
      type: "transport", lat: 16.0544, lng: 108.2022, mapQuery: "다낭 국제공항",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0544,108.2022&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+International+Airport",
      durationMin: 60, costVND: { min: 0, max: 0 },
      why: "07:55 서울 출발 -> 10:45 다낭 도착. 입국 수속 및 짐 찾기.",
      tips: ["공항 환전소에서 소액 환전", "Grab 호출 시 3번 게이트 건너편 주차장 이용"],
      rainAlternative: null,
      businessHours: "24시간 운영",
      closedDays: "연중무휴",
      routeFromPrev: undefined
    },
    {
      id: "DN-D1-002", day: 1, date: "2026-04-03", slot: "afternoon",
      name: "호텔 체크인 (미케비치 인근 추천)",
      type: "rest", lat: 16.0601, lng: 108.2458, mapQuery: "미케비치",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0601,108.2458&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach+Da+Nang",
      durationMin: 60, costVND: { min: 0, max: 0 },
      why: "숙소 추천: 미케비치 지역. 시내와 호이안 이동이 편리하고 휴양 느낌을 낼 수 있습니다.",
      tips: ["얼리 체크인 가능 여부 확인", "짐 맡기고 점심 식사 이동"],
      rainAlternative: {
        name: "호텔 로비 라운지 & 스파",
        type: "rest", lat: 16.0601, lng: 108.2458, mapQuery: "미케비치 호텔",
        why: "비가 올 때는 호텔 내 부대시설을 즐기며 휴식.",
        tips: ["호텔 애프터눈 티 이용", "스파 예약 확인"],
        businessHours: "상시",
      },
      businessHours: "체크인 14:00 / 체크아웃 12:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 6500, durationSec: 900, durationWalkingSec: 4800, durationPublicTransportSec: 2700,
        fareEstimateVND: { grab4: { min: 110000, max: 140000 }, grab7: { min: 130000, max: 160000 } }
      }
    },
    {
      id: "DN-D1-003", day: 1, date: "2026-04-03", slot: "afternoon",
      name: "핑크성당 & 한시장 & 콩카페",
      type: "activity", lat: 16.0667, lng: 108.2241, mapQuery: "다낭 대성당",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0667,108.2241&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+Cathedral",
      durationMin: 150, costVND: { min: 200000, max: 500000 },
      why: "다낭 시내 핵심 코스. 환전(한시장 금은방) 및 아오자이 맞춤.",
      tips: ["한시장 1층 냄새 주의", "콩카페 코코넛 스무디 커피 필수"],
      rainAlternative: {
        name: "한시장 (실내 쇼핑)",
        type: "activity", lat: 16.0688, lng: 108.2238, mapQuery: "한시장",
        placeUrl: "https://www.google.com/maps/search/?api=1&query=Han+Market+Da+Nang",
        why: "실내 시장이라 비를 피하며 쇼핑 가능. 2층 의류 코너 추천.",
        tips: ["미끄러움 주의", "우산 비닐 포장"],
        businessHours: "06:00 - 19:00",
      },
      businessHours: "06:00 - 19:00 (시장)",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 3000, durationSec: 600, durationWalkingSec: 2400, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 50000, max: 70000 }, grab7: { min: 60000, max: 80000 } }
      }
    },
    {
      id: "DN-D1-004", day: 1, date: "2026-04-03", slot: "evening",
      name: "용다리 야경 & 선짜 야시장",
      type: "activity", lat: 16.0614, lng: 108.2359, mapQuery: "용다리",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0614,108.2359&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Dragon+Bridge+Da+Nang",
      durationMin: 90, costVND: { min: 200000, max: 400000 },
      why: "다낭의 랜드마크 용다리 감상과 야시장 먹거리.",
      tips: ["주말(토/일) 21:00 불쇼 진행", "야시장 해산물 가격 흥정 필수"],
      rainAlternative: {
        name: "DHC 마리나 카페 (사랑의 부두)",
        type: "food", lat: 16.0614, lng: 108.2359, mapQuery: "DHC Marina",
        placeUrl: "https://www.google.com/maps/search/?api=1&query=DHC+Marina+Da+Nang",
        why: "용다리가 보이는 실내 카페에서 운치 있게 야경 감상.",
        tips: ["창가 자리 선점 필수", "따뜻한 음료 추천"],
        businessHours: "07:00 - 22:30",
      },
      businessHours: "18:00 - 24:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 1500, durationSec: 300, durationWalkingSec: 1200, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 35000, max: 45000 }, grab7: { min: 45000, max: 60000 } }
      }
    },
    {
      id: "DN-D1-005", day: 1, date: "2026-04-03", slot: "night",
      name: "숙소 복귀 (미케비치)",
      type: "rest", lat: 16.0601, lng: 108.2458, mapQuery: "미케비치",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0601,108.2458&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach+Da+Nang",
      durationMin: 0, costVND: { min: 0, max: 0 },
      why: "일정 마무리 및 휴식.",
      tips: ["내일 바나힐 일정을 위해 컨디션 조절"],
      rainAlternative: null,
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 2000, durationSec: 400, durationWalkingSec: 1500, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 35000, max: 45000 }, grab7: { min: 45000, max: 60000 } }
      }
    },
    {
      id: "DN-D2-001", day: 2, date: "2026-04-04", slot: "morning",
      name: "바나힐 썬월드 (오전~오후)",
      type: "activity", lat: 15.9964, lng: 107.9965, mapQuery: "바나힐 썬월드",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=15.9964,107.9965&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Sun+World+Ba+Na+Hills",
      durationMin: 360, costVND: { min: 5400000, max: 6000000 },
      why: "골든브릿지와 테마파크. 다낭 필수 코스.",
      tips: ["오픈런(08:00) 추천", "산 위는 쌀쌀하니 겉옷 준비"],
      rainAlternative: {
        name: "바나힐 판타지 파크 (실내)",
        type: "activity", lat: 15.9964, lng: 107.9965, mapQuery: "바나힐 판타지 파크",
        placeUrl: "https://www.google.com/maps/search/?api=1&query=Fantasy+Park+Ba+Na+Hills",
        why: "거대한 실내 테마파크에서 놀이기구와 오락 시설 즐기기.",
        tips: ["자이로드롭 등 실내 놀이기구 이용", "실내 공연 관람"],
        businessHours: "08:30 - 17:00",
      },
      reservationUrl: "https://ticket.sunworld.vn/khu-vui-choi/ba-na-hills/",
      businessHours: "08:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 25000, durationSec: 2700, durationWalkingSec: undefined, durationPublicTransportSec: 5400,
        fareEstimateVND: { grab4: { min: 350000, max: 400000 }, grab7: { min: 400000, max: 500000 } }
      }
    },
    {
      id: "DN-D2-002", day: 2, date: "2026-04-04", slot: "evening",
      name: "마사지 & 저녁 식사",
      type: "rest", lat: 16.0721, lng: 108.2265, mapQuery: "아지트 멀티플렉스",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0721,108.2265&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Azit+Multiplex+Da+Nang",
      durationMin: 120, costVND: { min: 800000, max: 1500000 },
      why: "바나힐 투어 피로 풀기. 마사지 후 맛집 탐방.",
      tips: ["인기 샵은 카톡 예약 필수", "다낭 시내 맛집(마담란, 목식당 등) 방문"],
      rainAlternative: null,
      reservationUrl: "https://pf.kakao.com/_xkwxexbb", // 예시 카카오 채널 링크
      businessHours: "09:00 - 23:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 25000, durationSec: 2700, durationWalkingSec: undefined, durationPublicTransportSec: 5400,
        fareEstimateVND: { grab4: { min: 350000, max: 400000 }, grab7: { min: 400000, max: 500000 } }
      }
    },
    {
      id: "DN-D2-003", day: 2, date: "2026-04-04", slot: "night",
      name: "숙소 복귀",
      type: "rest", lat: 16.0601, lng: 108.2458, mapQuery: "미케비치",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0601,108.2458&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach+Da+Nang",
      durationMin: 0, costVND: { min: 0, max: 0 },
      why: "휴식.",
      tips: ["내일 호이안 일정 준비"],
      rainAlternative: null,
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 3000, durationSec: 600, durationWalkingSec: 2400, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 50000, max: 70000 }, grab7: { min: 60000, max: 80000 } }
      }
    },
    {
      id: "DN-D3-001", day: 3, date: "2026-04-05", slot: "morning",
      name: "링엄사 (영흥사) & 해수관음상",
      type: "place", lat: 16.1001, lng: 108.2778, mapQuery: "다낭 링엄사",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.1001,108.2778&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Linh+Ung+Pagoda+Da+Nang",
      durationMin: 90, costVND: { min: 0, max: 0 },
      why: "부모님 만족도 1위! 67m 초대형 해수관음상과 다낭 바다를 한눈에.",
      tips: ["복장 단정히 (민소매/짧은바지 자제)", "야생 원숭이 소지품 주의", "그랩 기사님께 대기 요청 추천"],
      rainAlternative: {
        name: "참 조각 박물관 (실내)",
        type: "activity", lat: 16.0610, lng: 108.2232, mapQuery: "참 조각 박물관",
        placeUrl: "https://www.google.com/maps/search/?api=1&query=Museum+of+Cham+Sculpture",
        why: "비가 올 땐 실내에서 고대 참파 왕국의 유물을 감상하며 역사 탐방.",
        tips: ["한국어 오디오 가이드 대여 가능", "에어컨이 나와 쾌적함"],
        businessHours: "07:30 - 17:00",
      },
      businessHours: "06:00 - 21:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 10000, durationSec: 1200, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 150000, max: 200000 }, grab7: { min: 200000, max: 250000 } }
      }
    },
    {
      id: "DN-D3-002", day: 3, date: "2026-04-05", slot: "afternoon",
      name: "안방 비치 & 점심 (라플라주)",
      type: "food", lat: 15.9146, lng: 108.3238, mapQuery: "안방 비치 라플라주",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=15.9146,108.3238&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=La+Plage+Beach+Bar+Hoi+An",
      durationMin: 120, costVND: { min: 800000, max: 1500000 },
      why: "호이안으로 이동 후 바다를 보며 여유로운 점심 식사.",
      tips: ["가리비 구이, 총알 오징어 추천", "식사 후 썬베드에서 휴식"],
      rainAlternative: {
        name: "호이안 올드타운 맛집 (모닝글로리)",
        type: "food", lat: 15.8772, lng: 108.3275, mapQuery: "호이안 모닝글로리",
        placeUrl: "https://www.google.com/maps/search/?api=1&query=Morning+Glory+Original",
        why: "비가 오면 해변 대신 올드타운 내 분위기 좋은 실내 식당으로 이동.",
        tips: ["화이트 로즈, 프라이드 완탄 추천", "예약 권장"],
        businessHours: "10:00 - 22:00",
      },
      businessHours: "08:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 25000, durationSec: 2400, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 350000, max: 400000 }, grab7: { min: 400000, max: 500000 } }
      }
    },
    {
      id: "DN-D3-003", day: 3, date: "2026-04-05", slot: "evening",
      name: "호이안 올드타운 & 소원배 & 야시장",
      type: "activity", lat: 15.8801, lng: 108.3380, mapQuery: "호이안 올드타운",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=15.8801,108.3380&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Hoi+An+Ancient+Town",
      durationMin: 240, costVND: { min: 300000, max: 600000 },
      why: "유네스코 유산. 낮에는 노란 벽 배경 인생샷, 밤에는 등불과 소원배.",
      tips: ["소원배는 해 질 녘(17:30~) 추천", "호객 행위가 많으니 가격 확인 필수", "야시장에서 기념품 구입"],
      rainAlternative: {
        name: "호이안 메모리즈 쇼 (실내 관람석)",
        type: "activity", lat: 15.8801, lng: 108.3380, mapQuery: "호이안 메모리즈 쇼",
        placeUrl: "https://www.google.com/maps/search/?api=1&query=Hoi+An+Memories+Land",
        why: "비가 와도 관람 가능한 대형 야외 공연 (관람석 지붕 있음).",
        tips: ["미리 예약 필수", "공연 전 테마파크 구경"],
        businessHours: "20:00 - 21:00 (공연)",
        reservationUrl: "https://www.klook.com/ko/activity/11875-hoi-an-memories-show-da-nang/",
      },
      businessHours: "07:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 5000, durationSec: 600, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 60000, max: 80000 }, grab7: { min: 80000, max: 100000 } }
      }
    },
    {
      id: "DN-D3-004", day: 3, date: "2026-04-05", slot: "night",
      name: "다낭 숙소 복귀",
      type: "transport", lat: 16.0601, lng: 108.2458, mapQuery: "미케비치",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0601,108.2458&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach+Da+Nang",
      durationMin: 0, costVND: { min: 0, max: 0 },
      why: "호이안 야경 감상 후 다낭으로 복귀.",
      tips: ["그랩이 잘 안 잡힐 수 있으니 미리 예약하거나 셔틀 확인"],
      rainAlternative: null,
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 25000, durationSec: 2400, durationWalkingSec: undefined, durationPublicTransportSec: 5400,
        fareEstimateVND: { grab4: { min: 350000, max: 400000 }, grab7: { min: 400000, max: 500000 } }
      }
    },
    {
      id: "DN-D4-001", day: 4, date: "2026-04-06", slot: "morning",
      name: "롯데마트 쇼핑 (귀국 선물)",
      type: "activity", lat: 16.0345, lng: 108.2205, mapQuery: "롯데마트 다낭",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0345,108.2205&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Lotte+Mart+Da+Nang",
      durationMin: 90, costVND: { min: 1000000, max: 3000000 },
      why: "체크아웃 후 공항 가기 전 마지막 쇼핑. 짐 보관 가능.",
      tips: ["커피, 건망고, 과자 등 구입", "3층/4층 짐 보관소 이용"],
      rainAlternative: null,
      businessHours: "08:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 4000, durationSec: 600, durationWalkingSec: 3000, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 60000, max: 80000 }, grab7: { min: 75000, max: 95000 } }
      }
    },
    {
      id: "DN-D4-002", day: 4, date: "2026-04-06", slot: "afternoon",
      name: "다낭 국제공항 이동 (13:30)",
      type: "transport", lat: 16.0544, lng: 108.2022, mapQuery: "다낭 국제공항",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0544,108.2022&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+International+Airport",
      durationMin: 60, costVND: { min: 0, max: 0 },
      why: "15:55 출발 비행기. 2시간 전 도착 권장.",
      tips: ["남은 동(VND) 소진", "출국 심사 대기 시간 고려"],
      rainAlternative: null,
      businessHours: "24시간",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 3000, durationSec: 500, durationWalkingSec: 2400, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 50000, max: 70000 }, grab7: { min: 60000, max: 80000 } }
      }
    }
  ]
};

// --- 모의 API 클라이언트 ---

const fetchItinerary = (day: number): Promise<ItineraryItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_TRIP_DATA.itinerary.filter(i => i.day === day));
    }, 400); 
  });
};

const fetchWeather = (lat: number, lng: number, date: string): Promise<{ temp: number | null, condition: string }> => {
  return new Promise((resolve) => {
    const targetDate = new Date(date);
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    setTimeout(() => {
      if (diffDays > 10) {
        resolve({ temp: null, condition: "unavailable" });
      } else {
        resolve({ temp: 28, condition: "cloudy" });
      }
    }, 300);
  });
};

// --- 도우미 함수 ---

const EXCHANGE_RATE = 0.055; // 1 VND = 0.055 KRW (approx)

const formatVND = (amount: number) => {
  return `${(amount/1000).toLocaleString()}k`;
};

const formatKRW = (amount: number) => {
  return `${Math.round(amount * EXCHANGE_RATE).toLocaleString()}원`;
};

const formatVNDRange = (min: number, max: number) => {
  if (min === 0 && max === 0) return "포함 / 무료";
  return (
    <span>
      {formatVND(min)} - {formatVND(max)}
      <span className="text-gray-400 text-[10px] ml-1">
        ({formatKRW(min)}~{formatKRW(max)})
      </span>
    </span>
  );
};

const getSlotLabel = (slot: Slot) => {
  switch (slot) {
    case 'morning': return '오전';
    case 'afternoon': return '오후';
    case 'evening': return '저녁';
    case 'night': return '밤';
    default: return '';
  }
};

// --- 컴포넌트 ---

const Checklist = () => {
  const defaultItems = [
    { id: 1, text: "샤워기 필터 (베트남 수질 대비)", checked: false },
    { id: 2, text: "칫솔, 치약 (호텔 어메니티 확인)", checked: false },
    { id: 3, text: "상비약 (소화제, 지사제, 두통약, 밴드)", checked: false },
    { id: 4, text: "여권 (유효기간 6개월 이상)", checked: false },
    { id: 5, text: "환전 (달러 또는 5만원권)", checked: false },
    { id: 6, text: "유심 / 이심 / 로밍 신청", checked: false },
    { id: 7, text: "보조배터리 & 충전기", checked: false },
    { id: 8, text: "선글라스, 모자, 썬크림 (자외선 강함)", checked: false },
    { id: 9, text: "수영복, 아쿠아슈즈, 방수팩", checked: false },
    { id: 10, text: "우산 또는 우비 (우천 대비)", checked: false },
    { id: 11, text: "물티슈, 휴지", checked: false },
    { id: 12, text: "손선풍기 (더위 대비)", checked: false },
    { id: 13, text: "얇은 겉옷 (실내 에어컨/바나힐 쌀쌀함)", checked: false },
    { id: 14, text: "그랩(Grab) 앱 미리 설치 및 카드 등록", checked: false },
    { id: 15, text: "여행자 보험 가입", checked: false },
  ];

  const [items, setItems] = useState(defaultItems);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/checklist')
      .then(res => res.json())
      .then(data => {
        if (data.checklist) {
          setItems(data.checklist);
        } else {
          // If no data on server, save default items
          saveItems(defaultItems);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load checklist:", err);
        setLoading(false);
      });
  }, []);

  const saveItems = (newItems: any[]) => {
    fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist: newItems }),
    }).catch(err => console.error("Failed to save checklist:", err));
  };

  const toggleCheck = (id: number) => {
    const newItems = items.map((item: any) => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(newItems);
    saveItems(newItems);
  };

  const resetList = () => {
    if (window.confirm("체크리스트를 초기화하시겠습니까?")) {
      setItems(defaultItems);
      saveItems(defaultItems);
    }
  };

  const progress = Math.round((items.filter((i: any) => i.checked).length / items.length) * 100);

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto pb-24 flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              여행 준비물 체크리스트
            </h2>
            <p className="text-xs text-indigo-600 mt-1">
              * 서버에 자동 저장됩니다. (다른 기기 연동 가능)
            </p>
          </div>
          <button 
            onClick={resetList}
            className="text-gray-400 hover:text-red-500 transition-colors p-2"
            title="초기화"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="bg-gray-100 h-2 w-full">
          <div 
            className="bg-indigo-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {items.map((item: any) => (
            <div 
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-4 flex items-center gap-3 cursor-pointer transition-colors hover:bg-gray-50 ${item.checked ? 'bg-gray-50/50' : ''}`}
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                item.checked 
                  ? 'bg-indigo-500 border-indigo-500 text-white' 
                  : 'border-gray-300 bg-white'
              }`}>
                {item.checked && <CheckSquare className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-sm flex-1 ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const WeatherBar = ({ day, date, lat, lng }: { day: number, date: string, lat: number, lng: number }) => {
  const [weather, setWeather] = useState<{ temp: number | null, condition: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setWeather(null);
    setLoading(true);
    fetchWeather(lat, lng, date).then(data => {
      setWeather(data);
      setLoading(false);
    });
  }, [lat, lng, date]);

  return (
    <div className="bg-blue-600 text-white p-4 shadow-md transition-all">
      <div className="flex justify-between items-center max-w-md mx-auto">
        <div>
          <h2 className="text-lg font-bold">다낭 여행 - {day}일차</h2>
          <p className="text-sm opacity-90">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="text-xs animate-pulse">로딩 중...</span>
          ) : weather?.condition === "unavailable" ? (
             <div className="flex flex-col items-end">
               <span className="text-xs bg-blue-700 px-2 py-1 rounded">날씨 정보 없음</span>
               <span className="text-[10px] opacity-75">(너무 먼 날짜)</span>
             </div>
          ) : (
            <>
              <Cloud className="w-6 h-6" />
              <span className="text-xl font-bold">{weather?.temp}°C</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const DayTabs = ({ days, selectedDay, onSelect }: { days: DayHeader[], selectedDay: number, onSelect: (d: number) => void }) => {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 overflow-x-auto hide-scrollbar">
      <div className="flex max-w-md mx-auto">
        {days.map((d) => (
          <button
            key={d.day}
            onClick={() => onSelect(d.day)}
            className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap px-4 border-b-2 ${
              selectedDay === d.day
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {d.day}일차
            <span className="block text-[10px] font-normal">{d.date.slice(5)}</span>
          </button>
        ))}
        <button
          onClick={() => onSelect(1000)}
          className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap px-4 border-b-2 ${
            selectedDay === 1000
              ? "border-indigo-500 text-indigo-600 bg-indigo-50/50"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          준비물
          <span className="block text-[10px] font-normal">체크리스트</span>
        </button>
        <button
          onClick={() => onSelect(999)}
          className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap px-4 border-b-2 ${
            selectedDay === 999
              ? "border-yellow-500 text-yellow-600 bg-yellow-50/50"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          메모
          <span className="block text-[10px] font-normal">예약/기록</span>
        </button>
      </div>
    </div>
  );
};

const GrabButton = ({ lat, lng, name }: { lat: number, lng: number, name: string }) => {
  const handleGrabClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // grab:// 딥링크 스키마를 사용하여 앱을 직접 실행합니다.
    // r.grab.com 링크에서 발생하는 'invalid ID' 에러를 방지하고 더 확실하게 앱을 엽니다.
    const grabAppUrl = `grab://open?screenType=BOOKING&dropOffLatitude=${lat}&dropOffLongitude=${lng}&dropOffName=${encodeURIComponent(name)}`;
    
    // 앱 실행 시도
    window.location.href = grabAppUrl;

    // 앱이 설치되어 있지 않은 경우를 위한 웹 링크 백업 (필요시)
    setTimeout(() => {
      if (!document.hidden) {
        // 앱 실행에 실패한 경우 (브라우저가 여전히 활성 상태인 경우)
        // r.grab.com 대신 공식 다운로드/랜딩 페이지로 안내하거나 알림을 띄울 수 있습니다.
        console.log("Grab app might not be installed.");
      }
    }, 2500);
  };

  return (
    <button
      onClick={handleGrabClick}
      className="w-full mt-3 bg-[#00B14F] hover:bg-[#009e47] text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
    >
      <Car className="w-4 h-4" />
      Grab 앱으로 호출 (목적지 자동 설정)
    </button>
  );
};

const ItineraryCard: React.FC<{ item: ItineraryItem }> = ({ item }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const getIcon = (type: ItemType) => {
    switch (type) {
      case 'place': return <MapPin className="w-5 h-5 text-purple-500" />;
      case 'food': return <Utensils className="w-5 h-5 text-orange-500" />;
      case 'activity': return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'transport': return <Car className="w-5 h-5 text-blue-500" />;
      case 'rest': return <Coffee className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleRowClick = () => {
    if (item.dirMapUrl) {
      window.open(item.dirMapUrl, '_blank');
    }
  };

  const handleReservationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.reservationUrl) {
      window.open(item.reservationUrl, '_blank');
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      scrollRef.current.scrollBy({
        left: direction === 'right' ? clientWidth : -clientWidth,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="mb-6 relative">
      {/* 이전 장소에서의 이동 선 */}
      {item.routeFromPrev && (
        <div className="absolute -top-6 left-6 w-0.5 h-6 bg-gray-300"></div>
      )}

      {/* 이동 정보 */}
      {item.routeFromPrev && (
        <div className="mx-4 mb-2 bg-gray-50 rounded p-2 text-xs text-gray-500 border border-gray-100">
          <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-1 font-medium text-gray-700">
                <Navigation className="w-3 h-3 text-blue-500" />
                <span>이동: {(item.routeFromPrev.distanceMeters / 1000).toFixed(1)}km</span>
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="flex flex-col items-center p-1.5 bg-white rounded border border-gray-100 shadow-sm">
              <Car className="w-4 h-4 text-blue-500 mb-1" />
              <span className="font-bold text-gray-800">{Math.round(item.routeFromPrev.durationSec/60)}분</span>
              <span className="text-[10px] text-gray-400">택시/그랩</span>
            </div>
            
            <div className="flex flex-col items-center p-1.5 bg-white rounded border border-gray-100 shadow-sm">
              <Footprints className="w-4 h-4 text-green-500 mb-1" />
              <span className="font-bold text-gray-800">
                {item.routeFromPrev.durationWalkingSec ? `${Math.round(item.routeFromPrev.durationWalkingSec/60)}분` : '-'}
              </span>
              <span className="text-[10px] text-gray-400">도보</span>
            </div>

            <div className="flex flex-col items-center p-1.5 bg-white rounded border border-gray-100 shadow-sm">
              <Bus className="w-4 h-4 text-purple-500 mb-1" />
              <span className="font-bold text-gray-800">
                {item.routeFromPrev.durationPublicTransportSec ? `${Math.round(item.routeFromPrev.durationPublicTransportSec/60)}분` : '-'}
              </span>
              <span className="text-[10px] text-gray-400">대중교통</span>
            </div>
          </div>

          <div className="text-right border-t border-gray-100 pt-2 mt-1">
            <div className="flex justify-between">
              <span>그랩 4인</span>
              <span className="font-semibold text-gray-700">{formatVNDRange(item.routeFromPrev.fareEstimateVND.grab4.min, item.routeFromPrev.fareEstimateVND.grab4.max)}</span>
            </div>
            <div className="flex justify-between mt-0.5">
              <span>그랩 7인</span>
              <span className="font-semibold text-gray-700">{formatVNDRange(item.routeFromPrev.fareEstimateVND.grab7.min, item.routeFromPrev.fareEstimateVND.grab7.max)}</span>
            </div>
          </div>
          
          <GrabButton lat={item.lat} lng={item.lng} name={item.name} />
        </div>
      )}

      {/* 메인 카드 (가로 스크롤 슬라이더) */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto flex snap-x snap-mandatory pb-4 -mb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Slide 1: 기본 일정 */}
        <div className="min-w-full snap-center px-4">
          <div 
            onClick={handleRowClick}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 active:bg-blue-50 transition-colors cursor-pointer ring-1 ring-transparent hover:ring-blue-200 h-full relative"
          >
            {/* 슬라이드 인디케이터 힌트 (버튼으로 변경) */}
            <button 
              onClick={(e) => { e.stopPropagation(); scroll('right'); }}
              className="absolute right-2 top-2 text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm border border-gray-100 z-10"
            >
               <span className="text-[10px] font-medium">우천 시 대안</span>
               <ChevronRight className="w-3 h-3" />
            </button>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="p-2 bg-gray-100 rounded-full">
                  {getIcon(item.type)}
                </div>
                <div className="h-full w-0.5 bg-gray-100 my-2"></div>
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{getSlotLabel(item.slot)}</span>
                  <Navigation className="w-4 h-4 text-blue-400" />
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 leading-tight mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600 mb-3 italic">"{item.why}"</p>
                
                {/* 가게 정보 (영업시간/브레이크타임/휴무일/상세보기) 추가 */}
                {(item.businessHours || item.breakTime || item.closedDays || item.placeUrl || item.reservationUrl) && (
                  <div className="mb-3 bg-blue-50/50 rounded-lg p-3 border border-blue-100/50 flex flex-col gap-2">
                    {(item.businessHours || item.breakTime || item.closedDays) && (
                      <div className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-500 mt-0.5" />
                        <div className="text-[11px] text-blue-800 leading-relaxed">
                          {item.businessHours && <div><strong>영업:</strong> {item.businessHours}</div>}
                          {item.breakTime && <div><strong>브레이크 타임:</strong> {item.breakTime}</div>}
                          {item.closedDays && <div><strong>휴무:</strong> {item.closedDays}</div>}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {item.placeUrl && (
                        <a 
                          href={item.placeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-white border border-blue-200 px-2.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
                        >
                          <MapPin className="w-3 h-3" />
                          구글맵
                        </a>
                      )}
                      {item.reservationUrl && (
                        <button 
                          onClick={handleReservationClick}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-indigo-500 border border-indigo-600 px-2.5 py-1.5 rounded-md hover:bg-indigo-600 transition-colors shadow-sm"
                        >
                          <PenLine className="w-3 h-3" />
                          예약하기
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {item.tips.map((tip, idx) => (
                    <span key={idx} className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md border border-yellow-100">
                      💡 {tip}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mt-3 pt-3 border-t border-gray-50">
                  <div>
                    <span className="text-gray-400 block mb-0.5">예상 경비 (합계)</span>
                    <span className="font-medium text-gray-700">
                      {formatVNDRange(item.costVND.min, item.costVND.max)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 2: 우천 시 대안 */}
        <div className="min-w-full snap-center px-4">
          <div className="bg-slate-50 rounded-xl shadow-inner border border-slate-200 p-4 h-full flex flex-col relative min-h-[180px]">
             <button 
               onClick={(e) => { e.stopPropagation(); scroll('left'); }}
               className="absolute left-2 top-2 text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm border border-gray-100 z-10"
             >
               <ChevronLeft className="w-3 h-3" />
               <span className="text-[10px] font-medium">기본 일정</span>
            </button>
            
            {item.rainAlternative ? (
              <div className="flex gap-4 mt-8">
                <div className="flex flex-col items-center">
                   <div className="p-2 bg-blue-100 rounded-full">
                     {getIcon(item.rainAlternative.type)}
                   </div>
                   <div className="h-full w-0.5 bg-blue-100 my-2"></div>
                </div>

                <div className="flex-1 text-left">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wide text-blue-500">우천 시 추천</span>
                    {item.rainAlternative.placeUrl && (
                       <a 
                         href={item.rainAlternative.placeUrl}
                         target="_blank"
                         rel="noopener noreferrer"
                         onClick={(e) => e.stopPropagation()}
                         className="text-blue-400 hover:text-blue-600"
                       >
                         <MapPin className="w-4 h-4" />
                       </a>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1">{item.rainAlternative.name}</h3>
                  <p className="text-sm text-slate-600 mb-3 italic">"{item.rainAlternative.why}"</p>

                  <div className="mb-3 bg-white rounded-lg p-3 border border-slate-200 flex flex-col gap-2 shadow-sm">
                    {item.rainAlternative.businessHours && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span><strong>영업:</strong> {item.rainAlternative.businessHours}</span>
                      </div>
                    )}
                    {item.rainAlternative.reservationUrl && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.rainAlternative?.reservationUrl) window.open(item.rainAlternative.reservationUrl, '_blank');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-indigo-500 border border-indigo-600 px-2.5 py-1.5 rounded-md hover:bg-indigo-600 transition-colors shadow-sm self-start"
                      >
                        <PenLine className="w-3 h-3" />
                        예약하기
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.rainAlternative.tips.map((tip, idx) => (
                      <span key={idx} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-md border border-blue-200">
                        ☔ {tip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-3 py-8 justify-center h-full">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Umbrella className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-500 mb-1">대안 일정 없음</h3>
                  <p className="text-sm text-gray-400">이 일정은 실내 활동이거나<br/>비가 와도 진행 가능합니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CurrencyConverter = () => {
  const [vnd, setVnd] = useState<string>("");
  const [krw, setKrw] = useState<string>("0");

  const handleVndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, "");
    if (!isNaN(Number(value))) {
      setVnd(Number(value).toLocaleString());
      setKrw(Math.round(Number(value) * EXCHANGE_RATE).toLocaleString());
    }
  };

  return (
    <div className="mx-4 mb-6 bg-white rounded-xl shadow-sm border border-blue-100 p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <span className="bg-green-100 text-green-700 p-1 rounded">₫</span>
        간편 환율 계산기
      </h3>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <input
            type="text"
            value={vnd}
            onChange={handleVndChange}
            placeholder="0"
            className="w-full pl-3 py-2 text-right focus:outline-none text-sm min-w-0"
          />
          <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 border-l border-gray-200 whitespace-nowrap">
            VND
          </div>
        </div>
        <span className="text-gray-400">=</span>
        <div className="flex-1 flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          <div className="w-full pl-3 py-2 text-right text-gray-700 text-sm min-w-0 truncate">
            {krw}
          </div>
          <div className="bg-gray-100 px-3 py-2 text-xs text-gray-500 border-l border-gray-200 whitespace-nowrap">
            KRW
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-right">* 10,000동 ≈ 550원 기준</p>
    </div>
  );
};

const MemoPad = () => {
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/memo')
      .then(res => res.json())
      .then(data => {
        setMemo(data.memo);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load memo:", err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMemo(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fetch('/api/memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: newValue }),
      }).catch(err => console.error("Failed to save memo:", err));
    }, 1000);
  };

  if (loading) {
    return (
      <div className="mx-4 animate-fade-in flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="mx-4 animate-fade-in">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 shadow-sm relative">
        <div className="absolute top-0 left-0 w-full h-8 bg-yellow-100 rounded-t-xl border-b border-yellow-200 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="mt-6">
            <textarea
            value={memo}
            onChange={handleChange}
            placeholder="여기에 예약 번호, 맛집 리스트, 쇼핑 목록 등을 자유롭게 적어두세요."
            className="w-full h-[50vh] bg-transparent border-none resize-none focus:ring-0 text-gray-700 placeholder-gray-400 text-base font-medium"
            style={{ 
                backgroundImage: 'linear-gradient(transparent, transparent 27px, #e5e7eb 28px)', 
                backgroundSize: '100% 28px',
                lineHeight: '28px',
                paddingTop: '0px'
            }}
            />
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
        <PenLine className="w-3 h-3" /> 작성한 내용은 서버에 자동 저장됩니다.
      </p>
    </div>
  );
};

const App = () => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDay === 999 || selectedDay === 1000) return; // 메모/체크리스트 탭일 때는 API 호출 스킵
    setLoading(true);
    fetchItinerary(selectedDay).then(data => {
      setItinerary(data);
      setLoading(false);
    });
  }, [selectedDay]);

  const currentDayHeader = useMemo(() => 
    MOCK_TRIP_DATA.dayHeaders.find(d => d.day === selectedDay), 
  [selectedDay]);

  if (selectedDay !== 999 && selectedDay !== 1000 && !currentDayHeader) return <div className="p-10 text-center">여정 데이터를 불러오는 데 실패했습니다.</div>;

  return (
    <div className="min-h-screen pb-10 max-w-md mx-auto bg-gray-50 shadow-2xl overflow-hidden">
      {selectedDay === 999 ? (
        <div className="bg-yellow-500 text-white p-4 shadow-md transition-all">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <div>
              <h2 className="text-lg font-bold">여행 메모장</h2>
              <p className="text-sm opacity-90">예약 정보와 꿀팁 기록</p>
            </div>
            <PenLine className="w-6 h-6" />
          </div>
        </div>
      ) : selectedDay === 1000 ? (
        <div className="bg-indigo-600 text-white p-4 shadow-md transition-all">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <div>
              <h2 className="text-lg font-bold">여행 준비물</h2>
              <p className="text-sm opacity-90">빠짐없이 챙기셨나요?</p>
            </div>
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>
      ) : (
        currentDayHeader && <WeatherBar 
          day={selectedDay} 
          date={currentDayHeader.date} 
          lat={currentDayHeader.representativeLat} 
          lng={currentDayHeader.representativeLng} 
        />
      )}
      
      <DayTabs 
        days={MOCK_TRIP_DATA.dayHeaders} 
        selectedDay={selectedDay} 
        onSelect={setSelectedDay} 
      />

      <div className="mt-6">
        {selectedDay === 999 ? (
          <MemoPad />
        ) : selectedDay === 1000 ? (
          <Checklist />
        ) : (
          <>
            <CurrencyConverter />
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm">일정을 구성하고 있습니다...</p>
              </div>
            ) : (
              <div className="animate-fade-in">
                {itinerary.length > 0 ? itinerary.map((item) => (
                  <ItineraryCard key={item.id} item={item} />
                )) : (
                  <div className="text-center py-20 text-gray-400 text-sm italic">해당 일자의 세부 일정이 아직 업데이트되지 않았습니다.</div>
                )}
                
                <div className="text-center py-8 text-gray-400 text-xs">
                  <p>{selectedDay}일차 일정 종료</p>
                  <p className="mt-1">카드를 누르면 구글 지도로 길찾기가 실행됩니다</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const container = document.getElementById('root')!;
const root = (container as any)._reactRoot || createRoot(container);
(container as any)._reactRoot = root;
root.render(<App />);